import type { FoodType } from '../types/diet';

/**
 * 食物营养数据接口
 */
export interface FoodNutritionData {
  name: string;
  protein: number;      // 蛋白质（g/100g）
  potassium: number;    // 钾（mg/100g）
  phosphorus: number;   // 磷（mg/100g）
  calories: number;     // 热量（kcal/100g）
  unit: '100g' | '1个'; // 单位
  unitWeight?: number;  // 单个重量（克），当 unit 为 '1个' 时使用
}

/**
 * 每 100g 食物的营养数据（参考中国食物成分表）
 */
export const FOOD_NUTRITION_DATA: Record<FoodType, FoodNutritionData> = {
  [FoodType.RICE]: {
    name: '米饭（熟）',
    protein: 2.6,
    potassium: 30,
    phosphorus: 33,
    calories: 116,
    unit: '100g',
  },
  [FoodType.EGG]: {
    name: '鸡蛋（全蛋）',
    protein: 13.3,
    potassium: 154,
    phosphorus: 172,
    calories: 144,
    unit: '1个',
    unitWeight: 50, // 1 个鸡蛋约 50g
  },
  [FoodType.MEAT_PORK]: {
    name: '猪瘦肉',
    protein: 20.3,
    potassium: 305,
    phosphorus: 189,
    calories: 143,
    unit: '100g',
  },
  [FoodType.MEAT_CHICKEN]: {
    name: '鸡胸肉',
    protein: 23.1,
    potassium: 334,
    phosphorus: 226,
    calories: 133,
    unit: '100g',
  },
  [FoodType.MEAT_BEEF]: {
    name: '牛肉',
    protein: 26.3,
    potassium: 284,
    phosphorus: 168,
    calories: 190,
    unit: '100g',
  },
};

/**
 * 获取食物显示名称
 */
export function getFoodName(foodType: FoodType): string {
  return FOOD_NUTRITION_DATA[foodType].name;
}

/**
 * 计算食物的营养含量
 * @param foodType 食物类型
 * @param weight 重量（克）
 * @returns 营养数据
 */
export function calculateNutrition(
  foodType: FoodType,
  weight: number
): {
  protein: number;
  potassium: number;
  phosphorus: number;
  calories: number;
} {
  const data = FOOD_NUTRITION_DATA[foodType];
  const ratio = weight / 100; // 按 100g 比例计算

  return {
    protein: Number((data.protein * ratio).toFixed(2)),
    potassium: Number((data.potassium * ratio).toFixed(2)),
    phosphorus: Number((data.phosphorus * ratio).toFixed(2)),
    calories: Number((data.calories * ratio).toFixed(2)),
  };
}

/**
 * 将重量转换为显示单位
 * @param foodType 食物类型
 * @param weight 重量（克）
 * @returns 格式化后的重量字符串
 */
export function formatWeight(foodType: FoodType, weight: number): string {
  const data = FOOD_NUTRITION_DATA[foodType];
  
  if (data.unit === '1个' && data.unitWeight) {
    const count = weight / data.unitWeight;
    return `${count.toFixed(1)}个（${weight}g）`;
  }
  
  return `${weight}g`;
}

/**
 * 获取所有食物类型选项（用于下拉选择）
 */
export function getFoodTypeOptions(): Array<{
  value: FoodType;
  label: string;
}> {
  return Object.values(FOOD_NUTRITION_DATA).map((item) => ({
    value: Object.keys(FOOD_NUTRITION_DATA).find(
      (key) => FOOD_NUTRITION_DATA[key as FoodType] === item
    ) as FoodType,
    label: item.name,
  }));
}
