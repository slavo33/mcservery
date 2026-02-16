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

    // Use mcsrvstat.us API for server status
    const host = ip.split(":")[0];
    const port = ip.split(":")[1] || "25565";
    
    const response = await fetch(`https://api.mcsrvstat.us/3/${host}:${port}`, {
      headers: { "Accept": "application/json" },
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ online: false, players: { online: 0, max: 0 } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();

    return new Response(
      JSON.stringify({
        online: data.online || false,
        players: {
          online: data.players?.online || 0,
          max: data.players?.max || 0,
        },
        version: data.version || null,
        motd: data.motd?.clean?.[0] || null,
        icon: data.icon || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ online: false, players: { online: 0, max: 0 } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
