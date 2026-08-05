import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import PageBreadcrumbs from "@/components/PageBreadcrumbs";
import { buildPageJsonLdGraph } from "@/lib/pageJsonLd";
import { useLanguage } from "@/i18n/LanguageContext";

const Terms = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Podmienky používania | MCServery"
        description="Podmienky používania služby MCServery — databázy Minecraft serverov. Prečítaj si pravidlá pre pridávanie serverov a používanie platformy."
        path="/terms"
        jsonLd={buildPageJsonLdGraph({
          name: "Podmienky používania",
          description:
            "Podmienky používania služby MCServery — databázy Minecraft serverov. Prečítaj si pravidlá pre pridávanie serverov a používanie platformy.",
          path: "/terms",
          breadcrumbs: [["Podmienky používania", "/terms"]],
        })}
      />
      <Header />
      <main className="flex-1 container mx-auto px-4 py-16 max-w-3xl">
        <PageBreadcrumbs items={[["Podmienky používania", "/terms"]]} />
        <h1 className="font-display text-4xl font-bold text-foreground mb-8">{t("footer_terms")}</h1>
        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-xl font-display font-bold text-foreground mb-3">{t("terms_section_1_title")}</h2>
            <p>{t("terms_section_1_text")}</p>
          </section>
          <section>
            <h2 className="text-xl font-display font-bold text-foreground mb-3">{t("terms_section_2_title")}</h2>
            <p>{t("terms_section_2_text")}</p>
          </section>
          <section>
            <h2 className="text-xl font-display font-bold text-foreground mb-3">{t("terms_section_3_title")}</h2>
            <p>{t("terms_section_3_text")}</p>
          </section>
          <section>
            <h2 className="text-xl font-display font-bold text-foreground mb-3">{t("terms_section_4_title")}</h2>
            <p>{t("terms_section_4_text")}</p>
          </section>
          <section>
            <h2 className="text-xl font-display font-bold text-foreground mb-3">{t("terms_section_5_title")}</h2>
            <p>{t("terms_section_5_text")}</p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Terms;
