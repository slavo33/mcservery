import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  );

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user) throw new Error("Not authenticated");

    const { session_id } = await req.json();
    if (!session_id) throw new Error("Missing session_id");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ error: "not_paid" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const meta = session.metadata || {};
    if (meta.user_id !== user.id) throw new Error("Unauthorized");

    // Check if already processed
    const { data: existing } = await supabaseAdmin
      .from("vip_purchases")
      .select("id")
      .eq("stripe_session_id", session_id)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ success: true, already_processed: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expiresAt = meta.expires_at;
    const cooldown = parseInt(meta.cooldown || "24");
    const serverId = meta.server_id;
    const tier = meta.tier;
    const discountCodeId = meta.discount_code_id || null;

    // Insert VIP purchase
    await supabaseAdmin.from("vip_purchases").insert({
      user_id: user.id,
      server_id: serverId,
      tier,
      price_id: session.metadata?.price_id || "",
      stripe_session_id: session_id,
      discount_code_id: discountCodeId || null,
      amount_paid: session.amount_total || 0,
      expires_at: expiresAt,
    });

    // Update server: set VIP expiry and cooldown
    await supabaseAdmin.from("servers").update({
      vip_expires_at: expiresAt,
      vote_cooldown_hours: cooldown,
      is_featured: true,
    }).eq("id", serverId);

    // Track discount code usage
    if (discountCodeId) {
      await supabaseAdmin.from("discount_code_usage").insert({
        discount_code_id: discountCodeId,
        user_id: user.id,
        tier,
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
