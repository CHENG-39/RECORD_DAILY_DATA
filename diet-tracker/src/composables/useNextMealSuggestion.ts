import { computed, ref, watch } from 'vue'
import { useDietStore } from '@/stores/diet'
import { getPersonalizedNutrientRanges } from '@/utils'

export interface NextMealSuggestion {
  key: string
  title: string
  action: string
  reason: string
}

function vegetableAction(source: string): string {
  const actions: Record<string, string> = {
    canteen: '食堂点餐时加一份素菜，优先选少油少汁的做法。',
    takeout: '点餐时加一份蔬菜，酱汁和汤汁尽量分开。',
    convenience: '便利店可搭配一份即食蔬菜或完整水果。',
    home: '现有菜里多加一把绿叶菜或一份当季蔬菜。',
    mixed: '下一餐优先补一份蔬菜，不必改变整顿饭。',
  }
  return actions[source] ?? actions.mixed
}

function lowerSodiumAction(source: string): string {
  const actions: Record<string, string> = {
    canteen: '食堂优先选少汁菜，少浇汤汁和卤汁。',
    takeout: '下单备注少盐少酱，汤汁分开或少喝。',
    convenience: '优先选原味食物，少选汤面、腌制品和高盐零食。',
    home: '下一餐先少放酱油和盐，用葱姜蒜、醋或香料提味。',
    mixed: '下一餐少喝汤、少蘸酱，优先选原味食物。',
  }
  return actions[source] ?? actions.mixed
}

export function useNextMealSuggestion() {
  const dietStore = useDietStore()
  const activeIndex = ref(0)

  const suggestions = computed<NextMealSuggestion[]>(() => {
    const nutrition = dietStore.todayNutrition
    const profile = dietStore.lifestyleProfile
    const weight = dietStore.bodyWeight || 60
    const ranges = getPersonalizedNutrientRanges(weight, dietStore.userMode, dietStore.personalCarePlan)

    if (nutrition.records.length === 0) {
      return [{
        key: 'start-recording',
        title: '从一顿真实的饭开始',
        action: profile.configured ? '先记录下一餐，不需要一次补全全天饮食。' : '先设置你的用餐情境，再记录下一餐。',
        reason: '连续、可完成的记录比追求一次输入准确更重要。',
      }]
    }

    if (dietStore.userMode === 'kidney') {
      return [{
        key: 'kidney-record-first',
        title: '肾脏饮食请以个人方案为准',
        action: '在录入医生或营养师设定的个人目标前，先如实记录下一餐。',
        reason: '钾、磷、蛋白质和液体限制需要结合分期、化验和治疗方案个体化确定。',
      }]
    }

    if (nutrition.totalSodium >= ranges.sodium.max * 0.75) {
      return [
        {
          key: 'lower-sodium',
          title: '下一餐尽量清淡一些',
          action: lowerSodiumAction(profile.mealSource),
          reason: `今天已记录约 ${Math.round(nutrition.totalSodium)}mg 钠，下一餐减少汤汁和酱料更容易执行。`,
        },
        {
          key: 'lower-sodium-alternative',
          title: '换成不喝汤也可以',
          action: '保留喜欢的主食和菜，先把汤、蘸酱和腌制小菜减掉。',
          reason: '不必重做整顿饭，先减少最容易带来额外钠的部分。',
        },
      ]
    }

    if (nutrition.totalFiber < ranges.fiber.min * 0.6) {
      return [
        {
          key: 'add-vegetables',
          title: '优先补一份蔬菜或水果',
          action: vegetableAction(profile.mealSource),
          reason: '当前膳食纤维记录偏少，补一份熟悉食物即可改善当天结构。',
        },
        {
          key: 'add-fruit-alternative',
          title: '不方便加菜时，换一份水果',
          action: '选择一份完整水果作为加餐或饭后补充。',
          reason: '这比强行改变主餐更容易执行，也能补充部分膳食纤维。',
        },
      ]
    }

    if (nutrition.totalProtein < ranges.protein.min * 0.55) {
      return [
        {
          key: 'add-protein',
          title: '下一餐补一点优质蛋白',
          action: profile.priority === 'budget' ? '优先选鸡蛋、豆腐或一份普通奶制品。' : '搭配鸡蛋、豆腐、鱼、瘦肉或奶制品中的一种。',
          reason: '蛋白质记录仍低于今日参考区间的一半，分散到后续餐次通常更容易坚持。',
        },
        {
          key: 'add-protein-alternative',
          title: '换成更省事的搭配',
          action: '在现有主食旁加一杯牛奶或豆浆，或加一个鸡蛋。',
          reason: '不需要重新安排菜单，也能让下一餐更完整。',
        },
      ]
    }

    return [{
      key: 'keep-rhythm',
      title: '保持这份节奏',
      action: '下一餐按平时习惯吃，优先保留蔬菜和原味食物。',
      reason: '当前已记录的饮食结构没有明显需要立刻补位的项目。',
    }]
  })

  watch(suggestions, () => { activeIndex.value = 0 })

  const suggestion = computed(() => suggestions.value[activeIndex.value] ?? suggestions.value[0])
  const hasAlternative = computed(() => suggestions.value.length > 1)

  function showAlternative(): void {
    if (suggestions.value.length > 1) {
      activeIndex.value = (activeIndex.value + 1) % suggestions.value.length
    }
  }

  return { suggestion, hasAlternative, showAlternative }
}
