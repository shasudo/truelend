"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

export interface RevealProps {
  children: ReactNode;
  /** Seconds. Stagger siblings with 0.1 increments. */
  delay?: number;
  /** Animate on mount (heroes) instead of on scroll into view. */
  immediate?: boolean;
  className?: string;
}

export function Reveal({ children, delay = 0, immediate, className }: RevealProps) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      {...(immediate
        ? { animate: { opacity: 1, y: 0 } }
        : { whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-80px" } })}
      transition={{ duration: 0.55, delay, ease: [0.25, 1, 0.5, 1] }}
    >
      {children}
    </motion.div>
  );
}
