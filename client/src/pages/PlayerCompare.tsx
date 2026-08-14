/*
 * FC MOBILE 26 — Player Compare (ideas.md)
 * Search bar on top to add players. Glass compare table: headers = player
 * names (gold), rows = stat names, highest value pulses gold, others cyan,
 * remove X red on hover.
 */
import { useState } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import { usePlayers } from "@/hooks/usePlayers";
import { Player, searchPlayers, Position, positions, matchesPosition } from "@/lib/api";
import { Users, Zap } from "lucide-react";

const statRows: { key: string; label: string }[] = [
  { key: "rating", label: "OVR" },
  { key: "pace", label: "Pace" },
  { key: "shooting", label: "Shooting" },
  { key: "passing", label: "Passing" },
  { key: "dribbling", label: "Dribbling" },
  { key: "defending", label: "Defending" },
  { key: "physical", label: "Physical" },
  { key: "acceleration", label: "Acceleration" },
  { key: "sprint_speed", label: "Sprint Speed" },
  { key: "finishing", label: "Finishing" },
  { key: "shot_power", label: "Shot Power" },
  { key: "positioning", label: "Positioning" },
  { key: "long_shot", label: "Long Shots" },
  { key: "volley", label: "Volleys" },
  { key: "penalties", label: "Penalties" },
  { key: "short_passing", label: "Short Pass" },
  { key: "long_passing", label: "Long Pass" },
  { key: "vision", label: "Vision" },
  { key: "crossing", label: "Crossing" },
  { key: "curve", label: "Curve" },
  { key: "free_kick", label: "Free Kicks" },
  { key: "dribbling_2", label: "Agility (Drib.)" },
  { key: "balance", label: "Balance" },
  { key: "agility", label: "Agility" },
  { key: "reactions", label: "Reactions" },
  { key: "ball_control", label: "Ball Control" },
  { key: "marking", label: "Marking" },
  { key: "standing_tackle", label: "Standing Tackle" },
  { key: "sliding_tackle", label: "Sliding Tackle" },
  { key: "awareness", label: "Awareness" },
  { key: "heading", label: "Heading" },
  { key: "strength", label: "Strength" },
  { key: "aggression", label: "Aggression" },
  { key: "jumping", label: "Jumping" },
  { key: "stamina", label: "Stamina" },
];

export default function PlayerCompare() {
  const { players, loading } = usePlayers();
  const [selected, setSelected] = useState<Player[]>([]);
  const [query, setQuery] = useState("");
  const [pos, setPos] = useState<Position>("ALL");
  const [panelOpen, setPanelOpen] = useState(false);

  const results = searchPlayers(players, query, pos);

  const add = (p: Player) => {
    if (selected.length >= 4) {
      toast("Max 4 players — remove one first");
      return;
    }
    if (selected.find((s) => s.postId === p.postId)) {
      toast("Already in comparison");
      return;
    }
    setSelected([...selected, p]);
    setPanelOpen(false);
    setQuery("");
  };

  const remove = (postId: number) => {
    setSelected(selected.filter((p) => p.postId !== postId));
  };

  return (
    <div className="container page-enter">
      <PageHeader
        title="Player Compare"
        description="Head-to-head stat breakdown. Add up to 4 players and see who dominates each attribute."
      />

      {/* Add player bar */}
      <div className="relative mb-6 max-w-xl">
        <button
          onClick={() => setPanelOpen(!panelOpen)}
          className={`glass glass-hover w-full h-12 px-4 flex items-center gap-3 text-left ${
            panelOpen ? "ring-1 ring-gold/50" : ""
          }`}
        >
          <Search className="h-4 w-4 text-muted-foreground" />
          <span className={`text-sm ${selected.length ? "" : "text-muted-foreground"}`}>
            {panelOpen && query ? `${results.length} results` : selected.length ? `${selected.map((p) => p.shortName || p.name).join(", ")} — add another?` : "Search a player to compare..."}
          </span>
        </button>
        {panelOpen && (
          <div className="absolute z-20 mt-2 w-full glass-strong p-3 max-h-80 flex flex-col gap-2 overflow-hidden">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
                placeholder="Name, team, nation..."
                className="glass-input h-10 w-full pl-9 pr-3 text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {positions.map((p) => (
                <button
                  key={p}
                  onClick={() => setPos(p)}
                  className={`mono px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                    pos === p ? "bg-gold text-navy-deep" : "bg-white/5 text-white/60 border border-gold/10 hover:text-gold"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
              {loading && (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin inline mr-1 text-gold" />
                  Loading...
                </p>
              )}
              {!loading && results.length === 0 && (
                <p className="py-6 text-center text-xs text-muted-foreground">No players found.</p>
              )}
              {results.map((p) => (
                <button
                  key={p.postId}
                  onClick={() => add(p)}
                  className="glass glass-hover w-full flex items-center gap-3 px-3 py-2 text-left"
                >
                  <span className="mono text-sm font-bold text-gold w-8">{p.rating}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-white truncate">{p.shortName || p.name}</span>
                    <span className="block text-[11px] text-muted-foreground truncate">{p.position} · {p.team || p.nation}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Compare table */}
      {selected.length === 0 ? (
        <div className="glass-strong edge-lit hud-corner p-8 md:p-10 grid-overlay">
          <div className="text-center mb-8">
            <Zap className="h-8 w-8 text-cyan mx-auto mb-3" />
            <h3 className="text-lg font-extrabold text-white uppercase">Compare any 4 players</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              Pull anyone from the live database and stack their stats side by side. Winning values flash gold.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {["PAC", "SHO", "PAS", "DRI"].map((label) => (
              <div key={label} className="glass p-4 flex flex-col items-center gap-3">
                <div className="h-16 w-14 rounded-lg border border-dashed border-cyan/30 bg-white/[0.02] grid place-items-center">
                  <Users className="h-5 w-5 text-cyan/40" />
                </div>
                <span className="mono text-[10px] text-cyan uppercase">Empty slot</span>
                <div className="w-full stat-bar"><span style={{ width: "0%" }} /></div>
                <span className="mono text-lg font-bold text-white/20">{label}</span>
              </div>
            ))}
          </div>
          <p className="mono text-[11px] text-center text-muted-foreground mt-8">
            Add a player above to fill the first slot →
          </p>
        </div>
      ) : (
        <div className="glass overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="border-b border-gold/15">
                <th className="text-left p-3 mono text-[11px] text-muted-foreground font-medium uppercase w-40">Stat</th>
                {selected.map((p) => (
                  <th key={p.postId} className="p-3 text-center">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="relative h-16 w-14 overflow-hidden rounded-lg border border-gold/20">
                        {p.image ? (
                          <img src={p.image} alt={p.name} loading="lazy" className="h-full w-full object-cover object-top" />
                        ) : (
                          <span className="h-full w-full grid place-items-center mono text-gold text-xs">{p.rating}</span>
                        )}
                      </div>
                      <span className="text-gold font-extrabold uppercase text-sm max-w-[110px] truncate">
                        {p.shortName || p.name}
                      </span>
                      <span className="mono text-[10px] text-cyan">{p.position} · {p.rating}</span>
                      <button
                        onClick={() => remove(p.postId)}
                        className="h-4 w-4 grid place-items-center rounded-full text-white/40 hover:text-destructive hover:bg-destructive/15 transition-colors"
                        aria-label={`Remove ${p.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {statRows.map((row) => {
                const vals = selected.map((p) => p.stats[row.key] ?? 0);
                const max = Math.max(...vals);
                const showMax = selected.length > 1 && vals.filter((v) => v === max).length === 1;
                return (
                  <tr key={row.key} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                    <td className="p-3 text-[13px] text-muted-foreground font-medium">{row.label}</td>
                    {vals.map((v, i) => {
                      const best = showMax && v === max && v > 0;
                      return (
                        <td key={i} className="p-3 text-center mono text-[15px] font-semibold">
                          <span className={best ? "gold-pulse" : "text-cyan/90"}>
                            {row.key === "rating" ? v || (selected[i].rating || "-") : v || "-"}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Quick hint */}
      {selected.length > 0 && (
        <p className="mono text-[11px] text-muted-foreground mt-3">
          Gold = best in comparison (pulsing) · Cyan = other values · Use the position chips to filter search.
        </p>
      )}
    </div>
  );
}
