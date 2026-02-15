import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import ServerCard from "@/components/ServerCard";
import { mockServers } from "@/lib/mockData";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = () => {
  const featured = mockServers.filter((s) => s.isOnline).slice(0, 3);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        <HeroSection />

        {/* Featured servers */}
        <section className="container mx-auto px-4 py-16">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="font-display text-3xl font-bold text-foreground">
                Populárne <span className="text-gradient">servery</span>
              </h2>
              <p className="text-sm text-muted-foreground mt-1">Najobľúbenejšie servery v našom katalógu</p>
            </div>
            <Link to="/servers">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground gap-1">
                Všetky servery <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((server) => (
              <ServerCard key={server.id} server={server} />
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
