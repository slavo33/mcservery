import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Globe, RefreshCw, AlertTriangle, CheckCircle2, Sparkles, Loader2 } from "lucide-react";

type Rec = { value: string; ttl: number };
type Lookup = {
  results: { name: string; a: Rec[]; txt: Rec[] }[];
  lovableIp: string;
  oldIp: string;
  checkedAt: string;
};

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dns-admin`;

const DnsCheckAdmin = () => {
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const runLookup = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.functions.invoke("dns-admin", { body: { action: "lookup" } });
    if (error || data?.error) setError(data?.error ?? error?.message ?? "Chyba");
    else setLookup(data);
    setLoading(false);
  };

  const fillFromLookup = () => {
    if (!lookup) return;
    const lines: string[] = [];
    lookup.results.forEach((r) => {
      const host = r.name === "mcservery.one" ? "@" : r.name.replace(".mcservery.one", "");
      r.a.forEach((a) => lines.push(`${host}  A  ${a.value}  TTL ${a.ttl}`));
      r.txt.forEach((t) => lines.push(`${host}  TXT  ${t.value}`));
    });
    setRecords(lines.join("\n"));
  };

  const analyze = async () => {
    setAnalyzing(true);
    setAnalysis("");
    setAiError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(FN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ action: "analyze", records }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        const msg =
          res.status === 402 ? "Nedostatok AI kreditov. Doplň ich v nastaveniach workspace." :
          res.status === 429 ? "Príliš veľa požiadaviek, skús o chvíľu." :
          j.error ?? `Chyba ${res.status}`;
        setAiError(msg);
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const ev = JSON.parse(payload);
            if (ev.type === "response.output_text.delta") setAnalysis((p) => p + ev.delta);
            else if (ev.type === "response.failed" || ev.type === "error")
              setAiError(ev.response?.error?.message ?? ev.message ?? "AI analýza zlyhala");
          } catch { /* partial */ }
        }
      }
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Chyba");
    } finally {
      setAnalyzing(false);
    }
  };

  const apex = lookup?.results.find((r) => r.name === "mcservery.one");
  const www = lookup?.results.find((r) => r.name === "www.mcservery.one");
  const hasOld = lookup?.results.some((r) => r.a.some((a) => a.value === lookup.oldIp));
  const wrongAny = [apex, www].some((r) => r && (r.a.length === 0 || r.a.some((a) => a.value !== lookup!.lovableIp)));

  return (
    <section className="mt-10 rounded-lg border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
          <Globe className="h-5 w-5 text-primary" /> Kontrola DNS – mcservery.one
        </h2>
        <Button size="sm" onClick={runLookup} disabled={loading} className="gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Skontrolovať
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {lookup && (
        <>
          {hasOld ? (
            <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              Doména stále smeruje na starú IP {lookup.oldIp}. Zmeň A záznamy na {lookup.lovableIp} a odstráň staré.
            </div>
          ) : wrongAny ? (
            <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              Niektoré A záznamy nesmerujú na {lookup.lovableIp}.
            </div>
          ) : (
            <div className="mb-4 flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 p-3 text-sm text-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" /> A záznamy smerujú správne na {lookup.lovableIp}.
            </div>
          )}

          <div className="space-y-3">
            {lookup.results.map((r) => (
              <div key={r.name} className="rounded-md bg-muted/40 p-3 text-sm">
                <p className="mb-1 font-semibold text-foreground">{r.name}</p>
                {!r.name.startsWith("_") && (
                  <p className="text-muted-foreground">
                    A:{" "}
                    {r.a.length === 0 ? <span className="text-destructive">žiadny</span> : r.a.map((a) => (
                      <span key={a.value} className={`mr-2 font-mono ${a.value === lookup.lovableIp ? "text-primary" : "text-destructive"}`}>
                        {a.value}
                      </span>
                    ))}
                  </p>
                )}
                <p className="break-all text-muted-foreground">
                  TXT: {r.txt.length === 0 ? "—" : r.txt.map((t) => <span key={t.value} className="mr-2 font-mono">{t.value}</span>)}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Overené: {new Date(lookup.checkedAt).toLocaleString()}</p>
        </>
      )}

      <div className="mt-6 border-t border-border pt-5">
        <h3 className="mb-2 flex items-center gap-2 font-semibold text-foreground">
          <Sparkles className="h-4 w-4 text-primary" /> AI analýza DNS pre HTTPS
        </h3>
        <p className="mb-2 text-sm text-muted-foreground">Vlož DNS záznamy (napr. skopírované od registrátora) a AI posúdi, či sú správne.</p>
        <Textarea
          value={records}
          onChange={(e) => setRecords(e.target.value)}
          rows={6}
          placeholder={"@  A  185.158.133.1\nwww  A  185.158.133.1\n_lovable  TXT  lovable_verify=..."}
          className="font-mono text-xs"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <Button size="sm" onClick={analyze} disabled={analyzing || !records.trim()} className="gap-1.5">
            {analyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Analyzovať
          </Button>
          {lookup && <Button size="sm" variant="secondary" onClick={fillFromLookup}>Vložiť aktuálne záznamy</Button>}
        </div>
        {aiError && <p className="mt-3 text-sm text-destructive">{aiError}</p>}
        {analysis && (
          <div className="mt-3 whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm text-foreground">{analysis}</div>
        )}
      </div>
    </section>
  );
};

export default DnsCheckAdmin;
