import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { buildPageJsonLdGraph } from "@/lib/pageJsonLd";
import { useLanguage } from "@/i18n/LanguageContext";

const Privacy = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Ochrana súkromia | MCServery"
        description="Zásady ochrany osobných údajov služby MCServery. Zisti, ako spracúvame a chránime tvoje údaje pri používaní databázy Minecraft serverov."
        path="/privacy"
        jsonLd={buildPageJsonLdGraph({
          name: "Ochrana súkromia",
          description: "Zásady ochrany osobných údajov služby MCServery.",
          path: "/privacy",
          breadcrumbs: [["Ochrana súkromia", "/privacy"]],
        })}
      />
      <Header />
      <main className="flex-1 container mx-auto px-4 py-16 max-w-3xl">
        <h1 className="font-display text-4xl font-bold text-foreground mb-8">{t("footer_privacy")}</h1>
        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-xl font-display font-bold text-foreground mb-3">{t("privacy_section_1_title")}</h2>
            <p>{t("privacy_section_1_text")}</p>
          </section>
          <section>
            <h2 className="text-xl font-display font-bold text-foreground mb-3">{t("privacy_section_2_title")}</h2>
            <p>{t("privacy_section_2_text")}</p>
          </section>
          <section>
            <h2 className="text-xl font-display font-bold text-foreground mb-3">{t("privacy_section_3_title")}</h2>
            <p>{t("privacy_section_3_text")}</p>
          </section>
          <section>
            <h2 className="text-xl font-display font-bold text-foreground mb-3">{t("privacy_section_4_title")}</h2>
            <p>{t("privacy_section_4_text")}</p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Privacy;
