/*
 * FC MOBILE 26 — Pack Opener (ideas.md)
 * Centered experience: gold gradient glass "OPEN PACK" button, 2s flip animation
 * with particle burst, then large glass player card reveal (name + rating in gold)
 * and "Open Another" button.
 */
import { useCallback, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { usePlayers } from "@/hooks/usePlayers";
import { Player } from "@/lib/api";

type Stage = "idle" | "opening" | "reveal";

function randPlayer(players: Player[]): Player {
  const withImg = players.filter((p) => p.image);
  const pool = withImg.length > 0 ? withImg : players;
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function PackOpener() {
  const { players, loading, error } = usePlayers();
  const [stage, setStage] = useState<Stage>("idle");
  const [won, setWon] = useState<Player | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const ratingTier = useMemo(() => {
    if (!won) return "";
    const r = won.rating;
    if (r >= 95) return "LEGENDARY";
    if (r >= 91) return "ELITE";
    if (r >= 88) return "RARE";
    return "COMMON";
  }, [won]);

  const tierColor =
    ratingTier === "LEGENDARY" ? "#ffd700" :
    ratingTier === "ELITE" ? "#ffb300" :
    ratingTier === "RARE" ? "#00d4ff" : "#a0a0b8";

  /* Particle burst on a canvas during the flip */
  const burst = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const W = (c.width = c.offsetWidth * 2);
    const H = (c.height = c.offsetHeight * 2);
    ctx.scale(2, 2);
    const cw = c.offsetWidth;
    const ch = c.offsetHeight;
    type P = { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number };
    const ps: P[] = [];
    const colors = ["#ffd700", "#00d4ff", "#ffffff", "#ffb300"];
    for (let i = 0; i < 160; i++) {
      ps.push({
        x: cw / 2,
        y: ch / 2,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.5) * 12 - 2,
        life: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 4 + 1.5,
      });
    }
    let raf = 0;
    const t0 = performance.now();
    const draw = () => {
      const t = (performance.now() - t0) / 1400;
      ctx.clearRect(0, 0, cw, ch);
      let alive = false;
      for (const p of ps) {
        p.life = 1 - Math.min(1, t * 0.8);
        if (p.life <= 0) continue;
        alive = true;
        p.vy += 0.18;
        p.x += p.vx;
        p.y += p.vy;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      }
      if (alive && t < 1.6) raf = requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, cw, ch);
    };
    cancelAnimationFrame(raf);
    draw();
  }, []);

  const openPack = useCallback(() => {
    if (players.length === 0) return;
    setWon(randPlayer(players));
    setStage("opening");
    setTimeout(() => {
      burst();
      setStage("reveal");
    }, 2000);
  }, [players, burst]);

  const openAnother = () => {
    setStage("idle");
    setWon(null);
    setTimeout(() => openPack(), 150);
  };

  return (
    <div className="container page-enter">
      <PageHeader
        title="Pack Opener"
        description="Feeling lucky? Open a pack and see who joins your squad. Draws from the live FC Mobile 26 database."
      />

      <div className="relative flex flex-col items-center justify-center min-h-[62vh]">
        <div className="absolute inset-0 grid-overlay opacity-60 pointer-events-none" aria-hidden />
        {loading && (
          <p className="mono text-xs text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-gold" />
            Loading player database...
          </p>
        )}
        {error && <p className="mono text-xs text-destructive">{error}</p>}

        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 w-full h-full z-10"
          aria-hidden
        />

        <AnimatePresence mode="wait">
          {stage === "idle" && !loading && !error && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="flex flex-col items-center gap-6"
            >
              <img
                src="/manus-storage/pack-gold_ba22c138.png"
                alt="Golden pack"
                className="h-64 md:h-80 object-contain drop-shadow-[0_0_60px_rgba(255,215,0,0.35)]"
              />
              <button
                onClick={openPack}
                className="btn-gold h-14 px-12 text-lg font-extrabold tracking-wide flex items-center gap-3 uppercase"
              >
                <Sparkles className="h-5 w-5" />
                Open Pack
              </button>
            </motion.div>
          )}

          {stage === "opening" && (
            <motion.div
              key="opening"
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center"
            >
              <motion.div
                className="h-64 w-48 md:h-80 md:w-60 rounded-2xl overflow-hidden"
                style={{ perspective: 900 }}
              >
                <motion.div
                  className="w-full h-full relative"
                  animate={{ rotateY: 900 }}
                  transition={{ duration: 2, ease: [0.65, 0, 0.35, 1] }}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <img
                    src="/manus-storage/pack-gold_ba22c138.png"
                    alt="Pack opening"
                    className="w-full h-full object-cover rounded-2xl"
                    style={{ backfaceVisibility: "hidden" }}
                  />
                </motion.div>
              </motion.div>
              <p className="mt-6 mono text-sm text-gold animate-pulse">Revealing...</p>
            </motion.div>
          )}

          {stage === "reveal" && won && (
            <motion.div
              key="reveal"
              initial={{ opacity: 0, scale: 0.92, rotateX: -8 }}
              animate={{ opacity: 1, scale: 1, rotateX: 0 }}
              transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
              className="flex flex-col items-center gap-6"
            >
              <span
                className="mono text-xs font-bold tracking-[0.3em] px-4 py-1.5 rounded-full border"
                style={{ color: tierColor, borderColor: tierColor, background: `${tierColor}14` }}
              >
                {ratingTier}
              </span>
              <div
                className="glass-strong edge-lit hud-corner p-8 md:p-10 flex flex-col items-center gap-4 max-w-sm w-full"
                style={{ boxShadow: `0 0 60px ${tierColor}33` }}
              >
                <div className="relative h-44 w-40 overflow-hidden rounded-xl border-2" style={{ borderColor: tierColor }}>
                  {won.image ? (
                    <img src={won.image} alt={won.name} className="h-full w-full object-cover object-top" />
                  ) : (
                    <div className="h-full w-full grid place-items-center mono text-gold">{won.rating}</div>
                  )}
                </div>
                <span className="mono text-6xl font-extrabold text-gold drop-shadow-[0_0_18px_rgba(255,215,0,0.5)]">
                  {won.rating}
                </span>
                <h3 className="text-2xl font-black text-white text-center uppercase">
                  {won.shortName || won.name}
                </h3>
                <p className="mono text-xs text-cyan text-center">
                  {won.position} · {won.team || won.nation}
                </p>
                {won.program && (
                  <p className="mono text-[10px] text-muted-foreground text-center">{won.program}</p>
                )}
              </div>
              <button onClick={openAnother} className="btn-gold h-12 px-10 text-base font-bold">
                Open Another
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
