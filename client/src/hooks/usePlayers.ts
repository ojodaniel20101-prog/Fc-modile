import { useState, useEffect } from "react";
import { searchPlayers, Player } from "@/lib/api";

export function usePlayers() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load initial player list (empty or placeholder for now)
    // When user searches, PlayerSearchPanel calls searchPlayers directly
    setLoading(false);
  }, []);

  return { players, loading, error };
}
