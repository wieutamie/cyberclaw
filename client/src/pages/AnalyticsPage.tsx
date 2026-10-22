import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ShieldAlert,
  AlertTriangle,
  ShieldCheck,
  Activity,
  TrendingUp,
  PieChart as PieIcon,
  HelpCircle,
  Clock,
  XCircle,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { formatDateTime, truncate } from '../lib/format.js';
import { useSettings } from '../context/SettingsContext.js';
import { StatusDonut } from '../components/charts/StatusDonut.js';
import { ScansLine } from '../components/charts/ScansLine.js';
import { AnimatedNumber } from '../components/ui/AnimatedNumber.js';
import { LoadingState } from '../components/ui/LoadingState.js';
import { ScanRecord } from '../types/index.js';

export const AnalyticsPage: React.FC = () => {
  const { t } = useTranslation();
  const { settings } = useSettings();

  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [data, setData] = useState<any>(null);
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

  const kpi = data?.kpi || { totalScans: 0, danger: 0, warning: 0, clean: 0 };
  const recentActivities: ScanRecord[] = data?.recent || [];

  return (
    <div className="flex flex-col gap-8 max-w-[1200px] mx-auto">
      {/* Header & Range Filters */}
      <div className="animate-fade-rise flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {t('analytics.title')}
          </h1>
          <p className="text-xs text-muted mt-1">
            Ringkasan dan tren pemindaian keamanan akun Anda.
          </p>
        </div>

        {/* Range Filter Buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface border border-surface-alt self-start sm:self-auto">
          {(['7d', '30d', '90d'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
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
          {/* KPI Cards (4) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
            <div className="animate-fade-rise bg-surface border border-surface-alt rounded-card p-5 shadow-card flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:border-brand-accent/40 hover:shadow-[0_14px_36px_rgba(0,0,0,0.4)]">
              <div className="flex items-center justify-between text-muted mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  {t('analytics.totalScans')}
                </span>
                <Activity className="w-4 h-4 text-brand-accent" />
              </div>
              <span className="text-3xl font-bold font-mono text-white">
                <AnimatedNumber value={kpi.totalScans} />
              </span>
            </div>

            <div className="animate-fade-rise [animation-delay:60ms] bg-surface border border-surface-alt rounded-card p-5 shadow-card flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:border-status-danger/40 hover:shadow-[0_14px_36px_rgba(0,0,0,0.4)]">
              <div className="flex items-center justify-between text-muted mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  {t('analytics.dangerScans')}
                </span>
                <ShieldAlert className="w-4 h-4 text-status-danger" />
              </div>
              <span className="text-3xl font-bold font-mono text-status-danger">
                <AnimatedNumber value={kpi.danger} />
              </span>
            </div>

            <div className="animate-fade-rise [animation-delay:120ms] bg-surface border border-surface-alt rounded-card p-5 shadow-card flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:border-status-warning/40 hover:shadow-[0_14px_36px_rgba(0,0,0,0.4)]">
              <div className="flex items-center justify-between text-muted mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  {t('analytics.warningScans')}
                </span>
                <AlertTriangle className="w-4 h-4 text-status-warning" />
              </div>
              <span className="text-3xl font-bold font-mono text-status-warning">
                <AnimatedNumber value={kpi.warning} />
              </span>
            </div>

            <div className="animate-fade-rise [animation-delay:180ms] bg-surface border border-surface-alt rounded-card p-5 shadow-card flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:border-status-clean/40 hover:shadow-[0_14px_36px_rgba(0,0,0,0.4)]">
              <div className="flex items-center justify-between text-muted mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  {t('analytics.cleanScans')}
                </span>
                <ShieldCheck className="w-4 h-4 text-status-clean" />
              </div>
              <span className="text-3xl font-bold font-mono text-status-clean">
                <AnimatedNumber value={kpi.clean} />
              </span>
            </div>
          </div>

          {/*
            Breakdown strip for the non-verdict outcomes. These are deliberately
            NOT KPI cards: they are not verdicts, they are "work not yet done".
            They exist so that Total Scans is fully accounted for — every scan
            in the range lands in exactly one of Danger / Warning / Clean /
            Not Found / Pending / Failed, which is the same sum the donut shows.
          */}
          <div className="animate-fade-rise [animation-delay:200ms] grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-surface/60 border border-surface-alt rounded-xl px-5 py-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-muted">
                <HelpCircle className="w-3.5 h-3.5" />
                <span className="text-[11px] font-semibold uppercase tracking-wider">
                  {t('analytics.notFoundScans')}
                </span>
              </div>
              <span className="text-lg font-bold font-mono text-[#94A3B8]">
                <AnimatedNumber value={kpi.notFound ?? 0} />
              </span>
            </div>

            <div className="bg-surface/60 border border-surface-alt rounded-xl px-5 py-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-muted">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-[11px] font-semibold uppercase tracking-wider">
                  {t('analytics.pendingScans')}
                </span>
              </div>
              <span className="text-lg font-bold font-mono text-[#38BDF8]">
                <AnimatedNumber value={kpi.pending ?? 0} />
              </span>
            </div>

            <div className="bg-surface/60 border border-surface-alt rounded-xl px-5 py-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-muted">
                <XCircle className="w-3.5 h-3.5" />
                <span className="text-[11px] font-semibold uppercase tracking-wider">
                  {t('analytics.failedScans')}
                </span>
              </div>
              <span className="text-lg font-bold font-mono text-[#B91C1C]">
                <AnimatedNumber value={kpi.failed ?? 0} />
              </span>
            </div>
          </div>

          {/* Charts Row: Donut + Line */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Status Donut Chart: 5/12 */}
            <div className="animate-fade-rise [animation-delay:220ms] lg:col-span-5 bg-surface border border-surface-alt rounded-card p-5 sm:p-6 shadow-card flex flex-col justify-between transition-shadow duration-300 hover:shadow-[0_14px_36px_rgba(0,0,0,0.4)]">
              <div className="flex items-center gap-2 pb-3 border-b border-surface-alt mb-2">
                <PieIcon className="w-4 h-4 text-brand-accent" />
                <h3 className="text-sm font-bold text-white">
                  {t('analytics.donutTitle')}
                </h3>
              </div>
              <StatusDonut data={data?.donut || []} />
            </div>

            {/* Daily Scans Line Chart: 7/12 */}
            <div className="animate-fade-rise [animation-delay:260ms] lg:col-span-7 bg-surface border border-surface-alt rounded-card p-5 sm:p-6 shadow-card flex flex-col justify-between transition-shadow duration-300 hover:shadow-[0_14px_36px_rgba(0,0,0,0.4)]">
              <div className="flex items-center gap-2 pb-3 border-b border-surface-alt mb-2">
                <TrendingUp className="w-4 h-4 text-brand-accent" />
                <h3 className="text-sm font-bold text-white">
                  {t('analytics.lineTitle')}
                </h3>
              </div>
              <ScansLine data={data?.daily || []} />
            </div>
          </div>

          {/* Recent Activity Log Table */}
          <div className="animate-fade-rise [animation-delay:300ms] bg-surface border border-surface-alt rounded-card p-5 sm:p-6 shadow-card flex flex-col gap-4 transition-shadow duration-300 hover:shadow-[0_14px_36px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between pb-3 border-b border-surface-alt">
              <h3 className="text-sm font-bold text-white">
                {t('analytics.recentActivity')}
              </h3>
            </div>

            {recentActivities.length === 0 ? (
              <p className="text-xs text-muted py-6 text-center">
                {t('analytics.noData')}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-muted border-b border-surface-alt">
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Activity</th>
                      <th className="py-2.5 px-3">Item</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3 text-right">Verdict</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-alt/60">
                    {recentActivities.map((act) => (
                      <tr key={act.id} className="hover:bg-surface-alt/40 transition-colors">
                        <td className="py-3 px-3 text-gray-400 whitespace-nowrap">
                          {formatDateTime(
                            act.created_at,
                            settings.timezone,
                            settings.time_format
                          )}
                        </td>
                        <td className="py-3 px-3 text-white font-medium">
                          Scanned {act.type}
                        </td>
                        <td className="py-3 px-3 font-mono text-gray-300">
                          {truncate(act.item_label, 30)}
                        </td>
                        <td className="py-3 px-3 uppercase text-brand-accent font-semibold">
                          {act.type}
                        </td>
                        <td className="py-3 px-3 text-right font-bold capitalize">
                          {act.verdict === 'danger' && (
                            <span className="text-status-danger">Danger</span>
                          )}
                          {act.verdict === 'warning' && (
                            <span className="text-status-warning">Warning</span>
                          )}
                          {act.verdict === 'clean' && (
                            <span className="text-status-clean">Clean</span>
                          )}
                          {!act.verdict && act.state === 'not_found' && (
                            <span className="text-muted">Not Found</span>
                          )}
                          {!act.verdict && act.state === 'failed' && (
                            <span className="text-status-danger">Failed</span>
                          )}
                          {!act.verdict &&
                            act.state !== 'not_found' &&
                            act.state !== 'failed' && (
                              <span className="text-muted capitalize">
                                {act.state.replace('_', ' ')}
                              </span>
                            )}
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
