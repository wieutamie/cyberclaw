import React from "react";
import { useTranslation } from "react-i18next";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { AnalyticsDailyPoint, AnalyticsRange } from "../../types/index.js";

interface ScansLineProps {
  data: AnalyticsDailyPoint[];
  /** Active range; 7d renders weekday names instead of MM/DD. */
  range: AnalyticsRange;
  /** Caption rendered under the X axis, e.g. "Past 7 Days". */
  caption?: string;
}

/** Parse a YYYY-MM-DD day key into a *local* Date (avoids the UTC-midnight shift). */
function parseDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** ISO weekday index: Monday = 0 ... Sunday = 6. */
function isoWeekday(key: string): number {
  return (parseDayKey(key).getDay() + 6) % 7;
}

/** The four series the mockup draws — one per donut slice. */
const SERIES = [
  { key: "danger", color: "#FF0000", labelKey: "analytics.slice.danger", dot: false },
  { key: "warning", color: "#FF7300", labelKey: "analytics.slice.warning", dot: false },
  { key: "clean", color: "#11FF00", labelKey: "analytics.slice.clean", dot: true },
  { key: "undetected", color: "#64748B", labelKey: "analytics.slice.undetected", dot: false },
] as const;

export const ScansLine: React.FC<ScansLineProps> = ({ data, range, caption }) => {
  const { t, i18n } = useTranslation();
  const locale = (i18n.language || "en").split("-")[0];

  let shortFmt: Intl.DateTimeFormat | null = null;
  let weekdayFmt: Intl.DateTimeFormat | null = null;
  let fullFmt: Intl.DateTimeFormat | null = null;
  try {
    shortFmt = new Intl.DateTimeFormat(locale, { month: "2-digit", day: "2-digit" });
    weekdayFmt = new Intl.DateTimeFormat(locale, { weekday: "long" });
    fullFmt = new Intl.DateTimeFormat(locale, {
      weekday: "long",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    shortFmt = null;
    weekdayFmt = null;
    fullFmt = null;
  }

  // 7 days -> weekday names ("Monday"), longer ranges -> locale day keys.
  const axisLabel = (key: string) => {
    const day = parseDayKey(key);
    if (range === "7d") {
      return weekdayFmt
        ? weekdayFmt.format(day)
        : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
            day.getDay()
          ];
    }
    return shortFmt ? shortFmt.format(day) : key.slice(5);
  };

  // The mockup's axis always reads Monday -> Sunday, but the API returns a
  // rolling window ending today, which may start on any weekday. Rotating the
  // same seven points into ISO order keeps the axis tidy without changing
  // which days are shown.
  const ordered =
    range === "7d" ? [...data].sort((a, b) => isoWeekday(a.date) - isoWeekday(b.date)) : data;

  // Merge the three "no verdict" buckets into a single `undetected` series so
  // the chart shows exactly the four mockup lines (danger / warning / clean /
  // undetected) instead of six overlapping ones.
  const formattedData = ordered.map((d) => ({
    ...d,
    undetected: (d.notFound ?? 0) + (d.pending ?? 0) + (d.failed ?? 0),
    axisLabel: axisLabel(d.date),
  }));

  // The page owns the empty state, so an empty series just renders the frame.
  if (!data || data.length === 0) {
    return <div className="w-full h-64" aria-hidden="true" />;
  }

  return (
    <div className="w-full flex flex-col">
      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={formattedData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#412431" />
            <XAxis
              dataKey="axisLabel"
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              tickMargin={8}
              minTickGap={range === "7d" ? 0 : 24}
              interval={range === "7d" ? 0 : "preserveStartEnd"}
            />
            <YAxis
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              tickMargin={6}
              allowDecimals={false}
              width={36}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const point = payload[0].payload as AnalyticsDailyPoint & {
                    undetected: number;
                  };
                  return (
                    <div className="bg-surface border border-surface-alt p-3 rounded-lg shadow-xl text-xs flex flex-col gap-1">
                      <span className="font-semibold text-white border-b border-surface-alt pb-1 mb-1">
                        {fullFmt ? fullFmt.format(parseDayKey(point.date)) : point.date}
                      </span>
                      <span className="text-white">
                        {t("analytics.series.total")}:{" "}
                        <strong className="font-mono">{point.total}</strong>
                      </span>
                      <span className="text-status-danger">
                        {t("analytics.slice.danger")}:{" "}
                        <strong className="font-mono">{point.danger}</strong>
                      </span>
                      <span className="text-status-warning">
                        {t("analytics.slice.warning")}:{" "}
                        <strong className="font-mono">{point.warning}</strong>
                      </span>
                      <span className="text-status-clean">
                        {t("analytics.slice.clean")}:{" "}
                        <strong className="font-mono">{point.clean}</strong>
                      </span>
                      <span className="text-muted">
                        {t("analytics.slice.undetected")}:{" "}
                        <strong className="font-mono">{point.undetected}</strong>
                      </span>
                    </div>
                  );
                }
                return null;
              }}
            />
            {SERIES.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={t(s.labelKey)}
                stroke={s.color}
                strokeWidth={s.key === "clean" ? 2.5 : 1.75}
                dot={s.dot ? { r: 3.5, fill: s.color, strokeWidth: 0 } : false}
                activeDot={{ r: 5, fill: s.color, strokeWidth: 0 }}
                strokeDasharray={s.key === "undetected" ? "5 3" : undefined}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* The four colour keys live under the donut, exactly as in the mockup. */}
      {caption && (
        <p className="text-center text-xs font-extrabold text-white mt-2">{caption}</p>
      )}
    </div>
  );
};
