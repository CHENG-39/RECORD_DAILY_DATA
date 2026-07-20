import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { FoodRecord, DailyNutrition, NutritionGoals, UserMode, FoodDefinition, LifestyleProfile, SuggestionFeedback, MealTemplate, PersonalCarePlan, PersonalCarePlanTargets, WeightRecord } from '@/types'
import { generateId, getTodayString, calculateNutritionTotals, calculateGoalsFromWeight } from '@/utils'
import { DEFAULT_NUTRITION_GOALS } from '@/constants'
import { BUILT_IN_FOODS, getPhosphorusBioavailability } from '@/data/foods'

export const useDietStore = defineStore('diet', () => {
  const records = ref<FoodRecord[]>([])
  const goals = ref<NutritionGoals>({ ...DEFAULT_NUTRITION_GOALS })
  const userMode = ref<UserMode>('normal')
  const lifestyleProfile = ref<LifestyleProfile>({
    mealSource: 'mixed',
    cookingAccess: 'limited',
    priority: 'balance',
    configured: false,
  })
  const suggestionFeedback = ref<SuggestionFeedback[]>([])
  const mealTemplates = ref<MealTemplate[]>([])
  const personalCarePlan = ref<PersonalCarePlan>({ enabled: false, source: 'self', note: '' })
  const customFoods = ref<FoodDefinition[]>([])
  const bodyWeight = ref<number | null>(null) // 用户体重 (kg)
  const weightRecords = ref<WeightRecord[]>([])

  const allFoods = computed<FoodDefinition[]>(() => {
    return [...BUILT_IN_FOODS, ...customFoods.value]
  })

  /** 迁移旧记录：补齐后续版本新增的营养字段。 */
  let _migrating = false
  function migrateOldRecords(): void {
    if (_migrating) return
    let changed = false
    const all = allFoods.value
    for (const r of records.value) {
      const food = all.find(f => f.id === r.foodType || f.name === r.foodName)
      if (r.bioavailablePhosphorus === undefined || r.bioavailablePhosphorus === null) {
        const coeff = food ? getPhosphorusBioavailability(food.category) : 0.40
        r.bioavailablePhosphorus = Math.round(r.phosphorus * coeff)
        changed = true
      }
      if (r.sodium === undefined || r.sodium === null) {
        r.sodium = food ? Number((food.sodium * r.weight / 100).toFixed(1)) : 0
        changed = true
      }
    }
    if (changed) {
      _migrating = true
      records.value = [...records.value]
      _migrating = false
    }
  }

  // watch 确保 persist 插件恢复数据后才执行迁移
  watch(records, () => migrateOldRecords(), { immediate: true })

  const todayRecords = computed(() => {
    const today = getTodayString()
    return records.value.filter((record) => record.date === today)
  })

  function buildDailyNutrition(date: string, recs: FoodRecord[], totals: ReturnType<typeof calculateNutritionTotals>): DailyNutrition {
    return {
      date,
      totalCalories: totals.totalCalories,
      totalProtein: totals.totalProtein,
      totalFat: totals.totalFat,
      totalCarbs: totals.totalCarbs,
      totalFiber: totals.totalFiber,
      totalPotassium: totals.totalPotassium,
      totalPhosphorus: totals.totalPhosphorus,
      totalSodium: totals.totalSodium,
      totalBioavailablePhosphorus: totals.totalBioavailablePhosphorus,
      totalPRAL: totals.totalPRAL,
      records: recs,
    }
  }

  const todayNutrition = computed((): DailyNutrition => {
    return buildDailyNutrition(getTodayString(), todayRecords.value, calculateNutritionTotals(todayRecords.value))
  })

  function addRecord(record: Omit<FoodRecord, 'id'>): void {
    const newRecord: FoodRecord = {
      ...record,
      id: generateId(),
    }
    records.value.push(newRecord)
  }

  function updateRecord(id: string, updates: Partial<FoodRecord>): void {
    const index = records.value.findIndex((r) => r.id === id)
    if (index !== -1) {
      records.value[index] = { ...records.value[index], ...updates }
    }
  }

  function deleteRecord(id: string): void {
    records.value = records.value.filter((record) => record.id !== id)
  }

  function updateGoals(newGoals: Partial<NutritionGoals>): void {
    Object.assign(goals.value, newGoals)
  }

  function setUserMode(mode: UserMode): void {
    userMode.value = mode
  }

  function updateLifestyleProfile(profile: Omit<LifestyleProfile, 'configured'>): void {
    lifestyleProfile.value = { ...profile, configured: true }
  }

  function recordSuggestionFeedback(feedback: SuggestionFeedback): void {
    const index = suggestionFeedback.value.findIndex(item => item.date === feedback.date && item.suggestionKey === feedback.suggestionKey)
    if (index >= 0) suggestionFeedback.value[index] = feedback
    else suggestionFeedback.value = [...suggestionFeedback.value, feedback].slice(-90)
  }

  function addMealTemplate(template: Omit<MealTemplate, 'id'>): MealTemplate {
    const newTemplate = { ...template, id: generateId() }
    mealTemplates.value.push(newTemplate)
    return newTemplate
  }

  function applyMealTemplate(id: string, date: string): number {
    const template = mealTemplates.value.find(item => item.id === id)
    if (!template) return 0
    for (const item of template.items) addRecord({ ...item, date })
    return template.items.length
  }

  function deleteMealTemplate(id: string): void {
    mealTemplates.value = mealTemplates.value.filter(template => template.id !== id)
  }

  function copyRecordsToDate(sourceDate: string, targetDate: string): number {
    const sourceRecords = records.value.filter(record => record.date === sourceDate)
    for (const record of sourceRecords) {
      const { id: _id, date: _date, ...recordData } = record
      addRecord({ ...recordData, date: targetDate })
    }
    return sourceRecords.length
  }

  function updatePersonalCarePlan(plan: PersonalCarePlan): void {
    personalCarePlan.value = plan
  }

  /** 设置体重并自动重算每日营养目标 */
  function setBodyWeight(weightKg: number | null): void {
    bodyWeight.value = weightKg
    if (weightKg && weightKg > 0) {
      Object.assign(goals.value, calculateGoalsFromWeight(weightKg, userMode.value))
    }
  }

  function recordBodyWeight(weightKg: number, date = getTodayString()): void {
    if (!Number.isFinite(weightKg) || weightKg < 30 || weightKg > 200) return
    if (date === getTodayString()) setBodyWeight(weightKg)
    const existing = weightRecords.value.findIndex(record => record.date === date)
    const nextRecord: WeightRecord = {
      id: existing >= 0 ? weightRecords.value[existing].id : generateId(),
      date,
      weight: Math.round(weightKg * 10) / 10,
    }
    if (existing >= 0) weightRecords.value[existing] = nextRecord
    else weightRecords.value = [...weightRecords.value, nextRecord].sort((a, b) => a.date.localeCompare(b.date))
  }

  function deleteWeightRecord(id: string): void {
    weightRecords.value = weightRecords.value.filter(record => record.id !== id)
  }

  function addCustomFood(food: Omit<FoodDefinition, 'id' | 'isBuiltIn'>): FoodDefinition {
    const newFood: FoodDefinition = {
      ...food,
      id: generateId(),
      isBuiltIn: false,
    }
    customFoods.value.push(newFood)
    return newFood
  }

  function deleteCustomFood(id: string): void {
    customFoods.value = customFoods.value.filter((f) => f.id !== id)
  }

  function updateCustomFood(id: string, updates: Partial<Omit<FoodDefinition, 'id' | 'isBuiltIn'>>): void {
    const index = customFoods.value.findIndex((f) => f.id === id)
    if (index !== -1) {
      customFoods.value[index] = { ...customFoods.value[index], ...updates }
    }
  }

  function getRecordsByDate(date: string): FoodRecord[] {
    return records.value.filter((record) => record.date === date)
  }

  function getDailyNutrition(date: string): DailyNutrition {
    const dateRecords = getRecordsByDate(date)
    return buildDailyNutrition(date, dateRecords, calculateNutritionTotals(dateRecords))
  }

  /** Restore a user-owned JSON backup after validating its minimum record shape. */
  function restoreBackup(backup: unknown): { records: number; customFoods: number } {
    if (!backup || typeof backup !== 'object') throw new Error('备份文件格式无效')
    const data = backup as Record<string, unknown>
    if (!Array.isArray(data.records)) throw new Error('备份文件缺少饮食记录')

    const numberValue = (value: unknown, fallback = 0): number =>
      typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback
    const textValue = (value: unknown): string => typeof value === 'string' ? value : ''
    const validMealTypes = new Set<FoodRecord['mealType']>(['breakfast', 'lunch', 'dinner', 'snack'])
    const validSources = new Set(['home', 'canteen', 'takeout', 'convenience', 'mixed'])

    const restoredRecords = data.records.reduce<FoodRecord[]>((result, item) => {
      if (!item || typeof item !== 'object') return result
      const raw = item as Record<string, unknown>
      const mealType = textValue(raw.mealType) as FoodRecord['mealType']
      const date = textValue(raw.date)
      if (!textValue(raw.id) || !textValue(raw.foodName) || !textValue(raw.foodType) || !validMealTypes.has(mealType) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return result
      const source = textValue(raw.source)
      result.push({
        id: textValue(raw.id), foodType: textValue(raw.foodType), foodName: textValue(raw.foodName),
        weight: numberValue(raw.weight), calories: numberValue(raw.calories), protein: numberValue(raw.protein),
        fat: numberValue(raw.fat), carbs: numberValue(raw.carbs), fiber: numberValue(raw.fiber),
        potassium: numberValue(raw.potassium), phosphorus: numberValue(raw.phosphorus), sodium: numberValue(raw.sodium),
        bioavailablePhosphorus: numberValue(raw.bioavailablePhosphorus, numberValue(raw.phosphorus)),
        mealType, date, ...(validSources.has(source) ? { source: source as FoodRecord['source'] } : {}),
      })
      return result
    }, [])

    const nextGoals: NutritionGoals = { ...DEFAULT_NUTRITION_GOALS }
    if (data.goals && typeof data.goals === 'object') {
      const rawGoals = data.goals as Record<string, unknown>
      for (const key of Object.keys(nextGoals) as Array<keyof NutritionGoals>) {
        const value = rawGoals[key]
        if (typeof value === 'number' && Number.isFinite(value) && value >= 0) nextGoals[key] = value
      }
    }
    goals.value = nextGoals

    if (data.userMode === 'normal' || data.userMode === 'kidney') userMode.value = data.userMode
    bodyWeight.value = typeof data.bodyWeight === 'number' && data.bodyWeight >= 30 && data.bodyWeight <= 200 ? data.bodyWeight : null
    weightRecords.value = Array.isArray(data.weightRecords)
      ? data.weightRecords.reduce<WeightRecord[]>((result, item) => {
        if (!item || typeof item !== 'object') return result
        const raw = item as Record<string, unknown>
        const date = textValue(raw.date)
        const weight = numberValue(raw.weight)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || weight < 30 || weight > 200 || result.some(record => record.date === date)) return result
        result.push({ id: textValue(raw.id) || generateId(), date, weight })
        return result
      }, []).sort((a, b) => a.date.localeCompare(b.date))
      : []

    customFoods.value = Array.isArray(data.customFoods)
      ? data.customFoods.reduce<FoodDefinition[]>((result, item) => {
        if (!item || typeof item !== 'object') return result
        const raw = item as Record<string, unknown>
        const id = textValue(raw.id)
        const name = textValue(raw.name).trim()
        const category = textValue(raw.category).trim()
        if (!id || !name || !category) return result
        result.push({
          id, name, category, isBuiltIn: false,
          calories: numberValue(raw.calories), protein: numberValue(raw.protein), fat: numberValue(raw.fat),
          carbs: numberValue(raw.carbs), fiber: numberValue(raw.fiber), potassium: numberValue(raw.potassium),
          phosphorus: numberValue(raw.phosphorus), sodium: numberValue(raw.sodium),
          unit: textValue(raw.unit) || '100g',
          ...(textValue(raw.dataSource) ? { dataSource: textValue(raw.dataSource) } : {}),
          ...(textValue(raw.sourceReference) ? { sourceReference: textValue(raw.sourceReference) } : {}),
          ...(raw.dataConfidence === 'reference' || raw.dataConfidence === 'label' || raw.dataConfidence === 'estimate' || raw.dataConfidence === 'user' ? { dataConfidence: raw.dataConfidence } : {}),
          ...(textValue(raw.dataVersion) ? { dataVersion: textValue(raw.dataVersion) } : {}),
          ...(textValue(raw.verifiedAt) ? { verifiedAt: textValue(raw.verifiedAt) } : {}),
        })
        return result
      }, [])
      : []

    lifestyleProfile.value = { mealSource: 'mixed', cookingAccess: 'limited', priority: 'balance', configured: false }
    if (data.lifestyleProfile && typeof data.lifestyleProfile === 'object') {
      const profile = data.lifestyleProfile as Partial<LifestyleProfile>
      if (validSources.has(profile.mealSource ?? '') && ['none', 'limited', 'kitchen'].includes(profile.cookingAccess ?? '') && ['balance', 'time', 'budget'].includes(profile.priority ?? '')) {
        lifestyleProfile.value = { mealSource: profile.mealSource!, cookingAccess: profile.cookingAccess!, priority: profile.priority!, configured: Boolean(profile.configured) }
      }
    }

    mealTemplates.value = Array.isArray(data.mealTemplates) ? data.mealTemplates as MealTemplate[] : []
    suggestionFeedback.value = Array.isArray(data.suggestionFeedback) ? data.suggestionFeedback as SuggestionFeedback[] : []
    personalCarePlan.value = { enabled: false, source: 'self', note: '' }
    if (data.personalCarePlan && typeof data.personalCarePlan === 'object') {
      const plan = data.personalCarePlan as Partial<PersonalCarePlan>
      const rawTargets = plan.targets && typeof plan.targets === 'object' ? plan.targets as PersonalCarePlanTargets : undefined
      const targets: PersonalCarePlanTargets = {}
      for (const key of ['protein', 'potassium', 'phosphorus', 'sodium'] as const) {
        const value = rawTargets?.[key]
        if (typeof value === 'number' && Number.isFinite(value) && value > 0) targets[key] = value
      }
      personalCarePlan.value = {
        enabled: Boolean(plan.enabled), source: plan.source === 'clinician' ? 'clinician' : 'self',
        reviewDate: typeof plan.reviewDate === 'string' ? plan.reviewDate : undefined,
        note: typeof plan.note === 'string' ? plan.note : '',
        ...(plan.source === 'clinician' && Object.keys(targets).length ? { targets } : {}),
      }
    }

    records.value = restoredRecords
    migrateOldRecords()
    return { records: restoredRecords.length, customFoods: customFoods.value.length }
  }

  return {
    records,
    goals,
    userMode,
    lifestyleProfile,
    suggestionFeedback,
    mealTemplates,
    personalCarePlan,
    bodyWeight,
    weightRecords,
    todayRecords,
    todayNutrition,
    addRecord,
    updateRecord,
    deleteRecord,
    updateGoals,
    setUserMode,
    updateLifestyleProfile,
    recordSuggestionFeedback,
    addMealTemplate,
    applyMealTemplate,
    deleteMealTemplate,
    copyRecordsToDate,
    updatePersonalCarePlan,
    setBodyWeight,
    recordBodyWeight,
    deleteWeightRecord,
    customFoods,
    allFoods,
    addCustomFood,
    deleteCustomFood,
    updateCustomFood,
    getRecordsByDate,
    getDailyNutrition,
    restoreBackup,
  }
}, {
  persist: true,
})
