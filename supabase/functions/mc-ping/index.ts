import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ip } = await req.json();
    if (!ip) {
      return new Response(JSON.stringify({ error: "IP required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const host = ip.split(":")[0];
    const port = ip.split(":")[1] || "25565";
    const address = `${host}:${port}`;

    // Try mcstatus.io first (handles SRV records, more reliable)
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
      // mcstatus.io failed, try fallback
    }

    // Fallback: mcsrvstat.us
    try {
      const res = await fetch(`https://api.mcsrvstat.us/3/${address}`, {
        headers: { "Accept": "application/json" },
        signal: AbortSignal.timeout(10000),
      });

      if (res.ok) {
        const data = await res.json();
        return new Response(
          JSON.stringify({
            online: data.online || false,
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
    } catch {
      // fallback also failed
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
