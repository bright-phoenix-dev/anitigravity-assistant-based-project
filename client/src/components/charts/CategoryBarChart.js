'use client';

/**
 * CarbonWise — Category Bar Chart
 * Displays emissions by category as a horizontal bar chart.
 */

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';

const CATEGORY_COLORS = {
  transport: '#3b82f6',
  energy: '#f59e0b',
  food: '#10b981',
  waste: '#8b5cf6',
  shopping: '#ec4899',
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div style={{
      background: 'rgba(17, 24, 39, 0.95)',
      border: '1px solid rgba(75, 85, 99, 0.4)',
      borderRadius: '8px',
      padding: '0.75rem 1rem',
      fontSize: '0.8rem',
    }}>
      <p style={{
        color: CATEGORY_COLORS[data.category] || '#9ca3af',
        fontWeight: 600,
        textTransform: 'capitalize',
        marginBottom: '0.25rem',
      }}>
        {data.category}
      </p>
      <p style={{ color: '#f9fafb' }}>
        {data.total_kg.toFixed(2)} kg CO₂
      </p>
      <p style={{ color: '#6b7280', fontSize: '0.75rem' }}>
        {data.count} activities
      </p>
    </div>
  );
};

export default function CategoryBarChart({ data = [] }) {
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
        No category data to display.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(75, 85, 99, 0.2)" horizontal={false} />
        <XAxis
          type="number"
          stroke="#6b7280"
          fontSize={11}
          tickLine={false}
          axisLine={{ stroke: 'rgba(75, 85, 99, 0.3)' }}
          tickFormatter={v => `${v} kg`}
        />
        <YAxis
          type="category"
          dataKey="category"
          stroke="#6b7280"
          fontSize={11}
          tickLine={false}
          axisLine={{ stroke: 'rgba(75, 85, 99, 0.3)' }}
          width={80}
          tickFormatter={v => v.charAt(0).toUpperCase() + v.slice(1)}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(75, 85, 99, 0.1)' }} />
        <Bar dataKey="total_kg" radius={[0, 4, 4, 0]} barSize={24}>
          {data.map((entry, index) => (
            <Cell key={index} fill={CATEGORY_COLORS[entry.category] || '#6b7280'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
