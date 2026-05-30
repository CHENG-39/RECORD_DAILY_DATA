export const MEAL_TYPES = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '加餐',
} as const

export const DEFAULT_NUTRITION_GOALS = {
  calories: 2000,
  protein: 60,
  fat: 65,
  carbs: 300,
  fiber: 25,
  potassium: 2000,
  phosphorus: 800,
} as const

export const NUTRITION_LABELS: Record<string, string> = {
  calories: '热量',
  protein: '蛋白质',
  fat: '脂肪',
  carbs: '碳水',
  fiber: '膳食纤维',
  potassium: '钾',
  phosphorus: '磷',
}

export const UNIT_LABELS: Record<string, string> = {
  calories: 'kcal',
  protein: 'g',
  fat: 'g',
  carbs: 'g',
  fiber: 'g',
  potassium: 'mg',
  phosphorus: 'mg',
}
