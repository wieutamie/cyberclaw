import React from 'react';
import { useTranslation } from 'react-i18next';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { AnalyticsDonutSlice } from '../../types/index.js';

interface StatusDonutProps {
  data: AnalyticsDonutSlice[];
}

export const StatusDonut: React.FC<StatusDonutProps> = ({ data }) => {
  const { t } = useTranslation();
  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  // Server sends a stable `key`; older cached payloads may only have `name`,
  // so fall back to the lowercased name before giving up.
  const labelFor = (item: AnalyticsDonutSlice) => {
    const key =
      item.key || (item.name ? item.name.toLowerCase().replace(/\s+/g, '') : '');
    const translated = key ? t(`analytics.slice.${key}`, { defaultValue: '' }) : '';
    return translated || item.name;
  };

  // The page owns the empty state, so a zero-total donut renders just the ring
  // frame (no second "no data" message stacked on top of the page one).
  if (total === 0) {
    return <div className="w-full h-64" aria-hidden="true" />;
  }

  const visible = data.filter((d) => d.value > 0);
  const pctOf = (v: number) => (total > 0 ? (v / total) * 100 : 0);

  return (
    <div className="flex flex-col items-center justify-center gap-3 h-full min-h-[16rem]">
      <div className="relative w-full max-w-[15rem] aspect-square">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload as AnalyticsDonutSlice;
                  const pct = pctOf(d.value).toFixed(1);
                  return (
                    <div className="bg-surface-alt border border-surface px-3 py-1.5 rounded-lg shadow-lg text-xs">
                      <div>
                        <span className="font-semibold text-white">{labelFor(d)}: </span>
                        <span className="font-mono text-brand-accent">{d.value}</span>
                        <span className="text-muted"> ({pct}%)</span>
                      </div>
                      {d.breakdown && (
                        <div className="mt-1 pt-1 border-t border-surface text-[11px] text-muted flex flex-col gap-0.5">
                          <span>
                            {t('analytics.slice.notFound')}: {d.breakdown.notFound}
                          </span>
                          <span>
                            {t('analytics.slice.pending')}: {d.breakdown.pending}
                          </span>
                          <span>
                            {t('analytics.slice.failed')}: {d.breakdown.failed}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Pie
              data={visible}
              cx="50%"
              cy="50%"
              innerRadius="55%"
              outerRadius="95%"
              paddingAngle={2}
              dataKey="value"
              labelLine={false}
              label={({ percent, index }) => {
                const item = visible[index as number];
                if (!item || pctOf(item.value) < 6) return '';
                return `${Math.round((percent || 0) * 100)}%`;
              }}
            >
              {visible.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  stroke="#17183B"
                  strokeWidth={2}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend below the ring, matching the mockup: colour dot + label. */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px]">
        {visible.map((item) => (
          <div key={labelFor(item)} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-gray-300 font-semibold">{labelFor(item)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
