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
    const { server_id } = await req.json();

    if (!server_id) {
      return new Response(JSON.stringify({ error: "missing_server_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify auth - only owner can test
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify JWT and get user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check ownership
    const { data: server } = await supabase
      .from("servers")
      .select("id, owner_id")
      .eq("id", server_id)
      .single();

    if (!server || server.owner_id !== user.id) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get votifier config
    const { data: secret } = await supabase
      .from("server_secrets")
      .select("votifier_ip, votifier_port, votifier_public_key")
      .eq("server_id", server_id)
      .maybeSingle();

    if (!secret?.votifier_ip || !secret?.votifier_port) {
      return new Response(JSON.stringify({ error: "no_config", message: "Votifier IP or port not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try TCP connection and read handshake
    try {
      const conn = await Promise.race([
        Deno.connect({ hostname: secret.votifier_ip, port: secret.votifier_port }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Connection timeout")), 10000)),
      ]);

      try {
        const buf = new Uint8Array(512);
        const n = await Promise.race([
          conn.read(buf),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Read timeout")), 10000)),
        ]);

        const banner = new TextDecoder().decode(buf.subarray(0, n || 0)).trim();
        conn.close();

        return new Response(JSON.stringify({ success: true, banner }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (readErr) {
        conn.close();
        throw readErr;
      }
    } catch (connErr) {
      const msg = connErr instanceof Error ? connErr.message : "Unknown error";
      return new Response(JSON.stringify({ error: "connection_failed", message: msg }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    console.error("Test votifier error:", err);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
