"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { cx } from "@truelend/ui";

export interface RevealProps {
  children: ReactNode;
  /** Seconds. Stagger siblings with 0.1 increments. */
  delay?: number;
  /** Animate on mount (heroes) instead of on scroll into view. */
  immediate?: boolean;
  className?: string;
}

export function Reveal({ children, delay = 0, immediate, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (immediate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      element.dataset.visible = "true";
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          element.dataset.visible = "true";
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -80px", threshold: 0.01 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [immediate]);

  return (
    <div
      ref={ref}
      className={cx("tl-reveal", className)}
      style={{ "--reveal-delay": `${delay}s` } as CSSProperties}
    >
      {children}
    </div>
  );
}
