'use client';

/**
 * CarbonWise — Habits Management Page
 *
 * Create, complete, toggle, and delete eco-friendly habits.
 * Shows streak data and estimated CO₂ savings.
 */

import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';

const CATEGORY_EMOJIS = {
  transport: '🚗', energy: '⚡', food: '🍽️', waste: '🗑️', shopping: '🛍️',
};

export default function HabitsPage() {
  const { habits, habitTemplates, fetchHabits, createHabit, updateHabit, deleteHabit, loading } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', category: 'food', frequency: 'daily', estimated_savings_kg: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  const handleTemplateClick = (name, data) => {
    setForm({
      name,
      category: data.category,
      frequency: 'daily',
      estimated_savings_kg: data.estimated_savings_kg,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await createHabit({
        name: form.name,
        category: form.category,
        frequency: form.frequency,
        estimated_savings_kg: form.estimated_savings_kg ? parseFloat(form.estimated_savings_kg) : undefined,
      });
      setForm({ name: '', category: 'food', frequency: 'daily', estimated_savings_kg: '' });
      setShowForm(false);
    } catch (err) {
      setError(err.message || 'Failed to create habit.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async (habit) => {
    try {
      await updateHabit(habit.id, { complete: true });
    } catch (err) {
      console.error('Failed to complete habit:', err);
    }
  };

  const handleToggle = async (habit) => {
    try {
      await updateHabit(habit.id, { is_active: !habit.is_active });
    } catch (err) {
      console.error('Failed to toggle habit:', err);
    }
  };

  const handleDelete = async (habit) => {
    if (!confirm(`Delete "${habit.name}" habit?`)) return;
    try {
      await deleteHabit(habit.id);
    } catch (err) {
      console.error('Failed to delete habit:', err);
    }
  };

  const activeHabits = habits.filter(h => h.is_active);
  const inactiveHabits = habits.filter(h => !h.is_active);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">🔄 Habits Tracker</h1>
        <p className="page-subtitle">Build eco-friendly routines and track your streaks.</p>
      </div>

      {/* ─── Create Habit ──────────────────────────────────────── */}
      <div className="glass-card habits-create-section">
        <div className="habits-create-header">
          <h3 className="card-title">Create a Habit</h3>
          <button
            className="btn-secondary"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'Cancel' : '+ Custom Habit'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="habit-form animate-slide-in-up">
            {error && <div className="habit-error" role="alert">⚠️ {error}</div>}
            <div className="form-row-3">
              <div className="form-group">
                <label htmlFor="habit-name" className="form-label">Habit Name</label>
                <input
                  id="habit-name"
                  type="text"
                  className="form-input"
                  placeholder="e.g., Walk to work"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="habit-category" className="form-label">Category</label>
                <select
                  id="habit-category"
                  className="form-select"
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                >
                  <option value="transport">🚗 Transport</option>
                  <option value="energy">⚡ Energy</option>
                  <option value="food">🍽️ Food</option>
                  <option value="waste">🗑️ Waste</option>
                  <option value="shopping">🛍️ Shopping</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="habit-frequency" className="form-label">Frequency</label>
                <select
                  id="habit-frequency"
                  className="form-select"
                  value={form.frequency}
                  onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn-primary" disabled={submitting || !form.name}>
              {submitting ? '⏳ Creating...' : '✅ Create Habit'}
            </button>
          </form>
        )}

        {/* Templates */}
        <div className="habit-templates">
          <p className="templates-label">Quick Add:</p>
          <div className="templates-grid">
            {Object.entries(habitTemplates).slice(0, 8).map(([name, data]) => {
              const alreadyHas = habits.some(h => h.name === name);
              return (
                <button
                  key={name}
                  className={`template-btn ${alreadyHas ? 'template-disabled' : ''}`}
                  onClick={() => !alreadyHas && handleTemplateClick(name, data)}
                  disabled={alreadyHas}
                  title={alreadyHas ? 'Already added' : `Add ${name}`}
                >
                  <span className="template-emoji">{CATEGORY_EMOJIS[data.category]}</span>
                  <span className="template-name">{name}</span>
                  <span className="template-savings">~{data.estimated_savings_kg} kg/mo</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Active Habits ─────────────────────────────────────── */}
      <div className="glass-card">
        <h3 className="card-title">Active Habits ({activeHabits.length})</h3>
        {activeHabits.length > 0 ? (
          <div className="habits-list">
            {activeHabits.map(h => (
              <div key={h.id} className="habit-card animate-fade-in">
                <div className="habit-main">
                  <span className="habit-emoji">{CATEGORY_EMOJIS[h.category]}</span>
                  <div className="habit-info">
                    <p className="habit-name">{h.name}</p>
                    <p className="habit-meta">
                      {h.frequency} • ~{h.estimated_savings_kg} kg CO₂/month saved
                    </p>
                  </div>
                  <div className="habit-streak">
                    <span className="streak-fire">🔥</span>
                    <span className="streak-count">{h.streak_days}</span>
                    <span className="streak-label">day{h.streak_days !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div className="habit-actions">
                  <button
                    className="btn-primary habit-complete-btn"
                    onClick={() => handleComplete(h)}
                    aria-label={`Mark ${h.name} complete for today`}
                  >
                    ✅ Complete Today
                  </button>
                  <button
                    className="btn-ghost"
                    onClick={() => handleToggle(h)}
                    aria-label={`Pause ${h.name}`}
                  >
                    ⏸️ Pause
                  </button>
                  <button
                    className="btn-ghost habit-delete-btn"
                    onClick={() => handleDelete(h)}
                    aria-label={`Delete ${h.name}`}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-text">No active habits yet. Create one above or use a template!</p>
        )}
      </div>

      {/* ─── Inactive Habits ───────────────────────────────────── */}
      {inactiveHabits.length > 0 && (
        <div className="glass-card" style={{ marginTop: '1rem' }}>
          <h3 className="card-title">Paused Habits ({inactiveHabits.length})</h3>
          <div className="habits-list">
            {inactiveHabits.map(h => (
              <div key={h.id} className="habit-card habit-inactive">
                <div className="habit-main">
                  <span className="habit-emoji">{CATEGORY_EMOJIS[h.category]}</span>
                  <div className="habit-info">
                    <p className="habit-name">{h.name}</p>
                    <p className="habit-meta">{h.frequency} • Paused</p>
                  </div>
                </div>
                <div className="habit-actions">
                  <button className="btn-secondary" onClick={() => handleToggle(h)}>
                    ▶️ Resume
                  </button>
                  <button className="btn-ghost habit-delete-btn" onClick={() => handleDelete(h)}>
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .habits-create-section { margin-bottom: 1rem; }

        .habits-create-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .card-title { font-size: 1rem; font-weight: 600; margin-bottom: 1rem; }

        .habit-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1.5rem;
          padding: 1.25rem;
          background: var(--color-bg-tertiary);
          border-radius: var(--radius-md);
        }

        .form-row-3 {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: 1rem;
        }

        .form-group { display: flex; flex-direction: column; }

        .habit-error {
          padding: 0.75rem;
          background: rgba(239, 68, 68, 0.1);
          border-radius: var(--radius-md);
          color: #fca5a5;
          font-size: 0.85rem;
        }

        .templates-label {
          font-size: 0.8rem;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.75rem;
        }

        .templates-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 0.5rem;
        }

        .template-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 0.875rem;
          background: var(--color-bg-tertiary);
          border: 1px solid var(--color-border-light);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all var(--transition-fast);
          color: var(--color-text-secondary);
          text-align: left;
          font-size: 0.8rem;
        }

        .template-btn:hover:not(.template-disabled) {
          border-color: var(--color-primary);
          color: var(--color-text-primary);
        }

        .template-disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .template-emoji { font-size: 1rem; }
        .template-name { flex: 1; font-weight: 500; }
        .template-savings { font-size: 0.7rem; color: var(--color-text-muted); }

        .habits-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .habit-card {
          background: var(--color-bg-tertiary);
          border: 1px solid var(--color-border-light);
          border-radius: var(--radius-md);
          padding: 1rem 1.25rem;
          transition: all var(--transition-fast);
        }

        .habit-card:hover {
          border-color: var(--color-border);
        }

        .habit-inactive { opacity: 0.6; }

        .habit-main {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }

        .habit-emoji { font-size: 1.5rem; }

        .habit-info { flex: 1; }
        .habit-name { font-weight: 600; font-size: 0.95rem; }
        .habit-meta { font-size: 0.8rem; color: var(--color-text-muted); margin-top: 0.125rem; }

        .habit-streak {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.375rem 0.75rem;
          background: rgba(245, 158, 11, 0.1);
          border-radius: var(--radius-full);
        }

        .streak-fire { font-size: 1rem; }
        .streak-count { font-weight: 700; font-size: 1.1rem; color: var(--color-warning); }
        .streak-label { font-size: 0.7rem; color: var(--color-text-muted); }

        .habit-actions {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .habit-complete-btn {
          font-size: 0.8rem;
          padding: 0.5rem 1rem;
        }

        .habit-delete-btn:hover {
          color: var(--color-danger) !important;
        }

        .empty-text {
          color: var(--color-text-muted);
          font-size: 0.85rem;
          text-align: center;
          padding: 1.5rem 0;
        }

        @media (max-width: 768px) {
          .form-row-3 { grid-template-columns: 1fr; }
          .templates-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
