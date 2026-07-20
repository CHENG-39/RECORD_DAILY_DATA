<template>
  <div class="history-view">
    <NavBar />

    <div class="content">
      <div class="page-heading">
        <span>饮食回顾</span>
        <small>按日期回看每一餐的营养记录</small>
      </div>
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

      <div v-if="selectedDateRecords.length && selectedDate !== todayStr" class="history-actions">
        <div>
          <span>复用这一天</span>
          <small>适合固定食堂餐、家常餐或常点外卖</small>
        </div>
        <van-button plain type="primary" icon="replay" @click="copySelectedDate">复制到今天</van-button>
      </div>

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
              <template #left>
                <van-button square type="primary" text="编辑记录" class="swipe-btn" @click="openRecordEdit(record)" />
              </template>
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

    <van-dialog v-model:show="showWeightEdit" title="编辑记录" show-cancel-button @confirm="saveWeightEdit">
      <van-field :model-value="resolvedEditingFood?.name || editingRecord?.foodName" label="食物" readonly is-link @click="showEditFoodPicker = true" />
      <van-field v-model.number="editingWeight" type="number" label="份量" placeholder="输入克数" :required="true">
        <template #extra>g</template>
      </van-field>
      <van-field v-model="editingDate" type="date" label="日期" />
      <div class="record-edit-options">
        <span>餐次</span>
        <van-radio-group v-model="editingMealType" direction="horizontal">
          <van-radio v-for="(label, type) in MEAL_TYPES" :key="type" :name="type">{{ label }}</van-radio>
        </van-radio-group>
        <span>用餐场景</span>
        <van-radio-group v-model="editingMealSource" direction="horizontal">
          <van-radio v-for="option in mealSourceOptions" :key="option.value" :name="option.value">{{ option.label }}</van-radio>
        </van-radio-group>
      </div>
      <p class="weight-edit-hint">{{ weightEditHint }}</p>
    </van-dialog>

    <van-popup v-model:show="showEditFoodPicker" position="bottom" :style="{ height: '78%' }" round>
      <div class="history-food-picker">
        <div class="history-food-picker-header">
          <span>更换食物</span>
          <van-icon name="cross" size="18" @click="showEditFoodPicker = false" />
        </div>
        <van-search v-model="editingFoodSearch" placeholder="搜索食物" shape="round" autofocus />
        <button v-for="food in filteredEditingFoods" :key="food.id" type="button" class="history-food-option" @click="selectEditingFood(food)">
          <span>{{ food.name }}</span>
          <small>每100g {{ food.calories }}kcal · 蛋白{{ food.protein }}g</small>
        </button>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDietStore } from '@/stores/diet'
import type { FoodDefinition, FoodRecord, MealSource } from '@/types'
import { formatDate, formatWeight, getPersonalizedNutrientRanges, getPRALStatus } from '@/utils'
import { MEAL_TYPES, NUTRITION_LABELS, UNIT_LABELS } from '@/constants'
import { calculateNutritionFromDefinition } from '@/constants/nutrition'
import { getPhosphorusBioavailability } from '@/data/foods'
import NavBar from '@/components/NavBar.vue'
import TabBar from '@/components/TabBar.vue'
import dayjs from 'dayjs'
import { showConfirmDialog, showToast } from 'vant'

const dietStore = useDietStore()
const { records, allFoods, getDailyNutrition, deleteRecord, updateRecord } = dietStore

// ========== 日期选择 ==========

const showCalendar = ref(false)
const showWeightEdit = ref(false)
const showEditFoodPicker = ref(false)
const selectedDate = ref(formatDate(new Date()))
const todayStr = formatDate(new Date())
const editingRecord = ref<FoodRecord | null>(null)
const editingWeight = ref<number | undefined>()
const editingDate = ref('')
const editingMealType = ref<FoodRecord['mealType']>('breakfast')
const editingMealSource = ref<MealSource>('mixed')
const editingFoodSearch = ref('')
const selectedEditingFood = ref<FoodDefinition | null>(null)

	const quickDateOptions = computed(() =>
	  Array.from({ length: 30 }, (_, i) => {
	    const date = dayjs(todayStr).subtract(i, 'day').format('YYYY-MM-DD')
	    const label = i === 0 ? '今天' : i === 1 ? '昨天' : dayjs(date).format('M/D')
	    return { label, value: date }
	  })
	)

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
  return getPersonalizedNutrientRanges(w, dietStore.userMode, dietStore.personalCarePlan)
})

const summaryItems = computed(() => {
  const ranges = nutrientRanges.value
  const isKidney = dietStore.userMode === 'kidney'
  const keys = ['calories', 'protein', 'fat', 'carbs', 'fiber', 'potassium', 'phosphorus', 'sodium'] as const
  const valueMap: Record<string, number> = {
    calories: selectedDateNutrition.value.totalCalories,
    protein: selectedDateNutrition.value.totalProtein,
    fat: selectedDateNutrition.value.totalFat,
    carbs: selectedDateNutrition.value.totalCarbs,
    fiber: selectedDateNutrition.value.totalFiber,
    potassium: selectedDateNutrition.value.totalPotassium,
    sodium: selectedDateNutrition.value.totalSodium,
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

const resolvedEditingFood = computed(() => {
  const record = editingRecord.value
  if (!record) return undefined
  return selectedEditingFood.value || allFoods.find(food => food.id === record.foodType || food.name === record.foodName)
})

const filteredEditingFoods = computed(() => {
  const keyword = editingFoodSearch.value.trim().toLowerCase()
  const foods = keyword ? allFoods.filter(food => food.name.toLowerCase().includes(keyword)) : allFoods
  return foods.slice(0, 80)
})

const mealSourceOptions: Array<{ value: MealSource; label: string }> = [
  { value: 'home', label: '家里' }, { value: 'canteen', label: '食堂' }, { value: 'takeout', label: '外卖' },
  { value: 'convenience', label: '便利店' }, { value: 'mixed', label: '混合' },
]

const weightEditHint = computed(() => {
  if (resolvedEditingFood.value) return '保存后将按当前食物库的每 100g 数据重新计算营养值。'
  return '原食物定义已不可用，保存后将按这条历史记录的原始营养比例缩放。'
})

function openRecordEdit(record: FoodRecord): void {
  editingRecord.value = record
  editingWeight.value = record.weight
  editingDate.value = record.date
  editingMealType.value = record.mealType
  editingMealSource.value = record.source ?? dietStore.lifestyleProfile.mealSource
  selectedEditingFood.value = null
  editingFoodSearch.value = ''
  showWeightEdit.value = true
}

function selectEditingFood(food: FoodDefinition): void {
  selectedEditingFood.value = food
  showEditFoodPicker.value = false
}

function saveWeightEdit(): void {
  const record = editingRecord.value
  const weight = editingWeight.value
  if (!record || !weight || !Number.isFinite(weight) || weight <= 0 || weight > 5000) {
    showToast('请输入 1-5000g 之间的有效份量')
    return
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(editingDate.value)) {
    showToast('请选择有效日期')
    return
  }
  const updates = { weight, date: editingDate.value, mealType: editingMealType.value, source: editingMealSource.value }
  const food = resolvedEditingFood.value
  if (food) {
    const nutrition = calculateNutritionFromDefinition(food, weight)
    updateRecord(record.id, {
      ...updates,
      foodType: food.id,
      foodName: food.name,
      ...nutrition,
      bioavailablePhosphorus: Math.round(nutrition.phosphorus * getPhosphorusBioavailability(food.category)),
    })
  } else if (record.weight > 0) {
    const ratio = weight / record.weight
    const scale = (value: number) => Number((value * ratio).toFixed(1))
    updateRecord(record.id, {
      ...updates,
      calories: Math.round(record.calories * ratio),
      protein: scale(record.protein), fat: scale(record.fat), carbs: scale(record.carbs), fiber: scale(record.fiber),
      potassium: scale(record.potassium), phosphorus: scale(record.phosphorus), sodium: scale(record.sodium),
      bioavailablePhosphorus: Math.round(record.bioavailablePhosphorus * ratio),
    })
  }
  showToast({ message: '已更新份量与营养估算', icon: 'success', duration: 1200 })
}

async function copySelectedDate(): Promise<void> {
  const count = selectedDateRecords.value.length
  if (!count || selectedDate.value === todayStr) return
  try {
    await showConfirmDialog({
      title: '复制到今天',
      message: `将 ${selectedDate.value} 的 ${count} 条饮食记录复制到今天。`,
      confirmButtonText: '复制到今天',
    })
    const copied = dietStore.copyRecordsToDate(selectedDate.value, todayStr)
    showToast({ message: `已复制 ${copied} 条记录`, icon: 'success', duration: 1200 })
  } catch {
    // Dialog cancellation is an expected user action.
  }
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
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 4px;
}

.quick-dates::-webkit-scrollbar { display: none; }

.date-chip {
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 500;
  color: #666;
  background: #fff;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
  white-space: nowrap;
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

.history-view { background: #f6f7f6; }
.content { padding: 14px; }
.page-heading { display: flex; flex-direction: column; gap: 3px; margin: 2px 2px 14px; }
.page-heading span { color: #263437; font-size: 19px; font-weight: 700; }
.page-heading small { color: #85918d; font-size: 12px; }

.quick-dates { gap: 7px; margin-bottom: 12px; }
.date-chip { padding: 6px 13px; border: 1px solid #e1e8e4; border-radius: 7px; }
.date-chip.active { background: #237a64; border-color: #237a64; }

:deep(.van-cell) { margin-bottom: 12px; border: 1px solid #e1e8e4; border-radius: 8px; }
.history-actions { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 11px 12px; margin-bottom: 12px; background: #eff8f2; border: 1px solid #cce5d5; border-radius: 9px; }
.history-actions > div { display: flex; min-width: 0; flex-direction: column; gap: 2px; }
.history-actions span { color: #2e5d4d; font-size: 13px; font-weight: 700; }
.history-actions small { overflow: hidden; color: #688277; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.history-actions :deep(.van-button) { flex: 0 0 auto; height: 32px; border-color: #a9d5c1; border-radius: 7px; font-size: 11px; }
.weight-edit-hint { margin: 0; padding: 4px 16px 14px; color: #81908b; font-size: 11px; line-height: 1.5; }
.record-edit-options { display: flex; flex-direction: column; gap: 8px; padding: 10px 16px; border-top: 1px solid #f0f2f1; }
.record-edit-options > span { color: #555; font-size: 13px; font-weight: 600; }
.record-edit-options :deep(.van-radio-group) { display: flex; flex-wrap: wrap; gap: 8px 12px; }
.record-edit-options :deep(.van-radio) { margin: 0; font-size: 12px; }
.history-food-picker { height: 100%; overflow-y: auto; padding: 10px 16px 24px; background: #f7f9f8; }
.history-food-picker-header { display: flex; align-items: center; justify-content: space-between; padding: 4px 2px 8px; color: #2b3d38; font-size: 16px; font-weight: 700; }
.history-food-option { display: flex; width: 100%; flex-direction: column; gap: 3px; padding: 12px 2px; text-align: left; font: inherit; background: #fff; border: 0; border-bottom: 1px solid #edf0ee; }
.history-food-option span { color: #31443d; font-size: 14px; font-weight: 600; }
.history-food-option small { color: #84918d; font-size: 11px; }
.day-summary { border: 1px solid #e1e8e4; border-radius: 10px; box-shadow: none; }
.summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; }
.s-item { min-height: 74px; border-radius: 7px; }
.record-card { border: 1px solid #e7ece9; border-radius: 8px; box-shadow: none; }
.dot-breakfast { background: #e9a84c; }
.dot-lunch { background: #3b9d7a; }
.dot-dinner { background: #5e78c9; }
.dot-snack { background: #d37c9a; }
</style>
