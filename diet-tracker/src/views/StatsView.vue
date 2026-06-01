<template>
  <div class="stats-view">
    <NavBar />

    <div class="content">
      <!-- 时间切换 -->
      <div class="period-tabs">
        <span
          v-for="p in periods"
          :key="p.key"
          class="period-tab"
          :class="{ active: activePeriod === p.key }"
          @click="activePeriod = p.key"
        >{{ p.label }}</span>
      </div>

      <!-- ===== 近7天：可切换趋势柱状图 ===== -->
      <div class="card" v-if="activePeriod === 'week'">
        <h4>近 7 天趋势</h4>

        <!-- 指标切换 -->
        <div class="chart-toggles">
          <span
            v-for="t in chartToggles"
            :key="t.key"
            class="chart-toggle"
            :class="{ active: activeChart === t.key }"
            @click="activeChart = t.key"
          >{{ t.label }}</span>
        </div>

        <!-- 柱状图 -->
        <div class="chart-section">
          <div class="chart-title">
            <span>{{ activeChartLabel }} ({{ activeChartUnit }})</span>
            <span class="goal-line-label">推荐 {{ activeChartGoalDisplay }}{{ activeChartUnit }}</span>
          </div>
          <div class="bar-chart">
            <div
              v-for="day in weeklyStats"
              :key="day.date"
              class="bar-col"
            >
              <div class="bar-value">{{ activeChartValue(day) }}</div>
              <div class="bar-wrap">
                <div
                  class="bar"
                  :style="barStyle(activeChartValue(day), activeChartGoal, activeChart)"
                ></div>
              </div>
              <div class="bar-date">{{ formatShortDate(day.date) }}</div>
            </div>
          </div>
        </div>

        <!-- 本周统计 + 日均营养素（合并卡片） -->
        <div class="week-summary">
          <div class="summary-divider"></div>
          <h5>本周概览</h5>

          <!-- 热量统计 -->
          <div class="cal-stats">
            <div class="cal-stat">
              <span class="cal-stat-label">日均热量</span>
              <span class="cal-stat-value">{{ avgCalories }}</span>
              <span class="cal-stat-unit">kcal</span>
            </div>
            <div class="cal-stat">
              <span class="cal-stat-label">最高</span>
              <span class="cal-stat-value">{{ maxCalories }}</span>
              <span class="cal-stat-unit">kcal</span>
            </div>
            <div class="cal-stat">
              <span class="cal-stat-label">最低</span>
              <span class="cal-stat-value">{{ minCalories }}</span>
              <span class="cal-stat-unit">kcal</span>
            </div>
          </div>

          <!-- 日均营养素 -->
          <div class="nutrient-row">
            <div class="n-item">
              <span class="n-value">{{ avgNutrition.protein }}<small>g</small></span>
              <span class="n-label">蛋白质</span>
            </div>
            <div class="n-item">
              <span class="n-value">{{ avgNutrition.fat }}<small>g</small></span>
              <span class="n-label">脂肪</span>
            </div>
            <div class="n-item">
              <span class="n-value">{{ avgNutrition.carbs }}<small>g</small></span>
              <span class="n-label">碳水</span>
            </div>
            <div class="n-item">
              <span class="n-value">{{ avgNutrition.fiber }}<small>g</small></span>
              <span class="n-label">纤维</span>
            </div>
            <div class="n-item">
              <span class="n-value">{{ avgNutrition.potassium }}<small>mg</small></span>
              <span class="n-label">钾</span>
            </div>
            <div class="n-item n-highlight">
              <span class="n-value">{{ avgNutrition.phosphorus }}<small>mg</small></span>
              <span v-if="dietStore.userMode === 'kidney'" class="n-extra">可利用 {{ avgNutrition.bioavailableP }}mg</span>
              <span class="n-label">磷</span>
            </div>
          </div>
        </div>

        <!-- 宏量营养素供能比 -->
        <div class="summary-divider"></div>
        <h5>供能占比（本周）</h5>
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

      <!-- ===== 近30天概览 ===== -->
      <div class="card" v-if="activePeriod === 'month'">
        <h4>近 30 天摘要</h4>
        <div class="month-summary">
          <div class="summary-row">
            <span class="summary-label">有记录天数</span>
            <span class="summary-value">{{ monthlyValidDays }} / 30</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">日均热量</span>
            <span class="summary-value">
              {{ monthlyAvg.calories }} kcal
              <span class="trend-arrow" v-if="monthlyTrend.calories !== 0">
                {{ monthlyTrend.calories > 0 ? '↑' : '↓' }}
              </span>
            </span>
          </div>
          <div class="summary-row">
            <span class="summary-label">日均蛋白质</span>
            <span class="summary-value" :class="{ over: monthlyAvg.protein > nutrientRanges.protein.max }">
              {{ monthlyAvg.protein }}g
              <span class="trend-arrow" v-if="monthlyTrend.protein !== 0">
                {{ monthlyTrend.protein > 0 ? '↑' : '↓' }}
              </span>
            </span>
          </div>
          <div class="summary-row">
            <span class="summary-label">日均钾</span>
            <span class="summary-value" :class="{ over: monthlyAvg.potassium > nutrientRanges.potassium.max }">
              {{ monthlyAvg.potassium }}mg
              <span class="trend-arrow" v-if="monthlyTrend.potassium !== 0">
                {{ monthlyTrend.potassium > 0 ? '↑' : '↓' }}
              </span>
            </span>
          </div>
          <div class="summary-row highlight">
            <span class="summary-label">日均磷</span>
            <span class="summary-value" :class="{ over: monthlyAvg.phosphorus > nutrientRanges.phosphorus.max }">
              {{ monthlyAvg.phosphorus }}mg
              <span class="trend-arrow" v-if="monthlyTrend.phosphorus !== 0">
                {{ monthlyTrend.phosphorus > 0 ? '↑' : '↓' }}
              </span>
            </span>
          </div>
          <div v-if="dietStore.userMode === 'kidney'" class="summary-row">
            <span class="summary-label">日均可利用磷</span>
            <span class="summary-value">{{ monthlyAvg.bioavailableP }}mg</span>
          </div>
        </div>
      </div>

      <!-- 数据导出 -->
      <van-button type="default" block plain icon="downland" @click="handleExport" style="margin-top: 12px;">
        导出数据 (JSON)
      </van-button>
    </div>

    <TabBar />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDietStore } from '@/stores/diet'
import { getTodayString, calculateNutritionTotals, exportRecordsAsJSON, getNutrientSafeRanges } from '@/utils'
import NavBar from '@/components/NavBar.vue'
import TabBar from '@/components/TabBar.vue'
import dayjs from 'dayjs'
import { showToast } from 'vant'

const dietStore = useDietStore()
const { records } = dietStore

const nutrientRanges = computed(() => {
  const w = dietStore.bodyWeight || 60
  return getNutrientSafeRanges(w, dietStore.userMode)
})

const activePeriod = ref<'week' | 'month'>('week')
const periods = [
  { key: 'week' as const, label: '近7天' },
  { key: 'month' as const, label: '近30天' },
]

// ========== 可切换图表 ==========

type ChartType = 'protein' | 'potassium' | 'phosphorus' | 'bioavailableP'
const activeChart = ref<ChartType>('protein')
const chartToggles = computed<{ key: ChartType; label: string }[]>(() => {
  const toggles: { key: ChartType; label: string }[] = [
    { key: 'protein', label: '蛋白质' },
    { key: 'potassium', label: '钾' },
    { key: 'phosphorus', label: '总磷' },
  ]
  if (dietStore.userMode === 'kidney') {
    toggles.push({ key: 'bioavailableP', label: '可利用磷' })
  }
  return toggles
})

const activeChartLabel = computed(() => {
  const map = { protein: '蛋白质', potassium: '钾', phosphorus: '总磷', bioavailableP: '可利用磷' }
  return map[activeChart.value]
})

const activeChartUnit = computed(() => {
  return activeChart.value === 'protein' ? 'g' : 'mg'
})

const activeChartGoal = computed(() => {
  if (activeChart.value === 'bioavailableP') return nutrientRanges.value.phosphorus.max
  return nutrientRanges.value[activeChart.value].max
})

const activeChartGoalDisplay = computed(() => {
  if (activeChart.value === 'bioavailableP') {
    const r = nutrientRanges.value.phosphorus
    return r.isUpperLimit ? `≤${r.max}` : `${r.min}-${r.max}`
  }
  const r = nutrientRanges.value[activeChart.value]
  return r.isUpperLimit ? `≤${r.max}` : `${r.min}-${r.max}`
})

function activeChartValue(day: {
  totalProtein: number
  totalPotassium: number
  totalPhosphorus: number
  totalBioavailablePhosphorus: number
}): number {
  const map = {
    protein: day.totalProtein,
    potassium: day.totalPotassium,
    phosphorus: day.totalPhosphorus,
    bioavailableP: day.totalBioavailablePhosphorus,
  }
  return Math.round(map[activeChart.value])
}

// ========== 日期工具 ==========

function formatShortDate(date: string): string {
  return dayjs(date).format('MM/DD')
}

const last7Days = Array.from({ length: 7 }, (_, i) =>
  dayjs(getTodayString()).subtract(i, 'day').format('YYYY-MM-DD')
)

const last30Days = Array.from({ length: 30 }, (_, i) =>
  dayjs(getTodayString()).subtract(i, 'day').format('YYYY-MM-DD')
)

// ========== 周数据 ==========

const weeklyStats = computed(() =>
  last7Days
    .map((date) => {
      const dayRecords = records.filter((r) => r.date === date)
      const totals = calculateNutritionTotals(dayRecords)
      return { date, ...totals }
    })
    .reverse()
)

const validDays = computed(() => weeklyStats.value.filter((d) => d.totalCalories > 0))

// 热量统计
const avgCalories = computed(() => {
  if (validDays.value.length === 0) return 0
  return Math.round(validDays.value.reduce((s, d) => s + d.totalCalories, 0) / validDays.value.length)
})

const maxCalories = computed(() =>
  validDays.value.length === 0 ? 0 : Math.max(...validDays.value.map(d => d.totalCalories))
)

const minCalories = computed(() =>
  validDays.value.length === 0 ? 0 : Math.min(...validDays.value.map(d => d.totalCalories))
)

// 日均营养素
const avgNutrition = computed(() => {
  if (validDays.value.length === 0) {
    return { protein: 0, fat: 0, carbs: 0, fiber: 0, potassium: 0, phosphorus: 0, bioavailableP: 0 }
  }
  const n = validDays.value.length
  return {
    protein: Math.round(validDays.value.reduce((s, d) => s + d.totalProtein, 0) / n),
    fat: Math.round(validDays.value.reduce((s, d) => s + d.totalFat, 0) / n),
    carbs: Math.round(validDays.value.reduce((s, d) => s + d.totalCarbs, 0) / n),
    fiber: Math.round(validDays.value.reduce((s, d) => s + d.totalFiber, 0) / n),
    potassium: Math.round(validDays.value.reduce((s, d) => s + d.totalPotassium, 0) / n),
    phosphorus: Math.round(validDays.value.reduce((s, d) => s + d.totalPhosphorus, 0) / n),
    bioavailableP: Math.round(validDays.value.reduce((s, d) => s + d.totalBioavailablePhosphorus, 0) / n),
  }
})

// ========== 柱状图样式 ==========

function barStyle(value: number, goal: number, _type: string) {
  const maxH = Math.max(goal * 1.3, value, 1)
  const pct = Math.min((value / maxH) * 100, 100)
  const over = value > goal
  return {
    height: pct + '%',
    background: over
      ? 'linear-gradient(to top, #ee0a24, #ff6b7a)'
      : 'linear-gradient(to top, #4facfe, #00f2fe)',
  }
}

// ========== 30天数据 ==========

const monthlyStats = computed(() =>
  last30Days
    .map((date) => {
      const dayRecords = records.filter((r) => r.date === date)
      const totals = calculateNutritionTotals(dayRecords)
      return { date, ...totals }
    })
    .reverse()
)

const monthlyValidDays = computed(() => monthlyStats.value.filter((d) => d.totalCalories > 0).length)

const monthlyAvg = computed(() => {
  const valid = monthlyStats.value.filter(d => d.totalCalories > 0)
  if (valid.length === 0) return { calories: 0, protein: 0, potassium: 0, phosphorus: 0, bioavailableP: 0 }
  const n = valid.length
  return {
    calories: Math.round(valid.reduce((s, d) => s + d.totalCalories, 0) / n),
    protein: Math.round(valid.reduce((s, d) => s + d.totalProtein, 0) / n),
    potassium: Math.round(valid.reduce((s, d) => s + d.totalPotassium, 0) / n),
    phosphorus: Math.round(valid.reduce((s, d) => s + d.totalPhosphorus, 0) / n),
    bioavailableP: Math.round(valid.reduce((s, d) => s + d.totalBioavailablePhosphorus, 0) / n),
  }
})

// 30天趋势（后15天 vs 前15天均值比较）
const monthlyTrend = computed(() => {
  const valid = monthlyStats.value.filter(d => d.totalCalories > 0)
  if (valid.length < 6) return { calories: 0, protein: 0, potassium: 0, phosphorus: 0 }

  const mid = Math.floor(valid.length / 2)
  const recent = valid.slice(0, mid)
  const older = valid.slice(mid)

  const avg = (arr: typeof recent, key: string) =>
    arr.length === 0 ? 0 : arr.reduce((s, d) => s + (d as unknown as Record<string, number>)[key], 0) / arr.length

  const compare = (key: string) => {
    const r = avg(recent, key)
    const o = avg(older, key)
    if (o === 0) return 0
    const diff = Math.round(((r - o) / o) * 100)
    return diff
  }

  return {
    calories: compare('totalCalories'),
    protein: compare('totalProtein'),
    potassium: compare('totalPotassium'),
    phosphorus: compare('totalPhosphorus'),
  }
})

// ========== 宏量营养素供能比 ==========

const totalMacros = computed(() =>
  validDays.value.reduce(
    (acc, d) => ({
      protein: acc.protein + d.totalProtein,
      fat: acc.fat + d.totalFat,
      carbs: acc.carbs + d.totalCarbs,
    }),
    { protein: 0, fat: 0, carbs: 0 }
  )
)

const totalMacroCalories = computed(() =>
  totalMacros.value.protein * 4 + totalMacros.value.fat * 9 + totalMacros.value.carbs * 4
)

const proteinPercentage = computed(() =>
  totalMacroCalories.value === 0 ? 0 : Math.round((totalMacros.value.protein * 4 / totalMacroCalories.value) * 100)
)

const fatPercentage = computed(() =>
  totalMacroCalories.value === 0 ? 0 : Math.round((totalMacros.value.fat * 9 / totalMacroCalories.value) * 100)
)

const carbsPercentage = computed(() =>
  totalMacroCalories.value === 0 ? 0 : Math.round((totalMacros.value.carbs * 4 / totalMacroCalories.value) * 100)
)

function handleExport(): void {
  exportRecordsAsJSON({
    records: records,
    goals: dietStore.goals,
    exportDate: getTodayString(),
  })
  showToast({ message: '数据已导出', icon: 'success', duration: 1000 })
}
</script>

<style scoped>
.stats-view {
  padding-bottom: 70px;
  background: #f5f7fa;
}

.content {
  padding: 12px 16px;
}

/* 时间切换 */
.period-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.period-tab {
  font-size: 13px;
  color: #999;
  padding: 6px 16px;
  border-radius: 20px;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s;
}

.period-tab.active {
  color: #fff;
  background: linear-gradient(135deg, #4facfe, #00f2fe);
}

/* 卡片 */
.card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.03);
}

.card h4 {
  margin: 0 0 12px;
  font-size: 14px;
  color: #333;
}

.card h5 {
  margin: 0 0 10px;
  font-size: 13px;
  color: #666;
}

.summary-divider {
  height: 1px;
  background: #f0f0f0;
  margin: 14px 0;
}

/* 图表切换 */
.chart-toggles {
  display: flex;
  gap: 6px;
  margin-bottom: 14px;
}

.chart-toggle {
  padding: 4px 12px;
  font-size: 12px;
  color: #999;
  background: #f5f5f5;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.chart-toggle.active {
  background: #4facfe;
  color: #fff;
}

/* 柱状图 */
.chart-section {
  margin-bottom: 4px;
}

.chart-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #666;
  margin-bottom: 6px;
}

.goal-line-label {
  font-size: 10px;
  color: #bbb;
}

.bar-chart {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  height: 100px;
  gap: 4px;
}

.bar-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}

.bar-value {
  font-size: 9px;
  color: #999;
  margin-bottom: 2px;
  min-height: 12px;
}

.bar-wrap {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.bar {
  width: 75%;
  border-radius: 3px 3px 0 0;
  min-height: 2px;
  transition: height 0.3s;
}

.bar-date {
  font-size: 9px;
  color: #bbb;
  margin-top: 4px;
}

/* 热量统计 */
.cal-stats {
  display: flex;
  justify-content: space-around;
  margin-bottom: 14px;
}

.cal-stat {
  text-align: center;
}

.cal-stat-label {
  display: block;
  font-size: 12px;
  color: #999;
}

.cal-stat-value {
  display: block;
  font-size: 20px;
  font-weight: 700;
  color: #333;
}

.cal-stat-unit {
  display: block;
  font-size: 10px;
  color: #bbb;
}

/* 日均营养素 */
.nutrient-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.n-item {
  text-align: center;
  padding: 8px 4px;
  background: #f7f8fa;
  border-radius: 8px;
}

.n-highlight {
  background: #fff5f5;
}

.n-value {
  font-size: 16px;
  font-weight: 700;
  color: #333;
}

.n-value small {
  font-size: 10px;
  font-weight: 400;
  color: #999;
}

.n-extra {
  display: block;
  font-size: 9px;
  color: #bbb;
  margin-top: 2px;
}

.n-label {
  font-size: 11px;
  color: #999;
  display: block;
  margin-top: 2px;
}

/* 供能占比 */
.dist-item {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.dist-item:last-child {
  margin-bottom: 0;
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

/* 30天概览 */
.month-summary {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #f7f8fa;
  border-radius: 8px;
}

.summary-row.highlight {
  background: #fff5f5;
}

.summary-label {
  font-size: 13px;
  color: #666;
}

.summary-value {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  display: flex;
  align-items: center;
  gap: 6px;
}

.summary-value.over {
  color: #ee0a24;
}

.trend-arrow {
  font-size: 12px;
  font-weight: 700;
}

.summary-value.over .trend-arrow {
  color: #ee0a24;
}
</style>
