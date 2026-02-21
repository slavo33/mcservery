import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const apiKey = url.searchParams.get("key");
    const serverId = url.searchParams.get("server_id");

    if (!apiKey || !serverId) {
      return new Response(JSON.stringify({ error: "Missing key or server_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify API key matches server via server_secrets table
    const { data: secret } = await supabase
      .from("server_secrets")
      .select("vote_api_key")
      .eq("server_id", serverId)
      .single();

    if (!secret || String(secret.vote_api_key) !== apiKey) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // GET = fetch pending votes, POST = mark as claimed
    if (req.method === "GET") {
      const { data: votes } = await supabase
        .from("votes")
        .select("id, minecraft_nick, created_at")
        .eq("server_id", serverId)
        .eq("claimed", false)
        .order("created_at", { ascending: true })
        .limit(100);

      return new Response(JSON.stringify({ votes: votes || [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (req.method === "POST") {
      const { vote_ids } = await req.json();
      if (!vote_ids || !Array.isArray(vote_ids)) {
        return new Response(JSON.stringify({ error: "Missing vote_ids array" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { error } = await supabase
        .from("votes")
        .update({ claimed: true })
        .in("id", vote_ids)
        .eq("server_id", serverId);

      if (error) {
        return new Response(JSON.stringify({ error: "update_failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Pending votes error:", err);
    return new Response(JSON.stringify({ error: "internal_error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
