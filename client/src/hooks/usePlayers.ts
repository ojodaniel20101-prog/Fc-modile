/* FC MOBILE 26 — shared players hook with global-search support */
import { useEffect, useState } from "react";
import { fetchPlayers, getGlobalSearch, type Player } from "@/lib/api";

export function usePlayers() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchPlayers(5)
      .then((p) => {
        if (cancelled) return;
        setPlayers(p);
        setError(p.length === 0 ? "Could not load the player database." : null);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Could not load the player database. Check your connection.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { players, loading, error };
}

