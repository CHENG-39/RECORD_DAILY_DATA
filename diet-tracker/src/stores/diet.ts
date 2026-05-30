import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { FoodRecord, DailyNutrition, NutritionGoals } from '@/types'
import { generateId, getTodayString, calculateNutritionTotals } from '@/utils'
import { DEFAULT_NUTRITION_GOALS } from '@/constants'

export const useDietStore = defineStore('diet', () => {
  const records = ref<FoodRecord[]>([])
  const goals = ref<NutritionGoals>({ ...DEFAULT_NUTRITION_GOALS })

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

  function deleteRecord(id: string): void {
    records.value = records.value.filter((record) => record.id !== id)
  }

  function updateGoals(newGoals: Partial<NutritionGoals>): void {
    goals.value = { ...goals.value, ...newGoals }
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
      records: dateRecords,
    }
  }

  return {
    records,
    goals,
    todayRecords,
    todayNutrition,
    addRecord,
    deleteRecord,
    updateGoals,
    getRecordsByDate,
    getDailyNutrition,
  }
}, {
  persist: true,
})
