import React from 'react';

interface BrandLogoProps {
  /** Tailwind size classes untuk logo mark, e.g. "w-16 h-14" (aspect ratio 6:5, landscape) */
  markClassName?: string;
  /** Wordmark size classes, e.g. "text-2xl" */
  wordClassName?: string;
  /** Show the "Security Inspector via VirusTotal API v3" tagline */
  showTagline?: boolean;
  /**
   * Stack the two wordmark lines:
   *   CYBER
   *   CLAW
   * Jika false, tampil inline: CYBER CLAW
   */
  stacked?: boolean;
  /** Extra className untuk wrapper div */
  className?: string;
}

/**
 * Cyber Claw brand lockup: logo mark + "CYBER CLAW" wordmark + optional tagline.
 * Uses the CyberClaw logo mark (public/LogoCC.svg) – aspect ratio 6:5 (landscape).
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  // Logo mark is 6:5 (landscape, see public/LogoCC.svg). Keep both dimensions on
  // the same 6:5 grid so the mark never looks squashed/stretched.
  markClassName = 'w-12 h-10',
  wordClassName = 'text-2xl',
  showTagline = false,
  stacked = false,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Logo mark */}
      <img
        src="/LogoCC.svg"
        alt=""
        aria-hidden="true"
        width={180}
        height={150}
        className={`${markClassName} shrink-0 object-contain select-none brightness-0 invert`}
        draggable={false}
      />

      {/* Wordmark */}
      <div className="flex flex-col justify-center items-start min-w-0 text-left">
        {stacked ? (
          <>
            <span
              className={`${wordClassName} font-display font-extrabold tracking-[0.06em] text-white leading-[0.95]`}
            >
              CYBER
            </span>
            <span
              className={`${wordClassName} font-display font-extrabold tracking-[0.06em] text-white leading-[0.95]`}
            >
              CLAW
            </span>
          </>
        ) : (
          <span
            className={`${wordClassName} font-display font-extrabold tracking-wide text-white leading-none whitespace-nowrap`}
          >
            CYBER CLAW
          </span>
        )}

        {showTagline && (
          <span className="text-[10px] sm:text-xs font-semibold text-white/85 mt-0.5 whitespace-nowrap tracking-wide">
            Security Inspector via VirusTotal API v3
          </span>
        )}
      </div>
    </div>
  );
};
