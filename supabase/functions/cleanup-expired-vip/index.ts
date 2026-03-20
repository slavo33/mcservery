import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    // Find servers with expired VIP
    const now = new Date().toISOString();
    const { data: expiredServers, error: fetchError } = await supabaseAdmin
      .from("servers")
      .select("id, name, vip_expires_at")
      .not("vip_expires_at", "is", null)
      .lt("vip_expires_at", now)
      .or("is_featured.eq.true,vote_cooldown_hours.neq.24");

    if (fetchError) throw fetchError;

    if (!expiredServers || expiredServers.length === 0) {
      console.log("[CLEANUP-VIP] No expired VIP servers to reset");
      return new Response(JSON.stringify({ reset: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ids = expiredServers.map((s) => s.id);
    console.log(`[CLEANUP-VIP] Resetting ${ids.length} expired VIP servers`, ids);

    const { error: updateError } = await supabaseAdmin
      .from("servers")
      .update({
        is_featured: false,
        vote_cooldown_hours: 24,
      })
      .in("id", ids);

    if (updateError) throw updateError;

    // Also remove VIP from staff posts of these servers
    const { error: staffError } = await supabaseAdmin
      .from("staff_posts")
      .update({ vip_tier: null, vip_expires_at: null })
      .in("server_id", ids);
    if (staffError) {
      console.log("[CLEANUP-VIP] Staff posts VIP cleanup error (non-fatal):", staffError);
    }

    console.log(`[CLEANUP-VIP] Successfully reset ${ids.length} servers`);
    return new Response(JSON.stringify({ reset: ids.length, server_ids: ids }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[CLEANUP-VIP] ERROR:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
