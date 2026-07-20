"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { cx } from "@truelend/ui";

interface RevealProps {
  children: ReactNode;
  /** Seconds. Stagger siblings with 0.1 increments. */
  delay?: number;
  /** Animate on mount (heroes) instead of on scroll into view. */
  immediate?: boolean;
  className?: string;
}

let revealObserver: IntersectionObserver | undefined;

function observeReveal(element: HTMLElement): () => void {
  if (!("IntersectionObserver" in window)) {
    element.dataset.visible = "true";
    return () => undefined;
  }
  revealObserver ??= new IntersectionObserver(
    (entries, observer) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        (entry.target as HTMLElement).dataset.visible = "true";
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -80px", threshold: 0.01 },
  );
  revealObserver.observe(element);
  return () => revealObserver?.unobserve(element);
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
    return observeReveal(element);
  }, [immediate]);

  return (
    <div
      ref={ref}
      data-visible={immediate ? "true" : undefined}
      className={cx("tl-reveal", className)}
      style={{ "--reveal-delay": `${delay}s` } as CSSProperties}
    >
      {children}
    </div>
  );
}
