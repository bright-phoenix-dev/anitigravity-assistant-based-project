'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const router = useRouter();
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ email, password });
      router.push('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
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
          <h2 className="auth-title">Welcome back</h2>
          <p className="auth-subtitle">Sign in to continue tracking your impact</p>
        </div>
        {error && (
          <div className="auth-error" role="alert">
            <span>⚠️</span> {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-group">
            <label htmlFor="login-email" className="form-label">Email Address</label>
            <input
              id="login-email"
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              aria-required="true"
            />
          </div>
          <div className="form-group">
            <label htmlFor="login-password" className="form-label">Password</label>
            <input
              id="login-password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="current-password"
              aria-required="true"
            />
          </div>
          <button aria-label="Interactive button"
            id="login-submit"
            type="submit"
            className="btn-primary auth-submit"
            disabled={loading || !email || !password}
          >
            {loading ? (
              <span className="auth-spinner" aria-label="Signing in">⏳</span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
        <p className="auth-footer-text">
          Don&apos;t have an account?{' '}
          <Link aria-label="Navigation link" href="/register" className="auth-link">Create one</Link>
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
        .auth-logo-icon {
          font-size: 1.75rem;
        }
        .auth-logo-text {
          font-size: 1.5rem;
          font-weight: 800;
        }
        .auth-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.375rem;
        }
        .auth-subtitle {
          color: var(--color-text-secondary);
          font-size: 0.9rem;
        }
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
        .auth-link:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
LoginPage.displayName = "LoginPage";
