<template>
  <div class="stats-view">
    <NavBar />

    <div class="content">
      <h3>统计分析</h3>

      <!-- 本周概览 -->
      <van-card title="本周概览" class="overview-card">
        <template #num>
          <div class="week-stats">
            <div class="stat-item">
              <span class="label">平均每日热量</span>
              <span class="value">{{ avgCalories }} kcal</span>
            </div>
            <div class="stat-item">
              <span class="label">最高摄入</span>
              <span class="value">{{ maxCalories }} kcal</span>
            </div>
            <div class="stat-item">
              <span class="label">最低摄入</span>
              <span class="value">{{ minCalories }} kcal</span>
            </div>
          </div>
        </template>
      </van-card>

      <!-- 营养分布 -->
      <van-card title="营养摄入分布" class="distribution-card">
        <template #num>
          <div class="nutrition-distribution">
            <div class="dist-item">
              <van-progress
                :percentage="proteinPercentage"
                stroke-width="10"
                color="#4facfe"
              />
              <span class="dist-label">蛋白质 {{ proteinPercentage }}%</span>
            </div>
            <div class="dist-item">
              <van-progress
                :percentage="carbsPercentage"
                stroke-width="10"
                color="#00f2fe"
              />
              <span class="dist-label">碳水 {{ carbsPercentage }}%</span>
            </div>
            <div class="dist-item">
              <van-progress
                :percentage="fatPercentage"
                stroke-width="10"
                color="#ff9a9e"
              />
              <span class="dist-label">脂肪 {{ fatPercentage }}%</span>
            </div>
          </div>
        </template>
      </van-card>

      <!-- 最近 7 天记录 -->
      <div class="recent-section">
        <h4>最近 7 天记录</h4>
        <van-empty v-if="weeklyStats.length === 0" description="暂无数据" />
        <van-cell-group v-else inset>
          <van-cell
            v-for="day in weeklyStats"
            :key="day.date"
            :title="day.date"
            :label="`总摄入：${day.totalCalories} kcal`"
          >
            <template #right-icon>
              <span class="sub-label">
                蛋白质 {{ day.totalProtein }}g | 碳水 {{ day.totalCarbs }}g | 脂肪 {{ day.totalFat }}g
              </span>
            </template>
          </van-cell>
        </van-cell-group>
      </div>
    </div>

    <TabBar />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDietStore } from '@/stores/diet'
import { getTodayString, calculateNutritionTotals } from '@/utils'
import NavBar from '@/components/NavBar.vue'
import TabBar from '@/components/TabBar.vue'
import dayjs from 'dayjs'

const dietStore = useDietStore()
const { records } = dietStore

// 获取最近 7 天的日期
const last7Days = Array.from({ length: 7 }, (_, i) => {
  return dayjs(getTodayString()).subtract(i, 'day').format('YYYY-MM-DD')
})

// 计算每天的营养数据
const weeklyStats = computed(() => {
  return last7Days.map((date) => {
    const dayRecords = records.filter((r) => r.date === date)
    const totals = calculateNutritionTotals(dayRecords)
    return {
      date,
      ...totals,
    }
  }).reverse()
})

// 计算平均值和极值
const validDays = weeklyStats.value.filter((d) => d.totalCalories > 0)
const avgCalories = computed(() => {
  if (validDays.length === 0) return 0
  return Math.round(validDays.reduce((sum, d) => sum + d.totalCalories, 0) / validDays.length)
})

const maxCalories = computed(() => {
  if (validDays.length === 0) return 0
  return Math.max(...validDays.map((d) => d.totalCalories))
})

const minCalories = computed(() => {
  if (validDays.length === 0) return 0
  return Math.min(...validDays.map((d) => d.totalCalories))
})

// 计算营养分布百分比（基于最近 7 天总和）
const totalNutrition = computed(() => {
  return weeklyStats.value.reduce(
    (acc, day) => ({
      calories: acc.calories + day.totalCalories,
      protein: acc.protein + day.totalProtein,
      carbs: acc.carbs + day.totalCarbs,
      fat: acc.fat + day.totalFat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )
})

// 计算热量占比（蛋白质和碳水每克 4kcal，脂肪每克 9kcal）
const proteinPercentage = computed(() => {
  const totalFromProtein = totalNutrition.value.protein * 4
  if (totalNutrition.value.calories === 0) return 0
  return Math.round((totalFromProtein / totalNutrition.value.calories) * 100)
})

const carbsPercentage = computed(() => {
  const totalFromCarbs = totalNutrition.value.carbs * 4
  if (totalNutrition.value.calories === 0) return 0
  return Math.round((totalFromCarbs / totalNutrition.value.calories) * 100)
})

const fatPercentage = computed(() => {
  const totalFromFat = totalNutrition.value.fat * 9
  if (totalNutrition.value.calories === 0) return 0
  return Math.round((totalFromFat / totalNutrition.value.calories) * 100)
})
</script>

<style scoped>
.stats-view {
  padding-bottom: 60px;
}

.content {
  padding: 16px;
}

.week-stats {
  display: flex;
  justify-content: space-around;
  padding: 10px 0;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-item .label {
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
}

.stat-item .value {
  font-size: 16px;
  font-weight: bold;
  color: #333;
}

.nutrition-distribution {
  padding: 10px 0;
}

.dist-item {
  margin-bottom: 16px;
}

.dist-label {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
  display: block;
}

.recent-section {
  margin-top: 20px;
}

.recent-section h4 {
  margin-bottom: 12px;
  font-size: 16px;
  color: #333;
}

.sub-label {
  font-size: 12px;
  color: #999;
}
</style>
