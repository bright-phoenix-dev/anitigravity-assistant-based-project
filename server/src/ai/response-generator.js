const { classifyIntent } = require('./intent-classifier');
const { buildUserContext } = require('./context-builder');
const { evaluateRules } = require('./rules-engine');
const { calculateCarbon, getEmissionFactors, BENCHMARKS } = require('../utils/carbon-calculator');
function generateResponse(userId, message) {
  const { intent, confidence, extractedData } = classifyIntent(message);
  const context = buildUserContext(userId);
  let response;
  let actions = [];
  switch (intent) {
    case 'greeting':
      ({ response, actions } = handleGreeting(context));
      break;
    case 'check_score':
      ({ response, actions } = handleCheckScore(context));
      break;
    case 'get_tips':
      ({ response, actions } = handleGetTips(context));
      break;
    case 'log_activity':
      ({ response, actions } = handleLogActivity(context, extractedData));
      break;
    case 'add_habit':
      ({ response, actions } = handleAddHabit(context, extractedData));
      break;
    case 'compare':
      ({ response, actions } = handleCompare(context));
      break;
    case 'set_goal':
      ({ response, actions } = handleSetGoal(context, extractedData));
      break;
    case 'help':
      ({ response, actions } = handleHelp(context));
      break;
    default:
      ({ response, actions } = handleGeneral(context));
  }
  const insights = evaluateRules(context, 2);
  return {
    response,
    actions,
    intent,
    confidence,
    insights: insights.map(i => ({
      message: i.message,
      actions: i.actions,
    })),
  };
}
function handleGreeting(ctx) {
  const timeGreeting = {
    morning: 'Good morning',
    afternoon: 'Good afternoon',
    evening: 'Good evening',
    night: 'Hey there',
  }[ctx.temporal.time_of_day] || 'Hello';
  let response = `${timeGreeting}, ${ctx.user.name}! 🌍 `;
  if (!ctx.activities.has_ever_logged) {
    response += `Welcome to CarbonWise! Ready to start tracking your carbon footprint? I can help you log activities, build eco-friendly habits, and track your progress over time.`;
  } else {
    response += `Your monthly emissions are at **${ctx.emissions.monthly_total_kg.toFixed(1)} kg CO₂** (${ctx.emissions.goal_progress_percent.toFixed(0)}% of your ${ctx.emissions.monthly_goal_kg} kg goal). `;
    if (ctx.emissions.is_improving) {
      response += `Great news — you're trending **down** from last week! 📉`;
    } else if (ctx.emissions.this_week_kg > ctx.emissions.last_week_kg && ctx.emissions.last_week_kg > 0) {
      response += `This week's emissions are a bit higher than last week. Let me know if you want tips on reducing them.`;
    } else {
      response += `How can I help you today?`;
    }
  }
  const actions = !ctx.activities.has_ever_logged
    ? [{ type: 'log_activity', label: '📋 Log my first activity' }]
    : [{ type: 'show_analytics', label: '📈 View dashboard' }];
  return { response, actions };
}
function handleCheckScore(ctx) {
  if (!ctx.activities.has_ever_logged) {
    return {
      response: `You haven't logged any activities yet, so your carbon score is at **0 kg CO₂**. Start by logging your daily commute, meals, or energy usage, and I'll calculate your footprint in real-time!`,
      actions: [{ type: 'log_activity', label: '📋 Log an activity' }],
    };
  }
  let response = `📊 **Your Carbon Score — This Month:**\n\n`;
  response += `• **Total Emissions:** ${ctx.emissions.monthly_total_kg.toFixed(1)} kg CO₂\n`;
  response += `• **Monthly Goal:** ${ctx.emissions.monthly_goal_kg} kg CO₂\n`;
  response += `• **Progress:** ${ctx.emissions.goal_progress_percent.toFixed(0)}% of goal\n`;
  if (ctx.emissions.by_category.length > 0) {
    response += `\n**By Category:**\n`;
    for (const cat of ctx.emissions.by_category) {
      const emoji = { transport: '🚗', energy: '⚡', food: '🍽️', waste: '🗑️', shopping: '🛍️' }[cat.category] || '📦';
      response += `• ${emoji} ${cat.category}: ${cat.total_kg.toFixed(1)} kg (${cat.percent}%)\n`;
    }
  }
  if (ctx.benchmark.is_below_benchmark) {
    response += `\n🌟 You're below the ${ctx.user.region || 'global'} average of ${ctx.benchmark.regional_monthly_kg} kg/month!`;
  } else {
    response += `\nYour regional benchmark is ${ctx.benchmark.regional_monthly_kg} kg/month.`;
  }
  const actions = [{ type: 'show_analytics', label: '📈 View detailed analytics' }];
  return { response, actions };
}
function handleGetTips(ctx) {
  let response = `💡 **Personalized Tips for You, ${ctx.user.name}:**\n\n`;
  const actions = [];
  const tips = [];
  if (ctx.emissions.top_category === 'transport') {
    tips.push(`🚗 **Transport** is your biggest category (${ctx.emissions.top_category_percent}%). Try carpooling, public transit, or biking for shorter trips.`);
    if (!ctx.habits.has_transport_habit) {
      actions.push({ type: 'add_habit', label: '🚴 Start biking habit', data: { name: 'Bike to work', category: 'transport' } });
    }
  } else if (ctx.emissions.top_category === 'food') {
    tips.push(`🍽️ **Food** is your top source (${ctx.emissions.top_category_percent}%). Reducing red meat by one meal/week saves ~6.6 kg CO₂.`);
    if (!ctx.habits.has_food_habit) {
      actions.push({ type: 'add_habit', label: '🥗 Try Meatless Monday', data: { name: 'Meatless Monday', category: 'food' } });
    }
  } else if (ctx.emissions.top_category === 'energy') {
    tips.push(`⚡ **Energy** leads your emissions (${ctx.emissions.top_category_percent}%). Switch to LED bulbs, unplug devices on standby, and optimize thermostat settings.`);
    if (!ctx.habits.has_energy_habit) {
      actions.push({ type: 'add_habit', label: '💡 Add LED lighting habit', data: { name: 'LED lighting', category: 'energy' } });
    }
  }
  tips.push(`🌱 **Quick wins:** Shorter showers (save ~12 kg/month), air-drying clothes (save ~6 kg/month), and buying local produce (save ~8 kg/month).`);
  tips.push(`♻️ **Recycling** vs landfill reduces waste emissions by **95%** — make sure to sort your waste.`);
  if (ctx.habits.active_count === 0) {
    tips.push(`💪 **Start a habit!** Consistent small actions have bigger impact than occasional big gestures.`);
  }
  response += tips.join('\n\n');
  if (actions.length === 0) {
    actions.push({ type: 'show_analytics', label: '📈 See my breakdown' });
  }
  return { response, actions };
}
function handleLogActivity(ctx, extractedData) {
  let response;
  const actions = [];
  if (extractedData.quantity && extractedData.activity_hint) {
    const hint = extractedData.activity_hint;
    const quantity = extractedData.quantity;
    const factorMap = {
      car: { category: 'transport', type: 'car_gasoline' },
      bus: { category: 'transport', type: 'bus' },
      train: { category: 'transport', type: 'train' },
      flight: { category: 'transport', type: 'flight_domestic' },
      bicycle: { category: 'transport', type: 'bicycle' },
      walking: { category: 'transport', type: 'walking' },
      electricity: { category: 'energy', type: 'electricity' },
      natural_gas: { category: 'energy', type: 'natural_gas' },
      red_meat: { category: 'food', type: 'red_meat' },
      poultry: { category: 'food', type: 'poultry' },
      vegan: { category: 'food', type: 'vegan' },
      vegetarian: { category: 'food', type: 'vegetarian' },
    };
    const mapping = factorMap[hint];
    if (mapping) {
      try {
        const calc = calculateCarbon(mapping.category, mapping.type, quantity);
        response = `I can log that for you! **${quantity} ${calc.unit}** of ${calc.label.toLowerCase()} would produce approximately **${calc.carbon_kg.toFixed(2)} kg CO₂**. Would you like me to add this to your log?`;
        actions.push({
          type: 'confirm_log',
          label: `✅ Log ${calc.carbon_kg.toFixed(2)} kg CO₂`,
          data: {
            category: mapping.category,
            activity_type: mapping.type,
            quantity,
          },
        });
      } catch (e) {
        response = `I understood you want to log an activity, but I need a bit more detail. Please use the activity logger to select the category and type.`;
        actions.push({ type: 'log_activity', label: '📋 Open activity logger' });
      }
    } else {
      response = `I see you want to log an activity with ${quantity} ${extractedData.unit || 'units'}. Let me open the logger so you can fill in the details.`;
      actions.push({ type: 'log_activity', label: '📋 Open activity logger' });
    }
  } else if (extractedData.quantity) {
    response = `Got it — ${extractedData.quantity} ${extractedData.unit || 'units'}. What type of activity was this? (e.g., driving, flying, a meal, electricity usage)`;
    actions.push({ type: 'log_activity', label: '📋 Open activity logger' });
  } else {
    response = `I'll help you log an activity! Open the tracker to select the category (transport, energy, food, waste, or shopping), choose the specific type, and enter the quantity. I'll calculate the CO₂ automatically.`;
    actions.push({ type: 'log_activity', label: '📋 Open activity logger' });
  }
  return { response, actions };
}
function handleAddHabit(ctx, extractedData) {
  let response;
  const actions = [];
  if (extractedData.habit_hint) {
    const habitName = extractedData.habit_hint;
    const existing = ctx.habits.active.find(
      h => h.name.toLowerCase( ===  habitName.toLowerCase()
    );
    if (existing) {
      response = `You already have a **"${habitName}"** habit with a ${existing.streak_days}-day streak! ${
        existing.streak_days > 0
          ? `Keep it going! 🔥`
          : `Don't forget to mark it complete today.`
      }`;
    } else {
      const categoryMap = {
        'Meatless Monday': 'food',
        'Bike to work': 'transport',
        'Use public transit': 'transport',
        'Recycle all waste': 'waste',
        'Compost food scraps': 'waste',
        'Carpool': 'transport',
        'Shorter showers': 'energy',
        'Plant-based meals': 'food',
        'Buy local produce': 'food',
      };
      response = `Great choice! I'll add **"${habitName}"** to your habits tracker. This can save an estimated amount of CO₂ each month. Shall I add it?`;
      actions.push({
        type: 'add_habit',
        label: `✅ Add "${habitName}" habit`,
        data: { name: habitName, category: categoryMap[habitName] || 'food' },
      });
    }
  } else {
    response = `Here are some popular eco-friendly habits you could start:\n\n`;
    response += `🥗 **Meatless Monday** — Save ~24 kg CO₂/month\n`;
    response += `🚴 **Bike to work** — Save ~40 kg CO₂/month\n`;
    response += `🚇 **Use public transit** — Save ~30 kg CO₂/month\n`;
    response += `♻️ **Recycle all waste** — Save ~15 kg CO₂/month\n`;
    response += `🚿 **Shorter showers** — Save ~12 kg CO₂/month\n\n`;
    response += `Which one interests you?`;
    actions.push({ type: 'show_habits', label: '🔄 Browse all habits' });
  }
  return { response, actions };
}
function handleCompare(ctx) {
  let response = `📊 **Your Emissions Comparison:**\n\n`;
  if (!ctx.activities.has_ever_logged) {
    return {
      response: `You need to log some activities first before I can show comparisons. Start tracking today!`,
      actions: [{ type: 'log_activity', label: '📋 Log an activity' }],
    };
  }
  response += `**This Week vs Last Week:**\n`;
  response += `• This week: ${ctx.emissions.this_week_kg.toFixed(1)} kg CO₂\n`;
  response += `• Last week: ${ctx.emissions.last_week_kg.toFixed(1)} kg CO₂\n`;
  if (ctx.emissions.last_week_kg > 0) {
    const change = ctx.emissions.week_change_percent;
    if (change < 0) {
      response += `• Change: 📉 **${Math.abs(change)}% decrease** — Great improvement!\n`;
    } else if (change > 0) {
      response += `• Change: 📈 **${change}% increase** — Let's work on bringing this down.\n`;
    } else {
      response += `• Change: ➡️ **No change** — Steady pace.\n`;
    }
  }
  response += `\n**Monthly Progress:**\n`;
  response += `• Current: ${ctx.emissions.monthly_total_kg.toFixed(1)} / ${ctx.emissions.monthly_goal_kg} kg goal\n`;
  response += `• Progress: ${ctx.emissions.goal_progress_percent.toFixed(0)}%\n`;
  response += `\n**vs ${ctx.user.region || 'Global'} Average:**\n`;
  response += `• You: ${ctx.emissions.monthly_total_kg.toFixed(1)} kg/month\n`;
  response += `• Average: ${ctx.benchmark.regional_monthly_kg} kg/month\n`;
  response += `• You're at ${ctx.benchmark.vs_benchmark_percent}% of the average ${ctx.benchmark.is_below_benchmark ? '✅' : ''}`;
  return {
    response,
    actions: [{ type: 'show_analytics', label: '📈 View full analytics' }],
  };
}
function handleSetGoal(ctx, extractedData) {
  if (extractedData.goal_value) {
    const newGoal = extractedData.goal_value;
    if (newGoal < 1 || newGoal > 10000) {
      return {
        response: `That goal seems out of range. Please set a monthly goal between 1 and 10,000 kg CO₂.`,
        actions: [],
      };
    }
    return {
      response: `I'll update your monthly goal from ${ctx.user.monthly_goal_kg} kg to **${newGoal} kg CO₂**. The sustainable target recommended by climate scientists is about ${BENCHMARKS.target_sustainable_monthly} kg/month. Would you like to confirm this change?`,
      actions: [
        { type: 'set_goal', label: `✅ Set goal to ${newGoal} kg`, data: { goal_kg: newGoal } },
      ],
    };
  }
  return {
    response: `Your current monthly goal is **${ctx.user.monthly_goal_kg} kg CO₂**. The sustainable target is about ${BENCHMARKS.target_sustainable_monthly} kg/month (~2,000 kg/year). What would you like to set your new goal to? (e.g., "set goal to 150 kg")`,
    actions: [
      { type: 'set_goal', label: '🎯 Set to sustainable target', data: { goal_kg: BENCHMARKS.target_sustainable_monthly } },
    ],
  };
}
function handleHelp(ctx) {
  let response = `🤖 **I'm your CarbonWise assistant!** Here's what I can help with:\n\n`;
  response += `📋 **Log Activities** — Tell me what you did (e.g., "I drove 30 km today")\n`;
  response += `📊 **Check Score** — Ask about your carbon footprint status\n`;
  response += `💡 **Get Tips** — Request personalized reduction advice\n`;
  response += `🔄 **Manage Habits** — Start eco-friendly habits (e.g., "add Meatless Monday")\n`;
  response += `📈 **Compare** — See how you're doing vs. last week or the average\n`;
  response += `🎯 **Set Goals** — Change your monthly carbon target\n\n`;
  response += `Just type naturally — I'll understand what you need! You can also use the navigation sidebar to access specific features directly.`;
  return {
    response,
    actions: [
      { type: 'log_activity', label: '📋 Log an activity' },
      { type: 'show_analytics', label: '📈 View dashboard' },
    ],
  };
}
function handleGeneral(ctx) {
  if (!ctx.activities.has_ever_logged) {
    return {
      response: `I'm here to help you track your carbon footprint! 🌍 To get started, try logging your first activity — like your commute, a meal, or energy usage. You can also say things like "give me tips" or "add a habit."`,
      actions: [{ type: 'log_activity', label: '📋 Log my first activity' }],
    };
  }
  const insights = evaluateRules(ctx, 1);
  if (insights.length > 0) {
    return {
      response: `Here's something relevant for you:\n\n${insights[0].message}`,
      actions: insights[0].actions || [],
    };
  }
  return {
    response: `I'm your CarbonWise assistant! I can help you log activities, check your score, get reduction tips, manage habits, or compare your progress. What would you like to do?`,
    actions: [
      { type: 'log_activity', label: '📋 Log an activity' },
      { type: 'show_analytics', label: '📈 View dashboard' },
    ],
  };
}
module.exports = { generateResponse };
