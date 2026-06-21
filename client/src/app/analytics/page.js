'use client';

/**
 * CarbonWise — Analytics Page
 *
 * Visual analytics dashboard with Recharts:
 * - Line chart: Daily emissions over time
 * - Bar chart: Emissions by category
 * - Pie chart: Category breakdown
 */

import { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import EmissionsLineChart from '@/components/charts/EmissionsLineChart';
import CategoryBarChart from '@/components/charts/CategoryBarChart';
import BreakdownPieChart from '@/components/charts/BreakdownPieChart';

export default function AnalyticsPage() {
  const { summary, fetchSummary, loading } = useApp();
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    fetchSummary(period);
  }, [fetchSummary, period]);

  const periods = [
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'year', label: 'This Year' },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="analytics-header-row">
          <div>
            <h1 className="page-title">📈 Analytics</h1>
            <p className="page-subtitle">Visualize your carbon footprint trends and patterns.</p>
          </div>
          <div className="period-toggle" role="tablist" aria-label="Time period selection">
            {periods.map(p => (
              <button
                key={p.value}
                role="tab"
                aria-selected={period === p.value}
                className={`period-btn ${period === p.value ? 'period-active' : ''}`}
                onClick={() => setPeriod(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Summary Stats Row ─────────────────────────────────── */}
      <div className="analytics-stats">
        <div className="glass-card stat-card">
          <p className="stat-label">Total Emissions</p>
          <p className="stat-value gradient-text">{summary?.total_kg?.toFixed(1) || '0.0'}</p>
          <p className="stat-unit-text">kg CO₂</p>
        </div>
        <div className="glass-card stat-card">
          <p className="stat-label">Previous Period</p>
          <p className="stat-value">{summary?.previous_total_kg?.toFixed(1) || '0.0'}</p>
          <p className="stat-unit-text">kg CO₂</p>
        </div>
        <div className="glass-card stat-card">
          <p className="stat-label">Change</p>
          <p className={`stat-value ${(summary?.change_percent || 0) <= 0 ? 'stat-positive' : 'stat-negative'}`}>
            {summary?.change_percent !== undefined ? `${summary.change_percent > 0 ? '+' : ''}${summary.change_percent}%` : '—'}
          </p>
          <p className="stat-unit-text">{(summary?.change_percent || 0) <= 0 ? '📉 Improving' : '📈 Increased'}</p>
        </div>
        <div className="glass-card stat-card">
          <p className="stat-label">Goal Progress</p>
          <p className="stat-value">{summary?.goal_progress_percent?.toFixed(0) || '0'}%</p>
          <p className="stat-unit-text">of {summary?.goal_kg || 200} kg</p>
        </div>
      </div>

      {/* ─── Charts Grid ───────────────────────────────────────── */}
      <div className="charts-grid">
        <div className="glass-card chart-card chart-wide">
          <h3 className="chart-title">Daily Emissions Over Time</h3>
          <div className="chart-container">
            <EmissionsLineChart data={summary?.daily_breakdown || []} />
          </div>
        </div>

        <div className="glass-card chart-card">
          <h3 className="chart-title">By Category</h3>
          <div className="chart-container">
            <CategoryBarChart data={summary?.by_category || []} />
          </div>
        </div>

        <div className="glass-card chart-card">
          <h3 className="chart-title">Category Breakdown</h3>
          <div className="chart-container">
            <BreakdownPieChart data={summary?.by_category || []} />
          </div>
        </div>
      </div>

      <style jsx>{`
        .analytics-header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .period-toggle {
          display: flex;
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          overflow: hidden;
        }

        .period-btn {
          padding: 0.5rem 1rem;
          font-size: 0.8rem;
          font-weight: 500;
          background: transparent;
          color: var(--color-text-secondary);
          border: none;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .period-btn:hover {
          color: var(--color-text-primary);
          background: var(--color-bg-tertiary);
        }

        .period-active {
          background: var(--gradient-primary) !important;
          color: white !important;
        }

        .analytics-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .stat-card {
          text-align: center;
          padding: 1.25rem;
        }

        .stat-label {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.5rem;
        }

        .stat-value {
          font-size: 1.75rem;
          font-weight: 700;
          line-height: 1.2;
        }

        .stat-positive { color: var(--color-success); }
        .stat-negative { color: var(--color-danger); }

        .stat-unit-text {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          margin-top: 0.25rem;
        }

        .charts-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .chart-wide {
          grid-column: 1 / -1;
        }

        .chart-card {
          padding: 1.5rem;
        }

        .chart-title {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 1.25rem;
        }

        .chart-container {
          width: 100%;
          height: 300px;
        }

        @media (max-width: 1024px) {
          .analytics-stats {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 768px) {
          .analytics-stats {
            grid-template-columns: 1fr;
          }

          .charts-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
