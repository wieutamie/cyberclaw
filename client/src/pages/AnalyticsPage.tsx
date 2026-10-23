import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock } from 'lucide-react';
import { api } from '../lib/api.js';
import { formatDateTime, truncate } from '../lib/format.js';
import { useSettings } from '../context/SettingsContext.js';
import { StatusDonut } from '../components/charts/StatusDonut.js';
import { ScansLine } from '../components/charts/ScansLine.js';
import { LoadingState } from '../components/ui/LoadingState.js';
import type { AnalyticsRange, AnalyticsResponse, ScanRecord } from '../types/index.js';

/** Verdict / state label key for the Recent Activity Log status column. */
function statusKey(act: ScanRecord): string {
  if (act.verdict) return `analytics.slice.${act.verdict}`;
  if (act.state === 'not_found') return 'analytics.slice.notFound';
  if (act.state === 'failed' || act.state === 'timeout') return 'analytics.slice.failed';
  if (act.state === 'cancelled') return 'analytics.slice.cancelled';
  return 'analytics.slice.pending';
}

/** Colour class for the status column, mirroring the mockup. */
function statusColor(act: ScanRecord): string {
  if (act.verdict === 'danger') return 'text-status-danger';
  if (act.verdict === 'warning') return 'text-status-warning';
  if (act.verdict === 'clean') return 'text-status-clean';
  if (act.state === 'failed' || act.state === 'timeout') return 'text-status-danger';
  return 'text-muted';
}

export const AnalyticsPage: React.FC = () => {
  const { t } = useTranslation();
  const { settings } = useSettings();

  const [range, setRange] = useState<AnalyticsRange>('7d');
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      try {
        const res = await api.getAnalytics(range);
        setData(res);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [range]);

  const recentActivities: ScanRecord[] = data?.recent || [];
  const totalScans = data?.kpi?.totalScans ?? 0;
  // A single page-level empty state: with zero scans the donut and the line
  // would each render their own "no data" text, so the mockup's one message
  // is rendered here instead and both charts are skipped.
  const hasData = totalScans > 0;

  /** Human label for the scanned item's type, using VT's own description. */
  const typeLabel = (act: ScanRecord) => {
    if (act.type === 'url') return t('analytics.type.url');
    if (act.type === 'hash') return t('analytics.type.hash');
    const desc = act.item_meta?.type_description;
    return desc ? String(desc) : t('analytics.type.file');
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1200px] mx-auto">
      {/* Title + range filters, matching the mockup's single heading line. */}
      <div className="animate-fade-rise flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {t('analytics.title')}
        </h1>

        <div
          role="group"
          aria-label={t('analytics.rangeLabel')}
          className="flex items-center gap-1.5 p-1 rounded-xl bg-surface border border-surface-alt self-start sm:self-auto"
        >
          {(['7d', '30d', '90d'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              aria-pressed={range === r}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                range === r
                  ? 'bg-brand text-white shadow-soft scale-105'
                  : 'text-muted hover:text-white hover:bg-surface-alt/60'
              }`}
            >
              {t(`analytics.range${r}`)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingState label={t('common.loading')} className="min-h-[40vh]" />
      ) : (
        <>
          {/*
            Single combined panel: donut on the left, daily line on the right.
            This mirrors the mockup, which shows both charts inside one
            rounded card rather than two separate cards. The surface is
            intentionally translucent (mockup: `bg-zinc-800/60` + soft outline)
            so the app watermark reads faintly through the card.
          */}
          <div className="animate-fade-rise bg-surface/55 backdrop-blur-[3px] border border-white/10 rounded-card p-5 sm:p-6 shadow-card">
            {hasData ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-4 flex items-center justify-center">
                  <StatusDonut data={data?.donut || []} />
                </div>
                <div className="lg:col-span-8">
                  <ScansLine
                    data={data?.daily || []}
                    range={range}
                    caption={t('analytics.pastRange', { range: t(`analytics.range${range}`) })}
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted text-center py-16">
                {t('common.noDataPeriod')}
              </p>
            )}
          </div>

          {/* Recent Activity Log — four columns, as in the mockup. */}
          <div className="animate-fade-rise [animation-delay:120ms] bg-surface/55 backdrop-blur-[3px] border border-white/10 rounded-card p-5 sm:p-6 shadow-card flex flex-col gap-4 transition-shadow duration-300 hover:shadow-[0_14px_36px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10">
              <h2 className="text-lg font-bold text-white">
                {t('analytics.recentActivity')}
              </h2>
              <span className="flex items-center gap-1.5 text-[11px] text-muted font-semibold whitespace-nowrap">
                <Clock className="w-3.5 h-3.5" />
                {t('analytics.totalLabel', { count: totalScans })}
              </span>
            </div>

            {recentActivities.length === 0 ? (
              <p className="text-xs text-muted py-6 text-center">
                {t('analytics.noData')}
              </p>
            ) : (
              /*
                Scrollable body with a sticky header: the mockup's log is taller
                than the card, so rows scroll under a pinned column header
                instead of stretching the page. `max-h` keeps the panel compact
                on both desktop and mobile.
              */
              <div className="max-h-[22rem] overflow-y-auto overflow-x-auto rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="text-white font-black text-sm bg-[#4E2640]/95 backdrop-blur-sm">
                      <th scope="col" className="py-2.5 px-3 font-black">
                        {t('analytics.colTimestamp')}
                      </th>
                      <th scope="col" className="py-2.5 px-3 font-black">
                        {t('analytics.colItem')}
                      </th>
                      <th scope="col" className="py-2.5 px-3 font-black">
                        {t('analytics.colType')}
                      </th>
                      <th scope="col" className="py-2.5 px-3 font-black">
                        {t('analytics.colStatus')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {recentActivities.map((act) => (
                      <tr key={act.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-3 text-gray-300 whitespace-nowrap font-mono text-[11px]">
                          {formatDateTime(
                            act.created_at,
                            settings.timezone,
                            settings.time_format
                          )}
                        </td>
                        <td className="py-3 px-3 text-white font-medium">
                          {truncate(act.item_label, 30)}
                        </td>
                        <td className="py-3 px-3 text-gray-300">{typeLabel(act)}</td>
                        <td className={`py-3 px-3 font-bold ${statusColor(act)}`}>
                          {t(statusKey(act))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
