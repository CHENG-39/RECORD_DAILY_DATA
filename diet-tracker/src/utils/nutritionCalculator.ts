import type { FoodType, FoodItem, MealRecord, DailyNutrition, NutritionStatus } from '@/types/diet'
import { FOOD_NUTRITION_DATA, calculateNutritionFromWeight } from '@/constants/nutrition'
import { RECOMMENDED_INTAKE } from '@/constants/recommended'

/**
 * 根据食物类型和重量计算营养数据
 * @param foodType - 食物类型
 * @param weightGrams - 食物重量（克），必须为正数
 * @returns 包含蛋白质、钾、磷、热量的营养数据对象
 * 
 * @example
 * calculateFoodNutrition('RICE', 150) // 计算150g米饭的营养
 */
export function calculateFoodNutrition(
  foodType: FoodType,
  weightGrams: number
): DailyNutrition {
  // 边界处理：重量为负数或零时返回零值
  if (weightGrams <= 0 || !isFinite(weightGrams)) {
    return {
      protein: 0,
      potassium: 0,
      phosphorus: 0,
      calories: 0
    }
  }

  return calculateNutritionFromWeight(foodType, weightGrams)
}

/**
 * 计算一餐的总营养
 * @param foods - 食物列表，包含每种食物的类型和重量
 * @returns 该餐的总营养数据
 * 
 * @example
 * const foods = [{ foodType: 'RICE', weight: 150, mealType: 'LUNCH' }]
 * calculateMealNutrition(foods)
 */
export function calculateMealNutrition(foods: FoodItem[]): DailyNutrition {
  // 边界处理：空数组或未定义
  if (!foods || foods.length === 0) {
    return {
      protein: 0,
      potassium: 0,
      phosphorus: 0,
      calories: 0
    }
  }

  return foods.reduce(
    (total, food) => {
      // 边界处理：跳过无效的食物项
      if (!food.foodType || !food.weight || food.weight <= 0) {
        return total
      }

      const nutrition = calculateFoodNutrition(food.foodType, food.weight)
      
      return {
        protein: total.protein + nutrition.protein,
        potassium: total.potassium + nutrition.potassium,
        phosphorus: total.phosphorus + nutrition.phosphorus,
        calories: total.calories + nutrition.calories
      }
    },
    {
      protein: 0,
      potassium: 0,
      phosphorus: 0,
      calories: 0
    }
  )
}

/**
 * 计算一整天的总营养
 * @param meals - 一天的所有餐食记录
 * @returns 全天的总营养数据
 * 
 * @example
 * const meals = [
 *   { date: '2024-01-01', mealType: 'BREAKFAST', foods: [...], timestamp: Date.now() }
 * ]
 * calculateDailyNutrition(meals)
 */
export function calculateDailyNutrition(meals: MealRecord[]): DailyNutrition {
  // 边界处理：空数组或未定义
  if (!meals || meals.length === 0) {
    return {
      protein: 0,
      potassium: 0,
      phosphorus: 0,
      calories: 0
    }
  }

  return meals.reduce(
    (total, meal) => {
      // 边界处理：跳过无效的餐食记录
      if (!meal.foods || meal.foods.length === 0) {
        return total
      }

      const mealNutrition = calculateMealNutrition(meal.foods)
      
      return {
        protein: total.protein + mealNutrition.protein,
        potassium: total.potassium + mealNutrition.potassium,
        phosphorus: total.phosphorus + mealNutrition.phosphorus,
        calories: total.calories + mealNutrition.calories
      }
    },
    {
      protein: 0,
      potassium: 0,
      phosphorus: 0,
      calories: 0
    }
  )
}

/**
 * 评估营养摄入状态
 * @param nutrition - 实际摄入的营养数据
 * @param mode - 用户模式：'normal'（普通成人）或 'kidney'（肾病患者）
 * @returns 每项营养的状态评估，包含状态等级、百分比和差值
 * 
 * @remarks
 * 状态等级说明：
 * - 'low': 低于推荐下限
 * - 'normal': 在推荐范围内
 * - 'high': 高于推荐上限但未超过 1.5 倍
 * - 'danger': 严重超标，超过推荐上限的 1.5 倍
 * 
 * @example
 * const nutrition = { protein: 90, potassium: 2500, phosphorus: 900, calories: 2000 }
 * evaluateIntake(nutrition, 'normal')
 */
export function evaluateIntake(
  nutrition: DailyNutrition,
  mode: 'normal' | 'kidney' = 'normal'
): Record<keyof DailyNutrition, NutritionStatus> {
  // 边界处理：空值时使用零值
  const safeNutrition: DailyNutrition = {
    protein: nutrition?.protein ?? 0,
    potassium: nutrition?.potassium ?? 0,
    phosphorus: nutrition?.phosphorus ?? 0,
    calories: nutrition?.calories ?? 0
  }

  const range = RECOMMENDED_INTAKE[mode]
  
  // 辅助函数：评估单项营养状态
  const evaluateSingle = (
    value: number,
    min: number,
    max: number
  ): Omit<NutritionStatus, 'key'> => {
    // 边界处理：负值视为 0
    const safeValue = Math.max(0, value)
    
    // 计算相对于推荐范围的百分比（以下限为基准）
    const percentage = min > 0 ? (safeValue / min) * 100 : 0
    
    // 计算与推荐范围中值的差值
    const midPoint = (min + max) / 2
    const diff = safeValue - midPoint
    
    let status: NutritionStatus['status']
    
    if (safeValue < min) {
      status = 'low'
    } else if (safeValue > max * 1.5) {
      status = 'danger'
    } else if (safeValue > max) {
      status = 'high'
    } else {
      status = 'normal'
    }
    
    return {
      status,
      percentage: Number(percentage.toFixed(1)),
      diff: Number(diff.toFixed(1))
    }
  }
  
  return {
    protein: {
      key: 'protein',
      ...evaluateSingle(safeNutrition.protein, range.protein.min, range.protein.max)
    },
    potassium: {
      key: 'potassium',
      ...evaluateSingle(safeNutrition.potassium, range.potassium.min, range.potassium.max)
    },
    phosphorus: {
      key: 'phosphorus',
      ...evaluateSingle(safeNutrition.phosphorus, range.phosphorus.min, range.phosphorus.max)
    },
    calories: {
      key: 'calories',
      ...evaluateSingle(safeNutrition.calories, range.calories.min, range.calories.max)
    }
  }
}

/**
 * 获取常见食物的份量参考
 * @param foodType - 食物类型
 * @returns 常见份量描述字符串
 * 
 * @example
 * getCommonFoodWeight('RICE') // "一碗米饭约 150g"
 * getCommonFoodWeight('EGG') // "一个鸡蛋约 50g"
 */
export function getCommonFoodWeight(foodType: FoodType): string {
  const commonWeights: Record<FoodType, string> = {
    RICE: '一碗米饭约 150g',
    EGG: '一个鸡蛋约 50g',
    MEAT_PORK: '一块猪瘦肉约 100g',
    MEAT_CHICKEN: '一块鸡胸肉约 150g',
    MEAT_BEEF: '一块牛肉约 100g'
  }
  
  return commonWeights[foodType] || '请根据实际重量输入'
}

/**
 * 获取食物类型的中文名称
 * @param foodType - 食物类型枚举值
 * @returns 中文名称
 */
export function getFoodTypeName(foodType: FoodType): string {
  const names: Record<FoodType, string> = {
    RICE: '米饭',
    EGG: '鸡蛋',
    MEAT_PORK: '猪瘦肉',
    MEAT_CHICKEN: '鸡胸肉',
    MEAT_BEEF: '牛肉'
  }
  
  return names[foodType] || foodType
}

/**
 * 获取餐食类型的中文名称
 * @param mealType - 餐食类型枚举值
 * @returns 中文名称
 */
export function getMealTypeName(mealType: import('@/types/diet').MealType): string {
  const names: Record<import('@/types/diet').MealType, string> = {
    BREAKFAST: '早餐',
    LUNCH: '午餐',
    DINNER: '晚餐',
    SNACK: '加餐'
  }
  
  return names[mealType] || mealType
}

/**
 * 格式化营养数值，保留合适的小数位数
 * @param value - 营养数值
 * @param type - 营养类型
 * @returns 格式化后的字符串
 */
export function formatNutritionValue(value: number, type: keyof DailyNutrition): string {
  // 边界处理：空值或负值
  if (value == null || value < 0) {
    return '0'
  }
  
  // 热量取整数，其他保留一位小数
  if (type === 'calories') {
    return Math.round(value).toString()
  }
  
  return value.toFixed(1)
}

/**
 * 检查营养数据是否有效
 * @param nutrition - 待检查的营养数据
 * @returns 是否有效
 */
export function isValidNutrition(nutrition: Partial<DailyNutrition>): boolean {
  if (!nutrition) return false
  
  const keys: (keyof DailyNutrition)[] = ['protein', 'potassium', 'phosphorus', 'calories']
  
  return keys.every(key => {
    const value = nutrition[key]
    return typeof value === 'number' && isFinite(value) && value >= 0
  })
}
