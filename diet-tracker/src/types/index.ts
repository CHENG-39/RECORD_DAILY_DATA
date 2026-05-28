export interface FoodRecord {
  id: string
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  date: string
}

export interface DailyNutrition {
  date: string
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
  records: FoodRecord[]
}

export interface NutritionGoals {
  calories: number
  protein: number
  carbs: number
  fat: number
}
