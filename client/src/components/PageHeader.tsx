/* FC MOBILE 26 — shared glass tab header with fade+slide-up entrance (ideas.md) */
import { ReactNode } from "react";
import { motion } from "framer-motion";

interface PageHeaderProps {
  title: string;
  description: string;
  children?: ReactNode;
}

export default function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <motion.section
      className="page-enter container mb-8"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.23, 1, 0.32, 1] }}
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
            {title.split(" ").map((w, i) =>
              i === title.split(" ").length - 1 ? (
                <span key={i} className="text-gold">{w}</span>
              ) : (
                <span key={i}>{w} </span>
              ),
            )}
          </h1>
          <p className="mt-2 text-sm md:text-base text-muted-foreground max-w-xl">{description}</p>
        </div>
        {children && <div className="flex items-center gap-2">{children}</div>}
      </div>
    </motion.section>
  );
}
