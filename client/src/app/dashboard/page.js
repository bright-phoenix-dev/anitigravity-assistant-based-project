'use client';

/**
 * CarbonWise — Dashboard Page
 *
 * Main overview showing carbon score, recent activities,
 * active habits, quick-log buttons, and AI insight card.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { chatAPI } from '@/lib/api';
import ProgressRing from '@/components/ProgressRing';

const CATEGORY_EMOJIS = {
  transport: '🚗', energy: '⚡', food: '🍽️', waste: '🗑️', shopping: '🛍️',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { summary, activities, habits, fetchSummary, fetchActivities, fetchHabits, loading } = useApp();
  const [insights, setInsights] = useState([]);
  const router = useRouter();

  useEffect(() => {
    fetchSummary('month');
    fetchActivities({ limit: 5 });
    fetchHabits();

    chatAPI.getInsights()
      .then(data => setInsights(data.insights || []))
      .catch(() => {});
  }, [fetchSummary, fetchActivities, fetchHabits]);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">
          Welcome back, <span className="gradient-text">{user?.name?.split(' ')[0] || 'there'}</span> 👋
        </h1>
        <p className="page-subtitle">Here&apos;s your carbon footprint overview for this month.</p>
      </div>

      {/* ─── Stats Row ──────────────────────────────────────────── */}
      <div className="dashboard-stats">
        {/* Score Card */}
        <div className="glass-card stat-card-main">
          <div className="stat-content">
            <div>
              <p className="stat-label">Monthly Emissions</p>
              <p className="stat-value">{summary?.total_kg?.toFixed(1) || '0.0'} <span className="stat-unit">kg CO₂</span></p>
              <p className="stat-meta">
                Goal: {summary?.goal_kg || user?.monthly_goal_kg || 200} kg
              </p>
            </div>
            <ProgressRing
              progress={summary?.goal_progress_percent || 0}
              size={100}
              strokeWidth={7}
              label="of goal"
            />
          </div>
        </div>

        {/* Week Change */}
        <div className="glass-card stat-card-small">
          <p className="stat-label">Week Change</p>
          <p className={`stat-value-sm ${(summary?.change_percent || 0) <= 0 ? 'stat-positive' : 'stat-negative'}`}>
            {summary?.change_percent !== undefined ? (
              <>
                {summary.change_percent <= 0 ? '📉' : '📈'}{' '}
                {Math.abs(summary.change_percent)}%
              </>
            ) : '—'}
          </p>
          <p className="stat-meta">{(summary?.change_percent || 0) <= 0 ? 'Improving!' : 'Let\'s work on this'}</p>
        </div>

        {/* Activities Count */}
        <div className="glass-card stat-card-small">
          <p className="stat-label">Activities Logged</p>
          <p className="stat-value-sm">{summary?.activity_count || 0}</p>
          <p className="stat-meta">This month</p>
        </div>

        {/* Active Habits */}
        <div className="glass-card stat-card-small">
          <p className="stat-label">Active Habits</p>
          <p className="stat-value-sm">{habits?.filter(h => h.is_active)?.length || 0}</p>
          <p className="stat-meta">Tracking</p>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* ─── AI Insight Card ──────────────────────────────────── */}
        {insights.length > 0 && (
          <div className="glass-card insight-card">
            <div className="insight-header">
              <span className="insight-icon">🤖</span>
              <h3 className="insight-title">AI Insight</h3>
            </div>
            <p className="insight-text">
              {insights[0].message.replace(/\*\*/g, '').replace(/\n/g, ' ').slice(0, 250)}
              {insights[0].message.length > 250 ? '...' : ''}
            </p>
            {insights[0].actions?.length > 0 && (
              <div className="insight-actions">
                {insights[0].actions.slice(0, 2).map((action, i) => (
                  <button key={i} className="btn-secondary insight-action-btn">
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Category Breakdown ───────────────────────────────── */}
        <div className="glass-card">
          <h3 className="card-title">Emissions by Category</h3>
          {summary?.by_category?.length > 0 ? (
            <div className="category-list">
              {summary.by_category.map((cat) => (
                <div key={cat.category} className="category-item">
                  <div className="category-info">
                    <span className="category-emoji">{CATEGORY_EMOJIS[cat.category] || '📦'}</span>
                    <span className="category-name">{cat.category}</span>
                  </div>
                  <div className="category-bar-wrapper">
                    <div
                      className={`category-bar category-bg-${cat.category}`}
                      style={{ width: `${Math.min(cat.total_kg / (summary.total_kg || 1) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="category-value">{cat.total_kg.toFixed(1)} kg</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-text">No emissions logged yet. Start by logging an activity!</p>
          )}
        </div>

        {/* ─── Recent Activities ─────────────────────────────────── */}
        <div className="glass-card">
          <div className="card-header-row">
            <h3 className="card-title">Recent Activities</h3>
            <Link href="/log" className="card-link">+ Log New</Link>
          </div>
          {activities?.length > 0 ? (
            <div className="activity-list">
              {activities.slice(0, 5).map((a) => (
                <div key={a.id} className="activity-item">
                  <span className="activity-emoji">{CATEGORY_EMOJIS[a.category] || '📦'}</span>
                  <div className="activity-info">
                    <p className="activity-name">{a.activity_type.replace(/_/g, ' ')}</p>
                    <p className="activity-date">{a.log_date} • {a.quantity} {a.unit}</p>
                  </div>
                  <span className="activity-carbon">{a.carbon_kg.toFixed(2)} kg</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-text">No activities yet. Log your first one!</p>
          )}
        </div>

        {/* ─── Habits ───────────────────────────────────────────── */}
        <div className="glass-card">
          <div className="card-header-row">
            <h3 className="card-title">Active Habits</h3>
            <Link href="/habits" className="card-link">Manage</Link>
          </div>
          {habits?.filter(h => h.is_active)?.length > 0 ? (
            <div className="habit-list">
              {habits.filter(h => h.is_active).slice(0, 5).map((h) => (
                <div key={h.id} className="habit-item">
                  <span className="habit-emoji">{CATEGORY_EMOJIS[h.category] || '🔄'}</span>
                  <div className="habit-info">
                    <p className="habit-name">{h.name}</p>
                    <p className="habit-streak">🔥 {h.streak_days} day streak</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-text">No habits yet. Start building eco-friendly routines!</p>
          )}
        </div>

        {/* ─── Quick Actions ────────────────────────────────────── */}
        <div className="glass-card quick-actions-card">
          <h3 className="card-title">Quick Actions</h3>
          <div className="quick-actions">
            <button className="quick-action" onClick={() => router.push('/log')}>
              <span className="quick-action-icon">📋</span>
              <span>Log Activity</span>
            </button>
            <button className="quick-action" onClick={() => router.push('/habits')}>
              <span className="quick-action-icon">🔄</span>
              <span>New Habit</span>
            </button>
            <button className="quick-action" onClick={() => router.push('/analytics')}>
              <span className="quick-action-icon">📈</span>
              <span>Analytics</span>
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .dashboard-stats {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .stat-card-main .stat-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .stat-label {
          font-size: 0.8rem;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.375rem;
        }

        .stat-value {
          font-size: 1.75rem;
          font-weight: 700;
          line-height: 1.2;
        }

        .stat-unit {
          font-size: 0.9rem;
          color: var(--color-text-secondary);
          font-weight: 400;
        }

        .stat-value-sm {
          font-size: 1.5rem;
          font-weight: 700;
          line-height: 1.2;
          margin-bottom: 0.25rem;
        }

        .stat-positive { color: var(--color-success); }
        .stat-negative { color: var(--color-danger); }

        .stat-meta {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          margin-top: 0.25rem;
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .insight-card {
          grid-column: 1 / -1;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(20, 184, 166, 0.05) 100%);
          border-color: rgba(16, 185, 129, 0.2);
        }

        .insight-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .insight-icon { font-size: 1.5rem; }
        .insight-title { font-weight: 600; font-size: 1rem; }

        .insight-text {
          color: var(--color-text-secondary);
          font-size: 0.9rem;
          line-height: 1.6;
          margin-bottom: 0.75rem;
        }

        .insight-actions {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .insight-action-btn {
          font-size: 0.8rem;
          padding: 0.5rem 1rem;
        }

        .card-title {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 1rem;
        }

        .card-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .card-link {
          font-size: 0.8rem;
          color: var(--color-primary-light);
          text-decoration: none;
          font-weight: 500;
        }

        .card-link:hover { text-decoration: underline; }

        .category-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .category-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .category-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          min-width: 100px;
        }

        .category-emoji { font-size: 1.1rem; }
        .category-name { font-size: 0.85rem; text-transform: capitalize; color: var(--color-text-secondary); }

        .category-bar-wrapper {
          flex: 1;
          height: 8px;
          background: var(--color-bg-tertiary);
          border-radius: var(--radius-full);
          overflow: hidden;
        }

        .category-bar {
          height: 100%;
          border-radius: var(--radius-full);
          transition: width 1s ease-out;
          min-width: 4px;
        }

        .category-value {
          font-size: 0.85rem;
          font-weight: 600;
          min-width: 60px;
          text-align: right;
        }

        .activity-list, .habit-list {
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
        }

        .activity-item, .habit-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.625rem 0;
          border-bottom: 1px solid var(--color-border-light);
        }

        .activity-item:last-child, .habit-item:last-child { border-bottom: none; }

        .activity-emoji, .habit-emoji { font-size: 1.25rem; }

        .activity-info, .habit-info { flex: 1; }

        .activity-name, .habit-name {
          font-size: 0.85rem;
          font-weight: 500;
          text-transform: capitalize;
        }

        .activity-date {
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }

        .activity-carbon {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--color-text-secondary);
        }

        .habit-streak {
          font-size: 0.75rem;
          color: var(--color-warning);
        }

        .empty-text {
          color: var(--color-text-muted);
          font-size: 0.85rem;
          text-align: center;
          padding: 1.5rem 0;
        }

        .quick-actions {
          display: flex;
          gap: 0.75rem;
        }

        .quick-action {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem;
          background: var(--color-bg-tertiary);
          border: 1px solid var(--color-border-light);
          border-radius: var(--radius-md);
          color: var(--color-text-secondary);
          font-size: 0.8rem;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .quick-action:hover {
          border-color: var(--color-primary);
          color: var(--color-text-primary);
          transform: translateY(-2px);
        }

        .quick-action-icon { font-size: 1.5rem; }

        @media (max-width: 1024px) {
          .dashboard-stats {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 768px) {
          .dashboard-stats {
            grid-template-columns: 1fr;
          }

          .dashboard-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
