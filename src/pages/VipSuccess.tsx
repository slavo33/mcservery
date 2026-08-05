import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";

const VipSuccess = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (!sessionId || !user) return;

    const verify = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("verify-vip-payment", {
          body: { session_id: sessionId },
        });
        if (error || data?.error) {
          setStatus("error");
        } else {
          setStatus("success");
        }
      } catch {
        setStatus("error");
      }
    };
    verify();
  }, [searchParams, user]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
    <SEO title="VIP aktivované | MCServery" description="Potvrdenie VIP nákupu na MCServery." path="/vip-success" noindex />
      <Header />
      <main className="flex-1 container mx-auto px-4 py-20 text-center">
        {status === "verifying" && (
          <div>
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
            <p className="text-muted-foreground">{t("vip_verifying")}</p>
          </div>
        )}
        {status === "success" && (
          <div>
            <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">{t("vip_success_title")}</h1>
            <p className="text-muted-foreground mb-6">{t("vip_success_desc")}</p>
            <Link to="/">
              <Button className="gradient-primary border-0 font-display font-semibold">
                {t("nav_home")} <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        )}
        {status === "error" && (
          <div>
            <p className="text-destructive font-display text-xl font-bold mb-4">{t("vip_error")}</p>
            <Link to="/vip">
              <Button variant="outline">{t("vip_try_again")}</Button>
            </Link>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default VipSuccess;
