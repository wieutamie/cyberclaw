import React, { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
  /** Duration in ms. */
  duration?: number;
  className?: string;
}

/**
 * Counts up from 0 to `value` once on mount. Respects prefers-reduced-motion by
 * snapping straight to the final value. Purely presentational — safe to use for
 * KPI numbers to make dashboards feel "alive".
 */
export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  duration = 900,
  className = '',
}) => {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (reduce || value === 0) {
      setDisplay(value);
      return;
    }

    const start = performance.now();
    const from = 0;

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [value, duration]);

  return <span className={className}>{display}</span>;
};
