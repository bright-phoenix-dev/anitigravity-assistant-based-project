'use client';

/**
 * CarbonWise — Sidebar Navigation Component
 *
 * Persistent sidebar with navigation links, user info, and logout.
 * Collapsible on mobile with a hamburger toggle.
 */

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊', ariaLabel: 'Go to Dashboard' },
  { href: '/log', label: 'Log Activity', icon: '📋', ariaLabel: 'Log a new activity' },
  { href: '/habits', label: 'Habits', icon: '🔄', ariaLabel: 'Manage habits' },
  { href: '/analytics', label: 'Analytics', icon: '📈', ariaLabel: 'View analytics' },
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        id="sidebar-toggle"
        className="sidebar-mobile-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={isOpen}
      >
        <span className={`hamburger ${isOpen ? 'active' : ''}`}>
          <span></span>
          <span></span>
          <span></span>
        </span>
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Logo / Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <span className="sidebar-logo-icon">🌍</span>
            <div>
              <h1 className="sidebar-logo-text">CarbonWise</h1>
              <p className="sidebar-logo-sub">Track. Reduce. Thrive.</p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
                onClick={() => setIsOpen(false)}
                aria-label={item.ariaLabel}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="sidebar-link-icon" aria-hidden="true">{item.icon}</span>
                <span className="sidebar-link-label">{item.label}</span>
                {isActive && <span className="sidebar-active-indicator" />}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar" aria-hidden="true">
              {user?.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="sidebar-user-info">
              <p className="sidebar-user-name">{user?.name || 'User'}</p>
              <p className="sidebar-user-region">{user?.region || 'Global'}</p>
            </div>
          </div>
          <button
            id="logout-button"
            className="sidebar-logout"
            onClick={logout}
            aria-label="Log out of your account"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </aside>

      <style jsx>{`
        .sidebar-mobile-toggle {
          display: none;
          position: fixed;
          top: 1rem;
          left: 1rem;
          z-index: 1001;
          width: 44px;
          height: 44px;
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          cursor: pointer;
          align-items: center;
          justify-content: center;
        }

        .hamburger {
          display: flex;
          flex-direction: column;
          gap: 5px;
          transition: all 0.3s;
        }

        .hamburger span {
          display: block;
          width: 20px;
          height: 2px;
          background: var(--color-text-primary);
          transition: all 0.3s;
          border-radius: 1px;
        }

        .hamburger.active span:nth-child(1) {
          transform: rotate(45deg) translateY(7px);
        }

        .hamburger.active span:nth-child(2) {
          opacity: 0;
        }

        .hamburger.active span:nth-child(3) {
          transform: rotate(-45deg) translateY(-7px);
        }

        .sidebar-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 999;
        }

        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          width: var(--sidebar-width);
          height: 100vh;
          background: var(--color-bg-secondary);
          border-right: 1px solid var(--color-border-light);
          display: flex;
          flex-direction: column;
          z-index: 1000;
          transition: transform var(--transition-base);
        }

        .sidebar-brand {
          padding: 1.5rem;
          border-bottom: 1px solid var(--color-border-light);
        }

        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .sidebar-logo-icon {
          font-size: 2rem;
          animation: float 3s ease-in-out infinite;
        }

        .sidebar-logo-text {
          font-size: 1.25rem;
          font-weight: 700;
          background: var(--gradient-primary);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: -0.02em;
        }

        .sidebar-logo-sub {
          font-size: 0.7rem;
          color: var(--color-text-muted);
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .sidebar-nav {
          flex: 1;
          padding: 1rem 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          overflow-y: auto;
        }

        .sidebar-link {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-radius: var(--radius-md);
          color: var(--color-text-secondary);
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 500;
          position: relative;
          transition: all var(--transition-fast);
        }

        .sidebar-link:hover {
          background: var(--color-bg-tertiary);
          color: var(--color-text-primary);
        }

        .sidebar-link-active {
          background: var(--color-primary-glow);
          color: var(--color-primary-light);
        }

        .sidebar-link-active:hover {
          background: var(--color-primary-glow);
          color: var(--color-primary-light);
        }

        .sidebar-active-indicator {
          position: absolute;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 60%;
          background: var(--color-primary);
          border-radius: var(--radius-full);
        }

        .sidebar-link-icon {
          font-size: 1.25rem;
          width: 1.5rem;
          text-align: center;
        }

        .sidebar-footer {
          padding: 1rem 1.25rem;
          border-top: 1px solid var(--color-border-light);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
        }

        .sidebar-user {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex: 1;
          min-width: 0;
        }

        .sidebar-avatar {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-full);
          background: var(--gradient-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.9rem;
          color: white;
          flex-shrink: 0;
        }

        .sidebar-user-info {
          min-width: 0;
        }

        .sidebar-user-name {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--color-text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sidebar-user-region {
          font-size: 0.7rem;
          color: var(--color-text-muted);
        }

        .sidebar-logout {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: var(--color-text-muted);
          cursor: pointer;
          border-radius: var(--radius-md);
          transition: all var(--transition-fast);
          flex-shrink: 0;
        }

        .sidebar-logout:hover {
          background: rgba(239, 68, 68, 0.1);
          color: var(--color-danger);
        }

        @media (max-width: 768px) {
          .sidebar-mobile-toggle {
            display: flex;
          }

          .sidebar-overlay {
            display: block;
          }

          .sidebar {
            transform: translateX(-100%);
          }

          .sidebar-open {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}
