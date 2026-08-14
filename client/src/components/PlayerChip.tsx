/* FC MOBILE 26 — glass player list item: mini card with rating, name, team, image (ideas.md) */
import { Player } from "@/lib/api";
import { Plus } from "lucide-react";

interface PlayerChipProps {
  player: Player;
  onAdd?: (p: Player) => void;
  onClick?: (p: Player) => void;
  highlight?: boolean;
}

export default function PlayerChip({ player, onAdd, onClick, highlight }: PlayerChipProps) {
  return (
    <button
      type="button"
      onClick={() => (onClick ? onClick(player) : onAdd?.(player))}
      className={`glass glass-hover w-full flex items-center gap-3 px-3 py-2.5 text-left ${
        highlight ? "ring-1 ring-gold/50" : ""
      }`}
    >
      <div className="relative h-11 w-9 shrink-0 overflow-hidden rounded-md bg-navy-deep border border-gold/15">
        {player.image ? (
          <img
            src={player.image}
            alt={player.name}
            loading="lazy"
            className="h-full w-full object-cover object-top"
          />
        ) : (
          <span className="h-full w-full grid place-items-center text-[10px] mono text-gold/70">
            {player.rating}
          </span>
        )}
      </div>
      <span
        className="mono text-base font-bold text-gold w-9 shrink-0 text-center"
      >
        {player.rating}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold text-white truncate">
          {player.shortName || player.name}
        </span>
        <span className="block text-[11px] text-muted-foreground truncate">
          {player.position} · {player.team || player.nation}
          {player.program ? ` · ${player.program}` : ""}
        </span>
      </span>
      {onAdd && (
        <span className="h-7 w-7 grid place-items-center rounded-full border border-cyan/40 text-cyan hover:bg-cyan hover:text-navy-deep transition-colors">
          <Plus className="h-4 w-4" />
        </span>
      )}
    </button>
  );
}
