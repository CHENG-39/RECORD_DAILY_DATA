import dayjs from 'dayjs'

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

export function formatDate(date: string | Date, format = 'YYYY-MM-DD'): string {
  return dayjs(date).format(format)
}

export function getTodayString(): string {
  return formatDate(new Date())
}

export function calculateNutritionTotals(records: Array<{
  calories: number
  protein: number
  fat: number
  carbs: number
  fiber: number
  potassium: number
  phosphorus: number
}>): {
  totalCalories: number
  totalProtein: number
  totalFat: number
  totalCarbs: number
  totalFiber: number
  totalPotassium: number
  totalPhosphorus: number
} {
  return records.reduce(
    (acc, r) => ({
      totalCalories: acc.totalCalories + r.calories,
      totalProtein: acc.totalProtein + r.protein,
      totalFat: acc.totalFat + r.fat,
      totalCarbs: acc.totalCarbs + r.carbs,
      totalFiber: acc.totalFiber + r.fiber,
      totalPotassium: acc.totalPotassium + r.potassium,
      totalPhosphorus: acc.totalPhosphorus + r.phosphorus,
    }),
    {
      totalCalories: 0,
      totalProtein: 0,
      totalFat: 0,
      totalCarbs: 0,
      totalFiber: 0,
      totalPotassium: 0,
      totalPhosphorus: 0,
    }
  )
}
