import { useState, useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ServerCard from "@/components/ServerCard";
import ServerFilters from "@/components/ServerFilters";
import { mockServers } from "@/lib/mockData";

const Servers = () => {
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState("");
  const [version, setVersion] = useState("");
  const [software, setSoftware] = useState("");

  const filtered = useMemo(() => {
    return mockServers.filter((s) => {
      if (search) {
        const q = search.toLowerCase();
        if (!s.name.toLowerCase().includes(q) && !s.ip.toLowerCase().includes(q)) return false;
      }
      if (platform) {
        const p = platform.toLowerCase() as "java" | "bedrock";
        if (!s.platform.includes(p)) return false;
      }
      if (version && s.version !== version) return false;
      if (software && s.software !== software) return false;
      return true;
    });
  }, [search, platform, version, software]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-10">
        <h1 className="font-display text-4xl font-bold text-foreground mb-2">
          Všetky <span className="text-gradient">servery</span>
        </h1>
        <p className="text-muted-foreground mb-8">Prehľadaj a filtruj Minecraft servery</p>

        <ServerFilters
          search={search}
          onSearchChange={setSearch}
          selectedPlatform={platform}
          onPlatformChange={setPlatform}
          selectedVersion={version}
          onVersionChange={setVersion}
          selectedSoftware={software}
          onSoftwareChange={setSoftware}
        />

        {filtered.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((server) => (
              <ServerCard key={server.id} server={server} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-muted-foreground font-display text-xl">Žiadne servery nenájdené</p>
            <p className="text-sm text-muted-foreground mt-2">Skús zmeniť filtre alebo hľadaný výraz</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Servers;
