import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Buffer } from "node:buffer";
import { constants, publicEncrypt, createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// SSRF protection: reject private/loopback/link-local hosts and privileged ports
const BLOCKED_HOST_PATTERNS = [
  /^127\./, /^10\./, /^172\.(1[6-9]|2[0-9]|3[01])\./, /^192\.168\./,
  /^169\.254\./, /^0\./, /^metadata/i, /localhost/i, /^::1$/, /^fc00/i, /^fe80/i,
];

const isSafeVotifierTarget = (host: string, port: number): boolean => {
  if (!host || typeof host !== "string") return false;
  const h = host.trim().toLowerCase();
  if (BLOCKED_HOST_PATTERNS.some((p) => p.test(h))) return false;
  if (!/^[a-zA-Z0-9.-]+$/.test(h)) return false;
  if (h.length < 1 || h.length > 253) return false;
  if (!Number.isInteger(port) || port < 1024 || port > 65535) return false;
  return true;
};

const VIP_TIER_COOLDOWN_HOURS: Record<string, number> = {
  basic: 8,
  pro: 4,
  max: 2,
};

// Takes raw base64 key (no PEM headers) from DB and wraps it into PEM format for crypto
const wrapKeyAsPem = (raw: string): string => {
  const stripped = raw
    .replace(/-----BEGIN (?:RSA )?PUBLIC KEY-----/g, "")
    .replace(/-----END (?:RSA )?PUBLIC KEY-----/g, "")
    .replace(/\s+/g, "");
  if (!stripped || !/^[A-Za-z0-9+/=]+$/.test(stripped) || stripped.length < 16) return "";
  const chunks = stripped.match(/.{1,64}/g) ?? [];
  return `-----BEGIN PUBLIC KEY-----\n${chunks.join("\n")}\n-----END PUBLIC KEY-----`;
};

// Votifier v1 - RSA encrypted vote packet
const sendVotifierV1 = async ({
  host, port, publicKey, minecraftNick, voterIp,
}: {
  host: string; port: number; publicKey: string; minecraftNick: string; voterIp: string;
}) => {
  const conn = await Promise.race([
    Deno.connect({ hostname: host, port }),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Connection timeout")), 10000)),
  ]);
  const encoder = new TextEncoder();

  try {
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
      { key: publicKey, padding: constants.RSA_PKCS1_PADDING },
      Buffer.from(block),
    );

    await conn.write(encrypted);
  } finally {
    conn.close();
  }
};

// NuVotifier v2 - HMAC-SHA256 token-based JSON protocol
const sendVotifierV2 = async ({
  host, port, token, minecraftNick, voterIp,
}: {
  host: string; port: number; token: string; minecraftNick: string; voterIp: string;
}) => {
  const conn = await Promise.race([
    Deno.connect({ hostname: host, port }),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Connection timeout")), 10000)),
  ]);
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  try {
    // Read handshake banner: "VOTIFIER <version> <challenge>\n"
    const handshakeBuffer = new Uint8Array(512);
    const n = await Promise.race([
      conn.read(handshakeBuffer),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Handshake timeout")), 10000)),
    ]);

    const banner = decoder.decode(handshakeBuffer.subarray(0, n || 0)).trim();
    const parts = banner.split(" ");
    if (parts.length < 3) {
      throw new Error("Not a Votifier v2 protocol server");
    }
    const challenge = parts[2];

    // Build vote JSON
    const vote = {
      username: minecraftNick,
      address: voterIp,
      timestamp: Date.now(),
      serviceName: "MCServery",
      challenge,
    };

    const payload = JSON.stringify(vote);

    // HMAC-SHA256 signature
    const hmac = createHmac("sha256", token);
    hmac.update(payload);
    const signature = hmac.digest("base64");

    const message = JSON.stringify({ payload, signature });

    // Build v2 message: magic (0x733a) + length (uint16 BE) + message
    const messageBytes = encoder.encode(message);
    const messageBuffer = new Uint8Array(messageBytes.length + 4);
    // Magic bytes 0x733a
    messageBuffer[0] = 0x73;
    messageBuffer[1] = 0x3a;
    // Length as uint16 BE
    messageBuffer[2] = (messageBytes.length >> 8) & 0xff;
    messageBuffer[3] = messageBytes.length & 0xff;
    messageBuffer.set(messageBytes, 4);

    await conn.write(messageBuffer);

    // Read response
    const respBuffer = new Uint8Array(1024);
    const rn = await Promise.race([
      conn.read(respBuffer),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Response timeout")), 10000)),
    ]);

    const respStr = decoder.decode(respBuffer.subarray(0, rn || 0)).trim();
    try {
      const resp = JSON.parse(respStr);
      if (resp.status === "error") {
        throw new Error(`Votifier v2 error: ${resp.cause || ""} ${resp.errorMessage || ""}`);
      }
    } catch (parseErr) {
      // If we can't parse, but we got data, it might be OK (some servers don't respond with JSON)
      if (respStr.length === 0) {
        throw new Error("No response from server");
      }
    }
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

    const nickRegex = /^[a-zA-Z0-9_]{3,16}$/;
    if (!nickRegex.test(minecraft_nick)) {
      return new Response(JSON.stringify({ error: "invalid_nick" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const voterIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || "127.0.0.1";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: server } = await supabase
      .from("servers")
      .select("id, vote_cooldown_hours, vip_expires_at")
      .eq("id", server_id)
      .single();

    if (!server) {
      return new Response(JSON.stringify({ error: "server_not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const vipActive = !!server.vip_expires_at && new Date(server.vip_expires_at).getTime() > now;

    // Effective cooldown: non-VIP = 24h, VIP = 8/4/2h by active tier
    let cooldownHours = 24;

    if (vipActive) {
      cooldownHours =
        server.vote_cooldown_hours && server.vote_cooldown_hours < 24
          ? server.vote_cooldown_hours
          : 8;

      const { data: activeVipPurchase } = await supabase
        .from("vip_purchases")
        .select("tier")
        .eq("server_id", server_id)
        .gt("expires_at", nowIso)
        .order("expires_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const tierCooldown = VIP_TIER_COOLDOWN_HOURS[(activeVipPurchase?.tier || "").toLowerCase()];
      if (tierCooldown) {
        cooldownHours = tierCooldown;
      }
    }

    const cooldownMs = cooldownHours * 60 * 60 * 1000;
    const cooldownAgo = new Date(now - cooldownMs).toISOString();

    const { data: recentByNick } = await supabase
      .from("votes")
      .select("id, created_at")
      .eq("server_id", server_id)
      .eq("minecraft_nick", minecraft_nick.toLowerCase())
      .gte("created_at", cooldownAgo)
      .limit(1);

    if (recentByNick && recentByNick.length > 0) {
      const nextVote = new Date(new Date(recentByNick[0].created_at).getTime() + cooldownMs);
      return new Response(
        JSON.stringify({
          error: "cooldown",
          next_vote: nextVote.toISOString(),
          cooldown_hours: cooldownHours,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: recentByIp } = await supabase
      .from("votes")
      .select("id, created_at")
      .eq("server_id", server_id)
      .eq("voter_ip", voterIp)
      .gte("created_at", cooldownAgo)
      .limit(1);

    if (recentByIp && recentByIp.length > 0) {
      const nextVote = new Date(new Date(recentByIp[0].created_at).getTime() + cooldownMs);
      return new Response(
        JSON.stringify({
          error: "cooldown_ip",
          next_vote: nextVote.toISOString(),
          cooldown_hours: cooldownHours,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Insert vote
    const { data: insertedVote, error: insertError } = await supabase
      .from("votes").insert({ server_id, minecraft_nick: minecraft_nick.toLowerCase(), voter_ip: voterIp })
      .select("id").single();

    if (insertError || !insertedVote) {
      console.error("Vote insert error:", insertError);
      return new Response(JSON.stringify({ error: "insert_failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Attempt Votifier dispatch
    const { data: secret } = await supabase
      .from("server_secrets")
      .select("votifier_ip, votifier_port, votifier_public_key, votifier_token")
      .eq("server_id", server_id)
      .maybeSingle();

    const hasV2Config = !!(secret?.votifier_ip && secret?.votifier_port && secret?.votifier_token);
    const hasV1Config = !!(secret?.votifier_ip && secret?.votifier_port && secret?.votifier_public_key);

    if (hasV2Config) {
      // Prefer v2 protocol if token is set
      try {
        await sendVotifierV2({
          host: secret!.votifier_ip as string,
          port: secret!.votifier_port as number,
          token: secret!.votifier_token as string,
          minecraftNick: minecraft_nick,
          voterIp,
        });
      } catch (votifierError) {
        console.error("Votifier v2 send error:", votifierError);
        await supabase.from("votes").delete().eq("id", insertedVote.id);
        return new Response(JSON.stringify({ error: "votifier_delivery_failed", protocol: "v2" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    } else if (hasV1Config) {
      const pemKey = wrapKeyAsPem(secret!.votifier_public_key as string);
      if (!pemKey) {
        await supabase.from("votes").delete().eq("id", insertedVote.id);
        return new Response(JSON.stringify({ error: "votifier_public_key_invalid" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      try {
        await sendVotifierV1({
          host: secret!.votifier_ip as string,
          port: secret!.votifier_port as number,
          publicKey: pemKey,
          minecraftNick: minecraft_nick,
          voterIp,
        });
      } catch (votifierError) {
        console.error("Votifier v1 send error:", votifierError);
        await supabase.from("votes").delete().eq("id", insertedVote.id);
        return new Response(JSON.stringify({ error: "votifier_delivery_failed", protocol: "v1" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }
    // If neither config is set, vote is still counted (no Votifier reward delivery)

    return new Response(JSON.stringify({ success: true, cooldown_hours: cooldownHours }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Vote handler error:", err);
    return new Response(JSON.stringify({ error: "internal_error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
