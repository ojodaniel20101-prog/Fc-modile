/*
 * FC MOBILE 26 — News (ideas.md)
 * Vertical list of glass cards: image thumbnail left, title + date right.
 * Hover: scale up + glow. Click: external link. Data from WP posts API, cached.
 */
import { useEffect, useState } from "react";
import { ExternalLink, Loader2, Newspaper } from "lucide-react";
import { motion } from "framer-motion";
import PageHeader from "@/components/PageHeader";
import { fetchNews, type NewsItem } from "@/lib/api";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function News() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchNews(14)
      .then((n) => {
        if (cancelled) return;
        setItems(n);
        setLoading(false);
        if (n.length === 0) setError("Could not load news.");
      })
      .catch(() => {
        if (cancelled) return;
        setError("Could not load news. Check your connection.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="container page-enter max-w-4xl">
      <PageHeader
        title="Latest News"
        description="Fresh from the mrbelieverhub feed — event guides, updates and tips for competitive FC Mobile 26 players."
      />

      {loading && (
        <p className="mono text-xs text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-gold" />
          Loading news...
        </p>
      )}
      {error && !loading && <p className="mono text-xs text-destructive">{error}</p>}

      <div className="space-y-4">
        {items.map((item, i) => {
          const featured = i === 0;
          return (
            <motion.a
              key={item.id}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.05, 0.4), duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className={`glass glass-hover group relative grid overflow-hidden ${
                featured ? "md:grid-cols-2 p-0 edge-lit" : "p-4 items-stretch gap-4"
              }`}
            >
              {featured && (
                <span className="absolute top-4 right-4 z-10 mono text-[10px] font-bold tracking-[0.25em] text-navy-deep bg-gold px-2.5 py-1 rounded">FEATURED</span>
              )}
              <div className={`relative overflow-hidden ${featured ? "h-52 md:h-full min-h-[180px]" : "h-24 w-28 md:w-36 shrink-0"} bg-navy-deep`}>
                {item.image ? (
                  <img
                    src={item.image}
                    alt=""
                    loading="lazy"
                    className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 ${featured ? "" : "border border-gold/15 rounded-lg"}`}
                  />
                ) : (
                  <span className={`h-full w-full grid place-items-center text-muted-foreground ${featured ? "border-b md:border-r md:border-b-0 border-gold/10" : ""}`}>
                    <Newspaper className="h-8 w-8 text-cyan/40" />
                  </span>
                )}
                {featured && <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#141428]/70 hidden md:block" />}
              </div>
              <div className={`flex flex-col justify-center py-0.5 ${featured ? "p-6 md:p-8 gap-3" : "flex-1 min-w-0"}`}>
                {featured && (
                  <span className="mono text-[10px] font-bold tracking-[0.3em] text-cyan-glow uppercase w-fit">Latest Dispatch</span>
                )}
                <h3 className={`${featured ? "text-lg md:text-xl" : "text-sm md:text-base"} font-extrabold text-white group-hover:text-gold transition-colors leading-snug`}>
                  {item.title}
                </h3>
                {!featured && item.excerpt && (
                  <p className="text-[12px] text-muted-foreground leading-relaxed mt-2 line-clamp-2">{item.excerpt}</p>
                )}
                <div className="flex items-center gap-3 mt-2">
                  <span className={`mono text-[11px] text-cyan`}>{formatDate(item.date)}</span>
                  <span className="h-1 w-1 rounded-full bg-gold/60" />
                  <span className="mono text-[10px] text-muted-foreground flex items-center gap-1">
                    mrbelieverhub
                    <ExternalLink className="h-3 w-3 text-white/40 group-hover:text-gold transition-colors" />
                  </span>
                </div>
              </div>
            </motion.a>
          );
        })}
      </div>

      {!loading && items.length === 0 && (
        <div className="glass p-12 text-center text-sm text-muted-foreground">
          No news available right now.
        </div>
      )}
    </div>
  );
}
