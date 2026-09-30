import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-lovable-aig-run-id",
  "Access-Control-Expose-Headers": "x-lovable-aig-run-id",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const LOVABLE_IP = "185.158.133.1";
const OLD_IP = "46.30.211.38";
const ALLOWED_NAMES = ["mcservery.one", "www.mcservery.one", "_lovable.mcservery.one"];

async function doh(name: string, type: "A" | "TXT") {
  const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`, {
    headers: { accept: "application/dns-json" },
  });
  if (!r.ok) return [];
  const d = await r.json();
  const code = type === "A" ? 1 : 16;
  return ((d.Answer ?? []) as { type: number; data: string; TTL: number }[])
    .filter((a) => a.type === code)
    .map((a) => ({ value: a.data.replace(/^"|"$/g, ""), ttl: a.TTL }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return json({ error: "unauthorized" }, 401);
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));

    if (body.action === "lookup") {
      const results = await Promise.all(
        ALLOWED_NAMES.map(async (name) => ({
          name,
          a: name.startsWith("_") ? [] : await doh(name, "A"),
          txt: await doh(name, "TXT"),
        })),
      );
      return json({ results, lovableIp: LOVABLE_IP, oldIp: OLD_IP, checkedAt: new Date().toISOString() });
    }

    if (body.action === "analyze") {
      const records = String(body.records ?? "").slice(0, 8000);
      if (!records.trim()) return json({ error: "empty_records" }, 400);
      const apiKey = Deno.env.get("LOVABLE_API_KEY");
      if (!apiKey) return json({ error: "ai_not_configured" }, 500);

      const instructions = `Si expert na DNS a HTTPS. Web je hostovaný na Lovable. Správne nastavenie:
- A záznam @ (koreňová doména) -> ${LOVABLE_IP}
- A záznam www -> ${LOVABLE_IP}
- TXT záznam _lovable -> lovable_verify=... (overovací kód)
- Nesmú existovať iné A/AAAA záznamy pre @ alebo www (napr. stará IP ${OLD_IP}), ani CNAME kolidujúci s A záznamom.
- CAA záznamy, ak existujú, musia povoliť letsencrypt.org.
Analyzuj záznamy od používateľa. Odpovedz po slovensky v Markdowne: 1) Verdikt (✅ správne / ⚠️ čiastočne / ❌ nesprávne), 2) Zistené problémy, 3) Presné kroky opravy (Host name / Type / Value). Buď stručný, max 250 slov.`;

      const runId = req.headers.get("x-lovable-aig-run-id") ?? undefined;
      const upstream = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
        method: "POST",
        signal: req.signal,
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": apiKey,
          "X-Lovable-AIG-SDK": "fetch",
          ...(runId ? { "X-Lovable-AIG-Run-ID": runId } : {}),
        },
        body: JSON.stringify({
          model: "openai/gpt-6-astra",
          instructions,
          input: `DNS záznamy:\n${records}`,
          stream: true,
          store: false,
          reasoning: { effort: "low", summary: "auto" },
          include: ["reasoning.encrypted_content"],
        }),
      });
      const headers = new Headers(corsHeaders);
      const rid = upstream.headers.get("X-Lovable-AIG-Run-ID");
      if (rid) headers.set("X-Lovable-AIG-Run-ID", rid);
      if (!upstream.ok) {
        const text = await upstream.text();
        let message = text;
        try { message = JSON.parse(text)?.error?.message ?? JSON.parse(text)?.message ?? text; } catch { /* keep */ }
        headers.set("Content-Type", "application/json");
        return new Response(JSON.stringify({ error: message.slice(0, 500) }), { status: upstream.status, headers });
      }
      headers.set("Content-Type", "text/event-stream");
      return new Response(upstream.body, { status: 200, headers });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    if (req.signal.aborted) return new Response(null, { status: 499 });
    return json({ error: e instanceof Error ? e.message : "error" }, 500);
  }
});
