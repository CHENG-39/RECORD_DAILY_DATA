// ========== 食物记录 ==========

export interface FoodRecord {
  id: string
  foodType: string       // 食物类型 ID（内置：RICE/EGG/MEAT_PORK/MEAT_CHICKEN/MEAT_BEEF；自定义：UUID）
  foodName: string       // 食物显示名称
  weight: number         // 重量（克）
  calories: number       // 热量（kcal）
  protein: number        // 蛋白质（g）
  fat: number            // 脂肪（g）
  carbs: number          // 碳水化合物（g）
  fiber: number          // 膳食纤维（g）
  potassium: number      // 钾（mg）
  phosphorus: number     // 磷（mg）— 总磷
  bioavailablePhosphorus: number // 生物可利用磷（mg）— 实际进入血液需肾脏过滤的磷
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
  totalBioavailablePhosphorus: number
  totalPRAL: number
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

// ========== 自定义食物定义 ==========

export interface FoodDefinition {
  id: string
  name: string
  category: string         // 食物分类：主食/肉类水产/蔬菜/水果/坚果种子/豆制品/乳制品
  isBuiltIn: boolean
  protein: number          // 蛋白质 g/100g
  fat: number              // 脂肪 g/100g
  carbs: number            // 碳水 g/100g
  fiber: number            // 膳食纤维 g/100g
  potassium: number        // 钾 mg/100g
  phosphorus: number       // 磷 mg/100g
  sodium: number           // 钠 mg/100g
  calories: number         // 热量 kcal/100g
  unit: string              // '100g' | '1个'
  unitWeight?: number      // 单件重量（g），如 1个鸡蛋=50g
  displayUnit?: string     // 显示单位，如 'ml' 表示输入时显示容量而非重量
}

// ========== 用户模式 ==========

export type UserMode = 'normal' | 'kidney'

// ========== 营养推荐与评估 ==========

export interface NutritionRange {
  protein: { min: number; max: number }
  fat: { min: number; max: number }
  carbs: { min: number; max: number }
  fiber: { min: number; max: number }
  potassium: { min: number; max: number }
  phosphorus: { min: number; max: number }
  calories: { min: number; max: number }
}

export interface NutritionStatus {
  key: string
  status: 'low' | 'normal' | 'high' | 'danger'
  percentage: number
  diff: number
}

export type NutritionEvaluation = Record<string, NutritionStatus>
