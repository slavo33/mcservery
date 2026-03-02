import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Buffer } from "node:buffer";
import { constants, publicEncrypt } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Takes raw base64 key (no PEM headers) from DB and wraps it into PEM format for crypto
// A valid RSA public key (DER-encoded SPKI) in base64 is at least ~176 chars for 1024-bit
const wrapKeyAsPem = (raw: string): string => {
  const stripped = raw
    .replace(/-----BEGIN (?:RSA )?PUBLIC KEY-----/g, "")
    .replace(/-----END (?:RSA )?PUBLIC KEY-----/g, "")
    .replace(/\s+/g, "");
  if (!stripped || !/^[A-Za-z0-9+/=]+$/.test(stripped) || stripped.length < 16) return "";
  const chunks = stripped.match(/.{1,64}/g) ?? [];
  return `-----BEGIN PUBLIC KEY-----\n${chunks.join("\n")}\n-----END PUBLIC KEY-----`;
};

const sendVotifierVote = async ({
  host,
  port,
  publicKey,
  minecraftNick,
  voterIp,
}: {
  host: string;
  port: number;
  publicKey: string;
  minecraftNick: string;
  voterIp: string;
}) => {
  // Connect with 10s timeout
  const conn = await Promise.race([
    Deno.connect({ hostname: host, port }),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Connection timeout")), 10000)),
  ]);
  const encoder = new TextEncoder();

  try {
    // Read handshake banner with timeout
    const handshakeBuffer = new Uint8Array(512);
    await Promise.race([
      conn.read(handshakeBuffer),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Handshake timeout")), 10000)),
    ]);

    const votePacket = `VOTE\nMCServery\n${minecraftNick}\n${voterIp}\n${Math.floor(Date.now() / 1000)}\n`;
    const voteBytes = encoder.encode(votePacket);
    const block = new Uint8Array(256);
    block.set(voteBytes.slice(0, 256));

    const encrypted = publicEncrypt(
      {
        key: publicKey,
        padding: constants.RSA_PKCS1_PADDING,
      },
      Buffer.from(block),
    );

    await conn.write(encrypted);
  } finally {
    conn.close();
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { server_id, minecraft_nick } = await req.json();

    if (!server_id || !minecraft_nick) {
      return new Response(JSON.stringify({ error: "Missing server_id or minecraft_nick" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Validate minecraft nick (3-16 chars, alphanumeric + underscore)
    const nickRegex = /^[a-zA-Z0-9_]{3,16}$/;
    if (!nickRegex.test(minecraft_nick)) {
      return new Response(JSON.stringify({ error: "invalid_nick" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get voter IP for rate limiting
    const voterIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || "127.0.0.1";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Check server exists
    const { data: server } = await supabase.from("servers").select("id").eq("id", server_id).single();
    if (!server) {
      return new Response(JSON.stringify({ error: "server_not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check 24h cooldown - by nick AND by IP per server
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: recentByNick } = await supabase
      .from("votes")
      .select("id, created_at")
      .eq("server_id", server_id)
      .eq("minecraft_nick", minecraft_nick.toLowerCase())
      .gte("created_at", twentyFourHoursAgo)
      .limit(1);

    if (recentByNick && recentByNick.length > 0) {
      const nextVote = new Date(new Date(recentByNick[0].created_at).getTime() + 24 * 60 * 60 * 1000);
      return new Response(JSON.stringify({ error: "cooldown", next_vote: nextVote.toISOString() }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Also check by IP to prevent vote manipulation
    const { data: recentByIp } = await supabase
      .from("votes")
      .select("id")
      .eq("server_id", server_id)
      .eq("voter_ip", voterIp)
      .gte("created_at", twentyFourHoursAgo)
      .limit(1);

    if (recentByIp && recentByIp.length > 0) {
      return new Response(JSON.stringify({ error: "cooldown_ip" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Store vote first (with rollback if Votifier dispatch fails)
    const { data: insertedVote, error: insertError } = await supabase
      .from("votes")
      .insert({
        server_id,
        minecraft_nick: minecraft_nick.toLowerCase(),
        voter_ip: voterIp,
      })
      .select("id")
      .single();

    if (insertError || !insertedVote) {
      console.error("Vote insert error:", insertError);
      return new Response(JSON.stringify({ error: "insert_failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Attempt Votifier dispatch when fully configured
    const { data: secret } = await supabase
      .from("server_secrets")
      .select("votifier_ip, votifier_port, votifier_public_key")
      .eq("server_id", server_id)
      .maybeSingle();

    const hasVotifierConfig = !!(secret?.votifier_ip && secret?.votifier_port && secret?.votifier_public_key);

    if (hasVotifierConfig) {
      const pemKey = wrapKeyAsPem(secret!.votifier_public_key as string);

      if (!pemKey) {
        await supabase.from("votes").delete().eq("id", insertedVote.id);
        return new Response(JSON.stringify({ error: "votifier_public_key_invalid" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      try {
        await sendVotifierVote({
          host: secret!.votifier_ip as string,
          port: secret!.votifier_port as number,
          publicKey: pemKey,
          minecraftNick: minecraft_nick,
          voterIp,
        });
      } catch (votifierError) {
        console.error("Votifier send error:", votifierError);
        await supabase.from("votes").delete().eq("id", insertedVote.id);
        return new Response(JSON.stringify({ error: "votifier_delivery_failed" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Vote handler error:", err);
    return new Response(JSON.stringify({ error: "internal_error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
