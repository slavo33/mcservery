import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    const voterIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || "unknown";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
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

    // Insert vote
    const { error: insertError } = await supabase.from("votes").insert({
      server_id,
      minecraft_nick: minecraft_nick.toLowerCase(),
      voter_ip: voterIp,
    });

    if (insertError) {
      console.error("Vote insert error:", insertError);
      return new Response(JSON.stringify({ error: "insert_failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Vote handler error:", err);
    return new Response(JSON.stringify({ error: "internal_error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
