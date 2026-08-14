/*
 * FC MOBILE 26 — Squad Builder (ideas.md)
 * Left 2/3: formation visualizer (4-3-3, 4-2-3-1, 3-5-2, 4-4-2), 11 glass slot cards,
 * drag-drop enabled, gold OVR badge top-right, prominent gold Save Squad button.
 * Right 1/3: player search sidebar with position filters + Add.
 */
import { useMemo, useState } from "react";
import { Save, Trash2, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import PlayerSearchPanel from "@/components/PlayerSearchPanel";
import PageHeader from "@/components/PageHeader";
import { usePlayers } from "@/hooks/usePlayers";
import { Player, loadSquads, saveSquads, type SavedSquad } from "@/lib/api";

const formations = ["4-3-3", "4-2-3-1", "4-4-2", "3-5-2", "4-5-1"] as const;
type Formation = (typeof formations)[number];

/* Position templates per formation: rows from top (ST) to bottom (GK).
   Each slot: [line position 0..1 across the row, position label]. */
interface Slot {
  x: number; // 0..1 across
  y: number; // 0..1 down (0 = top/attack, 1 = bottom/GK)
  pos: string;
}

const layouts: Record<Formation, Slot[]> = {
  "4-3-3": [
    { x: 0.5, y: 0.06, pos: "ST" },
    { x: 0.18, y: 0.22, pos: "LW" },
    { x: 0.82, y: 0.22, pos: "RW" },
    { x: 0.27, y: 0.42, pos: "CM" },
    { x: 0.5, y: 0.46, pos: "CM" },
    { x: 0.73, y: 0.42, pos: "CM" },
    { x: 0.12, y: 0.66, pos: "LB" },
    { x: 0.39, y: 0.7, pos: "CB" },
    { x: 0.61, y: 0.7, pos: "CB" },
    { x: 0.88, y: 0.66, pos: "RB" },
    { x: 0.5, y: 0.9, pos: "GK" },
  ],
  "4-2-3-1": [
    { x: 0.5, y: 0.06, pos: "ST" },
    { x: 0.18, y: 0.24, pos: "LW" },
    { x: 0.5, y: 0.26, pos: "CAM" },
    { x: 0.82, y: 0.24, pos: "RW" },
    { x: 0.38, y: 0.46, pos: "CM" },
    { x: 0.62, y: 0.46, pos: "CM" },
    { x: 0.12, y: 0.66, pos: "LB" },
    { x: 0.39, y: 0.7, pos: "CB" },
    { x: 0.61, y: 0.7, pos: "CB" },
    { x: 0.88, y: 0.66, pos: "RB" },
    { x: 0.5, y: 0.9, pos: "GK" },
  ],
  "4-4-2": [
    { x: 0.34, y: 0.1, pos: "ST" },
    { x: 0.66, y: 0.1, pos: "ST" },
    { x: 0.16, y: 0.32, pos: "LM" },
    { x: 0.39, y: 0.36, pos: "CM" },
    { x: 0.61, y: 0.36, pos: "CM" },
    { x: 0.84, y: 0.32, pos: "RM" },
    { x: 0.12, y: 0.62, pos: "LB" },
    { x: 0.39, y: 0.66, pos: "CB" },
    { x: 0.61, y: 0.66, pos: "CB" },
    { x: 0.88, y: 0.62, pos: "RB" },
    { x: 0.5, y: 0.9, pos: "GK" },
  ],
  "3-5-2": [
    { x: 0.36, y: 0.08, pos: "ST" },
    { x: 0.64, y: 0.08, pos: "ST" },
    { x: 0.14, y: 0.28, pos: "LW" },
    { x: 0.38, y: 0.34, pos: "CM" },
    { x: 0.5, y: 0.4, pos: "CAM" },
    { x: 0.62, y: 0.34, pos: "CM" },
    { x: 0.86, y: 0.28, pos: "RW" },
    { x: 0.3, y: 0.62, pos: "CB" },
    { x: 0.5, y: 0.68, pos: "CB" },
    { x: 0.7, y: 0.62, pos: "CB" },
    { x: 0.5, y: 0.9, pos: "GK" },
  ],
  "4-5-1": [
    { x: 0.5, y: 0.08, pos: "ST" },
    { x: 0.16, y: 0.3, pos: "LM" },
    { x: 0.36, y: 0.34, pos: "CM" },
    { x: 0.5, y: 0.38, pos: "CM" },
    { x: 0.64, y: 0.34, pos: "CM" },
    { x: 0.84, y: 0.3, pos: "RM" },
    { x: 0.12, y: 0.6, pos: "LB" },
    { x: 0.39, y: 0.64, pos: "CB" },
    { x: 0.61, y: 0.64, pos: "CB" },
    { x: 0.88, y: 0.6, pos: "RB" },
    { x: 0.5, y: 0.9, pos: "GK" },
  ],
};

interface SlotPlayer {
  player: Player | null;
  dragging?: boolean;
}

function emptySlots(): SlotPlayer[] {
  return Array.from({ length: 11 }, () => ({ player: null }));
}

function ovrOf(slots: SlotPlayer[]): number {
  const filled = slots.filter((s) => s.player);
  if (filled.length === 0) return 0;
  const avg = filled.reduce((acc, s) => acc + (s.player!.rating || 0), 0) / filled.length;
  return Math.round(avg);
}

export default function SquadBuilder() {
  const { players, loading, error } = usePlayers();
  const [formation, setFormation] = useState<Formation>("4-3-3");
  const [slots, setSlots] = useState<SlotPlayer[]>(emptySlots);
  const [squadName, setSquadName] = useState("My Elite XI");
  const [saved, setSaved] = useState<SavedSquad[]>(() => loadSquads());
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const ovr = useMemo(() => ovrOf(slots), [slots]);
  const layout = layouts[formation];

  const addPlayer = (p: Player) => {
    setSlots((prev) => {
      // avoid duplicates: if already present, replace it
      const idx = prev.findIndex((s) => s.player?.postId === p.postId);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = { player: p };
        return next;
      }
      // find first empty slot (prefer position match, then any)
      const open = prev
        .map((s, i) => ({ s, i }))
        .filter(({ s }) => !s.player);
      const match = open.find(({ s, i }) => layout[i].pos === p.position);
      const target = match ? match.i : open[0]?.i;
      if (target === undefined) {
        toast("Squad is full — remove a player first");
        return prev;
      }
      const next = [...prev];
      next[target] = { player: p };
      return next;
    });
  };

  const removeSlot = (i: number) => {
    setSlots((prev) => {
      const next = [...prev];
      next[i] = { player: null };
      return next;
    });
  };

  const clearAll = () => {
    setSlots(emptySlots());
    toast("Squad cleared");
  };

  const saveSquad = () => {
    const filled = slots.filter((s) => s.player);
    if (filled.length < 11) {
      toast.error(`Add all 11 players first (${filled.length}/11)`);
      return;
    }
    const squad: SavedSquad = {
      name: squadName.trim() || "My Elite XI",
      formation,
      players: slots.map((s) => s.player!),
      createdAt: Date.now(),
    };
    const next = [squad, ...saved].slice(0, 10);
    setSaved(next);
    saveSquads(next);
    toast.success(`Squad "${squad.name}" saved`);
  };

  const loadSquad = (s: SavedSquad) => {
    setFormation(s.formation as Formation);
    setSquadName(s.name);
    setSlots(s.players.map((p) => ({ player: p })));
    toast.success(`Loaded "${s.name}"`);
  };

  const deleteSquad = (createdAt: number) => {
    const next = saved.filter((s) => s.createdAt !== createdAt);
    setSaved(next);
    saveSquads(next);
    toast("Squad deleted");
  };

  /* Drag & drop handlers */
  const onDragStart = (i: number) => setDragIdx(i);
  const onDropOn = (i: number) => {
    if (dragIdx === null || dragIdx === i) {
      setDragIdx(null);
      return;
    }
    setSlots((prev) => {
      const next = prev.map((s) => ({ ...s }));
      const tmp = next[dragIdx];
      next[dragIdx] = next[i];
      next[i] = tmp;
      return next;
    });
    setDragIdx(null);
  };

  const ovrColor = ovr >= 90 ? "#ffd700" : ovr >= 85 ? "#ffb300" : ovr >= 80 ? "#00d4ff" : "#a0a0b8";

  return (
    <div className="container page-enter">
      <PageHeader
        title="Squad Builder"
        description="Build your dream XI. Search the live database, place players into formation slots, drag to rearrange, and save your squads."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2/3 — pitch */}
        <div className="lg:col-span-2 space-y-4">
          {/* Controls row */}
          <div className="glass p-4 flex flex-wrap items-center gap-3">
            <div className="flex gap-1.5">
              {formations.map((f) => (
                <button
                  key={f}
                  onClick={() => setFormation(f)}
                  className={`mono px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    formation === f
                      ? "bg-gold text-navy-deep"
                      : "bg-white/5 border border-gold/10 text-white/70 hover:text-gold"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <input
              value={squadName}
              onChange={(e) => setSquadName(e.target.value)}
              maxLength={28}
              className="glass-input h-9 px-3 text-sm flex-1 min-w-[140px]"
              placeholder="Squad name"
            />
            <div className="flex items-center gap-2">
              <span
                className="h-10 w-10 rounded-full grid place-items-center mono text-sm font-extrabold text-navy-deep"
                style={{ background: ovrColor, boxShadow: `0 0 18px ${ovrColor}66` }}
              >
                {ovr || "-"}
              </span>
              <span className="mono text-[10px] text-muted-foreground uppercase">Avg OVR</span>
            </div>
            <button onClick={clearAll} className="px-3 py-2 rounded-lg border border-gold/10 text-xs font-semibold text-white/60 hover:text-destructive hover:border-destructive/40 transition-colors">
              <Trash2 className="h-3.5 w-3.5 inline mr-1" />
              Clear
            </button>
            <button onClick={saveSquad} className="btn-gold h-10 px-5 text-sm flex items-center gap-2">
              <Save className="h-4 w-4" />
              Save Squad
            </button>
          </div>

          {/* Pitch */}
          <div
            className="glass p-3 relative select-none"
            style={{
              background:
                "linear-gradient(180deg, rgba(16,40,30,0.85) 0%, rgba(12,34,26,0.9) 100%)",
              backdropFilter: "blur(20px)",
            }}
          >
            {/* pitch markings */}
            <div className="absolute inset-3 border border-white/25 rounded-sm pointer-events-none">
              <div className="absolute left-1/4 right-1/4 top-0 h-[14%] border-b border-x border-white/25" />
              <div className="absolute left-1/4 right-1/4 bottom-0 h-[14%] border-t border-x border-white/25" />
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/25" />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[22%] w-[22%] rounded-full border border-white/25" />
            </div>
            <div className="relative w-full" style={{ aspectRatio: "4 / 3" }}>
              <AnimatePresence>
                {layout.map((slot, i) => {
                  const sp = slots[i];
                  return (
                    <motion.div
                      key={i}
                      className="absolute -translate-x-1/2 -translate-y-1/2"
                      style={{ left: `${slot.x * 100}%`, top: `${slot.y * 100}%` }}
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                    >
                      <div
                        draggable
                        onDragStart={() => onDragStart(i)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => onDropOn(i)}
                        className={`relative flex flex-col items-center gap-0.5 cursor-grab active:cursor-grabbing ${
                          sp.player ? "group" : ""
                        }`}
                      >
                        <div
                          className={`w-[13%] min-w-[56px] max-w-[84px] aspect-[3/4] rounded-lg border grid place-items-center overflow-hidden transition-shadow ${
                            sp.player
                              ? "border-gold/40 bg-[rgba(20,20,40,0.85)] shadow-[0_0_16px_rgba(255,215,0,0.25)]"
                              : "border-dashed border-white/30 bg-[rgba(10,10,24,0.6)]"
                          }`}
                        >
                          {sp.player ? (
                            <>
                              {sp.player.image && (
                                <img
                                  src={sp.player.image}
                                  alt={sp.player.name}
                                  loading="lazy"
                                  className="absolute inset-0 h-full w-full object-cover object-top"
                                />
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-[rgba(10,10,20,0.85)] via-transparent to-transparent" />
                              <span className="absolute top-0.5 left-1 mono text-[10px] font-extrabold text-gold z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                                {sp.player.rating}
                              </span>
                              <span className="absolute bottom-0.5 inset-x-0 text-center mono text-[8px] font-bold text-white truncate z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                                {(sp.player.shortName || sp.player.name).toUpperCase().slice(0, 14)}
                              </span>
                            </>
                          ) : (
                            <span className="mono text-[9px] font-bold text-white/50">{slot.pos}</span>
                          )}
                        </div>
                        {/* OVR badge top-right */}
                        {sp.player && (
                          <span
                            className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full grid place-items-center mono text-[9px] font-extrabold text-navy-deep z-20 border border-white/30"
                            style={{ background: "#ffd700", boxShadow: "0 0 10px rgba(255,215,0,0.8)" }}
                          >
                            {sp.player.rating}
                          </span>
                        )}
                        {sp.player && (
                          <button
                            onClick={() => removeSlot(i)}
                            className="absolute -top-1.5 -left-1.5 h-4.5 w-4.5 rounded-full grid place-items-center bg-destructive text-white opacity-0 group-hover:opacity-100 transition-opacity z-20 border border-white/40"
                            style={{ width: 18, height: 18 }}
                            aria-label="Remove player"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        )}
                        <span className="mono text-[10px] font-bold text-white/90 bg-[rgba(10,10,24,0.7)] px-1.5 py-0.5 rounded">
                          {slot.pos}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* Saved squads */}
          {saved.length > 0 && (
            <div className="glass p-4">
              <h3 className="text-xs font-bold tracking-widest text-gold uppercase mb-3">Saved Squads</h3>
              <div className="flex flex-wrap gap-2">
                {saved.map((s) => (
                  <div key={s.createdAt} className="glass glass-hover flex items-center gap-2 px-3 py-2">
                    <button onClick={() => loadSquad(s)} className="text-sm font-semibold text-white hover:text-gold transition-colors text-left">
                      {s.name}
                      <span className="mono ml-2 text-[10px] text-cyan">{s.formation}</span>
                    </button>
                    <button onClick={() => deleteSquad(s.createdAt)} className="text-white/40 hover:text-destructive transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right 1/3 — search sidebar */}
        <PlayerSearchPanel players={players} loading={loading} onAdd={addPlayer} />
      </div>

      {error && !loading && (
        <p className="mono text-xs text-destructive mt-4">{error}</p>
      )}
      {loading && (
        <p className="mono text-xs text-muted-foreground mt-4 flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-gold" />
          Loading player database...
        </p>
      )}
    </div>
  );
}
