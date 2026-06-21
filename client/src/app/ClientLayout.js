'use client';

/**
 * CarbonWise — Client Layout
 *
 * Wraps the app with Context providers.
 * Shows Sidebar + Chat widget only for authenticated routes.
 */

import { usePathname } from 'next/navigation';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AppProvider } from '@/context/AppContext';
import Sidebar from '@/components/Sidebar';
import ChatWidget from '@/components/ChatWidget';

/**
 * Inner layout that reads auth state to conditionally render the sidebar.
 */
function LayoutInner({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const pathname = usePathname();

  // Public routes (no sidebar)
  const isPublicRoute = ['/', '/login', '/register'].includes(pathname);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--color-bg-primary)',
      }}>
        <div className="animate-pulse-glow" style={{
          width: 60,
          height: 60,
          borderRadius: '50%',
          background: 'var(--gradient-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
        }}>
          🌍
        </div>
      </div>
    );
  }

  if (!isAuthenticated || isPublicRoute) {
    return <>{children}</>;
  }

  return (
    <AppProvider>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar />
        <main style={{
          flex: 1,
          marginLeft: 'var(--sidebar-width)',
          minHeight: '100vh',
          background: 'var(--color-bg-primary)',
          position: 'relative',
        }}>
          {children}
        </main>
        <ChatWidget />
      </div>
      <style jsx>{`
        @media (max-width: 768px) {
          main {
            margin-left: 0 !important;
          }
        }
      `}</style>
    </AppProvider>
  );
}

export default function ClientLayout({ children }) {
  return (
    <AuthProvider>
      <LayoutInner>{children}</LayoutInner>
    </AuthProvider>
  );
}
