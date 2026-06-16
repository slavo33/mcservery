import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

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

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: server } = await supabase
      .from("servers").select("id, owner_id").eq("id", server_id).single();

    if (!server || server.owner_id !== user.id) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: secret } = await supabase
      .from("server_secrets")
      .select("votifier_ip, votifier_port, votifier_public_key, votifier_token")
      .eq("server_id", server_id)
      .maybeSingle();

    if (!secret?.votifier_ip || !secret?.votifier_port) {
      return new Response(JSON.stringify({ error: "no_config", message: "Votifier IP or port not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SSRF guard: refuse to probe private/internal targets or privileged ports
    if (!isSafeVotifierTarget(secret.votifier_ip, secret.votifier_port)) {
      return new Response(JSON.stringify({ error: "invalid_target", message: "Votifier IP/port is not allowed (private or invalid address)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine protocol
    const hasToken = !!secret.votifier_token;
    const hasKey = !!secret.votifier_public_key;

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
        const parts = banner.split(" ");
        const isV2Compatible = parts.length >= 3 && parts[0] === "VOTIFIER";

        let protocol = "unknown";
        let v2TestResult = null;

        if (hasToken && isV2Compatible) {
          // Test v2 handshake with a dummy vote
          protocol = "v2";
          try {
            const challenge = parts[2];
            const vote = {
              username: "MCServery_Test",
              address: "127.0.0.1",
              timestamp: Date.now(),
              serviceName: "MCServery",
              challenge,
            };
            const payload = JSON.stringify(vote);
            const hmac = createHmac("sha256", secret.votifier_token!);
            hmac.update(payload);
            const signature = hmac.digest("base64");

            const message = JSON.stringify({ payload, signature });
            const encoder = new TextEncoder();
            const messageBytes = encoder.encode(message);
            const messageBuffer = new Uint8Array(messageBytes.length + 4);
            messageBuffer[0] = 0x73;
            messageBuffer[1] = 0x3a;
            messageBuffer[2] = (messageBytes.length >> 8) & 0xff;
            messageBuffer[3] = messageBytes.length & 0xff;
            messageBuffer.set(messageBytes, 4);

            await conn.write(messageBuffer);

            const respBuf = new Uint8Array(1024);
            const rn = await Promise.race([
              conn.read(respBuf),
              new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Response timeout")), 5000)),
            ]);

            const respStr = new TextDecoder().decode(respBuf.subarray(0, rn || 0)).trim();
            try {
              const resp = JSON.parse(respStr);
              v2TestResult = resp.status === "ok" ? "ok" : `error: ${resp.cause || resp.errorMessage || "unknown"}`;
            } catch {
              v2TestResult = respStr ? "response_received" : "no_response";
            }
          } catch (v2Err) {
            v2TestResult = v2Err instanceof Error ? v2Err.message : "unknown error";
          }
        } else if (hasKey) {
          protocol = "v1";
        }

        conn.close();

        return new Response(JSON.stringify({
          success: true,
          banner,
          protocol,
          v2_compatible: isV2Compatible,
          v2_test_result: v2TestResult,
        }), {
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
