'use client';

/**
 * CarbonWise — Auth Context Provider
 *
 * Manages authentication state (user, token, loading) across the application.
 * Persists JWT in localStorage and auto-validates on mount.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Validates stored token and loads user profile on mount.
   */
  useEffect(() => {
    const token = localStorage.getItem('carbonwise_token');
    if (token) {
      authAPI.getProfile()
        .then((data) => {
          setUser(data.user);
        })
        .catch(() => {
          // Token is invalid or expired — clear it
          localStorage.removeItem('carbonwise_token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  /**
   * Registers a new user account.
   */
  const register = useCallback(async ({ email, password, name, region }) => {
    setError(null);
    try {
      const data = await authAPI.register({ email, password, name, region });
      localStorage.setItem('carbonwise_token', data.token);
      setUser(data.user);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  /**
   * Logs in an existing user.
   */
  const login = useCallback(async ({ email, password }) => {
    setError(null);
    try {
      const data = await authAPI.login({ email, password });
      localStorage.setItem('carbonwise_token', data.token);
      setUser(data.user);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  /**
   * Logs out the current user.
   */
  const logout = useCallback(() => {
    localStorage.removeItem('carbonwise_token');
    setUser(null);
  }, []);

  /**
   * Updates the user profile.
   */
  const updateProfile = useCallback(async (updates) => {
    try {
      const data = await authAPI.updateProfile(updates);
      setUser(data.user);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    register,
    login,
    logout,
    updateProfile,
    clearError: () => setError(null),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth context.
 * @returns {{ user, loading, error, isAuthenticated, register, login, logout, updateProfile, clearError }}
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
