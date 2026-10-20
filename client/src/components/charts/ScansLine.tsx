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
  Legend,
} from "recharts";

interface DailyData {
  date: string;
  total: number;
  danger: number;
  warning: number;
  clean: number;
}

interface ScansLineProps {
  data: DailyData[];
}

/** Parse a YYYY-MM-DD day key into a *local* Date (avoids the UTC-midnight shift). */
function parseDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export const ScansLine: React.FC<ScansLineProps> = ({ data }) => {
  const { i18n } = useTranslation();
  const locale = (i18n.language || "en").split("-")[0];

  // Day keys follow the active locale layout (en -> MM/DD, id -> DD/MM) so the
  // chart stays consistent with every other timestamp in the app.
  let shortFmt: Intl.DateTimeFormat | null = null;
  let fullFmt: Intl.DateTimeFormat | null = null;
  try {
    shortFmt = new Intl.DateTimeFormat(locale, { month: "2-digit", day: "2-digit" });
    fullFmt = new Intl.DateTimeFormat(locale, { year: "numeric", month: "2-digit", day: "2-digit" });
  } catch {
    shortFmt = null;
    fullFmt = null;
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted text-sm">
        No data available for this period
      </div>
    );
  }

  const formattedData = data.map((d) => ({
    ...d,
    shortDate: shortFmt ? shortFmt.format(parseDayKey(d.date)) : d.date.slice(5),
  }));

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formattedData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#412431" />
          <XAxis
            dataKey="shortDate"
            stroke="#64748B"
            fontSize={11}
            tickLine={false}
            tickMargin={8}
            minTickGap={24}
            interval="preserveStartEnd"
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
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const fullItem = payload[0].payload as DailyData;
                return (
                  <div className="bg-surface border border-surface-alt p-3 rounded-lg shadow-xl text-xs flex flex-col gap-1">
                    <span className="font-semibold text-white border-b border-surface-alt pb-1 mb-1">
                      {fullFmt ? fullFmt.format(parseDayKey(fullItem.date)) : fullItem.date}
                    </span>
                    <span className="text-white">
                      Total: <strong className="font-mono">{fullItem.total}</strong>
                    </span>
                    <span className="text-status-danger">
                      Danger: <strong className="font-mono">{fullItem.danger}</strong>
                    </span>
                    <span className="text-status-warning">
                      Warning: <strong className="font-mono">{fullItem.warning}</strong>
                    </span>
                    <span className="text-status-clean">
                      Clean: <strong className="font-mono">{fullItem.clean}</strong>
                    </span>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
            formatter={(value) => <span className="text-gray-300 capitalize">{value}</span>}
          />
          <Line
            type="monotone"
            dataKey="total"
            name="Total"
            stroke="#FF0090"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "#FF0090" }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="danger"
            name="Danger"
            stroke="#FF0000"
            strokeWidth={1.5}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="warning"
            name="Warning"
            stroke="#FF7300"
            strokeWidth={1.5}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="clean"
            name="Clean"
            stroke="#11FF00"
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};