import React, { useMemo } from 'react';
import { VendorResult, VendorCategory } from '../../types/index.js';

interface VendorReportListProps {
  vendors: VendorResult[];
}

interface RowStyle {
  /** Colour applied to the engine's raw result text. */
  resultColor: string;
  /** Plain-language status word shown in the right-hand column. */
  statusLabel: string;
  /** Colour applied to the status word. */
  statusColor: string;
}

/**
 * Map every engine verdict onto the three fixed columns the mockup uses:
 * engine name (white) · raw result (coloured) · plain status word (coloured).
 * Anything we cannot positively classify reads as "Undetected" so the list
 * never shows a blank cell.
 */
const CATEGORY_STYLE: Record<string, RowStyle> = {
  malicious: {
    resultColor: 'text-status-danger',
    statusLabel: 'Detected',
    statusColor: 'text-status-danger',
  },
  suspicious: {
    resultColor: 'text-status-warning',
    statusLabel: 'Detected',
    statusColor: 'text-status-warning',
  },
  harmless: {
    resultColor: 'text-status-clean',
    statusLabel: 'No Threat',
    statusColor: 'text-status-clean',
  },
  undetected: {
    resultColor: 'text-status-clean',
    statusLabel: 'No Threat',
    statusColor: 'text-status-clean',
  },
  timeout: {
    resultColor: 'text-muted',
    statusLabel: 'Undetected',
    statusColor: 'text-muted',
  },
  'confirmed-timeout': {
    resultColor: 'text-status-warning',
    statusLabel: 'Detected',
    statusColor: 'text-status-warning',
  },
  failure: {
    resultColor: 'text-muted',
    statusLabel: 'Undetected',
    statusColor: 'text-muted',
  },
  'type-unsupported': {
    resultColor: 'text-muted',
    statusLabel: 'Undetected',
    statusColor: 'text-muted',
  },
};

const styleFor = (category: VendorCategory): RowStyle =>
  CATEGORY_STYLE[category] || CATEGORY_STYLE.undetected;

/**
 * Full-scanner vendor breakdown, laid out exactly like the mockup: three
 * side-by-side columns, each row a single line of
 * `Engine name · Result · Status`. Columns are split evenly (not
 * worst-first) so the alphabetical list reads top-to-bottom, left-to-right
 * just like the reference.
 */
export const VendorReportList: React.FC<VendorReportListProps> = ({ vendors }) => {
  // Keep the vendor list alphabetical, matching the mockup ordering.
  const ordered = useMemo(
    () =>
      [...vendors].sort((a, b) => a.engine_name.localeCompare(b.engine_name)),
    [vendors]
  );

  // Split into three contiguous columns so reading order flows down column 1,
  // then column 2, then column 3.
  const columns = useMemo(() => {
    const perColumn = Math.ceil(ordered.length / 3) || 1;
    const buckets: VendorResult[][] = [[], [], []];
    ordered.forEach((vendor, i) => {
      buckets[Math.min(Math.floor(i / perColumn), 2)].push(vendor);
    });
    return buckets;
  }, [ordered]);

  if (ordered.length === 0) {
    return (
      <p className="text-sm text-white/70 text-center py-10">
        Tidak ada data scanner.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Column legend — keeps the three-column scan readable at a glance. */}
      <div className="flex items-center justify-between gap-3 border-b border-surface-alt pb-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-bold uppercase tracking-wider text-muted">
          <span>Engine</span>
          <span>Result</span>
          <span>Status</span>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
          {ordered.length} engines
        </span>
      </div>

      <div className="grid grid-cols-1 gap-x-8 gap-y-1 md:grid-cols-3 lg:gap-x-10">
      {columns.map((column, colIndex) => (
        <div key={colIndex} className="flex flex-col gap-1">
          {column.map((vendor) => {
            const style = styleFor(vendor.category);
            const resultText =
              vendor.result && vendor.result.trim() ? vendor.result : '—';
            return (
              <div
                key={vendor.engine_name}
                className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface/60"
              >
                <span
                  className="text-[12.5px] font-semibold text-white truncate"
                  title={vendor.engine_name}
                >
                  {vendor.engine_name}
                </span>
                <span
                  className={`text-[12px] font-semibold truncate ${style.resultColor}`}
                  title={resultText}
                >
                  {resultText}
                </span>
                <span
                  className={`text-[12px] font-semibold whitespace-nowrap text-right min-w-[80px] ${style.statusColor}`}
                >
                  {style.statusLabel}
                </span>
              </div>
            );
          })}
        </div>
      ))}
      </div>
    </div>
  );
};
