import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-VIP-PAYMENT] ${step}${detailsStr}`);
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
    logStep("User authenticated", { userId: user.id });

    const { session_id } = await req.json();
    if (!session_id) throw new Error("Missing session_id");
    logStep("Verifying session", { session_id });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(session_id);
    logStep("Session retrieved", { paymentStatus: session.payment_status, amountTotal: session.amount_total });

    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ error: "not_paid" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const meta = session.metadata || {};
    if (meta.user_id !== user.id) throw new Error("Unauthorized");
    logStep("Metadata verified", meta);

    // Check if already processed
    const { data: existing } = await supabaseAdmin
      .from("vip_purchases")
      .select("id")
      .eq("stripe_session_id", session_id)
      .maybeSingle();

    if (existing) {
      logStep("Already processed", { purchaseId: existing.id });
      return new Response(JSON.stringify({ success: true, already_processed: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expiresAt = meta.expires_at;
    const cooldown = parseInt(meta.cooldown || "24");
    const serverId = meta.server_id;
    const tier = meta.tier;
    const priceId = meta.price_id || "";
    const discountCodeId = meta.discount_code_id || null;

    // Insert VIP purchase
    const { error: insertError } = await supabaseAdmin.from("vip_purchases").insert({
      user_id: user.id,
      server_id: serverId,
      tier,
      price_id: priceId,
      stripe_session_id: session_id,
      discount_code_id: discountCodeId || null,
      amount_paid: session.amount_total || 0,
      expires_at: expiresAt,
    });
    if (insertError) {
      logStep("Insert error", { error: insertError });
      throw new Error(`Failed to save purchase: ${insertError.message}`);
    }
    logStep("VIP purchase saved");

    // Update server: set VIP expiry and cooldown
    const { error: updateError } = await supabaseAdmin.from("servers").update({
      vip_expires_at: expiresAt,
      vote_cooldown_hours: cooldown,
      is_featured: true,
    }).eq("id", serverId);
    if (updateError) {
      logStep("Server update error", { error: updateError });
      throw new Error(`Failed to update server: ${updateError.message}`);
    }
    logStep("Server updated with VIP status");

    // Auto-assign VIP to all staff posts for this server
    const { error: staffError, count: staffCount } = await supabaseAdmin
      .from("staff_posts")
      .update({ vip_tier: tier, vip_expires_at: expiresAt })
      .eq("server_id", serverId)
      .eq("is_active", true);
    if (staffError) {
      logStep("Staff posts VIP update error (non-fatal)", { error: staffError });
    } else {
      logStep("Staff posts VIP updated", { count: staffCount });
    }

    // Track discount code usage
    if (discountCodeId) {
      await supabaseAdmin.from("discount_code_usage").insert({
        discount_code_id: discountCodeId,
        user_id: user.id,
        tier,
      });
      logStep("Discount code usage tracked");
    }

    logStep("VIP activation complete", { serverId, tier, expiresAt });
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
