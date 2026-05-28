/**
 * 食物类型枚举
 */
export enum FoodType {
  RICE = 'RICE',           // 米饭
  EGG = 'EGG',             // 鸡蛋
  MEAT_PORK = 'MEAT_PORK', // 猪瘦肉
  MEAT_CHICKEN = 'MEAT_CHICKEN', // 鸡胸肉
  MEAT_BEEF = 'MEAT_BEEF', // 牛肉
}

/**
 * 餐次类型枚举
 */
export enum MealType {
  BREAKFAST = 'BREAKFAST', // 早餐
  LUNCH = 'LUNCH',         // 午餐
  DINNER = 'DINNER',       // 晚餐
  SNACK = 'SNACK',         // 加餐
}

/**
 * 食物项接口
 */
export interface FoodItem {
  foodType: FoodType;      // 食物类型
  weight: number;          // 重量（克）
  mealType: MealType;      // 所属餐次
}

/**
 * 单餐记录接口
 */
export interface MealRecord {
  date: string;            // 日期（YYYY-MM-DD）
  mealType: MealType;      // 餐次类型
  foods: FoodItem[];       // 食物列表
  timestamp: number;       // 时间戳
}

/**
 * 每日营养摄入接口
 */
export interface DailyNutrition {
  protein: number;         // 蛋白质（g）
  potassium: number;       // 钾（mg）
  phosphorus: number;      // 磷（mg）
  calories: number;        // 热量（kcal）
}

/**
 * 每日记录接口
 */
export interface DailyRecord {
  date: string;                    // 日期（YYYY-MM-DD）
  meals: MealRecord[];             // 餐次记录列表
  totalNutrition: DailyNutrition;  // 总营养摄入
}

/**
 * 用户模式类型
 */
export type UserMode = 'normal' | 'kidney';

/**
 * 营养推荐范围接口
 */
export interface NutritionRange {
  protein: [number, number];       // 蛋白质推荐范围 [min, max]
  potassium: [number, number];     // 钾推荐范围 [min, max]
  phosphorus: [number, number];    // 磷推荐范围 [min, max]
}
