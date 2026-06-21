const INTENT_PATTERNS = [
  {
    intent: 'log_activity',
    keywords: ['log', 'logged', 'drove', 'drive', 'ate', 'eat', 'flew', 'fly', 'used', 'took', 'rode', 'commute', 'traveled', 'consumed'],
    patterns: [
      /i (?:drove|drive|rode|took|flew|traveled|walked|biked|cycled)\s/i,
      /log\s(?:a|my|an)\s/i,
      /i (?:ate|had|consumed)\s/i,
      /i (?:used|consumed)\s\d+/i,
      /add\s(?:a|an|my)\s(?:activity|trip|ride|meal|flight)/i,
      /(\d+)\s*(km|miles?|kwh|hours?|meals?|kg)\b/i,
    ],
  },
  {
    intent: 'check_score',
    keywords: ['score', 'footprint', 'total', 'emissions', 'status', 'progress', 'stats', 'statistics', 'dashboard', 'overview', 'summary'],
    patterns: [
      /(?:what|show|check|how is|how's|what's|what is).*(?:score|footprint|emission|carbon|total|status|progress)/i,
      /(?:my|the)\s(?:score|footprint|total|emissions|status)/i,
      /how (?:am i|much|many)/i,
    ],
  },
  {
    intent: 'get_tips',
    keywords: ['tips', 'suggest', 'suggestion', 'advice', 'reduce', 'improve', 'lower', 'decrease', 'help me', 'recommend', 'ways', 'ideas'],
    patterns: [
      /(?:how (?:can|do|should) i|ways? to|tips? (?:for|to|on))\s.*(?:reduce|lower|decrease|improve|cut)/i,
      /(?:suggest|recommend|give me|any)\s.*(?:tips?|advice|ideas?|ways?)/i,
      /help me\s.*(?:reduce|lower|improve)/i,
      /what (?:can|should) i do/i,
    ],
  },
  {
    intent: 'add_habit',
    keywords: ['habit', 'routine', 'meatless', 'recycle', 'compost', 'bike', 'carpool'],
    patterns: [
      /(?:add|create|start|begin|set up)\s.*(?:habit|routine|practice)/i,
      /(?:i want to|i'd like to|let me)\s.*(?:habit|routine|start)/i,
      /meatless\s*monday/i,
      /(?:track|add).*(?:recycl|compost|bike|carpool|transit)/i,
    ],
  },
  {
    intent: 'compare',
    keywords: ['compare', 'comparison', 'versus', 'vs', 'last week', 'last month', 'previous', 'trend', 'better', 'worse', 'than'],
    patterns: [
      /(?:compare|comparison|versus|vs\.?)/i,
      /(?:this|last)\s(?:week|month|year)/i,
      /(?:am i|doing)\s(?:better|worse)/i,
      /(?:trend|progress)\s(?:over|in|for)/i,
    ],
  },
  {
    intent: 'set_goal',
    keywords: ['goal', 'target', 'limit', 'budget', 'set'],
    patterns: [
      /(?:set|change|update|adjust)\s.*(?:goal|target|limit|budget)/i,
      /(?:my|a new)\s(?:goal|target)/i,
      /(?:goal|target)\s.*(?:to|at)\s\d+/i,
    ],
  },
  {
    intent: 'greeting',
    keywords: ['hello', 'hi', 'hey', 'morning', 'afternoon', 'evening', 'night', 'sup', 'howdy'],
    patterns: [
      /^(?:hi|hello|hey|howdy|good (?:morning|afternoon|evening)|what's up|sup)\b/i,
    ],
  },
  {
    intent: 'help',
    keywords: ['help', 'how to', 'guide', 'tutorial', 'explain', 'what can you do', 'features'],
    patterns: [
      /(?:how (?:do i|to)|what can you|help me)\s(?:use|do|navigate|track)/i,
      /(?:help|guide|tutorial|features)/i,
    ],
  },
];
function classifyIntent(message) {
  if (!message || typeof message  ===  'string') {
    return { intent: 'general', confidence: 0, extractedData:  };
  }
  const normalizedMsg = message.toLowerCase().trim();
  const scores = ;
  for (const { intent, keywords, patterns } of INTENT_PATTERNS) {
    let score = 0;
    for (const pattern of patterns) {
      if (pattern.test(normalizedMsg)) {
        score += 3;
      }
    }
    for (const keyword of keywords) {
      if (normalizedMsg.includes(keyword)) {
        score += 1;
      }
    }
    if (score > 0) {
      scores[intent] = score;
    }
  }
  const sortedIntents = Object.entries(scores)
    .sort((a, b) => b[1] - a[1]);
  if (sortedIntents.length === 0) {
    return { intent: 'general', confidence: 0, extractedData:  };
  }
  const [topIntent, topScore] = sortedIntents[0];
  const maxPossibleScore = 20; // Rough maximum
  const confidence = Math.min(parseFloat((topScore / maxPossibleScore).toFixed(2)), 1.0);
  const extractedData = extractData(normalizedMsg, topIntent);
  return { intent: topIntent, confidence, extractedData };
}
function extractData(message, intent) {
  const data = ;
  const numberMatch = message.match(/(\d+(?:\.\d+)?)\s*(km|miles?|kwh|kw|hours?|meals?|kg|items?|litres?|liters?)/i);
  if (numberMatch) {
    data.quantity = parseFloat(numberMatch[1]);
    data.unit = numberMatch[2].toLowerCase();
  }
  if (inten ===  'log_activity') {
    if (/car|drove|drive|driving/i.test(message)) data.activity_hint = 'car';
    else if (/bus/i.test(message)) data.activity_hint = 'bus';
    else if (/train/i.test(message)) data.activity_hint = 'train';
    else if (/fl[ey]w|flight|plane/i.test(message)) data.activity_hint = 'flight';
    else if (/bik|cycl/i.test(message)) data.activity_hint = 'bicycle';
    else if (/walk/i.test(message)) data.activity_hint = 'walking';
    else if (/electri|power|kwh/i.test(message)) data.activity_hint = 'electricity';
    else if (/gas|heat/i.test(message)) data.activity_hint = 'natural_gas';
    else if (/meat|beef|steak/i.test(message)) data.activity_hint = 'red_meat';
    else if (/chicken|poultry/i.test(message)) data.activity_hint = 'poultry';
    else if (/vegan/i.test(message)) data.activity_hint = 'vegan';
    else if (/vegetarian|veggie/i.test(message)) data.activity_hint = 'vegetarian';
  }
  if (inten ===  'add_habit') {
    if (/meatless/i.test(message)) data.habit_hint = 'Meatless Monday';
    else if (/bike|cycl/i.test(message)) data.habit_hint = 'Bike to work';
    else if (/transit|bus|train/i.test(message)) data.habit_hint = 'Use public transit';
    else if (/recycl/i.test(message)) data.habit_hint = 'Recycle all waste';
    else if (/compost/i.test(message)) data.habit_hint = 'Compost food scraps';
    else if (/carpool/i.test(message)) data.habit_hint = 'Carpool';
    else if (/shower/i.test(message)) data.habit_hint = 'Shorter showers';
    else if (/plant.based/i.test(message)) data.habit_hint = 'Plant-based meals';
    else if (/local/i.test(message)) data.habit_hint = 'Buy local produce';
  }
  if (inten ===  'set_goal') {
    const goalMatch = message.match(/(\d+)\s*(?:kg|kilograms?)?/i);
    if (goalMatch) {
      data.goal_value = parseFloat(goalMatch[1]);
    }
  }
  return data;
}
module.exports = { classifyIntent };
