import type { FoodType, FoodItem, MealRecord, DailyNutrition, NutritionStatus } from '@/types/diet'
import { calculateNutrition } from '@/constants/nutrition'
import { RECOMMENDED_NUTRITION } from '@/constants/recommended'

const ZERO_NUTRITION: DailyNutrition = {
  protein: 0, fat: 0, carbs: 0, fiber: 0,
  potassium: 0, phosphorus: 0, calories: 0,
}

const NUTRITION_KEYS = ['protein', 'fat', 'carbs', 'fiber', 'potassium', 'phosphorus', 'calories'] as const

/** 根据食物类型和重量计算营养 */
export function calculateFoodNutrition(foodType: FoodType, weightGrams: number): DailyNutrition {
  if (weightGrams <= 0 || !isFinite(weightGrams)) {
    return { ...ZERO_NUTRITION }
  }
  return calculateNutrition(foodType, weightGrams)
}

/** 计算一餐的总营养 */
export function calculateMealNutrition(foods: FoodItem[]): DailyNutrition {
  if (!foods || foods.length === 0) return { ...ZERO_NUTRITION }

  return foods.reduce((total, food) => {
    if (!food.foodType || !food.weight || food.weight <= 0) return total
    const n = calculateFoodNutrition(food.foodType, food.weight)
    return {
      protein: total.protein + n.protein,
      fat: total.fat + n.fat,
      carbs: total.carbs + n.carbs,
      fiber: total.fiber + n.fiber,
      potassium: total.potassium + n.potassium,
      phosphorus: total.phosphorus + n.phosphorus,
      calories: total.calories + n.calories,
    }
  }, { ...ZERO_NUTRITION })
}

/** 计算一整天的总营养 */
export function calculateDailyNutrition(meals: MealRecord[]): DailyNutrition {
  if (!meals || meals.length === 0) return { ...ZERO_NUTRITION }

  return meals.reduce((total, meal) => {
    if (!meal.foods || meal.foods.length === 0) return total
    const n = calculateMealNutrition(meal.foods)
    return {
      protein: total.protein + n.protein,
      fat: total.fat + n.fat,
      carbs: total.carbs + n.carbs,
      fiber: total.fiber + n.fiber,
      potassium: total.potassium + n.potassium,
      phosphorus: total.phosphorus + n.phosphorus,
      calories: total.calories + n.calories,
    }
  }, { ...ZERO_NUTRITION })
}

/** 评估营养摄入状态 */
export function evaluateIntake(
  nutrition: DailyNutrition,
  mode: 'normal' | 'kidney' = 'normal'
): Record<keyof DailyNutrition, NutritionStatus> {
  const safe: DailyNutrition = { ...ZERO_NUTRITION, ...nutrition }
  const range = RECOMMENDED_NUTRITION[mode]

  const evaluateSingle = (value: number, min: number, max: number): Omit<NutritionStatus, 'key'> => {
    const safeValue = Math.max(0, value)
    const percentage = min > 0 ? (safeValue / min) * 100 : 0
    const midPoint = (min + max) / 2
    const diff = safeValue - midPoint

    let status: NutritionStatus['status']
    if (safeValue < min) status = 'low'
    else if (safeValue > max * 1.5) status = 'danger'
    else if (safeValue > max) status = 'high'
    else status = 'normal'

    return {
      status,
      percentage: Number(percentage.toFixed(1)),
      diff: Number(diff.toFixed(1)),
    }
  }

  return {
    protein:    { key: 'protein',    ...evaluateSingle(safe.protein, range.protein.min, range.protein.max) },
    fat:        { key: 'fat',        ...evaluateSingle(safe.fat, range.fat.min, range.fat.max) },
    carbs:      { key: 'carbs',      ...evaluateSingle(safe.carbs, range.carbs.min, range.carbs.max) },
    fiber:      { key: 'fiber',      ...evaluateSingle(safe.fiber, range.fiber.min, range.fiber.max) },
    potassium:  { key: 'potassium',  ...evaluateSingle(safe.potassium, range.potassium.min, range.potassium.max) },
    phosphorus: { key: 'phosphorus', ...evaluateSingle(safe.phosphorus, range.phosphorus.min, range.phosphorus.max) },
    calories:   { key: 'calories',   ...evaluateSingle(safe.calories, range.calories.min, range.calories.max) },
  }
}

/** 获取常见食物份量参考 */
export function getCommonFoodWeight(foodType: FoodType): string {
  const commonWeights: Record<FoodType, string> = {
    RICE: '一碗米饭约 150g',
    EGG: '一个鸡蛋约 50g',
    MEAT_PORK: '一块猪瘦肉约 100g',
    MEAT_CHICKEN: '一块鸡胸肉约 150g',
    MEAT_BEEF: '一块牛肉约 100g',
  }
  return commonWeights[foodType] || '请根据实际重量输入'
}

/** 食物类型中文名称 */
export function getFoodTypeName(foodType: FoodType): string {
  const names: Record<FoodType, string> = {
    RICE: '米饭', EGG: '鸡蛋', MEAT_PORK: '猪瘦肉',
    MEAT_CHICKEN: '鸡胸肉', MEAT_BEEF: '牛肉',
  }
  return names[foodType] || foodType
}

/** 餐食类型中文名称 */
export function getMealTypeName(mealType: import('@/types/diet').MealType): string {
  const names: Record<import('@/types/diet').MealType, string> = {
    BREAKFAST: '早餐', LUNCH: '午餐', DINNER: '晚餐', SNACK: '加餐',
  }
  return names[mealType] || mealType
}

/** 格式化营养数值 */
export function formatNutritionValue(value: number, type: keyof DailyNutrition): string {
  if (value == null || value < 0) return '0'
  return type === 'calories' ? Math.round(value).toString() : value.toFixed(1)
}

/** 检查营养数据是否有效 */
export function isValidNutrition(nutrition: Partial<DailyNutrition>): boolean {
  if (!nutrition) return false
  return NUTRITION_KEYS.every(key => {
    const value = nutrition[key]
    return typeof value === 'number' && isFinite(value) && value >= 0
  })
}
