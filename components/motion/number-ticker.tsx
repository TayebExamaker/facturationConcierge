"use client";

import * as React from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";

/**
 * Animated counter (adapted from 21st.dev "Number Ticker"). Tweens from the
 * previously displayed value to `value` whenever it changes, and renders each
 * frame through `format` — so money keeps its currency symbol and decimals
 * while it counts.
 */
export interface NumberTickerProps {
  value: number;
  format?: (n: number) => string;
  /** Seconds. */
  duration?: number;
  delay?: number;
  className?: string;
}

const defaultFormat = (n: number) => String(Math.round(n));

export function NumberTicker({
  value,
  format = defaultFormat,
  duration = 1.1,
  delay = 0,
  className,
}: NumberTickerProps) {
  const count = useMotionValue(0);
  const formatRef = React.useRef(format);
  formatRef.current = format;
  const display = useTransform(count, (v) => formatRef.current(v));

  React.useEffect(() => {
    const controls = animate(count, value, {
      duration,
      delay,
      ease: [0.16, 1, 0.3, 1],
    });
    return () => controls.stop();
  }, [count, value, duration, delay]);

  return <motion.span className={className}>{display}</motion.span>;
}

export default NumberTicker;
