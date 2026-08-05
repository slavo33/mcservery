import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function isValidMinecraftAddress(ip: string): boolean {
  const parts = ip.split(":");
  const host = parts[0];

  // Block internal/private IP ranges
  const blockedPatterns = [
    /^127\./,
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[01])\./,
    /^192\.168\./,
    /^169\.254\./,
    /^0\./,
    /^metadata/i,
    /localhost/i,
    /^::1$/,
    /^fc00/i,
    /^fe80/i,
  ];

  if (blockedPatterns.some((pattern) => pattern.test(host))) {
    return false;
  }

  // Validate hostname format (alphanumeric, dots, hyphens only)
  if (!/^[a-zA-Z0-9.-]+$/.test(host)) {
    return false;
  }

  // Must have at least one dot or be a valid IP
  if (host.length < 1 || host.length > 253) {
    return false;
  }

  // Validate port if present (only unprivileged ports allowed)
  if (parts[1]) {
    const port = Number(parts[1]);
    if (!Number.isInteger(port) || port < 1024 || port > 65535) {
      return false;
    }
  }

  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ip } = await req.json();
    if (!ip || typeof ip !== "string" || !isValidMinecraftAddress(ip)) {
      return new Response(JSON.stringify({ error: "Invalid address" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const host = ip.split(":")[0];
    const port = ip.split(":")[1];
    // Only append port if explicitly specified - let APIs handle SRV lookup
    const address = port ? `${host}:${port}` : host;

    // Try mcsrvstat.us first (better SRV record support)
    try {
      const res = await fetch(`https://api.mcsrvstat.us/3/${address}`, {
        headers: { "Accept": "application/json" },
        signal: AbortSignal.timeout(10000),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.online) {
          return new Response(
            JSON.stringify({
              online: true,
              players: {
                online: data.players?.online ?? 0,
                max: data.players?.max ?? 0,
              },
              version: data.version || null,
              motd: data.motd?.clean?.[0] || null,
              icon: data.icon || null,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    } catch {
      // mcsrvstat.us failed, try fallback
    }

    // Fallback: mcstatus.io
    try {
      const res = await fetch(`https://api.mcstatus.io/v2/status/java/${address}`, {
        headers: { "Accept": "application/json" },
        signal: AbortSignal.timeout(10000),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.online) {
          return new Response(
            JSON.stringify({
              online: true,
              players: {
                online: data.players?.online ?? 0,
                max: data.players?.max ?? 0,
              },
              version: data.version?.name_clean || null,
              motd: data.motd?.clean || null,
              icon: data.icon || null,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    } catch {
      // fallback also failed
    }

    // Last resort: resolve SRV record via mcsrvstat debug and try direct TCP check
    // Some servers (especially Velocity proxies) don't respond to standard status pings
    // but are actually online and accepting connections
    try {
      // First try to get the real host:port from mcsrvstat (it resolves SRV records)
      let checkHost = host;
      let checkPort = port ? Number(port) : 25565;

      try {
        const srvRes = await fetch(`https://api.mcsrvstat.us/3/${address}`, {
          headers: { "Accept": "application/json" },
          signal: AbortSignal.timeout(5000),
        });
        if (srvRes.ok) {
          const srvData = await srvRes.json();
          if (srvData.ip) checkHost = srvData.ip;
          if (srvData.port) checkPort = srvData.port;
        }
      } catch {
        // ignore SRV resolution failure
      }

      // Try TCP connect to verify server is at least reachable
      const conn = await Deno.connect({
        hostname: checkHost,
        port: checkPort,
        transport: "tcp",
      });
      conn.close();

      // Port is open - server is running but doesn't respond to standard pings
      return new Response(
        JSON.stringify({
          online: true,
          players: { online: 0, max: 0 },
          version: null,
          motd: null,
          icon: null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch {
      // TCP connect also failed - server is truly offline
    }

    return new Response(
      JSON.stringify({ online: false, players: { online: 0, max: 0 } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch {
    return new Response(
      JSON.stringify({ online: false, players: { online: 0, max: 0 } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
