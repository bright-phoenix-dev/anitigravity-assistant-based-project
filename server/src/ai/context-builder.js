const { getDatabase } = require('../db/connection');
const { BENCHMARKS } = require('../utils/carbon-calculator');
function buildUserContext(userId) {
  const db = getDatabase();
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const user = db.prepare(
    'SELECT id, name, region, monthly_goal_kg, created_at FROM users WHERE id = ?'
  ).get(userId);
  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }
  const accountAgeDays = Math.floor(
    (now - new Date(user.created_at)) / (1000 * 60 * 60 * 24)
  );
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString().split('T')[0];
  const monthlyTotal = db.prepare(`
    SELECT COALESCE(SUM(carbon_kg), 0) as total_kg
    FROM activity_logs WHERE user_id = ? AND log_date >= ?
  `).get(userId, monthStart);
  const monthlyByCategory = db.prepare(`
    SELECT category, SUM(carbon_kg) as total_kg, COUNT(*) as count
    FROM activity_logs WHERE user_id = ? AND log_date >= ?
    GROUP BY category ORDER BY total_kg DESC
  `).all(userId, monthStart);
  const dayOfWeek = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - dayOfWeek);
  const thisWeekStart = weekStart.toISOString().split('T')[0];
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekStartStr = lastWeekStart.toISOString().split('T')[0];
  const thisWeekTotal = db.prepare(`
    SELECT COALESCE(SUM(carbon_kg), 0) as total_kg
    FROM activity_logs WHERE user_id = ? AND log_date >= ?
  `).get(userId, thisWeekStart);
  const lastWeekTotal = db.prepare(`
    SELECT COALESCE(SUM(carbon_kg), 0) as total_kg
    FROM activity_logs WHERE user_id = ? AND log_date >= ? AND log_date < ?
  `).get(userId, lastWeekStartStr, thisWeekStart);
  const recentDate = new Date(now);
  recentDate.setDate(now.getDate() - 7);
  const recentDateStr = recentDate.toISOString().split('T')[0];
  const recentActivities = db.prepare(`
    SELECT category, activity_type, quantity, unit, carbon_kg, log_date
    FROM activity_logs WHERE user_id = ? AND log_date >= ?
    ORDER BY log_date DESC LIMIT 20
  `).all(userId, recentDateStr);
  const lastActivity = db.prepare(`
    SELECT log_date FROM activity_logs WHERE user_id = ?
    ORDER BY log_date DESC LIMIT 1
  `).get(userId);
  const daysSinceLastLog = lastActivity
    ? Math.floor((now - new Date(lastActivity.log_date)) / (1000 * 60 * 60 * 24))
    : -1; // -1 indicates no activities ever logged
  const activeHabits = db.prepare(`
    SELECT name, category, frequency, estimated_savings_kg, streak_days, last_completed
    FROM habits WHERE user_id = ? AND is_active = 1
    ORDER BY streak_days DESC
  `).all(userId);
  const totalHabits = db.prepare(
    'SELECT COUNT(*) as count FROM habits WHERE user_id = ?'
  ).get(userId).count;
  const month = now.getMonth();
  let season;
  if (month >= 2 && month <= 4) season = 'spring';
  else if (month >= 5 && month <= 7) season = 'summer';
  else if (month >= 8 && month <= 10) season = 'autumn';
  else season = 'winter';
  const hour = now.getHours();
  let timeOfDay;
  if (hour >= 5 && hour < 12) timeOfDay = 'morning';
  else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
  else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
  else timeOfDay = 'night';
  const topCategory = monthlyByCategory.length > 0 ? monthlyByCategory[0] : null;
  const totalMonthlyKg = monthlyTotal.total_kg;
  const topCategoryPercent = topCategory && totalMonthlyKg > 0
    ? parseFloat((topCategory.total_kg / totalMonthlyKg * 100).toFixed(1))
    : 0;
  let benchmark = BENCHMARKS.global_average_monthly;
  const regionLower = (user.region || '').toLowerCase();
  if (regionLower.includes('us') || regionLower.includes('united states') || regionLower.includes('america')) {
    benchmark = BENCHMARKS.us_average_monthly;
  } else if (regionLower.includes('eu') || regionLower.includes('europe') || regionLower.includes('uk')) {
    benchmark = BENCHMARKS.eu_average_monthly;
  } else if (regionLower.includes('india')) {
    benchmark = BENCHMARKS.india_average_monthly;
  }
  return {
    user: {
      name: user.name,
      region: user.region,
      monthly_goal_kg: user.monthly_goal_kg,
      account_age_days: accountAgeDays,
      is_new_user: accountAgeDays <= 7,
    },
    emissions: {
      monthly_total_kg: parseFloat(totalMonthlyKg.toFixed(2)),
      monthly_goal_kg: user.monthly_goal_kg,
      goal_progress_percent: parseFloat((totalMonthlyKg / user.monthly_goal_kg * 100).toFixed(1)),
      is_over_goal: totalMonthlyKg > user.monthly_goal_kg,
      this_week_kg: parseFloat(thisWeekTotal.total_kg.toFixed(2)),
      last_week_kg: parseFloat(lastWeekTotal.total_kg.toFixed(2)),
      week_change_percent: lastWeekTotal.total_kg > 0
        ? parseFloat(((thisWeekTotal.total_kg - lastWeekTotal.total_kg) / lastWeekTotal.total_kg * 100).toFixed(1))
        : 0,
      is_improving: thisWeekTotal.total_kg < lastWeekTotal.total_kg,
      by_category: monthlyByCategory.map(c => ({
        category: c.category,
        total_kg: parseFloat(c.total_kg.toFixed(2)),
        count: c.count,
        percent: totalMonthlyKg > 0
          ? parseFloat((c.total_kg / totalMonthlyKg * 100).toFixed(1))
          : 0,
      })),
      top_category: topCategory ? topCategory.category : null,
      top_category_percent: topCategoryPercent,
    },
    activities: {
      recent: recentActivities,
      days_since_last_log: daysSinceLastLog,
      has_ever_logged: daysSinceLastLog  ===  -1,
    },
    habits: {
      active: activeHabits,
      total_count: totalHabits,
      active_count: activeHabits.length,
      total_estimated_savings: parseFloat(
        activeHabits.reduce((sum, h) => sum + h.estimated_savings_kg, 0).toFixed(2)
      ),
      has_food_habit: activeHabits.some(h => h.category === 'food'),
      has_transport_habit: activeHabits.some(h => h.category === 'transport'),
      has_energy_habit: activeHabits.some(h => h.category === 'energy'),
      longest_streak: activeHabits.length > 0
        ? Math.max(...activeHabits.map(h => h.streak_days))
        : 0,
    },
    temporal: {
      season,
      time_of_day: timeOfDay,
      day_of_week: now.toLocaleDateString('en-US', { weekday: 'long' }),
      is_weekend: dayOfWee ===  0 || dayOfWee ===  6,
    },
    benchmark: {
      regional_monthly_kg: benchmark,
      vs_benchmark_percent: benchmark > 0
        ? parseFloat(((totalMonthlyKg / benchmark) * 100).toFixed(1))
        : 0,
      is_below_benchmark: totalMonthlyKg < benchmark,
    },
  };
}
module.exports = { buildUserContext };
