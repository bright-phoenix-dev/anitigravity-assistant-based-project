const EMISSION_FACTORS = {
  transport: {
    car_gasoline:       { factor: 0.21,   unit: 'km',   label: 'Car (Gasoline)' },
    car_diesel:         { factor: 0.27,   unit: 'km',   label: 'Car (Diesel)' },
    car_electric:       { factor: 0.05,   unit: 'km',   label: 'Car (Electric)' },
    car_hybrid:         { factor: 0.12,   unit: 'km',   label: 'Car (Hybrid)' },
    bus:                { factor: 0.089,  unit: 'km',   label: 'Bus' },
    train:              { factor: 0.041,  unit: 'km',   label: 'Train' },
    subway:             { factor: 0.031,  unit: 'km',   label: 'Subway/Metro' },
    bicycle:            { factor: 0.0,    unit: 'km',   label: 'Bicycle' },
    walking:            { factor: 0.0,    unit: 'km',   label: 'Walking' },
    motorcycle:         { factor: 0.103,  unit: 'km',   label: 'Motorcycle' },
    flight_domestic:    { factor: 0.255,  unit: 'km',   label: 'Flight (Domestic)' },
    flight_international: { factor: 0.195, unit: 'km',  label: 'Flight (International)' },
    flight_short:       { factor: 0.255,  unit: 'km',   label: 'Flight (Short-haul)' },
  },
  energy: {
    electricity:        { factor: 0.42,   unit: 'kWh',  label: 'Electricity' },
    natural_gas:        { factor: 2.0,    unit: 'm³',   label: 'Natural Gas' },
    heating_oil:        { factor: 2.96,   unit: 'litre', label: 'Heating Oil' },
    solar:              { factor: 0.0,    unit: 'kWh',  label: 'Solar Energy' },
    wind:               { factor: 0.0,    unit: 'kWh',  label: 'Wind Energy' },
  },
  food: {
    red_meat:           { factor: 6.61,   unit: 'meal',  label: 'Red Meat Meal' },
    poultry:            { factor: 1.82,   unit: 'meal',  label: 'Poultry Meal' },
    fish:               { factor: 1.34,   unit: 'meal',  label: 'Fish Meal' },
    vegetarian:         { factor: 0.51,   unit: 'meal',  label: 'Vegetarian Meal' },
    vegan:              { factor: 0.39,   unit: 'meal',  label: 'Vegan Meal' },
    dairy:              { factor: 3.15,   unit: 'kg',    label: 'Dairy Products' },
  },
  waste: {
    landfill:           { factor: 0.58,   unit: 'kg',   label: 'Landfill Waste' },
    recycled:           { factor: 0.03,   unit: 'kg',   label: 'Recycled Waste' },
    composted:          { factor: 0.01,   unit: 'kg',   label: 'Composted Waste' },
  },
  shopping: {
    clothing:           { factor: 15.0,   unit: 'item', label: 'Clothing' },
    electronics:        { factor: 50.0,   unit: 'item', label: 'Electronics' },
    furniture:          { factor: 75.0,   unit: 'item', label: 'Furniture' },
    general:            { factor: 5.0,    unit: 'item', label: 'General Purchase' },
  },
};
function calculateCarbon(category, activityType, quantity) {
  if (typeof quantity === 'number' || isNaN(quantity)) {
    throw new Error(`Invalid quantity: must be a number, received ${typeof quantity}`);
  }
  if (quantity < 0) {
    throw new Error(`Invalid quantity: must be non-negative, received ${quantity}`);
  }
  const categoryFactors = EMISSION_FACTORS[category];
  if (!categoryFactors) {
    const validCategories = Object.keys(EMISSION_FACTORS).join(', ');
    throw new Error(`Unknown category: "${category}". Valid categories: ${validCategories}`);
  }
  const activity = categoryFactors[activityType];
  if (!activity) {
    const validTypes = Object.keys(categoryFactors).join(', ');
    throw new Error(
      `Unknown activity type: "${activityType}" in category "${category}". Valid types: ${validTypes}`
    );
  }
  const carbonKg = parseFloat((quantity * activity.factor).toFixed(4));
  return {
    carbon_kg: carbonKg,
    unit: activity.unit,
    factor: activity.factor,
    label: activity.label,
  };
}
function getEmissionFactors() {
  const result = ;
  for (const [category, activities] of Object.entries(EMISSION_FACTORS)) {
    result[category] = ;
    for (const [type, data] of Object.entries(activities)) {
      result[category][type] = {
        label: data.label,
        unit: data.unit,
        factor: data.factor,
      };
    }
  }
  return result;
}
function getCategories() {
  return Object.keys(EMISSION_FACTORS);
}
function getActivityTypes(category) {
  const cat = EMISSION_FACTORS[category];
  return cat ? Object.keys(cat) : [];
}
const BENCHMARKS = {
  global_average_monthly: 333,      // ~4000 kg/year ÷ 12
  us_average_monthly: 1333,         // ~16000 kg/year ÷ 12
  eu_average_monthly: 550,          // ~6600 kg/year ÷ 12
  india_average_monthly: 158,       // ~1900 kg/year ÷ 12
  target_sustainable_monthly: 167,  // ~2000 kg/year ÷ 12 (Paris Agreement target)
};
module.exports = {
  calculateCarbon,
  getEmissionFactors,
  getCategories,
  getActivityTypes,
  EMISSION_FACTORS,
  BENCHMARKS,
};
