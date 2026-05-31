export const MEAL_TYPES = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '加餐',
} as const

// 基于 WHO/FAO 推荐范围中值
export const DEFAULT_NUTRITION_GOALS = {
  calories: 2000,
  protein: 60,
  fat: 55,
  carbs: 300,
  fiber: 30,
  potassium: 4000,
  phosphorus: 1000,
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

/** 各模式的预设营养目标（取推荐范围中值） */
export const MODE_PRESET_GOALS = {
  normal: {
    calories: 2200,
    protein: 62,
    fat: 55,
    carbs: 310,
    fiber: 30,
    potassium: 4100,
    phosphorus: 1000,
  },
  kidney: {
    calories: 1800,
    protein: 42,
    fat: 50,
    carbs: 250,
    fiber: 25,
    potassium: 2500,
    phosphorus: 900,
  },
} as const
