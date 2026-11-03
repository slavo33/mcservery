import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VIP_TIERS: Record<string, { price_id: string; days: number; cooldown: number }> = {
  basic: { price_id: "price_1T8gEdH8BEd7vCRGXJilnMkx", days: 7, cooldown: 8 },
  pro:   { price_id: "price_1T8gF2H8BEd7vCRGTABtuNxJ", days: 30, cooldown: 4 },
  max:   { price_id: "price_1T8gFUH8BEd7vCRGf1wiQNir", days: 90, cooldown: 2 },
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-VIP-CHECKOUT] ${step}${detailsStr}`);
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

  const unauthorized = () =>
    new Response(JSON.stringify({ error: "unauthorized" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 401,
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return unauthorized();
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) return unauthorized();
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { tier, server_id, discount_code } = await req.json();
    const tierConfig = VIP_TIERS[tier];
    if (!tierConfig) throw new Error("Invalid tier");
    logStep("Tier selected", { tier, server_id });

    // Verify server ownership
    const { data: server } = await supabaseAdmin
      .from("servers").select("id, owner_id").eq("id", server_id).single();
    if (!server || server.owner_id !== user.id) throw new Error("Not your server");
    logStep("Server ownership verified");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Handle discount code
    let stripeCouponId: string | undefined;
    let discountCodeId: string | undefined;
    if (discount_code) {
      const { data: dc } = await supabaseAdmin
        .from("discount_codes")
        .select("*")
        .eq("code", discount_code.toUpperCase())
        .eq("is_active", true)
        .maybeSingle();

      if (!dc) {
        logStep("Invalid discount code", { code: discount_code });
        return new Response(JSON.stringify({ error: "invalid_discount_code" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Check max uses
      if (dc.max_uses) {
        const { count } = await supabaseAdmin
          .from("discount_code_usage")
          .select("*", { count: "exact", head: true })
          .eq("discount_code_id", dc.id);
        if ((count || 0) >= dc.max_uses) {
          logStep("Discount code expired", { code: discount_code });
          return new Response(JSON.stringify({ error: "discount_code_expired" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
      }

      discountCodeId = dc.id;

      // Create Stripe coupon
      const coupon = await stripe.coupons.create({
        percent_off: dc.percent_off,
        duration: "once",
        name: `MCServery ${dc.code}`,
      });
      stripeCouponId = coupon.id;
      logStep("Discount coupon created", { couponId: coupon.id, percentOff: dc.percent_off });
    }

    // Check existing Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) customerId = customers.data[0].id;
    logStep("Stripe customer check", { customerId: customerId || "new" });

    const origin = req.headers.get("origin") || "https://mcservery.lovable.app";
    const expiresAt = new Date(Date.now() + tierConfig.days * 24 * 60 * 60 * 1000).toISOString();

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      ...(customerId ? { customer: customerId } : { customer_email: user.email }),
      line_items: [{ price: tierConfig.price_id, quantity: 1 }],
      mode: "payment",
      success_url: `${origin}/vip-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/vip`,
      metadata: {
        tier,
        server_id,
        user_id: user.id,
        expires_at: expiresAt,
        cooldown: tierConfig.cooldown.toString(),
        price_id: tierConfig.price_id,
        discount_code_id: discountCodeId || "",
      },
      ...(stripeCouponId ? { discounts: [{ coupon: stripeCouponId }] } : {}),
    };

    const session = await stripe.checkout.sessions.create(sessionParams);
    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
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
