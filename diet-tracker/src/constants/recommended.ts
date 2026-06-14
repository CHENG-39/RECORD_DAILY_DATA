import type { NutritionRange, UserMode } from '../types'

/**
 * 每日营养推荐摄入范围
 *
 * 普通成人模式数据来源：
 *   - 能量/宏量营养素: WHO/FAO 健康膳食指南 (2024)
 *     * 碳水化合物 45-75% 能量, 脂肪 15-30%, 蛋白质 10-15%
 *   - 蛋白质: WHO/FAO/UNU 安全摄入量 0.83 g/kg/天
 *   - 膳食纤维: WHO 强烈推荐 ≥25 g/天
 *   - 钾: WHO 成人推荐 ≥3510 mg/天 (conditional recommendation)
 *   - 磷: NIH/ODS RDA 成人 700 mg/天, 上限 4000 mg/天
 *
 * 养生模式数据来源：
 *   - KDIGO 2024 慢性肾脏病评估与管理临床实践指南
 *   - CKD 3-4 期 (非透析) 推荐:
 *     * 蛋白质: 0.6-0.8 g/kg/天 (基于50-65kg体重)
 *     * 磷: 800-1000 mg/天
 *     * 钾: 2000-3000 mg/天 (个体化)
 *     * 能量: 30-35 kcal/kg/天
 */
export const RECOMMENDED_NUTRITION: Record<UserMode, NutritionRange> = {
  normal: {
    protein:    { min: 50,  max: 75  },   // WHO 0.83g/kg × 60-90kg
    fat:        { min: 44,  max: 67  },   // 20-30% of 2000 kcal ÷ 9 kcal/g
    carbs:      { min: 250, max: 375 },   // 50-75% of 2000 kcal ÷ 4 kcal/g
    fiber:      { min: 25,  max: 38  },   // WHO ≥25g; US IOM upper 38g for men
    potassium:  { min: 3510, max: 4700 }, // WHO ≥3510mg; US IOM AI 4700mg
    phosphorus: { min: 700,  max: 1250 }, // NIH RDA 700mg; typical upper intake
    calories:   { min: 2000, max: 2500 }, // WHO healthy diet range
  },
  kidney: {
    protein:    { min: 30,  max: 52  },   // KDIGO 0.6-0.8g/kg × 50-65kg
    fat:        { min: 44,  max: 67  },   // Same as normal
    carbs:      { min: 200, max: 300 },   // Adjusted to maintain energy
    fiber:      { min: 20,  max: 30  },   // Slightly reduced for CKD tolerance
    potassium:  { min: 2000, max: 3000 }, // KDIGO 2024 (individualized)
    phosphorus: { min: 800,  max: 1000 }, // KDIGO 2024
    calories:   { min: 1600, max: 2000 }, // 30-35 kcal/kg × 50-65kg
  },
}

export const USER_MODE_CONFIG: Record<
  UserMode,
  { label: string; description: string }
> = {
  normal: {
    label: '普通成人',
    description: '基于 WHO/FAO 健康膳食指南的标准营养推荐',
  },
  kidney: {
    label: '养生 (低钾低磷)',
    description: '基于 KDIGO 2024 指南，精细化钾/磷摄入管理',
  },
}
