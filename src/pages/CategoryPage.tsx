import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import PageBreadcrumbs from "@/components/PageBreadcrumbs";
import { buildPageJsonLdGraph } from "@/lib/pageJsonLd";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Gamepad2 } from "lucide-react";

interface CategoryServer {
  id: string; slug: string | null; name: string; description: string | null; ip: string;
  version: string | null; platform: string[] | null; software: string | null;
  minigames: string[] | null; tags: string[] | null; images: string[] | null;
  likes_count: number | null; vote_count: number | null; max_players: number | null;
}
interface CategoryDefinition {
  title: string; shortTitle: string; description: string; intro: string;
  guideTitle: string; guide: string; match: (server: CategoryServer) => boolean; filter?: string;
}
const contains = (values: string[] | null | undefined, terms: string[]) =>
  (values ?? []).some((value) => terms.includes(value.trim().toLocaleLowerCase("sk")));

const categories: Record<string, CategoryDefinition> = {
  survival: {
    title: "Minecraft Survival servery", shortTitle: "Survival",
    description: "Nájdi Minecraft Survival servery na MCServery. Porovnaj slovenské a české servery, verzie Minecraftu, Java a Bedrock a vyber si svet na hranie.",
    intro: "Hľadáš Minecraft Survival server, na ktorom môžeš budovať, objavovať svet a hrať s komunitou? Prezri si aktuálny výber serverov a porovnaj ich verzie, edície aj herné režimy.",
    guideTitle: "Ako si vybrať Survival server",
    guide: "Pri výbere si skontroluj, či server používa klasický alebo upravený survival, či povoľuje PvP, či má ekonomiku a ochranu pozemkov. Dôležitá je aj aktivita komunity, pravidlá a kompatibilita tvojej Minecraft verzie. Ak hráš s kamarátmi na Bedrocku, over si podporu Bedrock alebo cross-play.",
    match: (s) => contains(s.minigames, ["survival", "vanilla survival"]) || contains(s.tags, ["survival", "vanilla survival"]), filter: "Survival",
  },
  skyblock: {
    title: "Minecraft SkyBlock servery", shortTitle: "SkyBlock",
    description: "Objav Minecraft SkyBlock servery. Začni na malom ostrove, rozvíjaj svoju ekonomiku a porovnaj herné možnosti slovenských a českých serverov.",
    intro: "SkyBlock začína na malom ostrove s obmedzenými zdrojmi. Postupne rozširuješ svoju základňu, plníš výzvy a buduješ ekonomiku. Tu nájdeš Minecraft servery, ktoré majú SkyBlock uvedený medzi svojimi režimami alebo tagmi.",
    guideTitle: "Čo sledovať pri výbere SkyBlock servera",
    guide: "Pozri sa na systém ostrovov, úlohy, obchodovanie, upgrady a sezónne reštarty. Niektoré servery ponúkajú klasický SkyBlock, iné pridávajú vlastné predmety a RPG prvky. Pred pripojením si over podporovanú verziu Minecraftu a či môžeš hrať na Java alebo Bedrock edícii.",
    match: (s) => contains(s.minigames, ["skyblock"]) || contains(s.tags, ["skyblock"]), filter: "SkyBlock",
  },
  bedwars: {
    title: "Minecraft BedWars servery", shortTitle: "BedWars",
    description: "Nájdi Minecraft BedWars servery a zahraj si tímové PvP. Porovnaj dostupné servery, podporované verzie a Java alebo Bedrock edíciu.",
    intro: "V BedWars chrániš posteľ svojho tímu, zbieraš suroviny a snažíš sa zničiť postele súperov. Vyber si server, na ktorom si zahráš rýchle tímové zápasy s ostatnými hráčmi.",
    guideTitle: "Ako vybrať BedWars server",
    guide: "Dôležitá je rýchlosť matchmakingu, počet máp, vyváženie tímov a stabilita servera. Skontroluj tiež, či server podporuje tvoju edíciu Minecraftu a verziu hry. Ak chceš hrať s kamarátmi, over si maximálnu veľkosť tímu a pravidlá pre party.",
    match: (s) => contains(s.minigames, ["bedwars"]) || contains(s.tags, ["bedwars"]), filter: "BedWars",
  },
  skywars: {
    title: "Minecraft SkyWars servery", shortTitle: "SkyWars",
    description: "Prezri si Minecraft SkyWars servery. Súťaž v PvP na ostrovoch, zbieraj výbavu a nájdi server kompatibilný s tvojou verziou Minecraftu.",
    intro: "SkyWars je PvP režim, v ktorom hráči začínajú na samostatných ostrovoch a bojujú o víťazstvo. Prezri si servery s týmto režimom a vyber si miesto na ďalší zápas.",
    guideTitle: "Na čo sa zamerať pri SkyWars",
    guide: "Skontroluj ponuku máp, sólové a tímové režimy, systém odmien a rýchlosť pripájania do zápasov. Rozdiely môžu byť aj v nastavení lootovania a tempe hry. Pred pripojením si over podporovanú verziu a edíciu Minecraftu.",
    match: (s) => contains(s.minigames, ["skywars"]) || contains(s.tags, ["skywars"]), filter: "SkyWars",
  },
  pvp: {
    title: "Minecraft PvP servery", shortTitle: "PvP",
    description: "Nájdi Minecraft PvP servery pre duely, KitPvP a súťažné súboje. Porovnaj herné režimy, verzie a dostupné edície na MCServery.",
    intro: "Chceš si zmerať schopnosti v súbojoch? Minecraft PvP servery ponúkajú duely, KitPvP, UHC aj ďalšie režimy, v ktorých rozhodujú reflexy, taktika a výbava.",
    guideTitle: "Vyber si PvP režim",
    guide: "KitPvP ponúka rýchle súboje s pripravenou výbavou, Duels stavia hráčov proti sebe v oddelených zápasoch a UHC pridáva dôraz na prežitie a prípravu. Pri výbere sleduj pravidlá, dostupné arény, ochranu pred cheatmi a odozvu servera.",
    match: (s) => contains(s.minigames, ["pvp", "kitpvp", "duels", "uhc", "the pit"]) || contains(s.tags, ["pvp", "kitpvp", "duels"]),
  },
  smp: {
    title: "Minecraft SMP servery", shortTitle: "SMP",
    description: "Objav Minecraft SMP servery pre spoločné survival hranie. Nájdi komunitný svet, pozri si podporované verzie a vyber si server pre seba a kamarátov.",
    intro: "SMP (Survival Multiplayer) je spoločný survival svet, v ktorom hráči stavajú, obchodujú a vytvárajú komunitu. Táto kategória zobrazuje servery, ktoré majú SMP uvedené vo svojich tagoch alebo herných režimoch.",
    guideTitle: "Čo očakávať od SMP servera",
    guide: "Každé SMP má vlastné pravidlá. Niektoré sa držia vanilla Minecraftu, iné používajú pluginy, ekonomiku alebo ochranu stavieb. Pred pripojením si prečítaj pravidlá, zisti, či je povolené PvP a či server pravidelne nemaže alebo nereštartuje svet.",
    match: (s) => contains(s.minigames, ["smp"]) || contains(s.tags, ["smp"]),
  },
};

const CategoryPage = () => {
  const { category: slug = "" } = useParams();
  const category = categories[slug];
  const [servers, setServers] = useState<CategoryServer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data, error } = await supabase.from("servers")
        .select("id,slug,name,description,ip,version,platform,software,minigames,tags,images,likes_count,vote_count,max_players")
        .order("vote_count", { ascending: false }).limit(5000);
      if (!cancelled) {
        if (!error && data) setServers(data as CategoryServer[]);
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const matchingServers = useMemo(() => category ? servers.filter(category.match) : [], [servers, category]);

  if (!category) {
    return <div className="min-h-screen flex flex-col bg-background">
      <SEO title="Kategória sa nenašla | MCServery" description="Požadovaná kategória Minecraft serverov neexistuje." path={`/minecraft-servery/${slug}`} noindex />
      <Header />
      <main className="container mx-auto flex-1 px-4 py-16">
        <h1 className="font-display text-3xl font-bold">Kategória sa nenašla</h1>
        <Link to="/servers" className="mt-4 inline-flex items-center gap-2 text-primary">Prejsť na všetky servery <ArrowRight className="h-4 w-4" /></Link>
      </main>
      <Footer />
    </div>;
  }

  const path = `/minecraft-servery/${slug}`;
  const description = category.description;
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO title={`${category.title} | MCServery`} description={description} path={path}
        jsonLd={buildPageJsonLdGraph({ name: category.title, description, path, pageType: "CollectionPage", breadcrumbs: [["Servery", "/servers"], [category.shortTitle, path]] })} />
      <Header />
      <main className="container mx-auto flex-1 px-4 py-10">
        <PageBreadcrumbs items={[["Servery", "/servers"], [category.shortTitle, path]]} />
        <section className="mb-10 max-w-4xl">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-primary"><Gamepad2 className="h-4 w-4" /> Minecraft servery</div>
          <h1 className="mb-4 font-display text-4xl font-bold text-foreground md:text-5xl">{category.title}</h1>
          <p className="text-lg leading-relaxed text-muted-foreground">{category.intro}</p>
        </section>
        <section aria-labelledby="category-servers-heading" className="mb-12">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="category-servers-heading" className="font-display text-2xl font-bold text-foreground">Servery v kategórii {category.shortTitle}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{loading ? "Načítavam servery…" : `${matchingServers.length} ${matchingServers.length === 1 ? "server" : "serverov"} v tejto kategórii`}</p>
            </div>
            <Link to={category.filter ? `/servers?minigame=${encodeURIComponent(category.filter)}` : "/servers"} className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">Zobraziť filtre <ArrowRight className="h-4 w-4" /></Link>
          </div>
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Načítavam servery">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 animate-pulse rounded-lg border border-border bg-secondary/50" />)}
            </div>
          ) : matchingServers.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {matchingServers.map((server) => (
                <Link key={server.id} to={server.slug ? `/server/${server.slug}` : "/servers"} className="group rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/50">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <h3 className="font-display text-xl font-bold text-foreground group-hover:text-primary">{server.name}</h3>
                    <span className="shrink-0 rounded bg-secondary px-2 py-1 text-xs text-muted-foreground">{server.version || "Minecraft"}</span>
                  </div>
                  <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{server.description || `Minecraft server v kategórii ${category.shortTitle}.`}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {(server.platform ?? []).map((platform) => <span key={platform} className="rounded bg-secondary px-2 py-1">{platform}</span>)}
                    {server.software && <span className="rounded bg-secondary px-2 py-1">{server.software}</span>}
                  </div>
                  <p className="mt-4 truncate border-t border-border pt-3 font-mono text-xs text-muted-foreground">{server.ip}</p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card p-6 text-muted-foreground">Momentálne tu nie sú žiadne servery. Pozri si <Link to="/servers" className="text-primary hover:underline">všetky Minecraft servery</Link> alebo sa sem vráť neskôr.</div>
          )}
        </section>
        <section className="mb-12 max-w-4xl">
          <h2 className="mb-3 font-display text-2xl font-bold text-foreground">{category.guideTitle}</h2>
          <p className="leading-relaxed text-muted-foreground">{category.guide}</p>
        </section>
        <section className="border-t border-border pt-8">
          <h2 className="mb-4 font-display text-2xl font-bold text-foreground">Ďalšie Minecraft kategórie</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(categories).filter(([key]) => key !== slug).map(([key, item]) => (
              <Link key={key} to={`/minecraft-servery/${key}`} className="rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary">{item.shortTitle}</Link>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};
export default CategoryPage;
