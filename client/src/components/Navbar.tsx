/*
 * FC MOBILE 26 — Navbar (ideas.md)
 * Fixed 80px glassmorphic top bar: logo left, centered tabs, search+settings+profile right.
 */
import { useState } from "react";
import { Search, Settings, User, Menu, X } from "lucide-react";

interface Tab {
  path: string;
  label: string;
}

interface NavbarProps {
  tabs: Tab[];
  current: string;
  onNavigate: (path: string) => void;
  menuOpen: boolean;
  onMenuToggle: () => void;
}

export default function Navbar({ tabs, current, onNavigate, menuOpen, onMenuToggle }: NavbarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const active = tabs.find((t) => current.startsWith(t.path))?.path ?? tabs[0]?.path;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-20 flex items-stretch border-b border-gold/10"
      style={{ background: "rgba(15,15,30,0.78)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}>
      <div className="absolute inset-0 grid-overlay opacity-60 pointer-events-none" aria-hidden />
      <div className="container w-full flex items-center gap-4">
        {/* Logo (left) */}
        <button
          className="flex items-center gap-3 shrink-0"
          onClick={() => onNavigate(tabs[0].path)}
          aria-label="Home"
        >
          <img
            src="/manus-storage/fc26-logo_b944cf86.png"
            alt="FC Mobile 26 logo"
            className="h-11 w-11 object-contain drop-shadow-[0_0_10px_rgba(255,215,0,0.45)]"
          />
          <span className="flex flex-col items-start leading-tight">
            <span className="text-lg font-black tracking-tight text-white">
              FC MOBILE <span className="text-gold">26</span>
            </span>
            <span className="mono text-[10px] tracking-[0.25em] text-cyan uppercase">Dynamic Hub</span>
          </span>
        </button>

        {/* Center tabs (desktop) */}
        <nav className="hidden lg:flex items-center gap-1 mx-auto" aria-label="Main navigation">
          {tabs.map((t) => {
            const isActive = active === t.path;
            return (
              <button
                key={t.path}
                onClick={() => onNavigate(t.path)}
                className={`relative px-4 py-2 text-sm font-semibold rounded-lg transition-colors duration-200 ${
                  isActive ? "text-gold" : "text-white/70 hover:text-white"
                }`}
              >
                {t.label}
                {isActive && (
                  <span
                    className="absolute left-3 right-3 -bottom-1.5 h-0.5 rounded-full"
                    style={{ background: "linear-gradient(90deg, #ffd700, #00d4ff)", boxShadow: "0 0 14px rgba(255,215,0,0.8)" }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right: search + icons */}
        <div className="hidden lg:flex items-center gap-3 ml-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search players..."
              className="glass-input h-9 w-44 pl-9 pr-3 text-sm"
            />
          </div>
          <button
            className="h-9 w-9 grid place-items-center rounded-lg border border-gold/15 text-white/70 hover:text-gold transition-colors"
            aria-label="Settings"
            onClick={() => {
              if (searchQuery.trim()) {
                onNavigate("/card-creator");
                // stash query for the card creator page
                sessionStorage.setItem("fc26.globalSearch", searchQuery.trim());
                setSearchQuery("");
              }
            }}
          >
            <Search className="h-4 w-4" />
          </button>
            <button className="h-9 w-9 grid place-items-center rounded-lg border border-gold/15 text-white/70 hover:text-cyan transition-colors" aria-label="Settings" title="Settings">
            <Settings className="h-4 w-4" />
          </button>
          <button className="h-9 w-9 grid place-items-center rounded-lg border border-gold/15 text-white/70 hover:text-gold transition-colors" aria-label="Profile">
            <User className="h-4 w-4" />
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="lg:hidden ml-auto h-10 w-10 grid place-items-center rounded-lg border border-gold/15 text-gold"
          onClick={onMenuToggle}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="lg:hidden absolute top-20 left-0 right-0 border-b border-gold/10 pt-4 pb-6 px-4 flex flex-col gap-1"
          style={{ background: "rgba(12,12,26,0.95)", backdropFilter: "blur(30px)" }}>
          {tabs.map((t) => (
            <button
              key={t.path}
              onClick={() => onNavigate(t.path)}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${
                active === t.path
                  ? "bg-gold/10 text-gold border border-gold/20"
                  : "text-white/75 hover:bg-white/5"
              }`}
            >
              {t.label}
            </button>
          ))}
          <div className="mt-3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search players..."
              className="glass-input h-10 w-full pl-9 pr-3 text-sm"
            />
          </div>
        </div>
      )}
    </header>
  );
}
