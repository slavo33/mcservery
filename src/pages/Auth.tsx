import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { toast } from "sonner";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Úspešne prihlásený!");
        navigate("/");
      }
    } else {
      if (!nickname.trim()) {
        toast.error("Zadaj prezývku");
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { nickname: nickname.trim() },
        },
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Registrácia úspešná! Skontroluj email na potvrdenie.");
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md gradient-card rounded-lg border border-border shadow-card p-8">
          <h1 className="font-display text-3xl font-bold text-foreground text-center mb-2">
            {isLogin ? "Prihlásenie" : "Registrácia"}
          </h1>
          <p className="text-sm text-muted-foreground text-center mb-6">
            {isLogin ? "Vitaj späť, hráč!" : "Vytvor si účet a zdieľaj servery"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Prezývka</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="SteveMinecraft"
                  className="w-full rounded-md border border-border bg-secondary/50 py-2.5 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  required={!isLogin}
                  maxLength={30}
                />
              </div>
            )}
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="hrac@minecraft.sk"
                className="w-full rounded-md border border-border bg-secondary/50 py-2.5 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                required
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Heslo</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-md border border-border bg-secondary/50 py-2.5 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                required
                minLength={6}
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full gradient-primary border-0 font-display text-base font-semibold tracking-wide text-primary-foreground glow-red"
              size="lg"
            >
              {loading ? "Načítavam..." : isLogin ? "Prihlásiť sa" : "Vytvoriť účet"}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground text-center mt-6">
            {isLogin ? "Nemáš účet?" : "Už máš účet?"}{" "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline font-medium"
            >
              {isLogin ? "Zaregistruj sa" : "Prihlás sa"}
            </button>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Auth;
