import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import {
  HelpCircle,
  Copy,
  Check,
  RotateCcw,
  FileSearch,
  ArrowLeft,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import { formatDateTime, formatBytes, truncate } from '../../lib/format.js';
import { totalEngines } from '../../lib/stats.js';
import { playCatSound } from '../../lib/catSounds.js';
import { useSettings } from '../../context/SettingsContext.js';
import { ScanRecord } from '../../types/index.js';

interface ResultCardProps {
  scan: ScanRecord;
  onScanAnother: () => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({ scan, onScanAnother }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [copied, setCopied] = useState(false);

  // ── Reveal effect ─────────────────────────────────────────────────────────
  // When a finished result first appears, play the verdict-matched cat sound
  // ("gemash" reveal) once. Guarded by a ref so re-renders / polling never
  // replay it, and so React StrictMode's double-mount in dev stays silent.
  const soundPlayed = useRef(false);
  const verdictForSound =
    scan.state === 'not_found'
      ? null
      : scan.verdict === 'danger'
      ? 'danger'
      : scan.verdict === 'warning'
      ? 'warning'
      : 'clean';

  useEffect(() => {
    if (soundPlayed.current || !verdictForSound) return;
    soundPlayed.current = true;
    // Defer a tick so the zoom-in animation is on-screen before the meow lands.
    const id = window.setTimeout(() => playCatSound(verdictForSound), 220);
    return () => window.clearTimeout(id);
  }, [verdictForSound]);

  const stats = scan.stats || {
    malicious: 0,
    suspicious: 0,
    harmless: 0,
    undetected: 0,
    timeout: 0,
    failure: 0,
    unsupported: 0,
  };

  const totalEnginesCount = totalEngines(stats);
  // "Detected" = every engine that flagged a threat (malicious + suspicious),
  // so the donut center matches the verdict: 0% only when nothing flagged.
  const ratioPercent = totalEnginesCount > 0 ? ((stats.malicious + stats.suspicious) / totalEnginesCount) * 100 : 0;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // State: Not Found (hash)
  if (scan.state === 'not_found') {
    return (
      <div className="w-full max-w-[860px] mx-auto bg-surface border-2 border-muted rounded-card p-6 sm:p-8 shadow-card flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
        <div className="w-20 h-20 rounded-full bg-muted/20 text-muted flex items-center justify-center mb-4">
          <HelpCircle className="w-12 h-12" />
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">
          {t('scan.verdictNotFound')}
        </h2>
        <p className="text-sm text-gray-300 max-w-md mb-6 leading-relaxed">
          {t('scan.verdictNotFoundDesc')}
        </p>

        <div className="w-full p-4 rounded-xl bg-surface-alt font-mono text-xs text-muted break-all mb-6">
          {scan.item_label}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            onClick={() => navigate('/dashboard?tab=file')}
            className="flex-1 py-3 px-4 rounded-btn bg-brand hover:bg-brand-accent text-white font-bold text-sm shadow-soft transition-all flex items-center justify-center gap-2"
          >
            <FileSearch className="w-4 h-4" />
            <span>{t('scan.scanFileCta')}</span>
          </button>
          <button
            onClick={onScanAnother}
            className="flex-1 py-3 px-4 rounded-btn bg-surface-alt border border-brand-accent text-white font-semibold text-sm hover:bg-brand-accent transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t('common.scanAnother')}</span>
          </button>
        </div>
      </div>
    );
  }

  // State: Failed (real upstream error — no fabricated result)
  if (scan.state === 'failed') {
    return (
      <div className="w-full max-w-[860px] mx-auto bg-surface border-2 border-status-danger/60 rounded-card p-6 sm:p-8 shadow-card flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
        <div className="w-20 h-20 rounded-full bg-status-danger/20 text-status-danger flex items-center justify-center mb-4">
          <AlertTriangle className="w-12 h-12" />
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">
          {t('scan.scanFailedTitle')}
        </h2>
        <p className="text-sm text-gray-300 max-w-md mb-6 leading-relaxed">
          {t('scan.scanFailedDesc')}
        </p>

        <div className="w-full p-4 rounded-xl bg-surface-alt font-mono text-xs text-muted break-all mb-6">
          {scan.item_label}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            onClick={onScanAnother}
            className="flex-1 py-3 px-4 rounded-btn bg-brand hover:bg-brand-accent text-white font-bold text-sm shadow-soft transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t('scan.retryScan')}</span>
          </button>
          <button
            onClick={() => navigate('/dashboard?tab=history')}
            className="flex-1 py-3 px-4 rounded-btn bg-surface-alt border border-brand-accent text-white font-semibold text-sm hover:bg-brand-accent transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('scan.viewInHistory')}</span>
          </button>
        </div>
      </div>
    );
  }

  // Verdict configs
  const isDanger = scan.verdict === 'danger';
  const isWarning = scan.verdict === 'warning';
  // Verdict styling (per PRD §4.1): distinct semantic colors — danger #FF0000,
  // warning #FF7300, clean #11FF00. No glow. Clean text is dark ink so it stays
  // legible on the bright green.
  const verdictColor = isDanger
    ? 'text-status-danger'
    : isWarning
    ? 'text-status-warning'
    : 'text-status-clean';

  const verdictIllustration = isDanger
    ? '/Danger.svg'
    : isWarning
    ? '/Warning.svg'
    : '/Clean.svg';

  const verdictTitle = isDanger
    ? t('scan.verdictDanger')
    : isWarning
    ? t('scan.verdictWarning')
    : t('scan.verdictClean');

  const verdictDesc = isDanger
    ? t('scan.verdictDangerDesc', { count: stats.malicious, total: totalEnginesCount })
    : isWarning
    ? t('scan.verdictWarningDesc')
    : t('scan.verdictCleanDesc');

  // Playful, mockup-style one-liner shown under the donut.
  const verdictTagline = isDanger
    ? t('scan.taglineDanger')
    : isWarning
    ? t('scan.taglineWarning')
    : t('scan.taglineClean');

  const itemSha256 = scan.item_sha256 || scan.item_meta?.sha256;

  // Raw per-category buckets for the right-hand status cards. These mirror
  // VirusTotal's own labels exactly (harmless = engines that explicitly said
  // "no threat", undetected = engines with no opinion, etc.) so the cards stay
  // a faithful breakdown even though the ring above is percentage-based.
  const otherCount =
    (stats.timeout || 0) +
    (stats.failure || 0) +
    (stats.unsupported || 0);

  // Donut chart data (per PRD §4.1): danger #FF0000, warning #FF7300, clean
  // #11FF00. The ring is driven by the *detection percentage* — only engines
  // that actually flagged the item get a coloured arc (red = malicious,
  // orange = suspicious) and every remaining engine is green. That is the
  // correct reading of the verdict rules in server/lib/virustotal/verdict.ts,
  // where only `malicious` and `suspicious` can downgrade a result: harmless,
  // undetected, timeout, failure and unsupported are all non-threats. So a
  // clean scan renders as a fully green ring with no grey gap, a single
  // suspicious hit leaves a thin orange sliver, and a danger scan shows red.
  // (The right-hand cards still break the non-threat engines out in detail.)
  const flaggedCount = (stats.malicious || 0) + (stats.suspicious || 0);
  const remainderClean = Math.max(0, totalEnginesCount - flaggedCount);
  const donutData = [
    { name: t('scan.verdictDanger'), value: stats.malicious || 0, color: '#FF0000' },
    { name: t('scan.verdictWarning'), value: stats.suspicious || 0, color: '#FF7300' },
    { name: t('scan.verdictClean'), value: remainderClean, color: '#11FF00' },
  ].filter((d) => d.value > 0);

  // Right-column status cards — one per VirusTotal verdict bucket. Colored
  // header bar + count/total + a short, human-readable explanation.
  const statusCards: {
    key: string;
    label: string;
    count: number;
    headerClass: string;
    desc: string;
  }[] = [
    {
      key: 'danger',
      label: t('scan.verdictDanger'),
      count: stats.malicious,
      headerClass: 'bg-status-danger',
      desc: t('scan.cardDangerDesc'),
    },
    {
      key: 'warning',
      label: t('scan.verdictWarning'),
      count: stats.suspicious,
      headerClass: 'bg-status-warning',
      desc: t('scan.cardWarningDesc'),
    },
    {
      key: 'clean',
      label: t('scan.verdictClean'),
      // `undetected` counts as clean per the verdict rules (only malicious /
      // suspicious can downgrade a result), so it belongs in the green card —
      // otherwise the four cards never add up to the engine total.
      count: (stats.harmless || 0) + (stats.undetected || 0),
      headerClass: 'bg-status-clean',
      desc: t('scan.cardCleanDesc'),
    },
    {
      key: 'undetected',
      label: t('scan.verdictOther'),
      // Engines that returned no usable answer at all (timeout / failure /
      // unsupported). Shown separately for transparency, but they are still
      // non-threats, which is why the ring above stays green for them.
      count: otherCount,
      headerClass: 'bg-muted',
      desc: t('scan.cardUndetectedDesc'),
    },
  ];

  return (
    <div className="relative w-full max-w-[1320px] mx-auto bg-[#17183B]/45 border border-white/10 backdrop-blur-sm rounded-card p-5 sm:p-8 lg:p-10 shadow-card overflow-hidden result-card-pop">
      <div className="relative z-10 animate-fade-rise flex flex-col lg:flex-row items-center lg:items-stretch gap-8 lg:gap-12">
        {/* ── Left: illustration + file identity + report CTA ───────────── */}
        <div className="flex flex-col items-center justify-center gap-4 w-full lg:w-80 shrink-0 text-center">
          <img
            src={verdictIllustration}
            alt={verdictTitle}
            className="animate-float w-56 h-52 sm:w-64 sm:h-60 object-contain select-none pointer-events-none"
            draggable={false}
          />

          <div className="flex flex-col items-center gap-0.5">
            <span className="text-base font-medium text-white break-all">
              {scan.item_label}
            </span>
            {scan.item_meta?.size != null && (
              <span className="text-sm font-medium text-white/60">
                {formatBytes(scan.item_meta.size)}
              </span>
            )}
          </div>

          <button
            onClick={() => navigate(`/scan/${scan.id}/report`)}
            className="mt-1 inline-flex items-center gap-2 px-4 py-2.5 rounded-btn bg-bg/60 border border-surface-alt text-white text-sm font-semibold shadow-soft hover:bg-surface-alt transition-colors"
          >
            <span>{t('scan.viewFullReport')}</span>
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>

        {/* ── Center: big donut verdict + summary + scan again ──────────── */}
        <div className="flex flex-col items-center justify-center gap-5 w-full lg:flex-1 text-center">
          <div className="relative w-52 h-52 sm:w-60 sm:h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                {/* Faint full ring underlay so the donut always reads as a circle.
                    Radii are percentages of the container so the ring scales
                    proportionally across breakpoints instead of being locked to
                    a fixed pixel size. */}
                <Pie
                  data={[{ value: 1 }]}
                  cx="50%"
                  cy="50%"
                  innerRadius="84%"
                  outerRadius="100%"
                  dataKey="value"
                  stroke="none"
                  fill="rgba(255,255,255,0.06)"
                  isAnimationActive={false}
                />
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius="84%"
                  outerRadius="100%"
                  paddingAngle={donutData.length > 1 ? 2 : 0}
                  dataKey="value"
                  stroke="none"
                  startAngle={90}
                  endAngle={-270}
                >
                  {donutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                {/* Hover readout so each verdict slice shows its exact vendor count */}
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload as { name: string; value: number; color: string };
                      const pct = totalEnginesCount > 0 ? ((d.value / totalEnginesCount) * 100).toFixed(1) : '0.0';
                      return (
                        <div className="bg-surface-alt border border-surface px-3 py-1.5 rounded-lg shadow-lg text-xs">
                          <span className="font-semibold" style={{ color: d.color }}>
                            {d.name}:{' '}
                          </span>
                          <span className="font-mono text-white">{d.value}</span>
                          <span className="text-muted"> ({pct}%)</span>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Centered verdict readout */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4">
              <span className="text-4xl sm:text-5xl font-normal text-white leading-none tracking-tight">
                {Math.round(ratioPercent)}%
              </span>
              <span className="text-sm sm:text-base font-semibold text-white/85 mt-1">
                {t('scan.detectedLabel')}
              </span>
              <span className={`text-base sm:text-lg font-bold capitalize mt-0.5 ${verdictColor}`}>
                {verdictTitle}
              </span>
            </div>
          </div>

          <p className={`text-sm sm:text-base font-semibold max-w-xs leading-relaxed ${verdictColor}`}>
            {verdictTagline}
          </p>

          <p className="text-xs text-white/55 max-w-xs leading-relaxed -mt-2">
            {verdictDesc}
          </p>

          <button
            onClick={onScanAnother}
            className="cta-sheen inline-flex items-center gap-2 px-5 py-3 rounded-btn bg-brand hover:bg-brand-accent text-white text-sm font-bold shadow-soft transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t('common.scanAnother')}</span>
          </button>
        </div>

        {/* ── Right: per-status cards (Danger / Warning / Clean / Other) ──
            Kept off the card edge with its own inset so the column never looks
            glued to the border, and given a slightly wider gap between cards. */}
        <div className="flex flex-col gap-3.5 w-full lg:w-64 shrink-0 justify-center lg:pl-4 lg:pr-2">
          {statusCards.map((card) => (
            <div key={card.key} className="rounded-2xl overflow-hidden shadow-soft">
              <div className={`${card.headerClass} h-11 flex items-center justify-center`}>
                {/* Clean header is bright green → use dark ink for legibility;
                    danger/warning/other keep white text (per PRD §4.1). */}
                <span
                  className={`text-sm font-extrabold ${
                    card.key === 'clean' ? 'text-bg' : 'text-white'
                  }`}
                >
                  {card.label}
                </span>
              </div>
              <div className="bg-surface-alt px-4 py-3 text-center">
                <div className="text-white text-sm font-normal">
                  <span className="font-bold">{card.count}</span>
                  <span className="text-white/70"> / {totalEnginesCount} Vendor</span>
                </div>
                <p className="text-white text-[10px] leading-snug mt-1.5">{card.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Item Metadata Box */}
      <div className="w-full bg-surface-alt/50 rounded-xl p-4 border border-surface-alt mb-6 text-left flex flex-col gap-2 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-muted">Item:</span>
          <span className="font-mono text-white font-medium truncate max-w-[280px]">
            {scan.item_label}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-muted">Type / Scan Time:</span>
          <span className="text-gray-300">
            <span className="uppercase font-semibold text-brand-accent">{scan.type}</span> ·{' '}
            {formatDateTime(
              scan.item_meta?.last_analysis_date ??
                scan.completed_at ??
                scan.created_at,
              settings.timezone,
              settings.time_format
            )}
          </span>
        </div>

        {itemSha256 && (
          <div className="flex justify-between items-center pt-2 border-t border-surface-alt">
            <span className="text-muted">SHA-256:</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-gray-300">
                {truncate(itemSha256, 24)}
              </span>
              <button
                onClick={() => handleCopy(itemSha256)}
                className="p-1 rounded bg-surface hover:bg-surface-alt text-muted hover:text-white transition-colors"
                title="Copy SHA-256"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-status-clean" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Secondary navigation — the primary CTAs live in the hero above */}
      <div className="flex flex-col gap-3 w-full mb-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="w-full py-2.5 px-4 rounded-btn bg-transparent border border-surface-alt text-muted hover:text-white hover:border-muted text-xs font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('common.back')} · Dashboard</span>
        </button>
      </div>

      {/* Indicative Disclaimer */}
      <span className="text-[11px] text-muted italic">
        {t('dashboard.disclaimer')}
      </span>
    </div>
  );
};
