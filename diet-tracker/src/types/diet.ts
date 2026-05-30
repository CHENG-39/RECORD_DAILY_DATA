/** 食物类型 */
export const FoodType = {
  RICE: 'RICE',
  EGG: 'EGG',
  MEAT_PORK: 'MEAT_PORK',
  MEAT_CHICKEN: 'MEAT_CHICKEN',
  MEAT_BEEF: 'MEAT_BEEF',
} as const
export type FoodType = (typeof FoodType)[keyof typeof FoodType]

/** 餐次类型 */
export const MealType = {
  BREAKFAST: 'BREAKFAST',
  LUNCH: 'LUNCH',
  DINNER: 'DINNER',
  SNACK: 'SNACK',
} as const
export type MealType = (typeof MealType)[keyof typeof MealType]

/** 食物项 */
export interface FoodItem {
  foodType: FoodType
  weight: number
  mealType: MealType
}

/** 单餐记录 */
export interface MealRecord {
  date: string
  mealType: MealType
  foods: FoodItem[]
  timestamp: number
}

/** 每日营养摄入 */
export interface DailyNutrition {
  protein: number
  fat: number
  carbs: number
  fiber: number
  potassium: number
  phosphorus: number
  calories: number
}

/** 每日记录 */
export interface DailyRecord {
  date: string
  meals: MealRecord[]
  totalNutrition: DailyNutrition
}

/** 用户模式 */
export type UserMode = 'normal' | 'kidney'

/** 营养推荐范围 */
export interface NutritionRange {
  protein: { min: number; max: number }
  fat: { min: number; max: number }
  carbs: { min: number; max: number }
  fiber: { min: number; max: number }
  potassium: { min: number; max: number }
  phosphorus: { min: number; max: number }
  calories: { min: number; max: number }
}

/** 营养评估状态 */
export interface NutritionStatus {
  key: keyof DailyNutrition
  status: 'low' | 'normal' | 'high' | 'danger'
  percentage: number
  diff: number
}

/** 营养评估结果 */
export type NutritionEvaluation = Record<keyof DailyNutrition, NutritionStatus>
