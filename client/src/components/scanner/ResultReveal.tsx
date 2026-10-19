import React, { useEffect, useState } from 'react';

interface ResultRevealProps {
  /** Verdict drives the burst accent colour so the "gemash" matches the mood. */
  verdict?: 'danger' | 'warning' | 'clean';
}

const VERDICT_ACCENT: Record<string, string> = {
  danger: '#FF0000',
  warning: '#FF7300',
  clean: '#11FF00',
};

/** How many sparks radiate out of the burst, evenly spaced around the ring. */
const SPARK_COUNT = 10;

/**
 * ResultReveal — the playful "gemash" overlay shown the moment a finished
 * scan first appears. A squishy BufferCat springs up with a shockwave ring and
 * a halo of sparks, then the whole thing fades away on its own (see the
 * `.gemash-*` keyframes in globals.css). Purely decorative and non-blocking.
 *
 * It unmounts itself after the animation so it never lingers over the result,
 * and it only plays on the first mount (a finished scan re-rendered by polling
 * won't replay the burst).
 */
export const ResultReveal: React.FC<ResultRevealProps> = ({ verdict = 'clean' }) => {
  const [done, setDone] = useState(false);
  const accent = VERDICT_ACCENT[verdict] ?? VERDICT_ACCENT.clean;

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const id = window.setTimeout(() => setDone(true), reduce ? 350 : 1350);
    return () => window.clearTimeout(id);
  }, []);

  if (done) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center overflow-hidden"
    >
      {/* Soft radial glow behind the burst, tinted to the verdict. */}
      <div
        className="absolute w-[520px] h-[520px] rounded-full blur-2xl opacity-30"
        style={{ background: `radial-gradient(circle, ${accent}66 0%, transparent 68%)` }}
      />

      {/* Expanding shockwave ring. */}
      <div
        className="gemash-ring absolute w-56 h-56 rounded-full border-4"
        style={{ borderColor: accent }}
      />

      {/* BufferCat burst. */}
      <img
        src="/BufferCat.svg"
        alt=""
        className="gemash-cat relative w-56 sm:w-64 h-auto object-contain drop-shadow-[0_6px_18px_rgba(0,0,0,0.5)] select-none"
        draggable={false}
      />

      {/* Halo of sparks / paw-poofs radiating outward. */}
      {Array.from({ length: SPARK_COUNT }).map((_, i) => (
        <span
          key={i}
          className="gemash-spark absolute left-1/2 top-1/2 text-2xl"
          style={
            {
              '--angle': `${(360 / SPARK_COUNT) * i}deg`,
              animationDelay: `${i * 30}ms`,
            } as React.CSSProperties
          }
        >
          {i % 2 === 0 ? '✨' : '💥'}
        </span>
      ))}
    </div>
  );
};

export default ResultReveal;
