/*
 * FC MOBILE 26 — OVR Calculator (ideas.md)
 * Glass textarea input (space/comma/newline-separated OVR numbers),
 * large gold Calculate button, big gold result in glass container,
 * saved squads list below (from localStorage, shared with Squad Builder).
 */
import { useMemo, useState } from "react";
import { Calculator, Trash2 } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import { loadSquads, saveSquads, type SavedSquad } from "@/lib/api";

function parseNumbers(input: string): number[] {
  return input
    .split(/[\s,;|\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number)
    .filter((n) => !Number.isNaN(n) && n > 0 && n <= 99);
}

export default function OvrCalc() {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<{ id: number; text: string; avg: number; min: number; max: number; n: number }[]>([]);
  const [saved, setSaved] = useState<SavedSquad[]>(() => loadSquads());

  const nums = useMemo(() => parseNumbers(input), [input]);
  const computed = useMemo(() => {
    if (nums.length === 0) return null;
    const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
    return {
      avg: Math.round(avg * 10) / 10,
      avgInt: Math.round(avg),
      min: Math.min(...nums),
      max: Math.max(...nums),
      n: nums.length,
    };
  }, [nums]);

  const calculate = () => {
    if (!computed) {
      toast.error("Enter at least one OVR number (1–99)");
      return;
    }
    setHistory((h) => [
      { id: Date.now(), text: input.replace(/\n+/g, " ").slice(0, 60), avg: computed.avg, min: computed.min, max: computed.max, n: computed.n },
      ...h,
    ].slice(0, 8));
    toast.success(`Team OVR: ${computed.avgInt}`);
  };

  const clearHistory = () => setHistory([]);

  const deleteSquad = (createdAt: number) => {
    const next = saved.filter((s) => s.createdAt !== createdAt);
    setSaved(next);
    saveSquads(next);
    toast("Squad deleted");
  };

  return (
    <div className="container page-enter">
      <PageHeader
        title="OVR Calculator"
        description="Paste your players' OVR numbers to compute your team's average rating. Separate numbers with spaces, commas or new lines."
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* Left 3/5 — input + result */}
        <div className="lg:col-span-3 space-y-4">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={"e.g.\n96 94 93 91 90\n89, 88, 87, 86, 85, 99"}
            rows={7}
            className="glass-input w-full p-4 text-sm mono resize-y min-h-[150px]"
          />
          <button onClick={calculate} className="btn-gold w-full h-14 text-lg font-extrabold flex items-center justify-center gap-2 uppercase tracking-wide">
            <Calculator className="h-5 w-5" />
            Calculate OVR
          </button>

          {computed && (
            <div className="glass-strong edge-lit grid-overlay p-8 flex flex-col items-center gap-2" style={{ boxShadow: "0 0 60px rgba(255,215,0,0.15)" }}>
              <span className="mono text-8xl font-extrabold text-gold drop-shadow-[0_0_30px_rgba(255,215,0,0.55)]">
                {computed.avg}
              </span>
              <span className="mono text-xs text-cyan uppercase tracking-[0.3em]">Average Team OVR</span>
              <div className="mt-4 grid grid-cols-3 gap-6 w-full max-w-md text-center">
                <div>
                  <p className="mono text-2xl font-bold text-white">{computed.n}</p>
                  <p className="mono text-[10px] text-muted-foreground uppercase">Players</p>
                </div>
                <div>
                  <p className="mono text-2xl font-bold text-cyan">{computed.min}</p>
                  <p className="mono text-[10px] text-muted-foreground uppercase">Lowest</p>
                </div>
                <div>
                  <p className="mono text-2xl font-bold text-gold">{computed.max}</p>
                  <p className="mono text-[10px] text-muted-foreground uppercase">Highest</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right 2/5 — history + saved squads */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold tracking-widest text-gold uppercase">Recent Calculations</h3>
              {history.length > 0 && (
                <button onClick={clearHistory} className="mono text-[10px] text-white/50 hover:text-destructive transition-colors">
                  Clear
                </button>
              )}
            </div>
            {history.length === 0 && (
              <p className="text-xs text-muted-foreground py-4 text-center">No calculations yet.</p>
            )}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {history.map((h) => (
                <div key={h.id} className="glass-hover flex items-center gap-3 px-3 py-2 bg-white/[0.03] rounded-lg">
                  <span className="mono text-lg font-bold text-gold">{h.avg}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[11px] text-white/80 truncate">{h.text || "—"}</span>
                    <span className="mono text-[10px] text-muted-foreground">{h.n} players · {h.min}–{h.max}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {saved.length > 0 && (
            <div className="glass p-4">
              <h3 className="text-xs font-bold tracking-widest text-gold uppercase mb-3">Saved Squads OVR</h3>
              <div className="space-y-2">
                {saved.map((s) => {
                  const avg = s.players.reduce((a, p) => a + (p.rating || 0), 0) / s.players.length;
                  return (
                    <div key={s.createdAt} className="glass-hover flex items-center gap-3 px-3 py-2 bg-white/[0.03] rounded-lg">
                      <span className="mono text-lg font-bold text-gold">{Math.round(avg)}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[12px] font-semibold text-white truncate">{s.name}</span>
                        <span className="mono text-[10px] text-cyan">{s.formation} · 11 players</span>
                      </span>
                      <button onClick={() => deleteSquad(s.createdAt)} className="text-white/40 hover:text-destructive transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
