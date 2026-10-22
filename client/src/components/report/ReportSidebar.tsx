import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ScanRecord, ScanStats } from '../../types/index.js';
import { totalEngines, respondedEngines, detectionPercent } from '../../lib/stats.js';

interface ReportSidebarProps {
  scan: ScanRecord;
}

const EMPTY_STATS: ScanStats = {
  malicious: 0,
  suspicious: 0,
  harmless: 0,
  undetected: 0,
  timeout: 0,
  failure: 0,
  unsupported: 0,
};

interface MiniRow {
  name: string;
  status: string;
  statusClass: string;
}

/**
 * Right-hand summary rail for the Full Report page. Mirrors the mockup: a small
 * "no threat" list, Danger/Warning cards, a detection donut, the Scan Another
 * CTA and the Clean/Undetected footer cards.
 */
export const ReportSidebar: React.FC<ReportSidebarProps> = ({ scan }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const vendors = scan.vendor_results || [];
  const stats = scan.stats || EMPTY_STATS;

  const totalEnginesCount = totalEngines(stats);
  const respondedCount = respondedEngines(stats);
  // Detection rate is measured against engines that actually answered, so a
  // scan with many timed-out engines doesn't understate the score. Shared
  // helper keeps this in lockstep with the scan result card.
  const detectedPercent = Math.round(detectionPercent(stats));

  // The mockup surfaces a few "safe looking" engines as a quick reassurance list.
  const miniRows: MiniRow[] = useMemo(() => {
    const cleanish = vendors.filter(
      (v) => v.category === 'harmless' || v.category === 'undetected'
    );
    return cleanish.slice(0, 6).map((v) => {
      const isUndetected = v.category === 'undetected';
      return {
        name: v.engine_name,
        status: isUndetected ? t('report.undetected') : t('report.sidebarNoThreat'),
        statusClass: isUndetected ? 'text-muted' : 'text-status-clean',
      };
    });
  }, [vendors, t]);

  // Donut geometry — a simple conic-gradient ring, no chart library needed.
  // Use the raw (unrounded) rate for the angle so the arc stays accurate even
  // when the displayed integer rounds down to 0%.
  const detectedAngle = (detectionPercent(stats) / 100) * 360;

  const dangerCount = stats.malicious;
  const warningCount = stats.suspicious;

  return (
    <div className="flex flex-col gap-5">
      {/* Quick "no threat" mini list */}
      {miniRows.length > 0 && (
        <div className="rounded-2xl bg-bg p-4 flex flex-col gap-2.5">
          {miniRows.map((row) => (
            <div key={row.name} className="flex items-center justify-between gap-3">
              <span className="text-[13px] font-semibold text-white truncate">
                {row.name}
              </span>
              <span className={`text-[11px] font-semibold shrink-0 ${row.statusClass}`}>
                {row.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Danger / Warning cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl overflow-hidden shadow-soft">
          <div className="bg-status-danger h-9 flex items-center justify-center">
            <span className="text-[12px] font-extrabold text-white">
              {t('scan.verdictDanger')}
            </span>
          </div>
          <div className="bg-bg px-3 py-3 text-center">
            <div className="text-white text-sm font-bold">
              {dangerCount} / {totalEnginesCount} {t('report.sidebarVendorUnit')}
            </div>
            <p className="mt-1.5 text-[10px] leading-snug text-muted">
              {t('report.sidebarDangerDesc')}
            </p>
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden shadow-soft">
          <div className="bg-status-warning h-9 flex items-center justify-center">
            <span className="text-[12px] font-extrabold text-white">
              {t('scan.verdictWarning')}
            </span>
          </div>
          <div className="bg-bg px-3 py-3 text-center">
            <div className="text-white text-sm font-bold">
              {warningCount} / {totalEnginesCount} {t('report.sidebarVendorUnit')}
            </div>
            <p className="mt-1.5 text-[10px] leading-snug text-muted">
              {t('report.sidebarWarningDesc')}
            </p>
          </div>
        </div>
      </div>
      {/* Detection donut */}
      <div className="flex items-center justify-center py-2">
        <div
          className="relative w-40 h-40 rounded-full flex items-center justify-center"
          style={{
            background: `conic-gradient(#FF4F79 0deg ${detectedAngle}deg, #412431 ${detectedAngle}deg 360deg)`,
          }}
        >
          <div className="absolute inset-[12px] rounded-full bg-bg flex flex-col items-center justify-center">
            <span className="text-[26px] font-extrabold text-white leading-none">
              {detectedPercent}%
            </span>
            <span className="text-[11px] font-semibold text-muted mt-0.5">
              {t('report.sidebarDetected')}
            </span>
            <span className="text-[10px] text-muted">
              {t('scan.respondingEnginesLabel', { total: respondedCount })}
            </span>
          </div>
        </div>
      </div>

      {/* Scan another CTA + Back */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/dashboard?tab=file&pick=1')}
          className="cta-sheen flex-1 py-3 rounded-btn bg-brand hover:bg-brand-accent text-white text-sm font-bold transition-all shadow-soft"
        >
          {t('report.sidebarScanAnother')}
        </button>
        <button
          onClick={() => navigate(`/scan/${scan.id}`)}
          className="py-3 px-5 rounded-btn bg-surface-alt hover:bg-surface text-white text-sm font-bold transition-all"
        >
          {t('report.sidebarBack')}
        </button>
      </div>

      {/* Clean / Undetected footer cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl overflow-hidden shadow-soft">
          <div className="bg-status-clean h-9 flex items-center justify-center">
            <span className="text-[12px] font-extrabold text-bg">
              {t('scan.verdictClean')}
            </span>
          </div>
          <div className="bg-bg px-3 py-3 text-center">
            <div className="text-white text-sm font-bold">
              {stats.harmless} / {totalEnginesCount} {t('report.sidebarVendorUnit')}
            </div>
            <p className="mt-1.5 text-[10px] leading-snug text-muted">
              {t('report.sidebarCleanDesc')}
            </p>
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden shadow-soft">
          <div className="bg-status-neutral h-9 flex items-center justify-center">
            <span className="text-[12px] font-extrabold text-white">
              {t('report.undetected')}
            </span>
          </div>
          <div className="bg-bg px-3 py-3 text-center">
            <div className="text-white text-sm font-bold">
              {stats.undetected} / {totalEnginesCount} {t('report.sidebarVendorUnit')}
            </div>
            <p className="mt-1.5 text-[10px] leading-snug text-muted">
              {t('report.sidebarUndetectedDesc')}
            </p>
          </div>
        </div>
      </div>

      <span className="text-center text-[10px] text-muted pt-1">
        {t('common.poweredBy')}
      </span>
    </div>
  );
};

