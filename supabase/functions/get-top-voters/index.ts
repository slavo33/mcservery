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
    const url = new URL(req.url);
    const serverId = url.searchParams.get("server_id");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "5"), 20);

    if (!serverId) {
      return new Response(JSON.stringify({ error: "Missing server_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get vote counts grouped by minecraft_nick (no IP exposed)
    const { data, error } = await supabase
      .from("votes")
      .select("minecraft_nick")
      .eq("server_id", serverId);

    if (error) {
      console.error("Top voters query error:", error);
      return new Response(JSON.stringify({ error: "query_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Aggregate votes per nick
    const counts: Record<string, number> = {};
    for (const row of data || []) {
      counts[row.minecraft_nick] = (counts[row.minecraft_nick] || 0) + 1;
    }

    const topVoters = Object.entries(counts)
      .map(([nick, count]) => ({ nick, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return new Response(JSON.stringify({ voters: topVoters }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Top voters error:", err);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
