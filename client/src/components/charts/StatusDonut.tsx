import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface DonutItem {
  name: string;
  value: number;
  color: string;
}

interface StatusDonutProps {
  data: DonutItem[];
}

export const StatusDonut: React.FC<StatusDonutProps> = ({ data }) => {
  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted text-sm">
        No data available for this period
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row items-center justify-around gap-6 h-64">
      {/* Chart with centered total */}
      <div className="relative w-48 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload as DonutItem;
                  const pct = ((d.value / total) * 100).toFixed(1);
                  return (
                    <div className="bg-surface-alt border border-surface px-3 py-1.5 rounded-lg shadow-lg text-xs">
                      <span className="font-semibold text-white">{d.name}: </span>
                      <span className="font-mono text-brand-accent">{d.value}</span>
                      <span className="text-muted"> ({pct}%)</span>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="60%"
              outerRadius="88%"
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="#17183B" strokeWidth={2} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Centered Total */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold font-mono text-white leading-none">
            {total}
          </span>
          <span className="text-[11px] text-muted uppercase tracking-wider mt-0.5">
            Total
          </span>
        </div>
      </div>

      {/* Legend with percentages */}
      <div className="flex flex-col gap-2.5 w-full md:w-48 text-xs">
        {data.map((item) => {
          const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
          return (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-gray-300 font-medium">{item.name}</span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-white font-bold">{item.value}</span>
                <span className="text-muted text-[11px]">({pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
