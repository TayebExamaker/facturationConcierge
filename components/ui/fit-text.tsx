"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Single-line text that shrinks its font to fit the available width instead
 * of overflowing, truncating or breaking mid-number — built for money values
 * whose length varies wildly ("€ 950.00" vs "US$ 11,690,078.26").
 *
 * `text` is the widest string the content will show (for an animated ticker:
 * its final value). It is measured off-screen at the base font size; the
 * visible content is scaled by `available / needed`, never above 1 or below
 * `min`.
 */
export interface FitTextProps {
  text: string;
  children?: React.ReactNode;
  className?: string;
  /** Smallest allowed scale (fraction of the base font size). */
  min?: number;
}

export function FitText({ text, children, className, min = 0.5 }: FitTextProps) {
  const boxRef = React.useRef<HTMLSpanElement>(null);
  const measureRef = React.useRef<HTMLSpanElement>(null);
  const [scale, setScale] = React.useState(1);

  React.useLayoutEffect(() => {
    const box = boxRef.current;
    const measure = measureRef.current;
    if (!box || !measure) return;
    const fit = () => {
      const available = box.clientWidth;
      const needed = measure.scrollWidth;
      if (!available || !needed) return;
      setScale(Math.max(min, Math.min(1, available / needed)));
    };
    fit();
    // Re-measure once Poppins has loaded — fallback-font widths differ.
    void document.fonts?.ready.then(fit);
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    return () => ro.disconnect();
  }, [text, min]);

  return (
    <span ref={boxRef} className={cn("relative block min-w-0 overflow-hidden whitespace-nowrap", className)}>
      <span
        ref={measureRef}
        aria-hidden="true"
        className="pointer-events-none invisible absolute left-0 top-0 whitespace-nowrap"
      >
        {text}
      </span>
      <span className="block" style={{ fontSize: `${scale}em` }}>
        {children ?? text}
      </span>
    </span>
  );
}

export default FitText;
