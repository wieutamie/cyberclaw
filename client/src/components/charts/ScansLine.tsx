import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

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

export const ScansLine: React.FC<ScansLineProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted text-sm">
        No data available for this period
      </div>
    );
  }

  // Format short date for X axis
  const formattedData = data.map((d) => ({
    ...d,
    shortDate: d.date.slice(5), // MM-DD
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
                      {fullItem.date}
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
            wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
            formatter={(value) => <span className="text-gray-300 capitalize">{value}</span>}
          />
          <Line
            type="monotone"
            dataKey="total"
            name="Total"
            stroke="#FF0090"
            strokeWidth={2.5}
            dot={{ r: 3, fill: '#FF0090' }}
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
