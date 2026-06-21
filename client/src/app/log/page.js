'use client';
import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
export default function LogActivityPage() {
  const { logActivity, fetchFactors, factors } = useApp();
  const [form, setForm] = useState({
    category: '',
    activity_type: '',
    quantity: '',
    log_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  useEffect(() => {
    fetchFactors();
  }, [fetchFactors]);
  const activityTypes = form.category && factors?.[form.category]
    ? Object.entries(factors[form.category])
    : [];
  useEffect(() => {
    if (form.category && form.activity_type && form.quantity && factors) {
      const factor = factors[form.category]?.[form.activity_type];
      if (factor) {
        const carbonKg = parseFloat(form.quantity) * factor.factor;
        setPreview({
          carbon_kg: carbonKg.toFixed(2),
          factor: factor.factor,
          unit: factor.unit,
          label: factor.label,
        });
      }
    } else {
      setPreview(null);
    }
  }, [form.category, form.activity_type, form.quantity, factors]);
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'category') {
        updated.activity_type = '';
      }
      return updated;
    });
    setSuccess(null);
    setError('');
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(null);
    setLoading(true);
    try {
      const data = await logActivity({
        category: form.category,
        activity_type: form.activity_type,
        quantity: parseFloat(form.quantity),
        log_date: form.log_date,
        notes: form.notes,
      });
      setSuccess({
        carbon_kg: data.activity.carbon_kg,
        label: data.calculation.label,
      });
      setForm(prev => ({
        category: '',
        activity_type: '',
        quantity: '',
        log_date: prev.log_date,
        notes: '',
      }));
      setPreview(null);
    } catch (err) {
      setError(err.message || 'Failed to log activity.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">📋 Log Activity</h1>
        <p className="page-subtitle">Record a carbon-emitting activity. We&apos;ll calculate the CO₂ automatically.</p>
      </div>
      <div className="log-layout">
        <div className="glass-card log-form-card">
          {success && (
            <div className="log-success animate-slide-in-up" role="status">
              <span className="log-success-icon">✅</span>
              <div>
                <p className="log-success-title">Activity logged!</p>
                <p className="log-success-detail">
                  {success.label}: {success.carbon_kg.toFixed(2)} kg CO₂
                </p>
              </div>
            </div>
          )}
          {error && (
            <div className="log-error" role="alert">⚠️ {error}</div>
          )}
          <form onSubmit={handleSubmit} className="log-form" id="log-activity-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="log-category" className="form-label">Category</label>
                <select
                  id="log-category"
                  name="category"
                  className="form-select"
                  value={form.category}
                  onChange={handleChange}
                  required
                  aria-required="true"
                >
                  <option value="">Select category</option>
                  {factors && Object.keys(factors).map(cat => (
                    <option key={cat} value={cat}>
                      {{'transport':'🚗 Transport','energy':'⚡ Energy','food':'🍽️ Food','waste':'🗑️ Waste','shopping':'🛍️ Shopping'}[cat] || cat}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="log-activity-type" className="form-label">Activity Type</label>
                <select
                  id="log-activity-type"
                  name="activity_type"
                  className="form-select"
                  value={form.activity_type}
                  onChange={handleChange}
                  required
                  disabled={!form.category}
                  aria-required="true"
                >
                  <option value="">Select type</option>
                  {activityTypes.map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="log-quantity" className="form-label">
                  Quantity {preview?.unit ? `(${preview.unit})` : ''}
                </label>
                <input
                  id="log-quantity"
                  name="quantity"
                  type="number"
                  className="form-input"
                  placeholder="e.g., 50"
                  value={form.quantity}
                  onChange={handleChange}
                  required
                  min="0"
                  step="any"
                  aria-required="true"
                />
              </div>
              <div className="form-group">
                <label htmlFor="log-date" className="form-label">Date</label>
                <input
                  id="log-date"
                  name="log_date"
                  type="date"
                  className="form-input"
                  value={form.log_date}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="log-notes" className="form-label">Notes (optional)</label>
              <input
                id="log-notes"
                name="notes"
                type="text"
                className="form-input"
                placeholder="e.g., Commute to work"
                value={form.notes}
                onChange={handleChange}
                maxLength={500}
              />
            </div>
            <button aria-label="Interactive button"
              id="log-submit"
              type="submit"
              className="btn-primary log-submit"
              disabled={loading || !form.category || !form.activity_type || !form.quantity}
            >
              {loading ? '⏳ Logging...' : '📋 Log Activity'}
            </button>
          </form>
        </div>
        <div className="glass-card preview-card">
          <h3 className="card-title">Live Preview</h3>
          {preview ? (
            <div className="preview-content animate-fade-in">
              <div className="preview-carbon">
                <span className="preview-carbon-value">{preview.carbon_kg}</span>
                <span className="preview-carbon-unit">kg CO₂</span>
              </div>
              <div className="preview-details">
                <p className="preview-label">{preview.label}</p>
                <p className="preview-factor">Factor: {preview.factor} kg CO₂ / {preview.unit}</p>
                <p className="preview-calc">{form.quantity} {preview.unit} × {preview.factor} = {preview.carbon_kg} kg</p>
              </div>
              <div className="preview-context">
                <p className="preview-equiv">
                  {parseFloat(preview.carbon_kg) < 1 && '🌿 Very low impact!'}
                  {parseFloat(preview.carbon_kg) >= 1 && parseFloat(preview.carbon_kg) < 5 && '🌱 Moderate impact'}
                  {parseFloat(preview.carbon_kg) >= 5 && parseFloat(preview.carbon_kg) < 20 && '🍂 Notable impact'}
                  {parseFloat(preview.carbon_kg) >= 20 && '🔥 High impact activity'}
                </p>
              </div>
            </div>
          ) : (
            <div className="preview-empty">
              <span className="preview-empty-icon">🧮</span>
              <p>Select a category and enter a quantity to see the CO₂ calculation.</p>
            </div>
          )}
        </div>
      </div>
      <style jsx>{`
        .log-layout {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 1.5rem;
          align-items: start;
        }
        .log-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .form-group {
          display: flex;
          flex-direction: column;
        }
        .log-submit {
          width: 100%;
          padding: 0.875rem;
          font-size: 1rem;
          margin-top: 0.5rem;
        }
        .log-success {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: var(--radius-md);
          margin-bottom: 1rem;
        }
        .log-success-icon { font-size: 1.5rem; }
        .log-success-title { font-weight: 600; font-size: 0.9rem; color: var(--color-success); }
        .log-success-detail { font-size: 0.8rem; color: var(--color-text-secondary); }
        .log-error {
          padding: 0.75rem 1rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: var(--radius-md);
          color: #fca5a5;
          font-size: 0.85rem;
          margin-bottom: 1rem;
        }
        .preview-content {
          text-align: center;
        }
        .preview-carbon {
          margin-bottom: 1.5rem;
        }
        .preview-carbon-value {
          font-size: 3rem;
          font-weight: 800;
          background: var(--gradient-primary);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .preview-carbon-unit {
          display: block;
          font-size: 0.9rem;
          color: var(--color-text-secondary);
          font-weight: 500;
        }
        .preview-details {
          background: var(--color-bg-tertiary);
          border-radius: var(--radius-md);
          padding: 1rem;
          margin-bottom: 1rem;
        }
        .preview-label { font-weight: 600; margin-bottom: 0.375rem; font-size: 0.9rem; }
        .preview-factor { color: var(--color-text-muted); font-size: 0.8rem; margin-bottom: 0.25rem; }
        .preview-calc { color: var(--color-text-secondary); font-size: 0.8rem; font-family: monospace; }
        .preview-context { margin-top: 0.5rem; }
        .preview-equiv { font-size: 0.9rem; }
        .preview-empty {
          text-align: center;
          padding: 2rem 1rem;
          color: var(--color-text-muted);
        }
        .preview-empty-icon { font-size: 2.5rem; display: block; margin-bottom: 0.75rem; }
        .card-title {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 1.5rem;
        }
        @media (max-width: 768px) {
          .log-layout {
            grid-template-columns: 1fr;
          }
          .form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
LogActivityPage.displayName = "LogActivityPage";
