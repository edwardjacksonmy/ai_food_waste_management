// src/utils/metricsUtils.js

/**
 * Convert any unit to kg for standardized calculations
 */
export const convertToKg = (quantity, unit) => {
  if (!quantity) return 0;
  
  switch (unit) {
    case 'kg':
      return quantity;
    case 'items':
    case 'portions': 
    case 'servings':
      return quantity * 0.3;
    case 'liters':
      return quantity * 1;
    case 'packages':
      return quantity * 0.5;
    default:
      return quantity; // Default assumes kg
  }
};

/**
 * Calculate CO2 emissions saved based on food type and quantity
 */
export const calculateCO2Savings = (foodType, quantity, unit) => {
  // CO2 emissions saved per kg for different food types (kg of CO2)
  const co2Map = {
    1: 2.2,   // Dairy (high emissions)
    2: 0.8,   // Bakery
    3: 0.5,   // Fruits
    4: 0.4,   // Vegetables (low emissions)
    5: 1.8,   // Prepared Meals
    6: 1.1,   // Canned Goods
    7: 0.7,   // Dry Goods
    8: 6.5,   // Meat & Poultry (highest emissions)
    9: 5.4,   // Seafood
    10: 2.2,  // Frozen Foods
  };
  
  // Default CO2 value if food type not found
  const baseCO2Value = co2Map[foodType] || 1.5;
  
  // Convert to kg if needed
  const quantityInKg = convertToKg(quantity, unit);
  
  return baseCO2Value * quantityInKg;
};

/**
 * Calculate meals provided based on food type and quantity
 */
export const calculateMealsProvided = (foodType, quantity, unit) => {
  // Meals per kg for different food types
  const mealMap = {
    1: 1.5,  // Dairy
    2: 2.0,  // Bakery (bread provides many servings)
    3: 1.5,  // Fruits
    4: 1.8,  // Vegetables
    5: 3.5,  // Prepared Meals (highest - ready to eat)
    6: 2.5,  // Canned Goods
    7: 3.0,  // Dry Goods (rice, pasta - many servings)
    8: 2.5,  // Meat & Poultry
    9: 2.0,  // Seafood
    10: 2.2, // Frozen Foods
  };
  
  // Default meals if food type not found
  const baseMeals = mealMap[foodType] || 2.0;
  
  // Convert to kg if needed
  const quantityInKg = convertToKg(quantity, unit);
  
  return Math.round(baseMeals * quantityInKg);
};

/**
 * Calculate food value in MYR based on food type and quantity
 */
export const calculateFoodValue = (foodType, quantity, unit) => {
  // Base values per kg for different food types (MYR)
  const valueMap = {
    1: 25.50,  // Dairy
    2: 18.00,  // Bakery
    3: 30.00,  // Fruits
    4: 25.00,  // Vegetables
    5: 40.00,  // Prepared Meals
    6: 15.00,  // Canned Goods
    7: 12.00,  // Dry Goods
    8: 55.00,  // Meat & Poultry
    9: 65.00,  // Seafood
    10: 35.00, // Frozen Foods
  };
  
  // Default value if food type not found
  const baseValue = valueMap[foodType] || 20.00;
  
  // Convert to kg if needed
  const quantityInKg = convertToKg(quantity, unit);
  
  return baseValue * quantityInKg;
};