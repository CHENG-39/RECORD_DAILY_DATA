import { FoodType, type FoodDefinition } from '../types'

/**
 * 食物营养数据接口 (每 100g 含量)
 * 数据来源: USDA FoodData Central (https://fdc.nal.usda.gov/)
 */
export interface FoodNutritionData {
  name: string
  protein: number       // 蛋白质（g）
  fat: number           // 脂肪（g）
  carbs: number         // 碳水化合物（g）
  fiber: number         // 膳食纤维（g）
  potassium: number     // 钾（mg）
  phosphorus: number    // 磷（mg）
  calories: number      // 热量（kcal）
  unit: '100g' | '1个'
  unitWeight?: number   // 单个重量（g）
}

/**
 * 每 100g 食物的营养数据
 * 来源: USDA FoodData Central
 *   - 米饭: #20445 (Rice, white, long-grain, cooked)
 *   - 鸡蛋: FDC 171287 (Egg, whole, raw, fresh)
 *   - 鸡胸肉: #05062 (Chicken breast, skinless, boneless, raw)
 *   - 猪瘦肉: #10218 (Pork, tenderloin, lean, raw)
 *   - 牛肉: #23477 (Beef, ground, 97% lean, raw)
 */
export const FOOD_NUTRITION_DATA: Record<FoodType, FoodNutritionData> = {
  [FoodType.RICE]: {
    name: '米饭（熟）',
    protein: 2.7,
    fat: 0.3,
    carbs: 28.2,
    fiber: 0.4,
    potassium: 35,
    phosphorus: 43,
    calories: 130,
    unit: '100g',
  },
  [FoodType.EGG]: {
    name: '鸡蛋（全蛋）',
    protein: 12.6,
    fat: 9.5,
    carbs: 0.7,
    fiber: 0,
    potassium: 138,
    phosphorus: 198,
    calories: 143,
    unit: '1个',
    unitWeight: 50,
  },
  [FoodType.MEAT_PORK]: {
    name: '猪瘦肉',
    protein: 20.7,
    fat: 3.5,
    carbs: 0,
    fiber: 0,
    potassium: 393,
    phosphorus: 243,
    calories: 120,
    unit: '100g',
  },
  [FoodType.MEAT_CHICKEN]: {
    name: '鸡胸肉',
    protein: 22.5,
    fat: 2.6,
    carbs: 0,
    fiber: 0,
    potassium: 256,
    phosphorus: 213,
    calories: 120,
    unit: '100g',
  },
  [FoodType.MEAT_BEEF]: {
    name: '牛肉（瘦）',
    protein: 22.0,
    fat: 3.0,
    carbs: 0,
    fiber: 0,
    potassium: 357,
    phosphorus: 203,
    calories: 115,
    unit: '100g',
  },
}

export interface NutritionResult {
  protein: number
  fat: number
  carbs: number
  fiber: number
  potassium: number
  phosphorus: number
  calories: number
}

export function calculateNutrition(foodType: FoodType, weight: number): NutritionResult {
  const data = FOOD_NUTRITION_DATA[foodType]
  const ratio = weight / 100

  return {
    protein: Number((data.protein * ratio).toFixed(1)),
    fat: Number((data.fat * ratio).toFixed(1)),
    carbs: Number((data.carbs * ratio).toFixed(1)),
    fiber: Number((data.fiber * ratio).toFixed(1)),
    potassium: Number((data.potassium * ratio).toFixed(1)),
    phosphorus: Number((data.phosphorus * ratio).toFixed(1)),
    calories: Math.round(data.calories * ratio),
  }
}

export function getFoodName(foodType: FoodType): string {
  return FOOD_NUTRITION_DATA[foodType].name
}

export function formatWeight(foodType: FoodType, weight: number): string {
  const data = FOOD_NUTRITION_DATA[foodType]
  if (data.unit === '1个' && data.unitWeight) {
    const count = weight / data.unitWeight
    return `${count.toFixed(1)}个（${weight}g）`
  }
  return `${weight}g`
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
    calories: Math.round(food.calories * ratio),
  }
}

export function getFoodTypeOptions(): Array<{ value: FoodType; label: string }> {
  return Object.entries(FOOD_NUTRITION_DATA).map(([key, item]) => ({
    value: key as FoodType,
    label: item.name,
  }))
}
