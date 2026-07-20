import type { FoodDefinition } from '../types'

export interface NutritionResult {
  protein: number
  fat: number
  carbs: number
  fiber: number
  potassium: number
  phosphorus: number
  sodium: number
  calories: number
}

/** 根据 FoodDefinition 计算营养（用于自定义食物） */
export function calculateNutritionFromDefinition(food: FoodDefinition, weight: number): NutritionResult {
  const ratio = weight / 100
  return {
    protein: Number((food.protein * ratio).toFixed(1)),
    fat: Number((food.fat * ratio).toFixed(1)),
    carbs: Number((food.carbs * ratio).toFixed(1)),
    fiber: Number((food.fiber * ratio).toFixed(1)),
    potassium: Number((food.potassium * ratio).toFixed(1)),
    phosphorus: Number((food.phosphorus * ratio).toFixed(1)),
    sodium: Number((food.sodium * ratio).toFixed(1)),
    calories: Math.round(food.calories * ratio),
  }
}
