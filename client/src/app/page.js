'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
export default function HomePage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, loading, router]);
  if (loading || isAuthenticated) {
    return null;
  }
  return (
    <div className="landing-page">
      <div className="landing-bg-glow" aria-hidden="true" />
      <div className="landing-content">
        <div className="landing-hero">
          <div className="landing-icon animate-float">🌍</div>
          <h1 className="landing-title">
            Carbon<span className="gradient-text">Wise</span>
          </h1>
          <p className="landing-subtitle">
            Understand, track, and reduce your carbon footprint with
            AI-powered personalized insights.
          </p>
          <div className="landing-features">
            <div className="landing-feature">
              <span className="landing-feature-icon">📊</span>
              <span>Track Daily Emissions</span>
            </div>
            <div className="landing-feature">
              <span className="landing-feature-icon">🤖</span>
              <span>AI-Powered Insights</span>
            </div>
            <div className="landing-feature">
              <span className="landing-feature-icon">🔄</span>
              <span>Build Eco Habits</span>
            </div>
            <div className="landing-feature">
              <span className="landing-feature-icon">📈</span>
              <span>Visual Analytics</span>
            </div>
          </div>
          <div className="landing-actions">
            <Link aria-label="Navigation link" href="/register" className="btn-primary landing-btn-primary" id="landing-register">
              Get Started Free
              <svg aria-label="Graphic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </Link>
            <Link aria-label="Navigation link" href="/login" className="btn-secondary landing-btn-secondary" id="landing-login">
              Sign In
            </Link>
          </div>
        </div>
      </div>
      <style jsx>{`
        .landing-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-bg-primary);
          position: relative;
          overflow: hidden;
        }
        .landing-bg-glow {
          position: absolute;
          top: -200px;
          right: -200px;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 70%);
          pointer-events: none;
        }
        .landing-content {
          max-width: 600px;
          padding: 2rem;
          text-align: center;
          animation: fadeIn 0.6s ease-out;
        }
        .landing-icon {
          font-size: 4rem;
          margin-bottom: 1.5rem;
        }
        .landing-title {
          font-size: 3.5rem;
          font-weight: 800;
          letter-spacing: -0.04em;
          margin-bottom: 1rem;
          line-height: 1.1;
        }
        .landing-subtitle {
          font-size: 1.15rem;
          color: var(--color-text-secondary);
          line-height: 1.7;
          margin-bottom: 2.5rem;
          max-width: 480px;
          margin-left: auto;
          margin-right: auto;
        }
        .landing-features {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 2.5rem;
        }
        .landing-feature {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border-light);
          border-radius: var(--radius-md);
          font-size: 0.85rem;
          color: var(--color-text-secondary);
          transition: all var(--transition-fast);
        }
        .landing-feature:hover {
          border-color: var(--color-primary);
          color: var(--color-text-primary);
        }
        .landing-feature-icon {
          font-size: 1.25rem;
        }
        .landing-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
        }
        .landing-btn-primary {
          padding: 0.875rem 2rem;
          font-size: 1rem;
        }
        .landing-btn-secondary {
          padding: 0.875rem 2rem;
          font-size: 1rem;
        }
        @media (max-width: 640px) {
          .landing-title {
            font-size: 2.5rem;
          }
          .landing-features {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
HomePage.displayName = "HomePage";
