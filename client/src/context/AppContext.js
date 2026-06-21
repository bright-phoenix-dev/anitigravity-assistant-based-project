'use client';

/**
 * CarbonWise — Application State Context
 *
 * Manages global app state: activities, habits, summary data, and emission factors.
 * Provides data-fetching functions and prevents prop drilling.
 */

import { createContext, useContext, useState, useCallback } from 'react';
import { activitiesAPI, habitsAPI } from '@/lib/api';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [activities, setActivities] = useState([]);
  const [habits, setHabits] = useState([]);
  const [habitTemplates, setHabitTemplates] = useState({});
  const [summary, setSummary] = useState(null);
  const [factors, setFactors] = useState(null);
  const [loading, setLoading] = useState({});

  /**
   * Fetches the emission factors for populating forms.
   */
  const fetchFactors = useCallback(async () => {
    if (factors) return factors; // Cache
    try {
      const data = await activitiesAPI.getFactors();
      setFactors(data.factors);
      return data.factors;
    } catch (err) {
      console.error('Failed to fetch factors:', err);
      return null;
    }
  }, [factors]);

  /**
   * Fetches recent activities with optional filters.
   */
  const fetchActivities = useCallback(async (params = {}) => {
    setLoading(prev => ({ ...prev, activities: true }));
    try {
      const data = await activitiesAPI.list(params);
      setActivities(data.activities);
      return data;
    } catch (err) {
      console.error('Failed to fetch activities:', err);
      return null;
    } finally {
      setLoading(prev => ({ ...prev, activities: false }));
    }
  }, []);

  /**
   * Logs a new activity and refreshes data.
   */
  const logActivity = useCallback(async (activityData) => {
    const data = await activitiesAPI.log(activityData);
    // Optimistically add to state
    setActivities(prev => [data.activity, ...prev]);
    // Refresh summary
    refreshSummary();
    return data;
  }, []);

  /**
   * Deletes an activity and updates state.
   */
  const deleteActivity = useCallback(async (id) => {
    await activitiesAPI.delete(id);
    setActivities(prev => prev.filter(a => a.id !== id));
    refreshSummary();
  }, []);

  /**
   * Fetches the emissions summary for a given period.
   */
  const fetchSummary = useCallback(async (period = 'month') => {
    setLoading(prev => ({ ...prev, summary: true }));
    try {
      const data = await activitiesAPI.getSummary(period);
      setSummary(data.summary);
      return data.summary;
    } catch (err) {
      console.error('Failed to fetch summary:', err);
      return null;
    } finally {
      setLoading(prev => ({ ...prev, summary: false }));
    }
  }, []);

  /**
   * Refreshes the summary (called after data changes).
   */
  const refreshSummary = useCallback(() => {
    fetchSummary('month');
  }, [fetchSummary]);

  /**
   * Fetches user habits.
   */
  const fetchHabits = useCallback(async () => {
    setLoading(prev => ({ ...prev, habits: true }));
    try {
      const data = await habitsAPI.list();
      setHabits(data.habits);
      setHabitTemplates(data.templates || {});
      return data;
    } catch (err) {
      console.error('Failed to fetch habits:', err);
      return null;
    } finally {
      setLoading(prev => ({ ...prev, habits: false }));
    }
  }, []);

  /**
   * Creates a new habit.
   */
  const createHabit = useCallback(async (habitData) => {
    const data = await habitsAPI.create(habitData);
    setHabits(prev => [data.habit, ...prev]);
    return data;
  }, []);

  /**
   * Updates a habit (complete, toggle, edit).
   */
  const updateHabit = useCallback(async (id, updateData) => {
    const data = await habitsAPI.update(id, updateData);
    setHabits(prev => prev.map(h => (h.id === id ? data.habit : h)));
    return data;
  }, []);

  /**
   * Deletes a habit.
   */
  const deleteHabit = useCallback(async (id) => {
    await habitsAPI.delete(id);
    setHabits(prev => prev.filter(h => h.id !== id));
  }, []);

  const value = {
    // State
    activities,
    habits,
    habitTemplates,
    summary,
    factors,
    loading,

    // Actions
    fetchFactors,
    fetchActivities,
    logActivity,
    deleteActivity,
    fetchSummary,
    refreshSummary,
    fetchHabits,
    createHabit,
    updateHabit,
    deleteHabit,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

/**
 * Hook to access app context.
 */
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
