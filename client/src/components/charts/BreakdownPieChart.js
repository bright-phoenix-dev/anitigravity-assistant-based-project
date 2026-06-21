'use client';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
const CATEGORY_COLORS = {
  transport: '#3b82f6',
  energy: '#f59e0b',
  food: '#10b981',
  waste: '#8b5cf6',
  shopping: '#ec4899',
};
const CATEGORY_LABELS = {
  transport: 'Transport',
  energy: 'Energy',
  food: 'Food',
  waste: 'Waste',
  shopping: 'Shopping',
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
        color: CATEGORY_COLORS[data.category],
        fontWeight: 600,
        marginBottom: '0.25rem',
      }}>
        {CATEGORY_LABELS[data.category] || data.category}
      </p>
      <p style={{ color: '#f9fafb' }}>
        {data.total_kg.toFixed(2)} kg CO₂
      </p>
      {data.percent  ===  undefined && (
        <p style={{ color: '#6b7280', fontSize: '0.75rem' }}>
          {data.percent}% of total
        </p>
      )}
    </div>
  );
};
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null; // Don't show labels for tiny slices
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={600}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};
export default function BreakdownPieChart({ data = [] }) {
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
        No data to display.
      </div>
    );
  }
  const chartData = data.map(d => ({
    ...d,
    name: CATEGORY_LABELS[d.category] || d.category,
  }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          dataKey="total_kg"
          labelLine={false}
          label={renderCustomLabel}
          animationBegin={0}
          animationDuration={800}
        >
          {chartData.map((entry, index) => (
            <Cell
              key={index}
              fill={CATEGORY_COLORS[entry.category] || '#6b7280'}
              stroke="transparent"
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          verticalAlign="bottom"
          height={36}
          formatter={(value) => (
            <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
BreakdownPieChart.displayName = "BreakdownPieChart";
