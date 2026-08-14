/*
 * FC MOBILE 26 — Card Creator (ideas.md)
 * Left 2/3: canvas card preview in glass container, gold download button.
 * Right 1/3: glass control panel — player search, scroll list, customization.
 * Rendering: pure Canvas API (brief-specified), no html-to-image lib.
 */
import { useEffect, useRef, useState, useMemo } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import PlayerSearchPanel from "@/components/PlayerSearchPanel";
import PageHeader from "@/components/PageHeader";
import { usePlayers } from "@/hooks/usePlayers";
import { Player, fetchPlayerRender } from "@/lib/api";

const canvasW = 620;
const canvasH = 900;

interface CardConfig {
  name: string;
  rating: number;
  position: string;
  programme: string;
  team: string;
  nation: string;
  textColor: string;
  accent: "gold" | "cyan";
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  const num = h.length === 3
    ? h.split("").map((c) => parseInt(c + c, 16))
    : [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  return { r: num[0], g: num[1], b: num[2] };
}

function drawCard(ctx: CanvasRenderingContext2D, cfg: CardConfig, img: HTMLImageElement | null) {
  const W = canvasW;
  const H = canvasH;
  ctx.clearRect(0, 0, W, H);

  const accent = cfg.accent === "gold" ? [255, 215, 0] : [0, 212, 255];
  const tc = hexToRgb(cfg.textColor);

  // background
  const grad = ctx.createLinearGradient(0, 0, W * 0.3, H);
  grad.addColorStop(0, "#12122a");
  grad.addColorStop(0.55, "#0b0b1c");
  grad.addColorStop(1, "#06060f");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(0, 0, W, H, 46);
  ctx.fill();

  // accent border + glow
  ctx.strokeStyle = `rgba(${accent[0]},${accent[1]},${accent[2]},0.85)`;
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.strokeStyle = `rgba(${accent[0]},${accent[1]},${accent[2]},0.25)`;
  ctx.lineWidth = 18;
  ctx.stroke();

  // corner ticks (shield-style cuts)
  ctx.lineWidth = 5;
  ctx.strokeStyle = `rgba(${accent[0]},${accent[1]},${accent[2]},0.7)`;
  const tk = 30;
  for (const [x, sx, sy] of [[38, 1, 1], [W - 38, -1, 1], [W - 38, -1, -1], [38, 1, -1]] as const) {
    ctx.beginPath();
    const yy = sy === 1 ? 38 : H - 38;
    ctx.moveTo(x, yy);
    ctx.lineTo(x + tk * sx, yy);
    ctx.stroke();
  }

  // inner frame lines
  ctx.strokeStyle = `rgba(${accent[0]},${accent[1]},${accent[2]},0.35)`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(26, 26, W - 52, H - 52, 30);
  ctx.stroke();

  // diagonal shine
  const shine = ctx.createLinearGradient(W * -0.2, 0, W * 0.6, H);
  shine.addColorStop(0, "rgba(255,255,255,0.06)");
  shine.addColorStop(0.4, "rgba(255,255,255,0)");
  shine.addColorStop(1, "rgba(255,255,255,0.02)");
  ctx.fillStyle = shine;
  ctx.beginPath();
  ctx.roundRect(14, 14, W - 28, H - 28, 38);
  ctx.fill();

  // rating block
  const textCol = `rgb(${tc.r},${tc.g},${tc.b})`;
  ctx.fillStyle = textCol;
  ctx.font = "900 120px Inter, sans-serif";
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillText(String(cfg.rating).padStart(3, " "), 56, 56);

  ctx.font = "700 52px Inter, sans-serif";
  ctx.fillText(cfg.position.toUpperCase(), 72, 196);

  // player image (smaller cutout-style)
  if (img) {
    ctx.save();
    const imgW = W * 0.5;  // 50% width
    const imgH = H * 0.35; // 35% height
    const imgX = W * 0.25;
    const imgY = H * 0.18;
    ctx.beginPath();
    ctx.roundRect(imgX, imgY, imgW, imgH, 20);
    ctx.clip();
    // tinted backdrop so transparent PNGs blend
    ctx.fillStyle = "rgba(15,15,30,0.9)";
    ctx.fillRect(imgX, imgY, imgW, imgH);
    const ar = img.width / img.height;
    let dw = imgW;
    let dh = dw / ar;
    if (dh < imgH) {
      dh = imgH;
      dw = dh * ar;
    }
    const dx = imgX + (imgW - dw) / 2;
    const dy = imgY + (imgH - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();
  }

  // name
  ctx.fillStyle = textCol;
  ctx.font = "900 74px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText((cfg.name || "YOUR NAME").toUpperCase(), W / 2, H * 0.795);

  // divider
  ctx.strokeStyle = `rgba(${accent[0]},${accent[1]},${accent[2]},0.6)`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(W * 0.2, H * 0.835);
  ctx.lineTo(W * 0.8, H * 0.835);
  ctx.stroke();

  // programme + team + nation row
  ctx.font = "600 38px Inter, sans-serif";
  ctx.fillStyle = `rgba(${tc.r},${tc.g},${tc.b},0.9)`;
  ctx.textAlign = "center";
  const row = [cfg.programme, cfg.team, cfg.nation].filter(Boolean).join("  ·  ") || "FC MOBILE 26";
  ctx.fillText(row, W / 2, H * 0.885);

  // Stats footer (placeholder)
  ctx.font = "600 24px Inter, sans-serif";
  ctx.fillStyle = `rgba(${tc.r},${tc.g},${tc.b},0.7)`;
  ctx.textAlign = "center";
  ctx.fillText("PAC 90  SHO 85  PAS 80  DRI 88  DEF 70  PHY 78", W / 2, H * 0.945);
}

function useImage(src: string | null): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!src) {
      setImg(null);
      return;
    }
    let cancelled = false;
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => {
      if (!cancelled) setImg(i);
    };
    i.onerror = () => {
      if (!cancelled) setImg(null);
    };
    i.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);
  return img;
}

export default function CardCreator() {
  const { players, loading, error } = usePlayers();
  const [selected, setSelected] = useState<Player | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageError, setImageError] = useState(false);
  const [renderUrl, setRenderUrl] = useState<string | null>(null);
  const [renderLoading, setRenderLoading] = useState(false);

  const [cfg, setCfg] = useState<CardConfig>({
    name: "",
    rating: 99,
    position: "ST",
    programme: "",
    team: "",
    nation: "",
    textColor: "#ffd700",
    accent: "gold",
  });

  const src = useMemo(() => {
    if (renderUrl && !imageError) return renderUrl;
    return null;
  }, [renderUrl, imageError]);

  const img = useImage(src);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    // Always draw, with or without image
    drawCard(ctx, cfg, img);
  }, [cfg, img]);

  const applyPlayer = (p: Player) => {
    setSelected(p);
    setImageError(false);
    setRenderUrl(null);
    setCfg({
      name: p.shortName || p.name,
      rating: typeof p.rating === "number" ? p.rating : parseInt(p.rating, 10) || 99,
      position: p.position || "ST",
      programme: p.program || "",
      team: p.team || "",
      nation: p.nation || "",
      textColor: p.textColourCode || cfg.textColor,
      accent: cfg.accent,
    });

    // Look up the real render image (live search, cached client-side)
    setRenderLoading(true);
    fetchPlayerRender(p)
      .then((url) => {
        setRenderUrl(url || null);
      })
      .finally(() => setRenderLoading(false));
  };


  const download = () => {
    const c = canvasRef.current;
    if (!c) return;
    const url = c.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `fc26-card-${(cfg.name || "custom").toLowerCase().replace(/\s+/g, "-")}.png`;
    a.click();
    toast.success("Card downloaded");
  };

  return (
    <div className="container page-enter">
      <PageHeader
        title="Card Creator"
        description="Design your dream FUT-style card. Pick a player from the live database, tweak the details, and export a PNG."
      >
        {loading && <span className="mono text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline mr-1 text-gold" />Database loading</span>}
        {error && <span className="mono text-xs text-destructive">{error}</span>}
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2/3 — canvas preview */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-strong edge-lit hud-corner grid-overlay glass-hover p-4 sm:p-6 flex justify-center items-center min-h-[280px] sm:min-h-[420px]">
            <canvas
              ref={canvasRef}
              width={canvasW}
              height={canvasH}
              className="max-h-[50vh] sm:max-h-[65vh] lg:max-h-[72vh] w-auto max-w-full drop-shadow-[0_0_40px_rgba(255,215,0,0.18)]"
              style={{ imageRendering: "auto" }}
            />
          </div>
          {selected && renderLoading && (
            <p className="mono text-xs text-gold text-center">Loading player render…</p>
          )}
          {selected && !renderLoading && !renderUrl && (
            <p className="mono text-xs text-muted-foreground text-center">No render image found for this player — card will show without image.</p>
          )}
          <button onClick={download} className="btn-gold w-full h-12 text-base font-bold flex items-center justify-center gap-2">
            <Download className="h-5 w-5" />
            Download Card (PNG)
          </button>
        </div>

        {/* Right 1/3 — controls */}
        <div className="space-y-4 lg:max-h-[calc(100vh-240px)] lg:overflow-y-auto lg:pr-1">
          <div className="glass p-4 space-y-4">
            <h3 className="text-sm font-bold tracking-wide text-gold uppercase">Customization</h3>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs text-muted-foreground">Name</span>
                <input
                  className="glass-input h-10 w-full mt-1 px-3 text-sm"
                  value={cfg.name}
                  onChange={(e) => setCfg({ ...cfg, name: e.target.value })}
                  maxLength={22}
                />
              </label>
              <label className="block">
                <span className="text-xs text-muted-foreground">Rating</span>
                <input
                  type="number"
                  min={1}
                  max={99}
                  className="glass-input h-10 w-full mt-1 px-3 text-sm mono"
                  value={cfg.rating}
                  onChange={(e) => setCfg({ ...cfg, rating: Math.min(99, Math.max(1, Number(e.target.value))) })}
                />
              </label>
              <label className="block">
                <span className="text-xs text-muted-foreground">Position</span>
                <input
                  className="glass-input h-10 w-full mt-1 px-3 text-sm uppercase"
                  value={cfg.position}
                  maxLength={4}
                  onChange={(e) => setCfg({ ...cfg, position: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="text-xs text-muted-foreground">Text Color</span>
                <div className="flex gap-2 mt-1">
                  <input
                    type="color"
                    value={cfg.textColor}
                    onChange={(e) => setCfg({ ...cfg, textColor: e.target.value })}
                    className="h-10 w-12 rounded-lg border-0 bg-transparent cursor-pointer"
                  />
                  {["#ffd700", "#00d4ff", "#ffffff"].map((c) => (
                    <button
                      key={c}
                      onClick={() => setCfg({ ...cfg, textColor: c })}
                      className={`h-10 flex-1 rounded-lg border-2 ${cfg.textColor === c ? "border-white" : "border-gold/20"}`}
                      style={{ background: c }}
                      aria-label={`Text color ${c}`}
                    />
                  ))}
                </div>
              </label>
              <label className="block">
                <span className="text-xs text-muted-foreground">Programme</span>
                <input
                  className="glass-input h-10 w-full mt-1 px-3 text-sm"
                  value={cfg.programme}
                  maxLength={26}
                  onChange={(e) => setCfg({ ...cfg, programme: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="text-xs text-muted-foreground">Team</span>
                <input
                  className="glass-input h-10 w-full mt-1 px-3 text-sm"
                  value={cfg.team}
                  maxLength={20}
                  onChange={(e) => setCfg({ ...cfg, team: e.target.value })}
                />
              </label>
              <label className="block col-span-2">
                <span className="text-xs text-muted-foreground">Nation</span>
                <input
                  className="glass-input h-10 w-full mt-1 px-3 text-sm"
                  value={cfg.nation}
                  maxLength={20}
                  onChange={(e) => setCfg({ ...cfg, nation: e.target.value })}
                />
              </label>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Card Accent</span>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {(["gold", "cyan"] as const).map((a) => (
                  <button
                    key={a}
                    onClick={() => setCfg({ ...cfg, accent: a })}
                    className={`h-9 rounded-lg text-sm font-semibold capitalize transition-colors ${
                      cfg.accent === a
                        ? "text-navy-deep"
                        : "border border-gold/15 text-white/70 hover:text-gold"
                    }`}
                    style={cfg.accent === a ? { background: a === "gold" ? "#ffd700" : "#00d4ff" } : {}}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
            {selected && (
              <p className="mono text-[11px] text-cyan">
                Selected: {selected.name} (OVR {selected.rating})
                {renderLoading && <span className="text-gold ml-2">· loading render…</span>}
                {!renderLoading && !renderUrl && <span className="text-muted-foreground ml-2">· no render found</span>}
              </p>
            )}
          </div>

          <PlayerSearchPanel
            players={players}
            loading={loading}
            onAdd={applyPlayer}
            title="Search Players"
            addLabel="Load"
          />
        </div>
      </div>
    </div>
  );
}
