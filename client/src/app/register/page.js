'use client';

/**
 * CarbonWise — Registration Page
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

const REGIONS = [
  'Global', 'North America', 'Europe', 'United Kingdom',
  'India', 'Asia Pacific', 'South America', 'Africa', 'Middle East', 'Oceania',
];

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', region: 'Global' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const router = useRouter();

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      await register(form);
      router.push('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card animate-fade-in">
        <div className="auth-header">
          <Link href="/" className="auth-logo" aria-label="Back to home">
            <span className="auth-logo-icon">🌍</span>
            <span className="gradient-text auth-logo-text">CarbonWise</span>
          </Link>
          <h2 className="auth-title">Create your account</h2>
          <p className="auth-subtitle">Start your journey to a smaller carbon footprint</p>
        </div>

        {error && (
          <div className="auth-error" role="alert">
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-group">
            <label htmlFor="register-name" className="form-label">Full Name</label>
            <input
              id="register-name"
              name="name"
              type="text"
              className="form-input"
              placeholder="Jane Doe"
              value={form.name}
              onChange={handleChange}
              required
              autoComplete="name"
              aria-required="true"
            />
          </div>

          <div className="form-group">
            <label htmlFor="register-email" className="form-label">Email Address</label>
            <input
              id="register-email"
              name="email"
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="email"
              aria-required="true"
            />
          </div>

          <div className="form-group">
            <label htmlFor="register-password" className="form-label">Password</label>
            <input
              id="register-password"
              name="password"
              type="password"
              className="form-input"
              placeholder="Min 8 characters"
              value={form.password}
              onChange={handleChange}
              required
              minLength={8}
              autoComplete="new-password"
              aria-required="true"
            />
          </div>

          <div className="form-group">
            <label htmlFor="register-region" className="form-label">Region</label>
            <select
              id="register-region"
              name="region"
              className="form-select"
              value={form.region}
              onChange={handleChange}
            >
              {REGIONS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <button
            id="register-submit"
            type="submit"
            className="btn-primary auth-submit"
            disabled={loading || !form.name || !form.email || !form.password}
          >
            {loading ? (
              <span className="auth-spinner" aria-label="Creating account">⏳</span>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <p className="auth-footer-text">
          Already have an account?{' '}
          <Link href="/login" className="auth-link">Sign in</Link>
        </p>
      </div>

      <style jsx>{`
        .auth-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-bg-primary);
          padding: 2rem;
        }

        .auth-card {
          width: 100%;
          max-width: 420px;
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border-light);
          border-radius: var(--radius-xl);
          padding: 2.5rem;
        }

        .auth-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .auth-logo {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          text-decoration: none;
          margin-bottom: 1.5rem;
        }

        .auth-logo-icon { font-size: 1.75rem; }
        .auth-logo-text { font-size: 1.5rem; font-weight: 800; }
        .auth-title { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.375rem; }
        .auth-subtitle { color: var(--color-text-secondary); font-size: 0.9rem; }

        .auth-error {
          padding: 0.75rem 1rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: var(--radius-md);
          color: #fca5a5;
          font-size: 0.85rem;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .auth-submit {
          width: 100%;
          padding: 0.875rem;
          font-size: 1rem;
          margin-top: 0.5rem;
        }

        .auth-spinner {
          animation: spin-slow 1s linear infinite;
          display: inline-block;
        }

        .auth-footer-text {
          text-align: center;
          margin-top: 1.5rem;
          font-size: 0.85rem;
          color: var(--color-text-secondary);
        }

        .auth-link {
          color: var(--color-primary-light);
          text-decoration: none;
          font-weight: 600;
        }

        .auth-link:hover { text-decoration: underline; }
      `}</style>
    </div>
  );
}
