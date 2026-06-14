import dayjs from 'dayjs'
import type { FoodRecord, DailyNutrition, NutritionStatus, NutritionGoals, FoodDefinition } from '@/types'
import { RECOMMENDED_NUTRITION } from '@/constants/recommended'



// ========== ID & Date ==========

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

export function formatDate(date: string | Date, format = 'YYYY-MM-DD'): string {
  return dayjs(date).format(format)
}

export function getTodayString(): string {
  return formatDate(new Date())
}

/** 根据当前时间自动判断餐次 */
export function getCurrentMealType(): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  const hour = dayjs().hour()
  if (hour >= 5 && hour < 10) return 'breakfast'
  if (hour >= 10 && hour < 14) return 'lunch'
  if (hour >= 14 && hour < 20) return 'dinner'
  return 'snack'
}

// ========== Nutrition Totals ==========

export function calculateNutritionTotals(records: Array<{
  calories: number
  protein: number
  fat: number
  carbs: number
  fiber: number
  potassium: number
  phosphorus: number
  bioavailablePhosphorus?: number
}>): {
  totalCalories: number
  totalProtein: number
  totalFat: number
  totalCarbs: number
  totalFiber: number
  totalPotassium: number
  totalPhosphorus: number
  totalBioavailablePhosphorus: number
  totalPRAL: number
} {
  const totals = records.reduce(
    (acc, r) => ({
      totalCalories: acc.totalCalories + r.calories,
      totalProtein: acc.totalProtein + r.protein,
      totalFat: acc.totalFat + r.fat,
      totalCarbs: acc.totalCarbs + r.carbs,
      totalFiber: acc.totalFiber + r.fiber,
      totalPotassium: acc.totalPotassium + r.potassium,
      totalPhosphorus: acc.totalPhosphorus + r.phosphorus,
      totalBioavailablePhosphorus: acc.totalBioavailablePhosphorus + (r.bioavailablePhosphorus ?? r.phosphorus),
    }),
    {
      totalCalories: 0,
      totalProtein: 0,
      totalFat: 0,
      totalCarbs: 0,
      totalFiber: 0,
      totalPotassium: 0,
      totalPhosphorus: 0,
      totalBioavailablePhosphorus: 0,
    }
  )
  return {
    ...totals,
    totalPRAL: calculatePRAL(totals.totalProtein, totals.totalPhosphorus, totals.totalPotassium),
  }
}

// ========== Nutrition Evaluation ==========

export function evaluateIntake(
  nutrition: DailyNutrition,
  mode: 'normal' | 'kidney' = 'normal',
  ranges?: Record<string, { min: number; max: number }>
): Record<string, NutritionStatus> {
  const defaultRange = RECOMMENDED_NUTRITION[mode]
  const getRange = (key: string) => ranges?.[key] ?? defaultRange[key as keyof typeof defaultRange]

  const evaluateSingle = (value: number, min: number, max: number): Omit<NutritionStatus, 'key'> => {
    const safeValue = Math.max(0, value)
    const percentage = min > 0 ? (safeValue / min) * 100 : 0
    const midPoint = (min + max) / 2
    const diff = safeValue - midPoint

    let status: NutritionStatus['status']
    if (safeValue < min) status = 'low'
    else if (safeValue > max * 1.5) status = 'danger'
    else if (safeValue > max) status = 'high'
    else status = 'normal'

    return {
      status,
      percentage: Number(percentage.toFixed(1)),
      diff: Number(diff.toFixed(1)),
    }
  }

  const r = (key: string) => getRange(key)
  return {
    protein:    { key: 'protein',    ...evaluateSingle(nutrition.totalProtein, r('protein').min, r('protein').max) },
    fat:        { key: 'fat',        ...evaluateSingle(nutrition.totalFat, r('fat').min, r('fat').max) },
    carbs:      { key: 'carbs',      ...evaluateSingle(nutrition.totalCarbs, r('carbs').min, r('carbs').max) },
    fiber:      { key: 'fiber',      ...evaluateSingle(nutrition.totalFiber, r('fiber').min, r('fiber').max) },
    potassium:  { key: 'potassium',  ...evaluateSingle(nutrition.totalPotassium, r('potassium').min, r('potassium').max) },
    phosphorus: { key: 'phosphorus', ...evaluateSingle(nutrition.totalPhosphorus, r('phosphorus').min, r('phosphorus').max) },
    calories:   { key: 'calories',   ...evaluateSingle(nutrition.totalCalories, r('calories').min, r('calories').max) },
  }
}

// ========== Formatting ==========

/**
 * 根据食物的单位类型，将重量（g）格式化为合适的显示文本
 * 如：50g 鸡蛋 → "1个"，250g 牛奶 → "250ml"
 */
export function formatWeight(weight: number, unit: string, unitWeight?: number, displayUnit?: string): string {
  if (unitWeight && unitWeight > 0) {
    const count = Math.round((weight / unitWeight) * 10) / 10
    if (unit === '1个') return `${count}个`
  }
  if (displayUnit === 'ml') return `${weight}ml`
  return `${weight}g`
}

// ========== PRAL (膳食酸负荷) ==========

/**
 * 计算膳食酸负荷 PRAL (Potential Renal Acid Load, mEq/d)
 *
 * 基于经典 Remer & Manz 公式 (J Am Diet Assoc, 1995):
 *   PRAL = 0.49 × 蛋白(g) + 0.037 × 磷(mg) − 0.021 × 钾(mg)
 *
 * 正值 = 产酸性（肉类/谷物为主）
 * 负值 = 产碱性（蔬果为主）
 * CKD 患者肾脏排酸能力下降，PRAL 应尽量维持低值甚至负值。
 *
 * 证据：Goraya, Wesson et al. (2024, ASN Kidney Week) 10年RCT —
 *   将 PRAL 减半可使终末期肾病风险从 51.6% 降至 13.8%。
 */
export function calculatePRAL(protein: number, phosphorus: number, potassium: number): number {
  return Math.round((0.49 * protein + 0.037 * phosphorus - 0.021 * potassium) * 10) / 10
}

/** PRAL 状态评估 */
export function getPRALStatus(pral: number): { level: string; color: string } {
  if (pral < 0)  return { level: '偏碱', color: '#07c160' }
  if (pral < 15) return { level: '正常', color: '#4facfe' }
  if (pral < 30) return { level: '偏高', color: '#ff976a' }
  return { level: '过高', color: '#ee0a24' }
}

// ========== Weight-based Goal Calculation ==========

/**
 * 基于体重计算每日营养素推荐摄入量
 *
 * 数据来源：
 * - WHO/FAO/UNU 能量需求 (2004): 30 kcal/kg/day (成人中等活动)
 * - WHO/FAO 蛋白质安全摄入 (2007): 0.83 g/kg/day
 * - WHO 总脂肪指南 (2024): <30% 总能量
 * - FAO/WHO 健康膳食定义 (2024): 碳水 45-75%, 蛋白 10-15%, 脂肪 15-30%
 * - KDIGO 2024 CKD G3-G5: 蛋白 0.8 g/kg/day, 热量 25-35 kcal/kg/day
 * - NIH DRI: 钾 3500-4700 mg, 磷 700 mg
 */
export function calculateGoalsFromWeight(
  weightKg: number,
  mode: 'normal' | 'kidney'
): NutritionGoals {
  const w = Math.max(30, Math.min(200, weightKg)) // clamp 30-200kg

  if (mode === 'kidney') {
    // KDIGO 2024 CKD G3-G5 指南
    return {
      calories:  Math.round(w * 27),          // 25-30 kcal/kg, 取中值 27
      protein:   Math.round(w * 0.8 * 10) / 10, // KDIGO 2024: 0.8 g/kg
      fat:       Math.round(w * 0.9),          // ~30% 热量来源于脂肪
      carbs:     Math.round(w * 3.7),          // ~55% 热量来源于碳水
      fiber:     Math.round(w * 0.35),          // CKD 适度限制
      potassium: Math.round(w * 35),            // KDIGO: ~2500 mg (70kg → 2450)
      phosphorus: Math.round(w * 12),           // KDIGO: ~840 mg (70kg → 840)
    }
  }

  // 普通模式 — WHO/FAO/NIH 标准
  return {
    calories:  Math.round(w * 30),             // WHO 中值 30 kcal/kg
    protein:   Math.round(w * 0.83 * 10) / 10, // WHO/FAO 安全摄入 0.83 g/kg
    fat:       Math.round(w * 1.0),            // ~30% 热量
    carbs:     Math.round(w * 4.1),            // ~55% 热量
    fiber:     Math.round(w * 0.4),            // ~28g for 70kg
    potassium: Math.round(w * 55),             // WHO: ~3850 mg (70kg)
    phosphorus: Math.round(w * 14),            // RDA: ~980 mg (70kg)
  }
}

export interface NutrientRange {
  min: number
  max: number
  unit: string
  label: string       // e.g. "48–56g" or "≤56g"
  isUpperLimit: boolean
}

/**
 * 各营养素安全摄入区间
 *
 * 普通模式 (WHO/FAO/NIH):
 *   热量: 28–32 kcal/kg (中等活动成人)
 *   蛋白质: 0.8–1.2 g/kg (WHO/FAO 安全范围)
 *   脂肪: 20–35% 总能量 ≈ 0.67–1.17 g/kg (WHO 2024)
 *   碳水: 45–75% 总能量 ≈ 3.4–5.6 g/kg (FAO/WHO)
 *   膳食纤维: 25–35 g/day 固定 (NIH DRI)
 *   钾: 3500–4700 mg ≈ 50–67 mg/kg (WHO)
 *   磷: 700–1250 mg ≈ 10–18 mg/kg (NIH RDA)
 *
 * 养生模式 (KDIGO 2024 CKD G3-G5):
 *   热量: 25–30 kcal/kg
 *   蛋白质: 0.6–0.8 g/kg (KDIGO 2024)
 *   脂肪: 0.6–1.0 g/kg
 *   膳食纤维: 20–28 g/day
 *   钾: ≤上限 (KDIGO 控钾)
 *   磷: ≤上限 (KDIGO 限磷)
 */
export function getNutrientSafeRanges(
  weightKg: number,
  mode: 'normal' | 'kidney'
): Record<string, NutrientRange> {
  const w = Math.max(30, Math.min(200, weightKg))

  if (mode === 'kidney') {
    return {
      calories: {
        min: Math.round(w * 25), max: Math.round(w * 30),
        unit: 'kcal', label: `${Math.round(w * 25)}–${Math.round(w * 30)} kcal`,
        isUpperLimit: false,
      },
      protein: {
        min: Math.round(w * 0.6 * 10) / 10, max: Math.round(w * 0.8 * 10) / 10,
        unit: 'g', label: `${Math.round(w * 0.6 * 10) / 10}–${Math.round(w * 0.8 * 10) / 10}g`,
        isUpperLimit: false,
      },
      fat: {
        min: Math.round(w * 0.6), max: Math.round(w * 1.0),
        unit: 'g', label: `${Math.round(w * 0.6)}–${Math.round(w * 1.0)}g`,
        isUpperLimit: false,
      },
      carbs: {
        min: Math.round(w * 3.0), max: Math.round(w * 4.6),
        unit: 'g', label: `${Math.round(w * 3.0)}–${Math.round(w * 4.6)}g`,
        isUpperLimit: false,
      },
      fiber: {
        min: 20, max: 28,
        unit: 'g', label: '20–28g',
        isUpperLimit: false,
      },
      potassium: {
        min: 0, max: Math.round(w * 35),
        unit: 'mg', label: `≤${Math.round(w * 35)}mg`,
        isUpperLimit: true,
      },
      phosphorus: {
        min: 0, max: Math.round(w * 12),
        unit: 'mg', label: `≤${Math.round(w * 12)}mg`,
        isUpperLimit: true,
      },
    }
  }

  // 普通模式
  return {
    calories: {
      min: Math.round(w * 28), max: Math.round(w * 32),
      unit: 'kcal', label: `${Math.round(w * 28)}–${Math.round(w * 32)} kcal`,
      isUpperLimit: false,
    },
    protein: {
      min: Math.round(w * 0.8 * 10) / 10, max: Math.round(w * 1.2 * 10) / 10,
      unit: 'g', label: `${Math.round(w * 0.8 * 10) / 10}–${Math.round(w * 1.2 * 10) / 10}g`,
      isUpperLimit: false,
    },
    fat: {
      min: Math.round(w * 0.67), max: Math.round(w * 1.17),
      unit: 'g', label: `${Math.round(w * 0.67)}–${Math.round(w * 1.17)}g`,
      isUpperLimit: false,
    },
    carbs: {
      min: Math.round(w * 3.4), max: Math.round(w * 5.6),
      unit: 'g', label: `${Math.round(w * 3.4)}–${Math.round(w * 5.6)}g`,
      isUpperLimit: false,
    },
    fiber: {
      min: 25, max: 35,
      unit: 'g', label: '25–35g',
      isUpperLimit: false,
    },
    potassium: {
      min: Math.round(w * 50), max: Math.round(w * 67),
      unit: 'mg', label: `${Math.round(w * 50)}–${Math.round(w * 67)}mg`,
      isUpperLimit: false,
    },
    phosphorus: {
      min: Math.round(w * 10), max: Math.round(w * 18),
      unit: 'mg', label: `${Math.round(w * 10)}–${Math.round(w * 18)}mg`,
      isUpperLimit: false,
    },
  }
}

// ========== Data Export ==========

export function exportRecordsAsJSON(data: {
  records: FoodRecord[]
  goals: NutritionGoals
  customFoods?: FoodDefinition[]
  exportDate: string
}): void {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `diet-records-${data.exportDate}.json`
  a.click()
  URL.revokeObjectURL(url)
}
