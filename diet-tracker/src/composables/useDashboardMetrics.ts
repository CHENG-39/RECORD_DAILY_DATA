import { ref, computed } from 'vue'
import { useDietStore } from '@/stores/diet'
import { NUTRITION_LABELS, UNIT_LABELS } from '@/constants'
import { evaluateIntake, getNutrientSafeRanges, getPRALStatus } from '@/utils'

export function useDashboardMetrics() {
  const dietStore = useDietStore()
  const { todayNutrition } = dietStore

  // ========== 营养区间 & 评估 ==========

  const nutrientRanges = computed(() => {
    const w = dietStore.bodyWeight || 60
    return getNutrientSafeRanges(w, dietStore.userMode)
  })

  const nutritionEvaluation = computed(() =>
    evaluateIntake(todayNutrition, dietStore.userMode, nutrientRanges.value)
  )

  // ========== 热量环形图 ==========

  const ringCircumference = 2 * Math.PI * 52

  const calorieRange = computed(() => {
    const r = nutrientRanges.value.calories
    return r.isUpperLimit ? `≤${r.max}` : `${r.min}-${r.max}`
  })

  const calorieRate = computed(() => {
    const max = nutrientRanges.value.calories.max
    if (max <= 0) return 0
    return Math.min((todayNutrition.totalCalories / max) * 100, 100)
  })

  const calorieColor = computed(() => {
    const rate = calorieRate.value
    if (rate > 110) return '#ee0a24'
    if (rate > 100) return '#ff976a'
    return dietStore.userMode === 'kidney' ? '#d8893a' : '#237a64'
  })

  const ringOffset = computed(() => {
    const pct = Math.min(calorieRate.value + 1, 100)
    return ringCircumference * (1 - pct / 100)
  })

  // ========== 3 项关键指标（蛋白质/钾/磷/PRAL） ==========

  const keyMetrics = computed(() => {
    const ranges = nutrientRanges.value
    const isKidney = dietStore.userMode === 'kidney'

    const pBio = Math.round(todayNutrition.totalBioavailablePhosphorus)
    const pTotal = Math.round(todayNutrition.totalPhosphorus)
    const pAbsorptionPct = pTotal > 0 ? Math.round((pBio / pTotal) * 100) : 0

    const items: Array<{
      key: string
      current: number
      range: { min: number; max: number; isUpperLimit: boolean; unit: string }
      kidneyDetail?: { totalP: number; absorptionPct: number }
    }> = [
      { key: 'protein',    current: Math.round(todayNutrition.totalProtein * 10) / 10, range: ranges.protein },
      { key: 'potassium',  current: Math.round(todayNutrition.totalPotassium),          range: ranges.potassium },
      {
        key: 'phosphorus', current: pBio, range: ranges.phosphorus,
        kidneyDetail: isKidney ? { totalP: pTotal, absorptionPct: pAbsorptionPct } : undefined,
      },
      {
        key: 'pral',       current: todayNutrition.totalPRAL,
        range: { min: -999, max: isKidney ? 0 : 15, isUpperLimit: true, unit: 'mEq' },
      },
    ]

    return items.filter(item => item.key !== 'pral' || isKidney).map(item => {
      const { min, max, isUpperLimit } = item.range
      const goalDisplay = isUpperLimit ? `≤${max}` : `${min}-${max}`
      const pct = item.key === 'pral'
        ? Math.min(Math.max((item.current + 5) / 20 * 100, 0), 100)
        : max > 0 ? Math.min((item.current / max) * 100, 100) : 0
      let statusText = '正常'; let color = '#07c160'; let status = 'ok'

      if (item.key === 'pral') {
        if (item.current > max) {
          const pralStatus = getPRALStatus(item.current)
          if (pralStatus.level === '过高') { statusText = '过高'; status = 'danger'; color = '#ee0a24' }
          else { statusText = '偏高'; status = 'low'; color = '#ff976a' }
        } else if (item.current < 0) {
          statusText = '优'; status = 'ok'; color = '#07c160'
        } else {
          statusText = '正常'; status = 'ok'; color = '#3478c7'
        }
      } else if (isUpperLimit) {
        if (item.current > max) { statusText = '超标'; color = '#ee0a24'; status = 'danger' }
      } else {
        if (item.current < min) { statusText = '偏低'; color = '#ff976a'; status = 'low' }
        else if (item.current > max) { statusText = '超标'; color = '#ee0a24'; status = 'danger' }
      }

      return { ...item, label: NUTRITION_LABELS[item.key], goalDisplay, statusText, color, pct, status, unit: item.range.unit }
    })
  })

  // ========== 可展开次要指标（脂肪/碳水/纤维） ==========

  const moreMetrics = computed(() => {
    const ev = nutritionEvaluation.value
    const keys = ['fat', 'carbs', 'fiber', 'sodium'] as const
    return keys.map(k => {
      const valueKey = `total${k.charAt(0).toUpperCase() + k.slice(1)}` as keyof typeof todayNutrition
      const val = todayNutrition[valueKey] as number
      const statusInfo = ev[k]
      let statusClass = ''
      if (statusInfo.status === 'danger' || statusInfo.status === 'high') statusClass = 'cell-danger'
      else if (statusInfo.status === 'low') statusClass = 'cell-low'
      return {
        key: k,
        value: Number((val ?? 0).toFixed(1)),
        label: NUTRITION_LABELS[k],
        unit: UNIT_LABELS[k],
        statusClass,
      }
    })
  })

  const showMoreMetrics = ref(false)

  return {
    nutrientRanges,
    nutritionEvaluation,
    calorieRange,
    calorieRate,
    calorieColor,
    ringOffset,
    ringCircumference,
    keyMetrics,
    moreMetrics,
    showMoreMetrics,
  }
}
