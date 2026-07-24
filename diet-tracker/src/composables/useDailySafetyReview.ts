import { computed } from 'vue'
import { useDietStore } from '@/stores/diet'
import { getPersonalizedNutrientRanges } from '@/utils'

type ReviewLevel = 'attention' | 'watch' | 'good' | 'neutral'

interface ReviewItem {
  key: string
  label: string
  value: string
  threshold: string
  level: ReviewLevel
  message: string
}

/**
 * Turns the recorded totals into a short, auditable daily review. It deliberately
 * reports only recorded intake and never infers a diagnosis from incomplete logs.
 */
export function useDailySafetyReview() {
  const dietStore = useDietStore()

  const ranges = computed(() => getPersonalizedNutrientRanges(dietStore.bodyWeight || 60, dietStore.userMode, dietStore.personalCarePlan))

  const dataQuality = computed(() => {
    const records = dietStore.todayRecords
    if (!records.length) return { label: '尚无记录', detail: '记录一餐后即可生成摘要', level: 'neutral' as ReviewLevel, score: 0, uncertainFoods: [] as string[] }

    const meals = new Set(records.map(record => record.mealType)).size
    const sourced = records.filter(record => Boolean(record.source)).length
    const uncertainFoods = [...new Set(records.flatMap(record => {
      const food = dietStore.allFoods.find(item => item.id === record.foodType || item.name === record.foodName)
      const requiresReview = !food || (!food.isBuiltIn && (!food.dataSource || food.dataConfidence === 'user' || food.dataConfidence === 'estimate'))
      return requiresReview ? [record.foodName] : []
    }))]
    const score = Math.max(0, Math.min(100, Math.round(35 + meals * 18 + sourced / records.length * 25 - uncertainFoods.length * 15)))
    const coverage = `已覆盖 ${meals} 个餐次，${sourced}/${records.length} 项标注用餐来源`
    if (uncertainFoods.length) {
      const names = uncertainFoods.slice(0, 2).join('、')
      const rest = uncertainFoods.length > 2 ? `等 ${uncertainFoods.length} 种` : ''
      return { label: '部分食物待核实', detail: `${coverage}；${names}${rest}缺少可追溯营养来源，相关指标可能被低估。`, level: 'watch' as ReviewLevel, score, uncertainFoods }
    }
    if (score >= 80) return { label: '记录较完整', detail: coverage, level: 'good' as ReviewLevel, score, uncertainFoods }
    return { label: '仍可补充', detail: `${coverage}；补充餐次和来源能提高参考价值。`, level: 'watch' as ReviewLevel, score, uncertainFoods }
  })

  const reviewItems = computed<ReviewItem[]>(() => {
    const nutrition = dietStore.todayNutrition
    const target = ranges.value
    const items: ReviewItem[] = []
    const isKidney = dietStore.userMode === 'kidney'

    const addUpperLimit = (key: string, label: string, value: number, max: number, unit: string, message: string) => {
      if (value <= max) return
      const ratio = value / max
      items.push({
        key,
        label,
        value: `${Math.round(value)} ${unit}`,
        threshold: `个人参考上限 ${Math.round(max)} ${unit}`,
        level: ratio >= 1.2 ? 'attention' : 'watch',
        message,
      })
    }

    addUpperLimit('sodium', '钠', nutrition.totalSodium, target.sodium.max, 'mg', '本日已记录摄入超过个人参考上限；调味料、汤汁和加工食品常被低估。')

    if (isKidney) {
      addUpperLimit('potassium', '钾', nutrition.totalPotassium, target.potassium.max, 'mg', '已超过当前个人参考上限，请以既有医嘱和化验结果为准。')
      addUpperLimit('bioavailable-phosphorus', '可利用磷', nutrition.totalBioavailablePhosphorus, target.phosphorus.max, 'mg', '可利用磷估算已超出参考上限；本指标用于识别记录中的磷负担，不替代血磷检查。')
      addUpperLimit('protein', '蛋白质', nutrition.totalProtein, target.protein.max, 'g', '蛋白质已超过当前参考区间；慢病管理目标应由医生或营养师结合个人情况确认。')
    } else if (nutrition.totalCalories > target.calories.max) {
      addUpperLimit('calories', '能量', nutrition.totalCalories, target.calories.max, 'kcal', '已记录能量超过个人参考上限；先核对油、含糖饮料和加餐的份量。')
    }

    return items.sort((a, b) => (a.level === 'attention' ? -1 : 1) - (b.level === 'attention' ? -1 : 1)).slice(0, 3)
  })

  const summary = computed(() => {
    if (!dietStore.todayRecords.length) return { title: '从一餐开始建立基线', detail: '没有连续记录就没有可靠趋势；今天先如实记下一餐即可。', level: 'neutral' as ReviewLevel }
    if (reviewItems.value.length) {
      const urgent = reviewItems.value.some(item => item.level === 'attention')
      return { title: urgent ? '有需要优先核对的指标' : '有需要留意的指标', detail: reviewItems.value[0].message, level: urgent ? 'attention' as ReviewLevel : 'watch' as ReviewLevel }
    }
    if (dataQuality.value.uncertainFoods.length) {
      return { title: '先核实食物营养来源', detail: '在包装营养成分表、品牌规格或可靠资料补全前，微量营养素汇总仅作参考。', level: 'watch' as ReviewLevel }
    }
    return { title: '已记录指标暂在参考范围内', detail: '这是已记录食物的汇总，不代表全天实际摄入或健康诊断。', level: 'good' as ReviewLevel }
  })

  const basis = computed(() => {
    const weight = dietStore.bodyWeight
    return weight ? `参考范围按 ${weight} kg 体重估算` : '参考范围按 60 kg 默认体重估算'
  })

  return { dataQuality, reviewItems, summary, basis }
}
