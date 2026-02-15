import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { softwareOptions, versions, minigameOptions } from "@/lib/mockData";
import { useState } from "react";
import { Plus, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const AddServer = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [ip, setIp] = useState("");
  const [description, setDescription] = useState("");
  const [version, setVersion] = useState("");
  const [software, setSoftware] = useState("");
  const [proxy, setProxy] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<string[]>([]);
  const [selectedMinigames, setSelectedMinigames] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const togglePlatform = (p: string) =>
    setSelectedPlatform((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );

  const toggleMinigame = (m: string) =>
    setSelectedMinigames((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Musíš sa prihlásiť");
      navigate("/auth");
      return;
    }
    if (!name.trim() || !ip.trim()) {
      toast.error("Vyplň názov a IP adresu");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("servers").insert({
      owner_id: user.id,
      name: name.trim(),
      ip: ip.trim(),
      description: description.trim(),
      version: version || "1.20.4",
      software: software || "Paper",
      proxy: proxy || null,
      platform: selectedPlatform.map((p) => p.toLowerCase()),
      minigames: selectedMinigames,
      tags: selectedMinigames.slice(0, 5),
    });

    if (error) {
      toast.error("Chyba pri pridávaní servera: " + error.message);
    } else {
      toast.success("Server bol pridaný!");
      navigate("/servers");
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-10 max-w-2xl">
        <h1 className="font-display text-4xl font-bold text-foreground mb-2">
          Pridať <span className="text-gradient">server</span>
        </h1>
        <p className="text-muted-foreground mb-8">Zdieľaj svoj Minecraft server s komunitou</p>

        {!user && (
          <div className="gradient-card rounded-lg border border-border shadow-card p-6 text-center mb-6">
            <p className="text-muted-foreground mb-3">Na pridanie servera sa musíš prihlásiť</p>
            <Button onClick={() => navigate("/auth")} className="gradient-primary border-0 text-primary-foreground font-display">
              Prihlásiť sa
            </Button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="gradient-card rounded-lg border border-border shadow-card p-6 space-y-6">
          <div>
            <label className="text-sm font-semibold text-foreground mb-1.5 block">Názov servera *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="MôjServer" maxLength={50}
              className="w-full rounded-md border border-border bg-secondary/50 py-2.5 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30" required />
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground mb-1.5 block">IP adresa *</label>
            <input type="text" value={ip} onChange={(e) => setIp(e.target.value)} placeholder="play.mojserver.sk" maxLength={100}
              className="w-full rounded-md border border-border bg-secondary/50 py-2.5 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30" required />
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground mb-1.5 block">Popis</label>
            <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opíš svoj server..." maxLength={1000}
              className="w-full rounded-md border border-border bg-secondary/50 py-2.5 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none" />
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground mb-2 block">Platforma</label>
            <div className="flex gap-2">
              {["Java", "Bedrock"].map((p) => (
                <button key={p} type="button" onClick={() => togglePlatform(p)}
                  className={`filter-chip ${selectedPlatform.includes(p) ? "active" : ""}`}>{p}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Verzia</label>
              <select value={version} onChange={(e) => setVersion(e.target.value)}
                className="w-full rounded-md border border-border bg-secondary/50 py-2.5 px-3 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30">
                <option value="">Vyber verziu</option>
                {versions.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Software</label>
              <select value={software} onChange={(e) => setSoftware(e.target.value)}
                className="w-full rounded-md border border-border bg-secondary/50 py-2.5 px-3 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30">
                <option value="">Vyber software</option>
                {softwareOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground mb-1.5 block">Proxy</label>
            <select value={proxy} onChange={(e) => setProxy(e.target.value)}
              className="w-full rounded-md border border-border bg-secondary/50 py-2.5 px-3 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30">
              <option value="">Žiadny</option>
              <option value="BungeeCord">BungeeCord</option>
              <option value="Velocity">Velocity</option>
              <option value="Waterfall">Waterfall</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground mb-2 block">Minihry</label>
            <div className="flex flex-wrap gap-1.5">
              {minigameOptions.map((m) => (
                <button key={m} type="button" onClick={() => toggleMinigame(m)}
                  className={`filter-chip ${selectedMinigames.includes(m) ? "active" : ""}`}>{m}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground mb-2 block">Fotky / GIF</label>
            <div className="flex items-center justify-center rounded-md border-2 border-dashed border-border bg-secondary/30 py-10 cursor-pointer hover:border-primary/40 transition-colors">
              <div className="text-center">
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nahraj fotky alebo GIF zo servera</p>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG, GIF do 5MB</p>
              </div>
            </div>
          </div>

          <Button type="submit" disabled={submitting || !user}
            className="w-full gradient-primary border-0 font-display text-base font-semibold tracking-wide text-primary-foreground glow-red gap-2" size="lg">
            <Plus className="h-4 w-4" />
            {submitting ? "Pridávam..." : "Pridať server"}
          </Button>
        </form>
      </main>
      <Footer />
    </div>
  );
};

export default AddServer;
