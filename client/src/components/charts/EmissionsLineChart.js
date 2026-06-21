'use client';

/**
 * CarbonWise — Emissions Line Chart
 * Displays daily emissions over time using Recharts.
 */

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
  AreaChart,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(17, 24, 39, 0.95)',
      border: '1px solid rgba(75, 85, 99, 0.4)',
      borderRadius: '8px',
      padding: '0.75rem 1rem',
      fontSize: '0.8rem',
    }}>
      <p style={{ color: '#9ca3af', marginBottom: '0.25rem' }}>{label}</p>
      <p style={{ color: '#10b981', fontWeight: 600 }}>
        {payload[0].value.toFixed(2)} kg CO₂
      </p>
    </div>
  );
};

export default function EmissionsLineChart({ data = [] }) {
  if (data.length === 0) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: 'var(--color-text-muted)',
        fontSize: '0.9rem',
      }}>
        No data available for this period. Start logging activities to see trends.
      </div>
    );
  }

  // Format dates for display
  const formatted = data.map(d => ({
    ...d,
    date: d.log_date?.slice(5) || d.log_date, // Show MM-DD
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={formatted} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="colorEmissions" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(75, 85, 99, 0.2)" />
        <XAxis
          dataKey="date"
          stroke="#6b7280"
          fontSize={11}
          tickLine={false}
          axisLine={{ stroke: 'rgba(75, 85, 99, 0.3)' }}
        />
        <YAxis
          stroke="#6b7280"
          fontSize={11}
          tickLine={false}
          axisLine={{ stroke: 'rgba(75, 85, 99, 0.3)' }}
          tickFormatter={v => `${v}`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="total_kg"
          stroke="#10b981"
          strokeWidth={2}
          fill="url(#colorEmissions)"
          dot={{ fill: '#10b981', strokeWidth: 0, r: 3 }}
          activeDot={{ fill: '#34d399', strokeWidth: 0, r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
