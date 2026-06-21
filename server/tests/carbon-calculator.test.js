const {
  calculateCarbon,
  getEmissionFactors,
  getCategories,
  getActivityTypes,
  EMISSION_FACTORS,
  BENCHMARKS,
} = require('../src/utils/carbon-calculator');
describe('Carbon Calculator', () => {
  describe('calculateCarbon()', () => {
    test('calculates car gasoline emissions correctly', () => {
      const result = calculateCarbon('transport', 'car_gasoline', 100);
      expect(result.carbon_kg).toBe(21);
      expect(result.unit).toBe('km');
      expect(result.factor).toBe(0.21);
      expect(result.label).toBe('Car (Gasoline)');
    });
    test('calculates car diesel emissions correctly', () => {
      const result = calculateCarbon('transport', 'car_diesel', 50);
      expect(result.carbon_kg).toBe(13.5);
      expect(result.unit).toBe('km');
    });
    test('calculates bus emissions correctly', () => {
      const result = calculateCarbon('transport', 'bus', 200);
      expect(result.carbon_kg).toBe(17.8);
    });
    test('calculates train emissions correctly', () => {
      const result = calculateCarbon('transport', 'train', 500);
      expect(result.carbon_kg).toBe(20.5);
    });
    test('calculates flight domestic emissions correctly', () => {
      const result = calculateCarbon('transport', 'flight_domestic', 1000);
      expect(result.carbon_kg).toBe(255);
    });
    test('calculates flight international emissions correctly', () => {
      const result = calculateCarbon('transport', 'flight_international', 5000);
      expect(result.carbon_kg).toBe(975);
    });
    test('bicycle and walking produce zero emissions', () => {
      expect(calculateCarbon('transport', 'bicycle', 50).carbon_kg).toBe(0);
      expect(calculateCarbon('transport', 'walking', 10).carbon_kg).toBe(0);
    });
    test('calculates electricity emissions correctly', () => {
      const result = calculateCarbon('energy', 'electricity', 250);
      expect(result.carbon_kg).toBe(105);
      expect(result.unit).toBe('kWh');
    });
    test('calculates natural gas emissions correctly', () => {
      const result = calculateCarbon('energy', 'natural_gas', 30);
      expect(result.carbon_kg).toBe(60);
      expect(result.unit).toBe('m³');
    });
    test('solar and wind produce zero emissions', () => {
      expect(calculateCarbon('energy', 'solar', 100).carbon_kg).toBe(0);
      expect(calculateCarbon('energy', 'wind', 100).carbon_kg).toBe(0);
    });
    test('calculates red meat meal emissions correctly', () => {
      const result = calculateCarbon('food', 'red_meat', 3);
      expect(result.carbon_kg).toBe(19.83);
      expect(result.unit).toBe('meal');
    });
    test('calculates vegan meal emissions correctly', () => {
      const result = calculateCarbon('food', 'vegan', 7);
      expect(result.carbon_kg).toBe(2.73);
    });
    test('calculates landfill waste emissions correctly', () => {
      const result = calculateCarbon('waste', 'landfill', 10);
      expect(result.carbon_kg).toBe(5.8);
    });
    test('recycled waste has much lower emissions than landfill', () => {
      const landfill = calculateCarbon('waste', 'landfill', 10);
      const recycled = calculateCarbon('waste', 'recycled', 10);
      expect(recycled.carbon_kg).toBeLessThan(landfill.carbon_kg);
      expect(recycled.carbon_kg).toBe(0.3);
    });
    test('calculates clothing shopping emissions correctly', () => {
      const result = calculateCarbon('shopping', 'clothing', 2);
      expect(result.carbon_kg).toBe(30);
      expect(result.unit).toBe('item');
    });
    test('calculates electronics shopping emissions correctly', () => {
      const result = calculateCarbon('shopping', 'electronics', 1);
      expect(result.carbon_kg).toBe(50);
    });
  });
  describe('Edge Cases', () => {
    test('handles zero quantity', () => {
      const result = calculateCarbon('transport', 'car_gasoline', 0);
      expect(result.carbon_kg).toBe(0);
    });
    test('handles very small quantities', () => {
      const result = calculateCarbon('transport', 'car_gasoline', 0.1);
      expect(result.carbon_kg).toBe(0.021);
    });
    test('handles very large quantities', () => {
      const result = calculateCarbon('transport', 'flight_international', 100000);
      expect(result.carbon_kg).toBe(19500);
    });
    test('handles decimal quantities', () => {
      const result = calculateCarbon('energy', 'electricity', 33.7);
      expect(result.carbon_kg).toBe(14.154);
    });
  });
  describe('Error Handling', () => {
    test('throws on unknown category', () => {
      expect(() => calculateCarbon('invalid', 'car', 100))
        .toThrow('Unknown category: "invalid"');
    });
    test('throws on unknown activity type', () => {
      expect(() => calculateCarbon('transport', 'spaceship', 100))
        .toThrow('Unknown activity type: "spaceship"');
    });
    test('throws on negative quantity', () => {
      expect(() => calculateCarbon('transport', 'car_gasoline', -10))
        .toThrow('must be non-negative');
    });
    test('throws on non-numeric quantity', () => {
      expect(() => calculateCarbon('transport', 'car_gasoline', 'abc'))
        .toThrow('must be a number');
    });
    test('throws on NaN quantity', () => {
      expect(() => calculateCarbon('transport', 'car_gasoline', NaN))
        .toThrow('must be a number');
    });
    test('throws on undefined quantity', () => {
      expect(() => calculateCarbon('transport', 'car_gasoline', undefined))
        .toThrow('must be a number');
    });
  });
  describe('getEmissionFactors()', () => {
    test('returns all categories', () => {
      const factors = getEmissionFactors();
      expect(Object.keys(factors)).toContain('transport');
      expect(Object.keys(factors)).toContain('energy');
      expect(Object.keys(factors)).toContain('food');
      expect(Object.keys(factors)).toContain('waste');
      expect(Object.keys(factors)).toContain('shopping');
    });
    test('each factor has label, unit, and factor', () => {
      const factors = getEmissionFactors();
      for (const category of Object.values(factors)) {
        for (const activity of Object.values(category)) {
          expect(activity).toHaveProperty('label');
          expect(activity).toHaveProperty('unit');
          expect(activity).toHaveProperty('factor');
          expect(typeof activity.factor).toBe('number');
        }
      }
    });
  });
  describe('getCategories()', () => {
    test('returns array of category names', () => {
      const categories = getCategories();
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBe(5);
      expect(categories).toEqual(
        expect.arrayContaining(['transport', 'energy', 'food', 'waste', 'shopping'])
      );
    });
  });
  describe('getActivityTypes()', () => {
    test('returns activity types for a valid category', () => {
      const types = getActivityTypes('transport');
      expect(Array.isArray(types)).toBe(true);
      expect(types).toContain('car_gasoline');
      expect(types).toContain('bus');
      expect(types).toContain('train');
    });
    test('returns empty array for invalid category', () => {
      const types = getActivityTypes('nonexistent');
      expect(types).toEqual([]);
    });
  });
  describe('BENCHMARKS', () => {
    test('contains expected regional benchmarks', () => {
      expect(BENCHMARKS.global_average_monthly).toBe(333);
      expect(BENCHMARKS.us_average_monthly).toBe(1333);
      expect(BENCHMARKS.eu_average_monthly).toBe(550);
      expect(BENCHMARKS.india_average_monthly).toBe(158);
      expect(BENCHMARKS.target_sustainable_monthly).toBe(167);
    });
    test('all benchmarks are positive numbers', () => {
      for (const value of Object.values(BENCHMARKS)) {
        expect(typeof value).toBe('number');
        expect(value).toBeGreaterThan(0);
      }
    });
  });
  describe('Cross-Category Sanity Checks', () => {
    test('driving is more carbon-intensive than public transit', () => {
      const car = calculateCarbon('transport', 'car_gasoline', 100);
      const bus = calculateCarbon('transport', 'bus', 100);
      const train = calculateCarbon('transport', 'train', 100);
      expect(car.carbon_kg).toBeGreaterThan(bus.carbon_kg);
      expect(bus.carbon_kg).toBeGreaterThan(train.carbon_kg);
    });
    test('red meat is more carbon-intensive than plant-based', () => {
      const meat = calculateCarbon('food', 'red_meat', 1);
      const veg = calculateCarbon('food', 'vegetarian', 1);
      const vegan = calculateCarbon('food', 'vegan', 1);
      expect(meat.carbon_kg).toBeGreaterThan(veg.carbon_kg);
      expect(veg.carbon_kg).toBeGreaterThan(vegan.carbon_kg);
    });
    test('landfill waste is more carbon-intensive than recycling', () => {
      const landfill = calculateCarbon('waste', 'landfill', 1);
      const recycled = calculateCarbon('waste', 'recycled', 1);
      expect(landfill.carbon_kg).toBeGreaterThan(recycled.carbon_kg);
    });
  });
});
