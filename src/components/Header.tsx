import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { label: "Domov", to: "/" },
    { label: "Servery", to: "/servers" },
    { label: "Pridať server", to: "/add-server" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 group">
          <Gamepad2 className="h-7 w-7 text-primary transition-transform duration-300 group-hover:rotate-12" />
          <span className="font-display text-xl font-bold tracking-wider text-foreground">
            MC<span className="text-gradient">Servery</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
          <Button className="ml-4 gradient-primary border-0 font-display text-sm font-semibold tracking-wide text-primary-foreground">
            Prihlásiť sa
          </Button>
        </nav>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-foreground md:hidden"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="border-t border-border bg-background px-4 pb-4 md:hidden animate-slide-up">
          <nav className="flex flex-col gap-1 pt-2">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className="rounded-md px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
            <Button className="mt-2 gradient-primary border-0 font-display text-sm font-semibold tracking-wide text-primary-foreground">
              Prihlásiť sa
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
