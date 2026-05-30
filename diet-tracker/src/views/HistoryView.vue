<template>
  <div class="history-view">
    <NavBar />

    <div class="content">
      <!-- 日期选择器 -->
      <van-cell
        title="选择日期"
        :value="selectedDate"
        is-link
        @click="showCalendar = true"
      />
      <van-calendar
        v-model:show="showCalendar"
        type="single"
        @confirm="onDateConfirm"
      />

      <!-- 记录列表 -->
      <div class="records-section" v-if="selectedDateRecords.length > 0">
        <h3>{{ selectedDate }} 记录（{{ selectedDateRecords.length }} 条）</h3>
        <van-cell-group inset>
          <van-cell
            v-for="record in selectedDateRecords"
            :key="record.id"
            :title="`${record.foodName} ${record.weight}g`"
            :label="mealLabel(record)"
            :value="`${record.calories} kcal`"
          />
        </van-cell-group>

        <!-- 当日营养汇总 -->
        <div class="day-summary">
          <h4>当日营养汇总</h4>
          <div class="summary-grid">
            <div class="s-item">
              <span class="s-value">{{ selectedDateNutrition.totalCalories }}</span>
              <span class="s-label">热量 kcal</span>
            </div>
            <div class="s-item">
              <span class="s-value">{{ selectedDateNutrition.totalProtein }}</span>
              <span class="s-label">蛋白质 g</span>
            </div>
            <div class="s-item">
              <span class="s-value">{{ selectedDateNutrition.totalFat }}</span>
              <span class="s-label">脂肪 g</span>
            </div>
            <div class="s-item">
              <span class="s-value">{{ selectedDateNutrition.totalCarbs }}</span>
              <span class="s-label">碳水 g</span>
            </div>
            <div class="s-item">
              <span class="s-value">{{ selectedDateNutrition.totalFiber }}</span>
              <span class="s-label">纤维 g</span>
            </div>
            <div class="s-item">
              <span class="s-value">{{ selectedDateNutrition.totalPotassium }}</span>
              <span class="s-label">钾 mg</span>
            </div>
            <div class="s-item s-highlight">
              <span class="s-value">{{ selectedDateNutrition.totalPhosphorus }}</span>
              <span class="s-label">磷 mg</span>
            </div>
          </div>
        </div>
      </div>

      <van-empty v-else description="该日期暂无记录" />
    </div>

    <TabBar />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { FoodRecord } from '@/types'
import { useDietStore } from '@/stores/diet'
import { MEAL_TYPES } from '@/constants'
import { formatDate } from '@/utils'
import NavBar from '@/components/NavBar.vue'
import TabBar from '@/components/TabBar.vue'

const dietStore = useDietStore()
const { records, getDailyNutrition } = dietStore

const showCalendar = ref(false)
const selectedDate = ref(formatDate(new Date()))

const selectedDateRecords = computed(() => {
  return records.filter((record) => record.date === selectedDate.value)
})

const selectedDateNutrition = computed(() => {
  return getDailyNutrition(selectedDate.value)
})

function mealLabel(record: FoodRecord): string {
  return `${MEAL_TYPES[record.mealType]} | 蛋白质${record.protein}g | 脂肪${record.fat}g | 碳水${record.carbs}g | 钾${record.potassium}mg | 磷${record.phosphorus}mg`
}

function onDateConfirm(date: Date): void {
  selectedDate.value = formatDate(date)
  showCalendar.value = false
}
</script>

<style scoped>
.history-view {
  padding-bottom: 70px;
}

.content {
  padding: 16px;
}

.records-section {
  margin-top: 16px;
}

.records-section h3 {
  margin-bottom: 12px;
  font-size: 15px;
  color: #333;
}

.day-summary {
  margin-top: 16px;
  background: #fff;
  border-radius: 12px;
  padding: 16px;
}

.day-summary h4 {
  margin: 0 0 12px;
  font-size: 14px;
  color: #333;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.s-item {
  text-align: center;
  padding: 8px 4px;
  background: #f7f8fa;
  border-radius: 8px;
}

.s-highlight {
  background: #fff0f0;
}

.s-value {
  display: block;
  font-size: 16px;
  font-weight: 700;
  color: #333;
}

.s-label {
  display: block;
  font-size: 10px;
  color: #999;
  margin-top: 2px;
}
</style>
