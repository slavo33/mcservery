import { Gamepad2 } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container mx-auto px-4 py-10">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <Link to="/" className="flex items-center gap-2 mb-3">
              <Gamepad2 className="h-6 w-6 text-primary" />
              <span className="font-display text-lg font-bold tracking-wider text-foreground">
                MC<span className="text-gradient">Servery</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              Najväčší katalóg Minecraft serverov. Nájdi svoj ideálny server alebo zdieľaj ten svoj.
            </p>
          </div>

          <div>
            <h4 className="font-display text-sm font-semibold uppercase tracking-wider text-foreground mb-3">
              Navigácia
            </h4>
            <nav className="flex flex-col gap-2">
              <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Domov</Link>
              <Link to="/servers" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Servery</Link>
              <Link to="/add-server" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pridať server</Link>
            </nav>
          </div>

          <div>
            <h4 className="font-display text-sm font-semibold uppercase tracking-wider text-foreground mb-3">
              Právne
            </h4>
            <nav className="flex flex-col gap-2">
              <span className="text-sm text-muted-foreground">Podmienky používania</span>
              <span className="text-sm text-muted-foreground">Ochrana súkromia</span>
            </nav>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} MCServery. Všetky práva vyhradené. Nie sme spojení s Mojang Studios.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
