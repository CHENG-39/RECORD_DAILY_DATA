<template>
  <div class="history-view">
    <NavBar />

    <div class="content">
      <h3>历史记录</h3>
      
      <!-- 日期选择器 -->
      <van-calendar
        v-model:show="showCalendar"
        type="single"
        @confirm="onDateConfirm"
      />
      
      <van-cell
        title="选择日期"
        :value="selectedDate"
        is-link
        @click="showCalendar = true"
      />

      <!-- 记录列表 -->
      <div class="records-section" v-if="selectedDateRecords.length > 0">
        <van-cell-group inset>
          <van-cell
            v-for="record in selectedDateRecords"
            :key="record.id"
            :title="record.name"
            :label="`${MEAL_TYPES[record.mealType]} | ${record.calories} kcal`"
          >
            <template #right-icon>
              <van-button size="small" type="danger" plain @click="deleteRecord(record.id)">
                删除
              </van-button>
            </template>
          </van-cell>
        </van-cell-group>
        
        <!-- 当日汇总 -->
        <van-card
          title="当日汇总"
          :desc="`总摄入：${selectedDateNutrition.totalCalories} kcal`"
          class="summary-card"
        >
          <template #num>
            <div class="nutrition-summary">
              <div class="nutrition-item">
                <span class="value">{{ selectedDateNutrition.totalProtein }}g</span>
                <span class="label">蛋白质</span>
              </div>
              <div class="nutrition-item">
                <span class="value">{{ selectedDateNutrition.totalCarbs }}g</span>
                <span class="label">碳水</span>
              </div>
              <div class="nutrition-item">
                <span class="value">{{ selectedDateNutrition.totalFat }}g</span>
                <span class="label">脂肪</span>
              </div>
            </div>
          </template>
        </van-card>
      </div>
      
      <van-empty v-else description="该日期暂无记录" />
    </div>

    <TabBar />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDietStore } from '@/stores/diet'
import { MEAL_TYPES } from '@/constants'
import { formatDate } from '@/utils'
import NavBar from '@/components/NavBar.vue'
import TabBar from '@/components/TabBar.vue'

const dietStore = useDietStore()
const { records, getDailyNutrition, deleteRecord } = dietStore

const showCalendar = ref(false)
const selectedDate = ref(formatDate(new Date()))

const selectedDateRecords = computed(() => {
  return records.filter((record) => record.date === selectedDate.value)
})

const selectedDateNutrition = computed(() => {
  return getDailyNutrition(selectedDate.value)
})

function onDateConfirm(date: Date): void {
  selectedDate.value = formatDate(date)
  showCalendar.value = false
}
</script>

<style scoped>
.history-view {
  padding-bottom: 60px;
}

.content {
  padding: 16px;
}

.records-section {
  margin-top: 20px;
}

.summary-card {
  margin-top: 20px;
}

.nutrition-summary {
  display: flex;
  justify-content: space-around;
  padding: 10px 0;
}

.nutrition-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.nutrition-item .value {
  font-size: 16px;
  font-weight: bold;
  color: #333;
}

.nutrition-item .label {
  font-size: 12px;
  color: #999;
}
</style>
