/*
 * FC MOBILE 26 — App shell (ideas.md)
 * Glassmorphic: gold #FFD700, navy #0f0f1e, cyan #00d4ff. Fixed 80px glass navbar.
 * Tabs: Card Creator | Squad Builder | Pack Opener | Compare | OVR Calc | News
 */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import { useEffect, useState } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Navbar from "./components/Navbar";
import CardCreator from "./pages/CardCreator";
import SquadBuilder from "./pages/SquadBuilder";
import PackOpener from "./pages/PackOpener";
import PlayerCompare from "./pages/PlayerCompare";
import OvrCalc from "./pages/OvrCalc";
import News from "./pages/News";

const tabs = [
  { path: "/card-creator", label: "Card Creator" },
  { path: "/squad-builder", label: "Squad Builder" },
  { path: "/pack-opener", label: "Pack Opener" },
  { path: "/compare", label: "Compare" },
  { path: "/ovr-calc", label: "OVR Calc" },
  { path: "/news", label: "News" },
];

function Shell() {
  const [location, navigate] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleNav = (p: string) => {
    navigate(p);
    setMenuOpen(false);
  };

  // keep body from scrolling when mobile menu open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        tabs={tabs}
        current={location}
        onNavigate={handleNav}
        menuOpen={menuOpen}
        onMenuToggle={() => setMenuOpen((v) => !v)}
      />
      <main className="flex-1 pt-24 pb-16">
        <Switch>
          <Route path="/card-creator" component={CardCreator} />
          <Route path="/squad-builder" component={SquadBuilder} />
          <Route path="/pack-opener" component={PackOpener} />
          <Route path="/compare" component={PlayerCompare} />
          <Route path="/ovr-calc" component={OvrCalc} />
          <Route path="/news" component={News} />
          <Route path="/">
            <HomeRedirect navigate={navigate} />
          </Route>
          <Route path={"/404"} component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <footer className="border-t border-gold/10 py-6 text-center text-xs text-muted-foreground mono">
        FC MOBILE 26 TOOLS — BUILT BY <span className="text-gold">DYNAMIC HUB</span>
      </footer>
    </div>
  );
}

function HomeRedirect({ navigate }: { navigate: (p: string) => void }) {
  useEffect(() => {
    navigate("/card-creator");
  }, [navigate]);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route component={Shell} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "rgba(20,20,40,0.92)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255,215,0,0.2)",
                color: "#f5f5f7",
              },
            }}
          />
          {/* Ambient background */}
          <div className="ambient-bg" aria-hidden />
          <div
            className="ambient-orb"
            style={{
              width: 480,
              height: 480,
              left: "-120px",
              top: "10%",
              background: "rgba(255,215,0,0.10)",
              animationDelay: "0s",
            }}
            aria-hidden
          />
          <div
            className="ambient-orb"
            style={{
              width: 420,
              height: 420,
              right: "-100px",
              top: "35%",
              background: "rgba(0,212,255,0.08)",
              animationDelay: "4s",
            }}
            aria-hidden
          />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
