<template>
  <div class="history-view">
    <NavBar />

    <div class="content">
      <!-- 快捷日期跳转 -->
      <div class="quick-dates">
        <span
          v-for="d in quickDateOptions"
          :key="d.value"
          class="date-chip"
          :class="{ active: selectedDate === d.value }"
          @click="onQuickDate(d.value)"
        >{{ d.label }}</span>
      </div>

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
        <h3>{{ selectedDate }} · {{ selectedDateRecords.length }} 条记录</h3>

        <!-- 当日营养汇总（带目标对比） -->
        <div class="day-summary">
          <h4>当日营养汇总</h4>
          <div class="summary-grid">
            <div
              v-for="item in summaryItems"
              :key="item.key"
              class="s-item"
              :class="item.statusClass"
            >
              <span class="s-value">
                {{ item.value }}<small> / {{ item.goalDisplay }} {{ item.unit }}</small>
              </span>
              <span v-if="item.extra" class="s-extra">{{ item.extra }}</span>
              <span class="s-label">{{ item.label }}</span>
              <span v-if="item.statusText" class="s-status" :class="'tag-' + item.status">{{ item.statusText }}</span>
            </div>
          </div>
        </div>

        <!-- 按餐次分组 -->
        <div class="meal-groups">
          <div v-for="group in dateMealGroups" :key="group.type" class="meal-group">
            <div class="meal-group-header">
              <span class="meal-dot" :class="'dot-' + group.type"></span>
              <span class="meal-name">{{ MEAL_TYPES[group.type] }}</span>
              <span class="meal-divider"></span>
              <span class="meal-subtotal">{{ group.subtotal }} kcal</span>
              <span class="meal-count">{{ group.records.length }}项</span>
            </div>
            <van-swipe-cell v-for="record in group.records" :key="record.id">
              <div class="record-card">
                <div class="record-main">
                  <div class="record-left">
                    <span class="record-name">{{ record.foodName }}</span>
                    <span class="record-weight">{{ formatRecordWeight(record) }}</span>
                  </div>
                  <div class="record-right">
                    <span class="record-cal">{{ record.calories }} kcal</span>
                    <span class="record-detail">蛋白{{ record.protein }}g · 钾{{ record.potassium }}mg · 磷{{ record.phosphorus }}mg</span>
                  </div>
                </div>
              </div>
              <template #right>
                <van-button square type="danger" text="删除" class="swipe-btn" @click="handleDelete(record.id)" />
              </template>
            </van-swipe-cell>
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
import { useDietStore } from '@/stores/diet'
import { formatDate, formatWeight, getNutrientSafeRanges, getPRALStatus } from '@/utils'
import { MEAL_TYPES, NUTRITION_LABELS, UNIT_LABELS } from '@/constants'
import NavBar from '@/components/NavBar.vue'
import TabBar from '@/components/TabBar.vue'
import dayjs from 'dayjs'

const dietStore = useDietStore()
const { records, allFoods, getDailyNutrition, deleteRecord } = dietStore

// ========== 日期选择 ==========

const showCalendar = ref(false)
const selectedDate = ref(formatDate(new Date()))
const todayStr = formatDate(new Date())

const quickDateOptions = computed(() => [
  { label: '今天', value: todayStr },
  { label: '昨天', value: dayjs(todayStr).subtract(1, 'day').format('YYYY-MM-DD') },
  { label: '前天', value: dayjs(todayStr).subtract(2, 'day').format('YYYY-MM-DD') },
])

function onQuickDate(date: string): void {
  selectedDate.value = date
}

function onDateConfirm(date: Date): void {
  selectedDate.value = formatDate(date)
  showCalendar.value = false
}

// ========== 当日数据 ==========

const selectedDateRecords = computed(() =>
  records.filter((record) => record.date === selectedDate.value)
)

const selectedDateNutrition = computed(() =>
  getDailyNutrition(selectedDate.value)
)

// ========== 汇总卡片（带目标区间） ==========

const nutrientRanges = computed(() => {
  const w = dietStore.bodyWeight || 60
  return getNutrientSafeRanges(w, dietStore.userMode)
})

const summaryItems = computed(() => {
  const ranges = nutrientRanges.value
  const isKidney = dietStore.userMode === 'kidney'
  const keys = ['calories', 'protein', 'fat', 'carbs', 'fiber', 'potassium', 'phosphorus'] as const
  const valueMap: Record<string, number> = {
    calories: selectedDateNutrition.value.totalCalories,
    protein: selectedDateNutrition.value.totalProtein,
    fat: selectedDateNutrition.value.totalFat,
    carbs: selectedDateNutrition.value.totalCarbs,
    fiber: selectedDateNutrition.value.totalFiber,
    potassium: selectedDateNutrition.value.totalPotassium,
    phosphorus: isKidney
      ? selectedDateNutrition.value.totalBioavailablePhosphorus
      : selectedDateNutrition.value.totalPhosphorus,
  }
  const items: Array<{
    key: string
    value: number
    goalDisplay: string
    unit: string
    label: string
    statusClass: string
    status: string
    statusText: string
    extra: string | undefined
  }> = keys.map(k => {
    const val = valueMap[k]
    const r = ranges[k]
    let statusClass = ''
    let status = ''
    let statusText = ''

    if (r.isUpperLimit) {
      if (val > r.max) { statusClass = 's-danger'; status = 'danger'; statusText = '超标' }
    } else {
      if (val < r.min) { statusClass = 's-low'; status = 'low'; statusText = '偏低' }
      else if (val > r.max) { statusClass = 's-danger'; status = 'danger'; statusText = '超标' }
    }

    const extra = k === 'phosphorus' && isKidney
      && selectedDateNutrition.value.totalPhosphorus !== selectedDateNutrition.value.totalBioavailablePhosphorus
      ? `总磷${Math.round(selectedDateNutrition.value.totalPhosphorus)}mg`
      : undefined

    return {
      key: k,
      value: k === 'calories' || k === 'potassium' || k === 'phosphorus' ? Math.round(val) : Number(val.toFixed(1)),
      goalDisplay: r.isUpperLimit ? `≤${r.max}` : `${r.min}-${r.max}`,
      unit: UNIT_LABELS[k],
      label: NUTRITION_LABELS[k],
      statusClass,
      status,
      statusText,
      extra,
    }
  });

  // PRAL 行（仅肾脏模式，目标 ≤0）
  if (isKidney) {
    const pral = selectedDateNutrition.value.totalPRAL
    const target = 0
    let pralClass = ''; let pralTag = ''; let pralText = ''
    if (pral > target) {
      const pralStatus = getPRALStatus(pral)
      if (pralStatus.level === '过高') { pralClass = 's-danger'; pralTag = 'danger'; pralText = '过高' }
      else { pralClass = 's-low'; pralTag = 'low'; pralText = '偏高' }
    }
    items.push({
      key: 'pral',
      value: pral,
      goalDisplay: '≤0',
      unit: 'mEq',
      label: '酸负荷',
      statusClass: pralClass,
      status: pralTag,
      statusText: pral > target ? pralText : (pral < 0 ? '优' : '正常'),
      extra: undefined,
    })
  }

  return items
})

// ========== 按餐次分组 ==========

const mealOrder: Array<keyof typeof MEAL_TYPES> = ['breakfast', 'lunch', 'dinner', 'snack']

const dateMealGroups = computed(() => {
  return mealOrder
    .filter(type => selectedDateRecords.value.some(r => r.mealType === type))
    .map(type => {
      const groupRecords = selectedDateRecords.value.filter(r => r.mealType === type)
      const subtotal = groupRecords.reduce((s, r) => s + r.calories, 0)
      return { type, records: groupRecords, subtotal }
    })
})

function formatRecordWeight(record: typeof records[number]): string {
  const food = allFoods.find(f => f.id === record.foodType || f.name === record.foodName)
  return formatWeight(record.weight, food?.unit || '100g', food?.unitWeight, food?.displayUnit)
}

function handleDelete(id: string): void {
  deleteRecord(id)
}
</script>

<style scoped>
.history-view {
  padding-bottom: 70px;
  background: #f5f7fa;
}

.content {
  padding: 12px 16px;
}

/* 快捷日期 */
.quick-dates {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.date-chip {
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 500;
  color: #666;
  background: #fff;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.date-chip.active {
  background: #4facfe;
  color: #fff;
}

/* 记录区域 */
.records-section {
  margin-top: 12px;
}

.records-section h3 {
  margin-bottom: 12px;
  font-size: 15px;
  color: #333;
  font-weight: 600;
}

/* 汇总卡片 */
.day-summary {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 14px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.03);
}

.day-summary h4 {
  margin: 0 0 12px;
  font-size: 14px;
  color: #333;
  font-weight: 600;
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
  position: relative;
  transition: background 0.2s;
}

.s-item.s-danger { background: #fff5f5; }
.s-item.s-low    { background: #fffaf5; }

.s-value {
  display: block;
  font-size: 14px;
  font-weight: 700;
  color: #333;
}

.s-value small {
  display: block;
  font-size: 10px;
  font-weight: 400;
  color: #999;
  margin-top: 1px;
}

.s-label {
  display: block;
  font-size: 11px;
  color: #999;
  margin-top: 4px;
}

.s-extra {
  display: block;
  font-size: 9px;
  color: #bbb;
  margin-top: 1px;
}

.s-status {
  display: inline-block;
  font-size: 9px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 8px;
  margin-top: 4px;
}

.tag-danger { background: #ffebee; color: #ee0a24; }
.tag-low    { background: #fff3e0; color: #ff976a; }

/* 餐次分组 */
.meal-group {
  margin-bottom: 4px;
}

.meal-group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 4px 8px;
  font-size: 13px;
  font-weight: 600;
}

.meal-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dot-breakfast { background: #4facfe; }
.dot-lunch     { background: #07c160; }
.dot-dinner    { background: #ff976a; }
.dot-snack     { background: #bbb; }

.meal-name {
  color: #333;
  flex-shrink: 0;
}

.meal-divider {
  flex: 1;
  height: 1px;
  background: #e8ecf1;
  min-width: 12px;
}

.meal-subtotal {
  color: #666;
  font-weight: 500;
  flex-shrink: 0;
}

.meal-count {
  font-size: 11px;
  color: #bbb;
  font-weight: 400;
  flex-shrink: 0;
}

/* 记录卡片 */
.record-card {
  background: #fff;
  border-radius: 10px;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.03);
  margin-bottom: 6px;
}

.record-main {
  flex: 1;
  min-width: 0;
}

.record-left {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 3px;
}

.record-name {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.record-weight {
  font-size: 12px;
  color: #999;
}

.record-right {
  display: flex;
  flex-direction: column;
}

.record-cal {
  font-size: 12px;
  color: #666;
}

.record-detail {
  font-size: 10px;
  color: #aaa;
}

.swipe-btn {
  height: 100%;
}
</style>
