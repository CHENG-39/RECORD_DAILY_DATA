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
  carbs: number
  fat: number
}>): { totalCalories: number; totalProtein: number; totalCarbs: number; totalFat: number } {
  return records.reduce(
    (acc, record) => ({
      totalCalories: acc.totalCalories + record.calories,
      totalProtein: acc.totalProtein + record.protein,
      totalCarbs: acc.totalCarbs + record.carbs,
      totalFat: acc.totalFat + record.fat,
    }),
    { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 }
  )
}
