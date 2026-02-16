import { Link } from "react-router-dom";
import { Search, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => {
  const { t } = useLanguage();
  const [serverCount, setServerCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      const { count } = await supabase
        .from("servers")
        .select("*", { count: "exact", head: true });
      if (count !== null) setServerCount(count);
    };
    fetchCount();
  }, []);

  return (
    <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
      <img src={heroBg} alt="Minecraft nether landscape" className="absolute inset-0 w-full h-full object-cover" loading="eager" />
      <div className="absolute inset-0 gradient-hero" />
      <div className="absolute inset-0" style={{ background: "var(--gradient-red-glow)" }} />

      <div className="relative z-10 container mx-auto px-4 text-center">
        <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight text-foreground mb-4 animate-slide-up">
          {t("hero_title_1")} <span className="text-gradient">{t("hero_title_2")}</span> server
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 animate-slide-up-delay-1">
          {t("hero_subtitle")}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 animate-slide-up-delay-2">
          <Link to="/servers">
            <Button size="lg" className="gradient-primary border-0 font-display text-base font-semibold tracking-wide text-primary-foreground gap-2 glow-red px-8">
              <Search className="h-4 w-4" />
              {t("hero_browse")}
            </Button>
          </Link>
          <Link to="/add-server">
            <Button size="lg" variant="outline" className="border-border text-foreground font-display text-base font-semibold tracking-wide gap-2 hover:bg-secondary px-8">
              {t("hero_add")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-3 gap-6 max-w-md mx-auto animate-slide-up-delay-3">
          {[
            { value: serverCount > 0 ? `${serverCount}` : "0", label: t("stat_servers") },
            { value: "24/7", label: t("stat_online") },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="font-display text-2xl md:text-3xl font-bold text-gradient">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
