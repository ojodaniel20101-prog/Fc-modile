import { useEffect, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Player, Position, positions, searchPlayers, matchesPosition, getGlobalSearch } from "@/lib/api";
import PlayerChip from "./PlayerChip";

interface PlayerSearchPanelProps {
  onAdd: (p: Player) => void;
  title?: string;
  addLabel?: string;
}

export default function PlayerSearchPanel({ onAdd, title = "Player Database", addLabel = "Add" }: PlayerSearchPanelProps) {
  const [query, setQuery] = useState("");
  const [pos, setPos] = useState<Position>("ALL");
  const [results, setResults] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const seed = getGlobalSearch();
    if (seed) setQuery(seed);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const runSearch = async () => {
      const trimmedQuery = query.trim();
      if (!trimmedQuery) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const nextResults = await searchPlayers(trimmedQuery);
        if (!cancelled) setResults(nextResults);
      } catch (error) {
        if (!cancelled) {
          console.error("Player search error:", error);
          setResults([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void runSearch();
    return () => {
      cancelled = true;
    };
  }, [query]);

  const visibleResults = pos === "ALL" ? results : results.filter((player) => matchesPosition(player, pos));

  return (
    <aside className="glass glass-hover flex flex-col h-full max-h-[calc(100vh-240px)] min-h-0">
      <div className="p-4 border-b border-gold/10">
        <h3 className="text-sm font-bold tracking-wide text-gold uppercase">{title}</h3>
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, team, nation..."
            className="glass-input h-10 w-full pl-9 pr-3 text-sm"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {positions.map((p) => (
            <button
              key={p}
              onClick={() => setPos(p)}
              className={`mono px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                pos === p
                  ? "bg-gold text-navy-deep"
                  : "bg-white/5 text-white/60 border border-gold/10 hover:text-gold"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {loading && (
          <div className="py-10 text-center text-sm text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3 text-gold" />
            Searching players...
          </div>
        )}
        {!loading && visibleResults.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {query.trim() ? "No players found." : "Type a player name to search."}
          </p>
        )}
        {!loading && visibleResults.map((p) => (
          <PlayerChip key={p.postId || p.id} player={p} onAdd={onAdd} />
        ))}
      </div>
      <div className="px-4 py-2 border-t border-gold/10 text-[11px] mono text-muted-foreground">
        {visibleResults.length} results{addLabel ? ` · tap ${addLabel} to use` : ""}
      </div>
    </aside>
  );
}
