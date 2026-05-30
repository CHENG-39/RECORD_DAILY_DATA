<template>
  <div class="stats-view">
    <NavBar />

    <div class="content">
      <h3>统计分析</h3>

      <!-- 本周热量概览 -->
      <div class="card">
        <h4>本周热量概览</h4>
        <div class="week-stats">
          <div class="stat-item">
            <span class="label">日均热量</span>
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
      </div>

      <!-- 本周平均营养素 -->
      <div class="card">
        <h4>本周日均营养素</h4>
        <div class="nutrient-grid">
          <div class="nutrient-item">
            <span class="n-value">{{ avgNutrition.protein }}<small>g</small></span>
            <span class="n-label">蛋白质</span>
          </div>
          <div class="nutrient-item">
            <span class="n-value">{{ avgNutrition.fat }}<small>g</small></span>
            <span class="n-label">脂肪</span>
          </div>
          <div class="nutrient-item">
            <span class="n-value">{{ avgNutrition.carbs }}<small>g</small></span>
            <span class="n-label">碳水</span>
          </div>
          <div class="nutrient-item">
            <span class="n-value">{{ avgNutrition.fiber }}<small>g</small></span>
            <span class="n-label">膳食纤维</span>
          </div>
          <div class="nutrient-item">
            <span class="n-value">{{ avgNutrition.potassium }}<small>mg</small></span>
            <span class="n-label">钾</span>
          </div>
          <div class="nutrient-item n-highlight">
            <span class="n-value">{{ avgNutrition.phosphorus }}<small>mg</small></span>
            <span class="n-label">磷</span>
          </div>
        </div>
      </div>

      <!-- 宏量营养素供能比 -->
      <div class="card">
        <h4>宏量营养素供能占比（本周）</h4>
        <div class="dist-item">
          <span class="dist-label">蛋白质</span>
          <van-progress :percentage="proteinPercentage" stroke-width="8" color="#4facfe" />
          <span class="dist-pct">{{ proteinPercentage }}%</span>
        </div>
        <div class="dist-item">
          <span class="dist-label">脂肪</span>
          <van-progress :percentage="fatPercentage" stroke-width="8" color="#ff9a9e" />
          <span class="dist-pct">{{ fatPercentage }}%</span>
        </div>
        <div class="dist-item">
          <span class="dist-label">碳水</span>
          <van-progress :percentage="carbsPercentage" stroke-width="8" color="#00f2fe" />
          <span class="dist-pct">{{ carbsPercentage }}%</span>
        </div>
      </div>

      <!-- 最近 7 天记录 -->
      <div class="card">
        <h4>最近 7 天记录</h4>
        <van-empty v-if="weeklyStats.length === 0" description="暂无数据" />
        <van-cell-group v-else inset>
          <van-cell
            v-for="day in weeklyStats"
            :key="day.date"
            :title="day.date"
            :label="`蛋白质${day.totalProtein}g | 脂肪${day.totalFat}g | 碳水${day.totalCarbs}g | 钾${day.totalPotassium}mg | 磷${day.totalPhosphorus}mg`"
            :value="`${day.totalCalories} kcal`"
          />
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

// 最近 7 天
const last7Days = Array.from({ length: 7 }, (_, i) => {
  return dayjs(getTodayString()).subtract(i, 'day').format('YYYY-MM-DD')
})

// 每天汇总
const weeklyStats = computed(() => {
  return last7Days
    .map((date) => {
      const dayRecords = records.filter((r) => r.date === date)
      const totals = calculateNutritionTotals(dayRecords)
      return { date, ...totals }
    })
    .reverse()
})

// 有记录的天数
const validDays = computed(() => weeklyStats.value.filter((d) => d.totalCalories > 0))

// 热量统计
const avgCalories = computed(() => {
  if (validDays.value.length === 0) return 0
  return Math.round(validDays.value.reduce((s, d) => s + d.totalCalories, 0) / validDays.value.length)
})

const maxCalories = computed(() => {
  if (validDays.value.length === 0) return 0
  return Math.max(...validDays.value.map((d) => d.totalCalories))
})

const minCalories = computed(() => {
  if (validDays.value.length === 0) return 0
  return Math.min(...validDays.value.map((d) => d.totalCalories))
})

// 日均营养素
const avgNutrition = computed(() => {
  if (validDays.value.length === 0) {
    return { protein: 0, fat: 0, carbs: 0, fiber: 0, potassium: 0, phosphorus: 0 }
  }
  const n = validDays.value.length
  return {
    protein: Math.round(validDays.value.reduce((s, d) => s + d.totalProtein, 0) / n),
    fat: Math.round(validDays.value.reduce((s, d) => s + d.totalFat, 0) / n),
    carbs: Math.round(validDays.value.reduce((s, d) => s + d.totalCarbs, 0) / n),
    fiber: Math.round(validDays.value.reduce((s, d) => s + d.totalFiber, 0) / n),
    potassium: Math.round(validDays.value.reduce((s, d) => s + d.totalPotassium, 0) / n),
    phosphorus: Math.round(validDays.value.reduce((s, d) => s + d.totalPhosphorus, 0) / n),
  }
})

// 本周宏量营养素总量
const totalMacros = computed(() => {
  return validDays.value.reduce(
    (acc, d) => ({
      protein: acc.protein + d.totalProtein,
      fat: acc.fat + d.totalFat,
      carbs: acc.carbs + d.totalCarbs,
    }),
    { protein: 0, fat: 0, carbs: 0 }
  )
})

// 供能占比（蛋白质 4kcal/g，脂肪 9kcal/g，碳水 4kcal/g）
const totalMacroCalories = computed(() => {
  return totalMacros.value.protein * 4 + totalMacros.value.fat * 9 + totalMacros.value.carbs * 4
})

const proteinPercentage = computed(() => {
  if (totalMacroCalories.value === 0) return 0
  return Math.round((totalMacros.value.protein * 4 / totalMacroCalories.value) * 100)
})

const fatPercentage = computed(() => {
  if (totalMacroCalories.value === 0) return 0
  return Math.round((totalMacros.value.fat * 9 / totalMacroCalories.value) * 100)
})

const carbsPercentage = computed(() => {
  if (totalMacroCalories.value === 0) return 0
  return Math.round((totalMacros.value.carbs * 4 / totalMacroCalories.value) * 100)
})
</script>

<style scoped>
.stats-view {
  padding-bottom: 70px;
}

.content {
  padding: 16px;
}

.card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.card h4 {
  margin: 0 0 12px;
  font-size: 14px;
  color: #333;
}

.week-stats {
  display: flex;
  justify-content: space-around;
}

.stat-item {
  text-align: center;
}

.stat-item .label {
  font-size: 12px;
  color: #999;
  display: block;
}

.stat-item .value {
  font-size: 18px;
  font-weight: 700;
  color: #333;
}

.nutrient-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.nutrient-item {
  text-align: center;
  padding: 8px 4px;
  background: #f7f8fa;
  border-radius: 8px;
}

.n-highlight {
  background: #fff0f0;
}

.n-value {
  font-size: 18px;
  font-weight: 700;
  color: #333;
}

.n-value small {
  font-size: 10px;
  font-weight: 400;
  color: #999;
}

.n-label {
  font-size: 11px;
  color: #999;
  display: block;
}

.dist-item {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.dist-label {
  font-size: 12px;
  color: #666;
  width: 48px;
  flex-shrink: 0;
}

.dist-pct {
  font-size: 12px;
  color: #999;
  width: 32px;
  text-align: right;
}
</style>
