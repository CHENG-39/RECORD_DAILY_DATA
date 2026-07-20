<template>
  <div class="stats-view">
    <NavBar />

    <div class="content">
      <div class="page-heading">
        <span>趋势分析</span>
        <small>用周和月的变化，替代单日的焦虑</small>
      </div>
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

      <section class="weekly-checkin" aria-label="本周记录节奏">
        <div class="weekly-checkin-heading">
          <div>
            <span>本周记录节奏</span>
            <small>{{ weeklyCheckInMessage }}</small>
          </div>
          <strong>{{ validDays.length }}/7 天</strong>
        </div>
        <div class="weekly-checkin-days">
          <div v-for="day in weeklyCheckInDays" :key="day.date" class="weekly-checkin-day" :class="{ recorded: day.hasRecords, today: day.isToday }">
            <span>{{ day.label }}</span>
            <i></i>
          </div>
        </div>
      </section>

      <section v-if="weeklySourceBreakdown.length" class="source-breakdown" aria-label="本周用餐来源">
        <div class="source-breakdown-heading">
          <span>本周主要用餐来源</span>
          <small>基于已标注的饮食记录</small>
        </div>
        <div class="source-breakdown-list">
          <div v-for="item in weeklySourceBreakdown" :key="item.source" class="source-breakdown-item">
            <span>{{ item.label }}</span>
            <div><i :style="{ width: item.percentage + '%' }"></i></div>
            <strong>{{ item.count }} 次</strong>
          </div>
        </div>
      </section>

      <section class="weekly-insight" aria-label="本周执行画像">
        <div class="weekly-insight-heading">
          <div>
            <span>本周执行画像</span>
            <small>只评估已记录的饮食，不推断未记录餐次</small>
          </div>
          <strong>{{ weeklyInsight.label }}</strong>
        </div>
        <div class="insight-metrics">
          <div>
            <strong>{{ weeklyInsight.recordDays }}/7</strong>
            <span>记录天数</span>
          </div>
          <div>
            <strong>{{ weeklyInsight.sourceCoverage }}%</strong>
            <span>餐源标注</span>
          </div>
          <div>
            <strong>{{ weeklyInsight.stableDays }}/{{ weeklyInsight.recordDays || 0 }}</strong>
            <span>{{ dietStore.userMode === 'kidney' ? '参考范围内' : '钠未超参考' }}</span>
          </div>
        </div>
        <p>{{ weeklyInsight.action }}</p>
      </section>

      <section class="weekly-feedback" aria-label="本周行动反馈">
        <div class="weekly-feedback-heading">
          <div>
            <span>本周行动反馈</span>
            <small>“能做到”表示建议贴近当前生活，不代表任务完成</small>
          </div>
          <strong>{{ weeklyFeedback.label }}</strong>
        </div>
        <div class="feedback-metrics">
          <div><strong>{{ weeklyFeedback.total }}</strong><span>回应次数</span></div>
          <div><strong>{{ weeklyFeedback.doable }}</strong><span>觉得可行</span></div>
          <div><strong>{{ weeklyFeedback.alternates }}</strong><span>请求调整</span></div>
        </div>
        <p>{{ weeklyFeedback.action }}</p>
      </section>

      <section class="body-records" aria-label="身体记录">
        <div class="body-records-heading">
          <div>
            <span>身体记录</span>
            <small>体重仅作自我趋势记录，不用于诊断</small>
          </div>
          <van-button plain size="small" icon="plus" @click="openWeightRecordDialog">补录体重</van-button>
        </div>
        <van-empty v-if="!recentWeightRecords.length" image-size="42" description="暂无体重记录" />
        <div v-else class="body-record-list">
          <div v-for="record in recentWeightRecords" :key="record.id">
            <span>{{ record.date }}</span>
            <strong>{{ record.weight }} kg</strong>
            <van-icon name="delete-o" size="16" @click="removeWeightRecord(record.id)" />
          </div>
        </div>
      </section>

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
            <div class="n-item">
              <span class="n-value">{{ avgNutrition.sodium }}<small>mg</small></span>
              <span class="n-label">钠</span>
            </div>
            <div class="n-item n-highlight">
              <span class="n-value">{{ avgNutrition.phosphorus }}<small>mg</small></span>
              <span v-if="dietStore.userMode === 'kidney'" class="n-extra">可利用 {{ avgNutrition.bioavailableP }}mg</span>
              <span class="n-label">磷</span>
            </div>
            <div v-if="dietStore.userMode === 'kidney'" class="n-item">
              <span class="n-value">{{ avgNutrition.pral }}<small>mEq</small></span>
              <span class="n-label">酸负荷</span>
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
            <span class="summary-label">最近体重</span>
            <span v-if="monthlyWeightSummary.count" class="summary-value">
              {{ monthlyWeightSummary.latest }} kg
              <small v-if="monthlyWeightSummary.count > 1" class="weight-change" :class="{ up: monthlyWeightSummary.change > 0, down: monthlyWeightSummary.change < 0 }">
                {{ monthlyWeightSummary.change > 0 ? '+' : '' }}{{ monthlyWeightSummary.change }} kg / {{ monthlyWeightSummary.count }}次
              </small>
            </span>
            <span v-else class="summary-value summary-empty">暂无记录</span>
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
          <div v-if="dietStore.userMode === 'kidney'" class="summary-row">
            <span class="summary-label">日均酸负荷</span>
            <span class="summary-value">{{ monthlyAvg.pral }} mEq</span>
          </div>
        </div>
      </div>

      <section class="backup-tools" aria-label="数据备份">
        <div>
          <span>本地数据备份</span>
          <small>备份包含记录、个人目标、食物库和已保存方案</small>
        </div>
        <div class="backup-actions">
          <van-button plain icon="down" @click="handleExport">导出备份</van-button>
          <van-button plain icon="lock" @click="openEncryptedExport">加密导出</van-button>
          <van-button plain icon="upgrade" @click="triggerRestore">恢复备份</van-button>
        </div>
        <input ref="backupInput" class="backup-input" type="file" accept="application/json,.json" @change="handleRestore" />
      </section>
    </div>

    <TabBar />
    <van-dialog v-model:show="showWeightRecordDialog" title="补录体重" show-cancel-button @confirm="saveWeightRecord">
      <van-field v-model="weightRecordDate" type="date" label="日期" />
      <van-field v-model.number="weightRecordInput" type="number" label="体重" placeholder="30-200" :required="true">
        <template #extra>kg</template>
      </van-field>
      <p class="weight-record-hint">同一天重复保存会覆盖当天的体重记录。</p>
    </van-dialog>
    <van-dialog v-model:show="showEncryptionDialog" title="加密导出" show-cancel-button @confirm="handleEncryptedExport">
      <van-field v-model="backupPassphrase" type="password" label="加密口令" placeholder="至少 8 个字符" :required="true" />
      <p class="weight-record-hint">口令不会上传或保存。遗忘后无法恢复该加密备份。</p>
    </van-dialog>
    <van-dialog v-model:show="showDecryptionDialog" title="恢复加密备份" show-cancel-button @confirm="handleEncryptedRestore">
      <van-field v-model="restorePassphrase" type="password" label="备份口令" placeholder="输入加密时设置的口令" :required="true" />
      <p class="weight-record-hint">解密成功后仍会提示确认覆盖当前本地数据。</p>
    </van-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDietStore } from '@/stores/diet'
import { getTodayString, calculateNutritionTotals, exportRecordsAsJSON, getPersonalizedNutrientRanges } from '@/utils'
import { FOOD_DATABASE_RELEASE } from '@/data/foods'
import { decryptBackup, downloadEncryptedBackup, encryptBackup, isEncryptedBackup } from '@/utils/secureBackup'
import type { EncryptedBackupEnvelope } from '@/utils/secureBackup'
import NavBar from '@/components/NavBar.vue'
import TabBar from '@/components/TabBar.vue'
import dayjs from 'dayjs'
import { showConfirmDialog, showToast } from 'vant'

const dietStore = useDietStore()
const { records } = dietStore

const nutrientRanges = computed(() => {
  const w = dietStore.bodyWeight || 60
  return getPersonalizedNutrientRanges(w, dietStore.userMode, dietStore.personalCarePlan)
})

const activePeriod = ref<'week' | 'month'>('week')
const backupInput = ref<HTMLInputElement | null>(null)
const showWeightRecordDialog = ref(false)
const weightRecordDate = ref(getTodayString())
const weightRecordInput = ref<number | undefined>()
const showEncryptionDialog = ref(false)
const showDecryptionDialog = ref(false)
const backupPassphrase = ref('')
const restorePassphrase = ref('')
const pendingEncryptedBackup = ref<EncryptedBackupEnvelope | null>(null)
const periods = [
  { key: 'week' as const, label: '近7天' },
  { key: 'month' as const, label: '近30天' },
]

// ========== 可切换图表 ==========

type ChartType = 'protein' | 'potassium' | 'phosphorus' | 'sodium' | 'bioavailableP' | 'pral'
const activeChart = ref<ChartType>('protein')
const chartToggles = computed<{ key: ChartType; label: string }[]>(() => {
  const toggles: { key: ChartType; label: string }[] = [
    { key: 'protein', label: '蛋白质' },
    { key: 'potassium', label: '钾' },
    { key: 'phosphorus', label: '总磷' },
    { key: 'sodium', label: '钠' },
  ]
  if (dietStore.userMode === 'kidney') {
    toggles.push({ key: 'bioavailableP', label: '可利用磷' })
    toggles.push({ key: 'pral', label: '酸负荷' })
  }
  return toggles
})

const activeChartLabel = computed(() => {
  const map: Record<ChartType, string> = { protein: '蛋白质', potassium: '钾', phosphorus: '总磷', sodium: '钠', bioavailableP: '可利用磷', pral: '酸负荷' }
  return map[activeChart.value]
})

const activeChartUnit = computed(() => {
  if (activeChart.value === 'protein') return 'g'
  if (activeChart.value === 'pral') return 'mEq'
  return 'mg'
})

const activeChartGoal = computed(() => {
  if (activeChart.value === 'bioavailableP') return nutrientRanges.value.phosphorus.max
  if (activeChart.value === 'pral') return 0
  return nutrientRanges.value[activeChart.value].max
})

const activeChartGoalDisplay = computed(() => {
  if (activeChart.value === 'bioavailableP') {
    const r = nutrientRanges.value.phosphorus
    return r.isUpperLimit ? `≤${r.max}` : `${r.min}-${r.max}`
  }
  if (activeChart.value === 'pral') return '≤0'
  const r = nutrientRanges.value[activeChart.value]
  return r.isUpperLimit ? `≤${r.max}` : `${r.min}-${r.max}`
})

function activeChartValue(day: {
  totalProtein: number
  totalPotassium: number
  totalPhosphorus: number
  totalSodium: number
  totalBioavailablePhosphorus: number
  totalPRAL: number
}): number {
  if (activeChart.value === 'pral') {
    return day.totalPRAL
  }
  const map = {
    protein: day.totalProtein,
    potassium: day.totalPotassium,
    phosphorus: day.totalPhosphorus,
    sodium: day.totalSodium,
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

const weeklyCheckInDays = computed(() =>
  weeklyStats.value.map(day => ({
    date: day.date,
    label: dayjs(day.date).format('dd'),
    hasRecords: day.totalCalories > 0,
    isToday: day.date === getTodayString(),
  }))
)

const weeklyCheckInMessage = computed(() => {
  const count = validDays.value.length
  if (count === 0) return '从下一餐开始，记录一项也算进步。'
  if (count < 3) return '不追求连续，想起时如实记录就好。'
  if (count < 6) return '记录正在形成节奏，继续保持真实就餐记录。'
  return '本周记录很完整，趋势分析会更可靠。'
})

const weeklySourceBreakdown = computed(() => {
  const labels = {
    home: '家里',
    canteen: '食堂',
    takeout: '外卖',
    convenience: '便利店',
    mixed: '混合',
  } as const
  const counts = new Map<keyof typeof labels, number>()

  for (const record of records) {
    if (!last7Days.includes(record.date) || !record.source) continue
    counts.set(record.source, (counts.get(record.source) ?? 0) + 1)
  }

  const total = [...counts.values()].reduce((sum, count) => sum + count, 0)
  if (total === 0) return []
  return [...counts.entries()]
    .map(([source, count]) => ({ source, label: labels[source], count, percentage: Math.round(count / total * 100) }))
    .sort((a, b) => b.count - a.count)
})

const weeklyInsight = computed(() => {
  const weekRecords = records.filter(record => last7Days.includes(record.date))
  const recordDays = validDays.value.length
  const sourceCoverage = weekRecords.length
    ? Math.round(weekRecords.filter(record => Boolean(record.source)).length / weekRecords.length * 100)
    : 0
  const ranges = nutrientRanges.value
  const stableDays = validDays.value.filter(day => {
    if (dietStore.userMode === 'kidney') {
      return day.totalSodium <= ranges.sodium.max
        && day.totalPotassium <= ranges.potassium.max
        && day.totalBioavailablePhosphorus <= ranges.phosphorus.max
        && day.totalProtein <= ranges.protein.max
    }
    return day.totalSodium <= ranges.sodium.max
  }).length

  if (!recordDays) {
    return { label: '等待基线', recordDays, sourceCoverage, stableDays, action: '下一步只要如实记录一餐；连续数据比一次性填满更有参考价值。' }
  }
  if (sourceCoverage < 60) {
    return { label: '提升可解释性', recordDays, sourceCoverage, stableDays, action: '下一步在一条记录中标注家庭、食堂或外卖来源，趋势才能更贴近你的真实用餐环境。' }
  }
  if (stableDays < Math.ceil(recordDays / 2)) {
    const action = dietStore.userMode === 'kidney'
      ? '已记录餐次中，多项指标常超当前参考范围。请结合个人方案和医生复核，不要仅据此自行限食。'
      : '已记录餐次中，钠摄入偏高的天数较多。下周先从记录调味料、汤汁和加工食品的份量开始核对。'
    return { label: '需要重点复盘', recordDays, sourceCoverage, stableDays, action }
  }
  return { label: '节奏稳定', recordDays, sourceCoverage, stableDays, action: '记录与餐源标注都在形成节奏。下周保持真实记录，再用趋势而不是单日数据调整习惯。' }
})

const weeklyFeedback = computed(() => {
  const feedback = dietStore.suggestionFeedback.filter(item => last7Days.includes(item.date))
  const total = feedback.length
  const doable = feedback.filter(item => item.response === 'doable').length
  const alternates = feedback.filter(item => item.response === 'alternate_requested').length
  if (!total) {
    return { total, doable, alternates, label: '等待反馈', action: '首页建议不需要每天回应；只有当它确实贴近或不贴近你的情况时，再点一下反馈即可。' }
  }
  if (doable >= alternates) {
    return { total, doable, alternates, label: '建议较贴近', action: '你认为可行的建议更多。继续优先选择能融入现有饮食的微小调整，不需要追求一次改变很多。' }
  }
  return { total, doable, alternates, label: '需要再贴近生活', action: '请求调整的次数更多。请在首页更新用餐情境，建议会优先按食堂、外卖或家里做饭的实际条件生成。' }
})

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
    return { protein: 0, fat: 0, carbs: 0, fiber: 0, potassium: 0, sodium: 0, phosphorus: 0, bioavailableP: 0, pral: 0 }
  }
  const n = validDays.value.length
  return {
    protein: Math.round(validDays.value.reduce((s, d) => s + d.totalProtein, 0) / n),
    fat: Math.round(validDays.value.reduce((s, d) => s + d.totalFat, 0) / n),
    carbs: Math.round(validDays.value.reduce((s, d) => s + d.totalCarbs, 0) / n),
    fiber: Math.round(validDays.value.reduce((s, d) => s + d.totalFiber, 0) / n),
    potassium: Math.round(validDays.value.reduce((s, d) => s + d.totalPotassium, 0) / n),
    sodium: Math.round(validDays.value.reduce((s, d) => s + d.totalSodium, 0) / n),
    phosphorus: Math.round(validDays.value.reduce((s, d) => s + d.totalPhosphorus, 0) / n),
    bioavailableP: Math.round(validDays.value.reduce((s, d) => s + d.totalBioavailablePhosphorus, 0) / n),
    pral: Math.round(validDays.value.reduce((s, d) => s + d.totalPRAL, 0) / n * 10) / 10,
  }
})

// ========== 柱状图样式 ==========

function barStyle(value: number, goal: number, _type: string) {
  const maxH = Math.max(goal * 1.3, value, 1)
  const pct = Math.max(0, Math.min((value / maxH) * 100, 100))
  const over = value > goal
  return {
    height: pct + '%',
    background: over
      ? '#d96666'
      : '#237a64',
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

const monthlyWeightSummary = computed(() => {
  const records = dietStore.weightRecords
    .filter(record => last30Days.includes(record.date))
    .sort((a, b) => a.date.localeCompare(b.date))
  if (!records.length) return { count: 0, latest: 0, change: 0 }
  const first = records[0]
  const latest = records[records.length - 1]
  return {
    count: records.length,
    latest: latest.weight,
    change: Math.round((latest.weight - first.weight) * 10) / 10,
  }
})

const recentWeightRecords = computed(() => [...dietStore.weightRecords].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5))

const monthlyAvg = computed(() => {
  const valid = monthlyStats.value.filter(d => d.totalCalories > 0)
  if (valid.length === 0) return { calories: 0, protein: 0, potassium: 0, phosphorus: 0, bioavailableP: 0, pral: 0 }
  const n = valid.length
  return {
    calories: Math.round(valid.reduce((s, d) => s + d.totalCalories, 0) / n),
    protein: Math.round(valid.reduce((s, d) => s + d.totalProtein, 0) / n),
    potassium: Math.round(valid.reduce((s, d) => s + d.totalPotassium, 0) / n),
    phosphorus: Math.round(valid.reduce((s, d) => s + d.totalPhosphorus, 0) / n),
    bioavailableP: Math.round(valid.reduce((s, d) => s + d.totalBioavailablePhosphorus, 0) / n),
    pral: Math.round(valid.reduce((s, d) => s + d.totalPRAL, 0) / n * 10) / 10,
  }
})

// 30天趋势（后15天 vs 前15天均值比较）
const monthlyTrend = computed(() => {
  const valid = monthlyStats.value.filter(d => d.totalCalories > 0)
  if (valid.length < 6) return { calories: 0, protein: 0, potassium: 0, phosphorus: 0 }

  const mid = Math.floor(valid.length / 2)
  // monthlyStats is chronological, so the latter half is the more recent period.
  const older = valid.slice(0, mid)
  const recent = valid.slice(mid)

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

function buildBackupPayload() {
  return {
    backupFormatVersion: 1,
    records: records,
    goals: dietStore.goals,
    userMode: dietStore.userMode,
    bodyWeight: dietStore.bodyWeight,
    weightRecords: dietStore.weightRecords,
    customFoods: dietStore.customFoods,
    lifestyleProfile: dietStore.lifestyleProfile,
    mealTemplates: dietStore.mealTemplates,
    suggestionFeedback: dietStore.suggestionFeedback,
    personalCarePlan: dietStore.personalCarePlan,
    foodDatabaseVersion: FOOD_DATABASE_RELEASE.version,
    exportDate: getTodayString(),
  }
}

function handleExport(): void {
  exportRecordsAsJSON(buildBackupPayload())
  showToast({ message: '数据已导出', icon: 'success', duration: 1000 })
}

function openEncryptedExport(): void {
  backupPassphrase.value = ''
  showEncryptionDialog.value = true
}

async function handleEncryptedExport(): Promise<void> {
  try {
    const encrypted = await encryptBackup(buildBackupPayload(), backupPassphrase.value)
    downloadEncryptedBackup(encrypted, getTodayString())
    backupPassphrase.value = ''
    showToast({ message: '已导出加密备份', icon: 'success', duration: 1200 })
  } catch (error) {
    showToast({ message: error instanceof Error ? error.message : '加密导出失败', icon: 'fail', duration: 1800 })
  }
}

function openWeightRecordDialog(): void {
  weightRecordDate.value = getTodayString()
  weightRecordInput.value = dietStore.bodyWeight ?? undefined
  showWeightRecordDialog.value = true
}

function saveWeightRecord(): void {
  const weight = weightRecordInput.value
  if (!weight || !Number.isFinite(weight) || weight < 30 || weight > 200 || !/^\d{4}-\d{2}-\d{2}$/.test(weightRecordDate.value) || weightRecordDate.value > getTodayString()) {
    showToast({ message: '请输入有效历史日期和 30-200kg 体重', icon: 'fail', duration: 1500 })
    return
  }
  dietStore.recordBodyWeight(weight, weightRecordDate.value)
  showToast({ message: '已保存体重记录', icon: 'success', duration: 1000 })
}

async function removeWeightRecord(id: string): Promise<void> {
  try {
    await showConfirmDialog({ title: '删除体重记录', message: '删除后不会影响饮食记录和当前营养目标。', confirmButtonText: '删除' })
    dietStore.deleteWeightRecord(id)
    showToast({ message: '已删除体重记录', icon: 'success', duration: 1000 })
  } catch {
    // Dialog cancellation is an expected user action.
  }
}

function triggerRestore(): void {
  backupInput.value?.click()
}

async function handleRestore(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    const backup = JSON.parse(await file.text()) as unknown
    if (isEncryptedBackup(backup)) {
      pendingEncryptedBackup.value = backup
      restorePassphrase.value = ''
      showDecryptionDialog.value = true
    } else {
      await restoreBackupPayload(backup)
    }
  } catch (error) {
    if (error === 'cancel' || error === 'close') return
    showToast({ message: error instanceof Error ? error.message : '无法读取该备份文件', icon: 'fail', duration: 1800 })
  } finally {
    input.value = ''
  }
}

async function handleEncryptedRestore(): Promise<void> {
  if (!pendingEncryptedBackup.value) return
  try {
    const backup = await decryptBackup(pendingEncryptedBackup.value, restorePassphrase.value)
    await restoreBackupPayload(backup)
    pendingEncryptedBackup.value = null
    restorePassphrase.value = ''
  } catch (error) {
    if (error === 'cancel' || error === 'close') return
    showToast({ message: error instanceof Error ? error.message : '无法恢复该备份文件', icon: 'fail', duration: 1800 })
  }
}

async function restoreBackupPayload(backup: unknown): Promise<void> {
  await showConfirmDialog({
    title: '恢复本地备份',
    message: '恢复会替换当前设备中的饮食记录、个人目标和自定义食物，且无法撤销。',
    confirmButtonText: '确认恢复',
  })
  const result = dietStore.restoreBackup(backup)
  showToast({ message: `已恢复 ${result.records} 条记录`, icon: 'success', duration: 1500 })
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

.summary-empty { color: #9aa59f; font-size: 13px; font-weight: 400; }
.weight-change { color: #87958e; font-size: 10px; font-weight: 500; white-space: nowrap; }
.weight-change.up { color: #c57a5a; }
.weight-change.down { color: #327a64; }

.trend-arrow {
  font-size: 12px;
  font-weight: 700;
}

.summary-value.over .trend-arrow {
  color: #ee0a24;
}

.stats-view { background: #f6f7f6; }
.content { padding: 14px; }
.page-heading { display: flex; flex-direction: column; gap: 3px; margin: 2px 2px 14px; }
.page-heading span { color: #263437; font-size: 19px; font-weight: 700; }
.page-heading small { color: #85918d; font-size: 12px; }

.period-tabs { gap: 7px; }
.period-tab { border: 1px solid #e1e8e4; border-radius: 7px; }
.period-tab.active { background: #237a64; border-color: #237a64; }
.card { border: 1px solid #e1e8e4; border-radius: 10px; box-shadow: none; }
.chart-toggles { overflow-x: auto; padding-bottom: 2px; }
.chart-toggle { border-radius: 6px; white-space: nowrap; }
.chart-toggle.active { background: #237a64; }
.n-item { border-radius: 7px; }
.summary-row { border: 1px solid #edf0ee; border-radius: 7px; }

.weekly-checkin {
  margin-bottom: 12px;
  padding: 13px 14px;
  background: #f1f8f4;
  border: 1px solid #cfe6d8;
  border-radius: 10px;
}

.weekly-checkin-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.weekly-checkin-heading > div { display: flex; flex-direction: column; gap: 3px; }
.weekly-checkin-heading span { color: #2e5d4d; font-size: 13px; font-weight: 700; }
.weekly-checkin-heading small { color: #678478; font-size: 11px; line-height: 1.4; }
.weekly-checkin-heading strong { color: #237a64; font-size: 14px; white-space: nowrap; }
.weekly-checkin-days { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 5px; margin-top: 12px; }
.weekly-checkin-day { display: flex; flex-direction: column; align-items: center; gap: 5px; color: #87968f; font-size: 10px; }
.weekly-checkin-day i { width: 18px; height: 18px; background: #dce7e1; border: 2px solid #fff; border-radius: 50%; box-shadow: 0 0 0 1px #cbd9d2; }
.weekly-checkin-day.recorded { color: #2e5d4d; font-weight: 700; }
.weekly-checkin-day.recorded i { background: #237a64; box-shadow: 0 0 0 1px #237a64; }
.weekly-checkin-day.today i { box-shadow: 0 0 0 2px #d8893a; }

.source-breakdown { margin-bottom: 12px; padding: 13px 14px; background: #fff; border: 1px solid #e1e8e4; border-radius: 10px; }
.source-breakdown-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 11px; }
.source-breakdown-heading span { color: #34443e; font-size: 13px; font-weight: 700; }
.source-breakdown-heading small { color: #8a9791; font-size: 10px; text-align: right; }
.source-breakdown-list { display: flex; flex-direction: column; gap: 8px; }
.source-breakdown-item { display: grid; grid-template-columns: 42px minmax(0, 1fr) 30px; align-items: center; gap: 8px; color: #65756d; font-size: 11px; }
.source-breakdown-item > div { height: 6px; overflow: hidden; background: #edf2ef; border-radius: 999px; }
.source-breakdown-item i { display: block; height: 100%; min-width: 4px; background: #3b9d7a; border-radius: inherit; }
.source-breakdown-item strong { color: #496258; font-size: 11px; text-align: right; }

.weekly-insight { margin-bottom: 12px; padding: 13px 14px; background: #fffdf7; border: 1px solid #eee2c7; border-radius: 10px; }
.weekly-insight-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
.weekly-insight-heading > div { display: flex; flex-direction: column; gap: 3px; }
.weekly-insight-heading span { color: #59472d; font-size: 13px; font-weight: 700; }
.weekly-insight-heading small { color: #8c7d68; font-size: 10px; line-height: 1.4; }
.weekly-insight-heading > strong { color: #956a2d; font-size: 12px; white-space: nowrap; }
.insight-metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; }
.insight-metrics > div { min-width: 0; padding: 8px 5px; text-align: center; background: #fff; border: 1px solid #f0e8d8; border-radius: 7px; }
.insight-metrics strong { display: block; overflow: hidden; color: #55462f; font-size: 15px; text-overflow: ellipsis; white-space: nowrap; }
.insight-metrics span { display: block; margin-top: 2px; overflow: hidden; color: #92836e; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.weekly-insight > p { margin: 11px 0 0; color: #706450; font-size: 12px; line-height: 1.55; }

.weekly-feedback { margin-bottom: 12px; padding: 13px 14px; background: #f4f8fb; border: 1px solid #d8e6ee; border-radius: 10px; }
.weekly-feedback-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
.weekly-feedback-heading > div { display: flex; flex-direction: column; gap: 3px; }
.weekly-feedback-heading span { color: #365465; font-size: 13px; font-weight: 700; }
.weekly-feedback-heading small { color: #758b98; font-size: 10px; line-height: 1.4; }
.weekly-feedback-heading > strong { color: #4a758a; font-size: 12px; white-space: nowrap; }
.feedback-metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; }
.feedback-metrics > div { padding: 8px 5px; text-align: center; background: #fff; border: 1px solid #e2ebf0; border-radius: 7px; }
.feedback-metrics strong { display: block; color: #3e6171; font-size: 15px; }
.feedback-metrics span { display: block; margin-top: 2px; color: #8297a2; font-size: 10px; }
.weekly-feedback > p { margin: 11px 0 0; color: #617783; font-size: 12px; line-height: 1.55; }

.body-records { margin-bottom: 12px; padding: 13px 14px; background: #fff; border: 1px solid #e1e8e4; border-radius: 10px; }
.body-records-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.body-records-heading > div { display: flex; flex-direction: column; gap: 3px; }
.body-records-heading span { color: #34443e; font-size: 13px; font-weight: 700; }
.body-records-heading small { color: #89958f; font-size: 10px; }
.body-records-heading :deep(.van-button) { height: 30px; color: #2e6e5c; border-color: #b9d9cb; border-radius: 6px; font-size: 11px; }
.body-record-list { display: flex; flex-direction: column; margin-top: 10px; }
.body-record-list > div { display: grid; grid-template-columns: 1fr auto 22px; align-items: center; gap: 8px; padding: 9px 0; border-top: 1px solid #edf0ee; }
.body-record-list span { color: #81908a; font-size: 11px; }
.body-record-list strong { color: #41584e; font-size: 13px; }
.body-record-list .van-icon { color: #c58b8b; }
.weight-record-hint { margin: 0; padding: 4px 16px 14px; color: #81908b; font-size: 11px; line-height: 1.5; }

.backup-tools { margin-top: 12px; padding: 13px 14px; background: #fff; border: 1px solid #e1e8e4; border-radius: 10px; }
.backup-tools > div:first-child { display: flex; flex-direction: column; gap: 3px; }
.backup-tools > div:first-child span { color: #34443e; font-size: 13px; font-weight: 700; }
.backup-tools > div:first-child small { color: #89958f; font-size: 10px; line-height: 1.45; }
.backup-actions { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 12px; }
.backup-actions :deep(.van-button) { height: 34px; color: #2e6e5c; border-color: #b9d9cb; border-radius: 7px; font-size: 12px; }
.backup-input { display: none; }
</style>
