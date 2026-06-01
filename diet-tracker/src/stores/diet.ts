import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { FoodRecord, DailyNutrition, NutritionGoals, UserMode, FoodDefinition } from '@/types'
import { generateId, getTodayString, calculateNutritionTotals, calculateGoalsFromWeight } from '@/utils'
import { DEFAULT_NUTRITION_GOALS } from '@/constants'
import { BUILT_IN_FOODS } from '@/data/foods'

export const useDietStore = defineStore('diet', () => {
  const records = ref<FoodRecord[]>([])
  const goals = ref<NutritionGoals>({ ...DEFAULT_NUTRITION_GOALS })
  const userMode = ref<UserMode>('normal')
  const customFoods = ref<FoodDefinition[]>([])
  const bodyWeight = ref<number | null>(null) // 用户体重 (kg)

  const allFoods = computed<FoodDefinition[]>(() => {
    return [...BUILT_IN_FOODS, ...customFoods.value]
  })

  const todayRecords = computed(() => {
    const today = getTodayString()
    return records.value.filter((record) => record.date === today)
  })

  const todayNutrition = computed((): DailyNutrition => {
    const totals = calculateNutritionTotals(todayRecords.value)
    return {
      date: getTodayString(),
      totalCalories: totals.totalCalories,
      totalProtein: totals.totalProtein,
      totalFat: totals.totalFat,
      totalCarbs: totals.totalCarbs,
      totalFiber: totals.totalFiber,
      totalPotassium: totals.totalPotassium,
      totalPhosphorus: totals.totalPhosphorus,
      totalBioavailablePhosphorus: totals.totalBioavailablePhosphorus,
      records: todayRecords.value,
    }
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

  /** 设置体重并自动重算每日营养目标 */
  function setBodyWeight(weightKg: number | null): void {
    bodyWeight.value = weightKg
    if (weightKg && weightKg > 0) {
      Object.assign(goals.value, calculateGoalsFromWeight(weightKg, userMode.value))
    }
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
    const totals = calculateNutritionTotals(dateRecords)
    return {
      date,
      totalCalories: totals.totalCalories,
      totalProtein: totals.totalProtein,
      totalFat: totals.totalFat,
      totalCarbs: totals.totalCarbs,
      totalFiber: totals.totalFiber,
      totalPotassium: totals.totalPotassium,
      totalPhosphorus: totals.totalPhosphorus,
      totalBioavailablePhosphorus: totals.totalBioavailablePhosphorus,
      records: dateRecords,
    }
  }

  return {
    records,
    goals,
    userMode,
    bodyWeight,
    todayRecords,
    todayNutrition,
    addRecord,
    updateRecord,
    deleteRecord,
    updateGoals,
    setUserMode,
    setBodyWeight,
    customFoods,
    allFoods,
    addCustomFood,
    deleteCustomFood,
    updateCustomFood,
    getRecordsByDate,
    getDailyNutrition,
  }
}, {
  persist: true,
})
