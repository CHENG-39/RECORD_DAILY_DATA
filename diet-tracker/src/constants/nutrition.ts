import { FoodType } from '../types/diet'

/**
 * 食物营养数据接口 (每 100g 含量)
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
 * 每 100g 食物的营养数据（参考中国食物成分表）
 */
export const FOOD_NUTRITION_DATA: Record<FoodType, FoodNutritionData> = {
  [FoodType.RICE]: {
    name: '米饭（熟）',
    protein: 2.6,
    fat: 0.3,
    carbs: 25.9,
    fiber: 0.3,
    potassium: 30,
    phosphorus: 33,
    calories: 116,
    unit: '100g',
  },
  [FoodType.EGG]: {
    name: '鸡蛋（全蛋）',
    protein: 13.3,
    fat: 8.8,
    carbs: 2.8,
    fiber: 0,
    potassium: 154,
    phosphorus: 172,
    calories: 144,
    unit: '1个',
    unitWeight: 50,
  },
  [FoodType.MEAT_PORK]: {
    name: '猪瘦肉',
    protein: 20.3,
    fat: 6.2,
    carbs: 1.5,
    fiber: 0,
    potassium: 305,
    phosphorus: 189,
    calories: 143,
    unit: '100g',
  },
  [FoodType.MEAT_CHICKEN]: {
    name: '鸡胸肉',
    protein: 23.1,
    fat: 1.2,
    carbs: 0,
    fiber: 0,
    potassium: 334,
    phosphorus: 226,
    calories: 133,
    unit: '100g',
  },
  [FoodType.MEAT_BEEF]: {
    name: '牛肉',
    protein: 26.3,
    fat: 7.0,
    carbs: 2.0,
    fiber: 0,
    potassium: 284,
    phosphorus: 168,
    calories: 190,
    unit: '100g',
  },
}

/**
 * 营养计算结果的返回类型
 */
export interface NutritionResult {
  protein: number
  fat: number
  carbs: number
  fiber: number
  potassium: number
  phosphorus: number
  calories: number
}

/**
 * 根据食物类型和重量计算营养含量
 */
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

/** 获取食物显示名称 */
export function getFoodName(foodType: FoodType): string {
  return FOOD_NUTRITION_DATA[foodType].name
}

/** 格式化重量显示 */
export function formatWeight(foodType: FoodType, weight: number): string {
  const data = FOOD_NUTRITION_DATA[foodType]
  if (data.unit === '1个' && data.unitWeight) {
    const count = weight / data.unitWeight
    return `${count.toFixed(1)}个（${weight}g）`
  }
  return `${weight}g`
}

/** 获取食物类型选项列表 */
export function getFoodTypeOptions(): Array<{ value: FoodType; label: string }> {
  return Object.entries(FOOD_NUTRITION_DATA).map(([key, item]) => ({
    value: key as FoodType,
    label: item.name,
  }))
}
