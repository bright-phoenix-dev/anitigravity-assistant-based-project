/**
 * CarbonWise — Rules Engine
 *
 * A priority-weighted rule evaluation engine that analyzes user context
 * to generate personalized insights and actionable recommendations.
 *
 * Each rule has:
 *   - id:        Unique identifier
 *   - priority:  1-10 (10 = highest urgency)
 *   - condition: Function that checks if the rule applies
 *   - generate:  Function that produces the insight message and optional actions
 *
 * The engine evaluates all rules, sorts by priority, and returns the
 * top matching insights. This ensures the most important recommendations
 * are always surfaced first.
 */

/**
 * @typedef {Object} RuleResult
 * @property {string} id         - Rule identifier
 * @property {number} priority   - Rule priority (1-10)
 * @property {string} message    - The insight message to display
 * @property {Array}  [actions]  - Optional UI actions to offer the user
 */

/**
 * Master list of context-aware rules.
 * Rules are defined in priority order but evaluated and sorted dynamically.
 */
const RULES = [
  // ═══════════════════════════════════════════════════════════════
  // PRIORITY 10 — Critical Alerts
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'goal_exceeded',
    priority: 10,
    condition: (ctx) => ctx.emissions.is_over_goal,
    generate: (ctx) => ({
      message: `⚠️ Heads up, ${ctx.user.name}! You've reached ${ctx.emissions.goal_progress_percent.toFixed(0)}% of your monthly goal (${ctx.emissions.monthly_total_kg.toFixed(1)} / ${ctx.emissions.monthly_goal_kg} kg CO₂). ${
        ctx.emissions.top_category
          ? `Your biggest contributor is **${ctx.emissions.top_category}** at ${ctx.emissions.top_category_percent}% of total emissions.`
          : ''
      } Let's look at ways to bring that down.`,
      actions: [
        { type: 'show_tips', label: '💡 Show reduction tips', category: ctx.emissions.top_category },
        { type: 'adjust_goal', label: '🎯 Adjust my goal' },
      ],
    }),
  },

  // ═══════════════════════════════════════════════════════════════
  // PRIORITY 9 — Approaching Goal
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'goal_warning',
    priority: 9,
    condition: (ctx) =>
      !ctx.emissions.is_over_goal &&
      ctx.emissions.goal_progress_percent >= 80,
    generate: (ctx) => ({
      message: `📊 You're at **${ctx.emissions.goal_progress_percent.toFixed(0)}%** of your monthly goal (${ctx.emissions.monthly_total_kg.toFixed(1)} / ${ctx.emissions.monthly_goal_kg} kg CO₂). You have about ${(ctx.emissions.monthly_goal_kg - ctx.emissions.monthly_total_kg).toFixed(1)} kg remaining. Consider lower-impact alternatives for the rest of the month.`,
      actions: [
        { type: 'show_analytics', label: '📈 View my breakdown' },
      ],
    }),
  },

  // ═══════════════════════════════════════════════════════════════
  // PRIORITY 8 — High Category Alerts
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'high_transport',
    priority: 8,
    condition: (ctx) =>
      ctx.emissions.top_category === 'transport' &&
      ctx.emissions.top_category_percent > 50,
    generate: (ctx) => {
      const tips = [
        'Consider carpooling or using public transit for your regular commute.',
        'If possible, try working from home 1-2 days a week.',
        'For short trips under 5 km, walking or cycling can eliminate emissions entirely.',
      ];
      const regionTip = ctx.user.region && ctx.user.region !== 'Global'
        ? ` Look into transit options in ${ctx.user.region} — many cities offer monthly passes that also save money.`
        : '';

      return {
        message: `🚗 Transport makes up **${ctx.emissions.top_category_percent}%** of your emissions this month. ${tips[Math.floor(Math.random() * tips.length)]}${regionTip}`,
        actions: !ctx.habits.has_transport_habit
          ? [{ type: 'add_habit', label: '🚴 Add "Bike to work" habit', data: { name: 'Bike to work', category: 'transport' } }]
          : [],
      };
    },
  },
  {
    id: 'high_food',
    priority: 8,
    condition: (ctx) =>
      ctx.emissions.top_category === 'food' &&
      ctx.emissions.top_category_percent > 40,
    generate: (ctx) => ({
      message: `🍔 Food accounts for **${ctx.emissions.top_category_percent}%** of your emissions. Switching just one red meat meal to vegetarian each week can save ~6 kg CO₂! Plant-based meals have up to 17x lower carbon footprint than beef.`,
      actions: !ctx.habits.has_food_habit
        ? [{ type: 'add_habit', label: '🥗 Add "Meatless Monday" habit', data: { name: 'Meatless Monday', category: 'food' } }]
        : [],
    }),
  },
  {
    id: 'high_energy',
    priority: 8,
    condition: (ctx) =>
      ctx.emissions.top_category === 'energy' &&
      ctx.emissions.top_category_percent > 45,
    generate: (ctx) => {
      const seasonTip = ctx.temporal.season === 'winter'
        ? 'Lowering your thermostat by 1°C can reduce heating emissions by ~10%.'
        : ctx.temporal.season === 'summer'
          ? 'Setting your AC to 26°C instead of 22°C can cut cooling energy by up to 30%.'
          : 'Switching off standby devices can save up to 10% on your electricity bill.';

      return {
        message: `⚡ Energy use is your largest category at **${ctx.emissions.top_category_percent}%** of emissions. ${seasonTip}`,
        actions: !ctx.habits.has_energy_habit
          ? [{ type: 'add_habit', label: '💡 Add "LED lighting" habit', data: { name: 'LED lighting', category: 'energy' } }]
          : [],
      };
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // PRIORITY 7 — Streak Celebrations
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'streak_milestone',
    priority: 7,
    condition: (ctx) => ctx.habits.longest_streak >= 7,
    generate: (ctx) => {
      const topHabit = ctx.habits.active.reduce(
        (best, h) => (h.streak_days > best.streak_days ? h : best),
        ctx.habits.active[0]
      );
      const milestone = topHabit.streak_days >= 30
        ? '🏆 Incredible! A whole month'
        : topHabit.streak_days >= 14
          ? '🔥 Two weeks strong'
          : '⭐ One week down';

      return {
        message: `${milestone}! Your "${topHabit.name}" habit has a **${topHabit.streak_days}-day streak**. That's saving approximately ${(topHabit.estimated_savings_kg * topHabit.streak_days / 30).toFixed(1)} kg CO₂. Keep it up!`,
        actions: [],
      };
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // PRIORITY 6 — Proactive Suggestions
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'suggest_meatless',
    priority: 6,
    condition: (ctx) => {
      const foodCat = ctx.emissions.by_category.find(c => c.category === 'food');
      return foodCat && foodCat.total_kg > 20 && !ctx.habits.has_food_habit;
    },
    generate: () => ({
      message: `🌿 Your food emissions are notable. Have you considered trying **Meatless Mondays**? Just one plant-based day per week can save ~24 kg CO₂ monthly — that's equivalent to driving 115 km less!`,
      actions: [
        { type: 'add_habit', label: '🥗 Start Meatless Monday', data: { name: 'Meatless Monday', category: 'food' } },
      ],
    }),
  },
  {
    id: 'suggest_transit',
    priority: 6,
    condition: (ctx) => {
      const transportCat = ctx.emissions.by_category.find(c => c.category === 'transport');
      return transportCat && transportCat.total_kg > 30 && !ctx.habits.has_transport_habit;
    },
    generate: (ctx) => ({
      message: `🚌 Your transport emissions suggest regular driving. Public transit produces **75% fewer emissions** per km than a solo car trip. ${
        ctx.user.region !== 'Global'
          ? `Check out transit options in ${ctx.user.region}!`
          : 'Consider looking into local transit passes.'
      }`,
      actions: [
        { type: 'add_habit', label: '🚇 Add "Use public transit" habit', data: { name: 'Use public transit', category: 'transport' } },
      ],
    }),
  },

  // ═══════════════════════════════════════════════════════════════
  // PRIORITY 5 — Positive Reinforcement
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'weekly_improvement',
    priority: 5,
    condition: (ctx) => ctx.emissions.is_improving && ctx.emissions.last_week_kg > 0,
    generate: (ctx) => {
      const reduction = Math.abs(ctx.emissions.week_change_percent);
      return {
        message: `📉 Great progress, ${ctx.user.name}! Your emissions are **down ${reduction}%** compared to last week (${ctx.emissions.this_week_kg} vs ${ctx.emissions.last_week_kg} kg CO₂). You're heading in the right direction! 🌍`,
        actions: [],
      };
    },
  },
  {
    id: 'below_benchmark',
    priority: 5,
    condition: (ctx) => ctx.benchmark.is_below_benchmark && ctx.emissions.monthly_total_kg > 0,
    generate: (ctx) => ({
      message: `🌟 You're producing **${ctx.benchmark.vs_benchmark_percent}%** of the ${ctx.user.region || 'global'} average monthly emissions. That puts you well below the benchmark of ${ctx.benchmark.regional_monthly_kg} kg/month. Outstanding work!`,
      actions: [],
    }),
  },

  // ═══════════════════════════════════════════════════════════════
  // PRIORITY 4 — Gentle Nudges
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'no_recent_logs',
    priority: 4,
    condition: (ctx) => ctx.activities.has_ever_logged && ctx.activities.days_since_last_log >= 3,
    generate: (ctx) => ({
      message: `📝 It's been **${ctx.activities.days_since_last_log} days** since your last activity log. Regular tracking helps you stay aware of your impact. Even small activities count — did you commute, eat meals, or use energy today?`,
      actions: [
        { type: 'log_activity', label: '📋 Log an activity now' },
      ],
    }),
  },
  {
    id: 'no_habits',
    priority: 4,
    condition: (ctx) => ctx.habits.active_count === 0 && ctx.activities.has_ever_logged,
    generate: () => ({
      message: `💪 You're tracking emissions — great start! Now let's build some eco-friendly **habits**. Habits create lasting change. Start with something small like carrying a reusable water bottle or taking shorter showers.`,
      actions: [
        { type: 'show_habits', label: '🔄 Browse habit ideas' },
      ],
    }),
  },

  // ═══════════════════════════════════════════════════════════════
  // PRIORITY 3 — Seasonal & Contextual Tips
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'winter_heating_tip',
    priority: 3,
    condition: (ctx) => ctx.temporal.season === 'winter',
    generate: () => ({
      message: `❄️ **Winter tip:** Heating accounts for a large share of winter emissions. Try lowering your thermostat by 1-2°C and wearing an extra layer. Using a programmable thermostat can reduce heating energy by 10-15%.`,
      actions: [],
    }),
  },
  {
    id: 'summer_cooling_tip',
    priority: 3,
    condition: (ctx) => ctx.temporal.season === 'summer',
    generate: () => ({
      message: `☀️ **Summer tip:** Air conditioning can be a significant energy drain. Set your AC to 25-26°C instead of lower temperatures. Using fans alongside AC can let you raise the thermostat by 2°C without losing comfort.`,
      actions: [],
    }),
  },
  {
    id: 'weekend_tip',
    priority: 3,
    condition: (ctx) => ctx.temporal.is_weekend,
    generate: () => ({
      message: `🌳 **Weekend idea:** This is a great time for low-carbon activities! Consider visiting a local park, cooking a plant-based meal, or organizing items for recycling. Weekends are perfect for building sustainable habits.`,
      actions: [],
    }),
  },

  // ═══════════════════════════════════════════════════════════════
  // PRIORITY 2 — New User Onboarding
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'welcome_new_user',
    priority: 2,
    condition: (ctx) => ctx.user.is_new_user && !ctx.activities.has_ever_logged,
    generate: (ctx) => ({
      message: `👋 Welcome to CarbonWise, ${ctx.user.name}! I'm your personal carbon footprint assistant. Start by **logging your first activity** — like your commute today or a meal. I'll help you track and reduce your impact over time. Your monthly goal is currently set to ${ctx.user.monthly_goal_kg} kg CO₂.`,
      actions: [
        { type: 'log_activity', label: '📋 Log my first activity' },
        { type: 'show_habits', label: '🔄 Explore habits' },
      ],
    }),
  },
];

/**
 * Evaluates all rules against the given context and returns matching insights.
 *
 * @param {Object} context   - User context from context-builder
 * @param {number} [maxResults=3] - Maximum number of insights to return
 * @returns {RuleResult[]} Sorted array of matching rule results (highest priority first)
 */
function evaluateRules(context, maxResults = 3) {
  const results = [];

  for (const rule of RULES) {
    try {
      if (rule.condition(context)) {
        const generated = rule.generate(context);
        results.push({
          id: rule.id,
          priority: rule.priority,
          message: generated.message,
          actions: generated.actions || [],
        });
      }
    } catch (err) {
      // Log but don't break on individual rule failures
      console.error(`Rule "${rule.id}" evaluation error:`, err.message);
    }
  }

  // Sort by priority (highest first) and return top N
  return results
    .sort((a, b) => b.priority - a.priority)
    .slice(0, maxResults);
}

/**
 * Gets a specific rule's result if it matches the context.
 *
 * @param {string} ruleId  - The rule ID to check
 * @param {Object} context - User context
 * @returns {RuleResult | null}
 */
function evaluateSpecificRule(ruleId, context) {
  const rule = RULES.find(r => r.id === ruleId);
  if (!rule) return null;

  try {
    if (rule.condition(context)) {
      const generated = rule.generate(context);
      return {
        id: rule.id,
        priority: rule.priority,
        message: generated.message,
        actions: generated.actions || [],
      };
    }
  } catch (err) {
    console.error(`Rule "${ruleId}" evaluation error:`, err.message);
  }

  return null;
}

module.exports = { evaluateRules, evaluateSpecificRule, RULES };
