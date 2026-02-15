import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { softwareOptions, versions, minigameOptions } from "@/lib/mockData";
import { useState } from "react";
import { Plus, Upload } from "lucide-react";

const AddServer = () => {
  const [selectedPlatform, setSelectedPlatform] = useState<string[]>([]);
  const [selectedMinigames, setSelectedMinigames] = useState<string[]>([]);

  const togglePlatform = (p: string) =>
    setSelectedPlatform((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );

  const toggleMinigame = (m: string) =>
    setSelectedMinigames((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-10 max-w-2xl">
        <h1 className="font-display text-4xl font-bold text-foreground mb-2">
          Pridať <span className="text-gradient">server</span>
        </h1>
        <p className="text-muted-foreground mb-8">Zdieľaj svoj Minecraft server s komunitou</p>

        <div className="gradient-card rounded-lg border border-border shadow-card p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="text-sm font-semibold text-foreground mb-1.5 block">Názov servera</label>
            <input
              type="text"
              placeholder="MôjServer"
              className="w-full rounded-md border border-border bg-secondary/50 py-2.5 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>

          {/* IP */}
          <div>
            <label className="text-sm font-semibold text-foreground mb-1.5 block">IP adresa</label>
            <input
              type="text"
              placeholder="play.mojserver.sk"
              className="w-full rounded-md border border-border bg-secondary/50 py-2.5 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-semibold text-foreground mb-1.5 block">Popis</label>
            <textarea
              rows={4}
              placeholder="Opíš svoj server..."
              className="w-full rounded-md border border-border bg-secondary/50 py-2.5 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
            />
          </div>

          {/* Platform */}
          <div>
            <label className="text-sm font-semibold text-foreground mb-2 block">Platforma</label>
            <div className="flex gap-2">
              {["Java", "Bedrock"].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePlatform(p)}
                  className={`filter-chip ${selectedPlatform.includes(p) ? "active" : ""}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Version + Software */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Verzia</label>
              <select className="w-full rounded-md border border-border bg-secondary/50 py-2.5 px-3 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30">
                <option value="">Vyber verziu</option>
                {versions.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Software</label>
              <select className="w-full rounded-md border border-border bg-secondary/50 py-2.5 px-3 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30">
                <option value="">Vyber software</option>
                {softwareOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Proxy */}
          <div>
            <label className="text-sm font-semibold text-foreground mb-1.5 block">Proxy</label>
            <select className="w-full rounded-md border border-border bg-secondary/50 py-2.5 px-3 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30">
              <option value="">Žiadny</option>
              <option value="BungeeCord">BungeeCord</option>
              <option value="Velocity">Velocity</option>
              <option value="Waterfall">Waterfall</option>
            </select>
          </div>

          {/* Minigames */}
          <div>
            <label className="text-sm font-semibold text-foreground mb-2 block">Minihry</label>
            <div className="flex flex-wrap gap-1.5">
              {minigameOptions.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleMinigame(m)}
                  className={`filter-chip ${selectedMinigames.includes(m) ? "active" : ""}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Images */}
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

          <Button className="w-full gradient-primary border-0 font-display text-base font-semibold tracking-wide text-primary-foreground glow-red gap-2" size="lg">
            <Plus className="h-4 w-4" />
            Pridať server
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AddServer;
