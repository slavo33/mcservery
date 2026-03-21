import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Missing API key" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Validate API key
  const { data: connection } = await supabase
    .from("chat_connections")
    .select("id, server_id, is_active")
    .eq("api_key", apiKey)
    .single();

  if (!connection || !connection.is_active) {
    return new Response(JSON.stringify({ error: "Invalid or inactive API key" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { action } = body;

  // Plugin sends a chat message from a player
  if (action === "chat") {
    const { player_name, message } = body;
    if (!player_name || !message || typeof message !== "string" || message.length > 500) {
      return new Response(JSON.stringify({ error: "Invalid chat data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("chat_messages").insert({
      server_id: connection.server_id,
      player_name: String(player_name).slice(0, 32),
      source: "minecraft",
      message: String(message).slice(0, 500),
    });

    // Cleanup old messages (keep last 500 per server)
    const { data: oldMessages } = await supabase
      .from("chat_messages")
      .select("id")
      .eq("server_id", connection.server_id)
      .order("created_at", { ascending: false })
      .range(500, 1000);

    if (oldMessages && oldMessages.length > 0) {
      await supabase
        .from("chat_messages")
        .delete()
        .in("id", oldMessages.map((m: any) => m.id));
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Plugin syncs current player list
  if (action === "players") {
    const { players } = body; // [{name: string, uuid?: string}]
    if (!Array.isArray(players)) {
      return new Response(JSON.stringify({ error: "Invalid players data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clear current players and insert new list
    await supabase
      .from("chat_online_players")
      .delete()
      .eq("server_id", connection.server_id);

    if (players.length > 0) {
      const validPlayers = players.slice(0, 200).map((p: any) => ({
        server_id: connection.server_id,
        player_name: String(p.name).slice(0, 32),
        player_uuid: p.uuid ? String(p.uuid).slice(0, 36) : null,
      }));

      await supabase.from("chat_online_players").insert(validPlayers);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Plugin fetches pending web messages to broadcast in-game
  if (action === "fetch") {
    const { data: messages } = await supabase
      .from("chat_messages")
      .select("id, message, user_id")
      .eq("server_id", connection.server_id)
      .eq("source", "web")
      .eq("delivered", false)
      .order("created_at", { ascending: true })
      .limit(50);

    if (messages && messages.length > 0) {
      const userIds = [...new Set(messages.map((m: any) => m.user_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, nickname")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map((p: any) => [p.id, p.nickname]) || []);

      await supabase
        .from("chat_messages")
        .update({ delivered: true })
        .in("id", messages.map((m: any) => m.id));

      return new Response(
        JSON.stringify({
          messages: messages.map((m: any) => ({
            id: m.id,
            message: m.message,
            sender: profileMap.get(m.user_id) || "Web",
          })),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ messages: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Unknown action" }), {
    status: 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
