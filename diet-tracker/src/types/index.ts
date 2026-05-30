export interface FoodRecord {
  id: string
  foodType: string       // 食物类型 (RICE, EGG, MEAT_PORK, MEAT_CHICKEN, MEAT_BEEF)
  foodName: string       // 食物显示名称
  weight: number         // 重量（克）
  calories: number       // 热量（kcal）
  protein: number        // 蛋白质（g）
  fat: number            // 脂肪（g）
  carbs: number          // 碳水化合物（g）
  fiber: number          // 膳食纤维（g）
  potassium: number      // 钾（mg）
  phosphorus: number     // 磷（mg）
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  date: string           // 日期 YYYY-MM-DD
}

export interface DailyNutrition {
  date: string
  totalCalories: number
  totalProtein: number
  totalFat: number
  totalCarbs: number
  totalFiber: number
  totalPotassium: number
  totalPhosphorus: number
  records: FoodRecord[]
}

export interface NutritionGoals {
  calories: number
  protein: number
  fat: number
  carbs: number
  fiber: number
  potassium: number
  phosphorus: number
}
