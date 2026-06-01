<template>
  <div class="home-view" :class="{ 'mode-kidney': dietStore.userMode === 'kidney' }">
    <NavBar @open-weight="showWeightDialog = true" />

    <!-- 养生模式提示 -->
    <div v-if="dietStore.userMode === 'kidney'" class="kidney-banner">
      <span>低蛋白 · 控钾 · 限磷 — KDIGO 2024</span>
    </div>

    <div class="content">
      <!-- ===== 营养仪表盘 ===== -->
      <div v-if="isNewUser" class="welcome-card">
        <div class="welcome-title">开始记录饮食</div>
        <div class="welcome-steps">
          <div class="welcome-step" @click="showWeightDialog = true">
            <span class="step-num active">1</span>
            <div class="step-text">
              <span class="step-title">设置体重</span>
              <span class="step-desc">自动计算每日营养推荐</span>
            </div>
            <van-icon name="arrow" size="14" color="#ccc" />
          </div>
          <div class="welcome-step" @click="openAddDialog">
            <span class="step-num">2</span>
            <div class="step-text">
              <span class="step-title">添加饮食</span>
              <span class="step-desc">记录你今天吃了什么</span>
            </div>
            <van-icon name="arrow" size="14" color="#ccc" />
          </div>
          <div class="welcome-step">
            <span class="step-num">3</span>
            <div class="step-text">
              <span class="step-title">查看分析</span>
              <span class="step-desc">追踪营养趋势和统计</span>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="dashboard">
        <!-- 热量环形图 -->
        <div class="ring-wrap">
          <svg viewBox="0 0 120 120" class="ring-svg">
            <circle
              cx="60" cy="60" r="52"
              fill="none"
              stroke="#e8ecf1"
              stroke-width="10"
            />
            <circle
              cx="60" cy="60" r="52"
              fill="none"
              :stroke="calorieColor"
              stroke-width="10"
              stroke-linecap="round"
              :stroke-dasharray="ringCircumference"
              :stroke-dashoffset="ringOffset"
              transform="rotate(-90 60 60)"
              class="ring-progress"
            />
          </svg>
          <div class="ring-center">
            <span class="ring-value">{{ Math.round(todayNutrition.totalCalories) }}</span>
            <span class="ring-goal">/ {{ calorieRange }} kcal</span>
          </div>
        </div>

        <!-- 3 项关键指标 -->
        <div class="key-metrics">
          <div
            v-for="m in keyMetrics"
            :key="m.key"
            class="metric-row"
            :class="m.status"
          >
            <!-- 肾脏模式磷：双行布局 -->
            <template v-if="m.kidneyDetail">
              <div class="metric-top">
                <span class="metric-label">{{ m.label }}</span>
                <div class="metric-val-col">
                  <span class="metric-val">
                    过滤 {{ m.current }}<small> / {{ m.goalDisplay }} {{ m.unit }}</small>
                  </span>
                  <span class="metric-sub">
                    摄入 {{ m.kidneyDetail.totalP }}mg · 吸收 ~{{ m.kidneyDetail.absorptionPct }}%
                  </span>
                </div>
                <span class="metric-tag" :class="'tag-' + m.status">{{ m.statusText }}</span>
              </div>
            </template>
            <!-- 普通指标：单行 -->
            <template v-else>
              <div class="metric-top">
                <span class="metric-label">{{ m.label }}</span>
                <span class="metric-val">
                  {{ m.current }}<small> / {{ m.goalDisplay }} {{ m.unit }}</small>
                </span>
                <span class="metric-tag" :class="'tag-' + m.status">{{ m.statusText }}</span>
              </div>
            </template>
            <div class="metric-bar">
              <div
                class="metric-fill"
                :style="{ width: m.pct + '%', background: m.color }"
              ></div>
            </div>
          </div>
        </div>

        <!-- 展开更多指标 -->
        <div v-if="showMoreMetrics" class="more-metrics">
          <div
            v-for="m in moreMetrics"
            :key="m.key"
            class="more-item"
            :class="m.statusClass"
          >
            <span class="more-val">{{ m.value }}<small>{{ m.unit }}</small></span>
            <span class="more-label">{{ m.label }}</span>
          </div>
        </div>
        <div class="expand-row" @click="showMoreMetrics = !showMoreMetrics">
          <span>{{ showMoreMetrics ? '收起' : '查看更多指标' }}</span>
          <van-icon :name="showMoreMetrics ? 'arrow-up' : 'arrow-down'" size="12" />
        </div>
      </div>

      <!-- ===== 操作按钮 ===== -->
      <div class="actions">
        <van-button type="primary" block round @click="openAddDialog">
          <van-icon name="add-o" /> 添加饮食记录
        </van-button>
      </div>

      <!-- ===== 今日记录（按餐次分组） ===== -->
      <div class="records-section">
        <div class="section-title">
          <span>今日记录</span>
          <span class="count-badge">{{ todayRecords.length }}</span>
        </div>
        <van-empty v-if="todayRecords.length === 0" description="今天还没记录，点击上方添加" />
        <div v-else class="meal-groups">
          <div v-for="group in mealGroups" :key="group.type" class="meal-group">
            <div class="meal-group-header">
              <span class="meal-dot" :class="'dot-' + group.type"></span>
              <span class="meal-name">{{ MEAL_TYPES[group.type] }}</span>
              <span class="meal-divider"></span>
              <span class="meal-subtotal">{{ group.subtotal }} kcal</span>
              <span class="meal-count">{{ group.records.length }}项</span>
            </div>
            <van-swipe-cell v-for="record in group.records" :key="record.id">
              <template #left>
                <van-button square type="primary" text="编辑" class="swipe-btn" @click="openEditDialog(record)" />
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
                <van-icon name="cross" size="16" class="record-delete" @click="handleDelete(record.id)" />
              </div>
              <template #right>
                <van-button square type="danger" text="删除" class="swipe-btn" @click="handleDelete(record.id)" />
              </template>
            </van-swipe-cell>
          </div>
        </div>
      </div>
    </div>

    <TabBar />

    <!-- ========== 添加/编辑记录弹窗 ========= -->
    <van-dialog
      v-model:show="showAddDialog"
      :title="isEditing ? '编辑饮食记录' : '添加饮食记录'"
      show-cancel-button
      :before-close="handleBeforeClose"
    >
      <van-field
        :model-value="selectedFoodLabel"
        label="食物"
        placeholder="搜索选择食物"
        readonly
        is-link
        :required="true"
        @click="showFoodPicker = true"
      />
      <van-field v-model.number="inputWeight" type="number" :label="weightFieldLabel" :placeholder="weightFieldPlaceholder" :required="true">
        <template #extra>
          <span v-if="selectedFoodWeightHint" class="unit-hint">{{ selectedFoodWeightHint }}</span>
        </template>
      </van-field>
      <div class="quick-weights">
        <span
          v-for="w in quickWeights"
          :key="w"
          class="qw-btn"
          :class="{ active: inputWeight === w }"
          @click="inputWeight = w"
        >{{ w }}{{ weightQuickUnit }}</span>
      </div>
      <van-field
        :model-value="MEAL_TYPES[inputMealType] + (isAutoMeal ? ' · 自动' : '')"
        label="餐次"
        readonly
        is-link
        @click="showMealPicker = true"
      />
      <div class="nutrition-preview" v-if="previewNutrition">
        <div class="preview-title">营养预估</div>
        <div class="preview-grid">
          <span>热量 {{ previewNutrition.calories }} kcal</span>
          <span>蛋白质 {{ previewNutrition.protein }}g</span>
          <span>钾 {{ previewNutrition.potassium }}mg</span>
          <span class="highlight">磷 {{ previewNutrition.phosphorus }}mg</span>
        </div>
      </div>
    </van-dialog>

    <!-- ========== 食物选择器 ========= -->
    <van-popup v-model:show="showFoodPicker" position="bottom" :style="{ height: '80%' }" round>
      <div class="food-picker">
        <div class="food-picker-header">
          <span class="picker-title">选择食物</span>
          <van-icon name="cross" size="18" @click="showFoodPicker = false" />
        </div>
        <van-search v-model="foodSearchText" placeholder="搜索食物名称" shape="round" autofocus />
        <div class="category-chips">
          <span
            v-for="cat in categoryChips"
            :key="cat"
            class="chip"
            :class="{ active: activeCategory === cat }"
            @click="activeCategory = activeCategory === cat ? '' : cat"
          >{{ cat }}</span>
        </div>
        <div class="food-list" v-if="filteredFoods.length > 0">
          <template v-for="group in filteredFoods" :key="group.category">
            <div class="category-header">{{ group.category }}</div>
            <div
              v-for="food in group.items"
              :key="food.id"
              class="food-item"
              :class="{ 'food-selected': inputFood?.id === food.id }"
              @click="onFoodSelect(food)"
            >
              <div class="food-info">
                <div class="food-name-row">
                  <span class="food-name">{{ food.name }}</span>
                  <span class="risk-dot" :style="{ background: getPotassiumRisk(food.potassium).color }"></span>
                  <span class="risk-dot" :style="{ background: getPhosphorusRisk(food.phosphorus).color }"></span>
                  <span v-if="food.protein > 0" class="ppro-tag" :style="{ background: getPtoProteinLevel(getPtoProteinRatio(food)).color }">
                    P/Pro {{ getPtoProteinRatio(food) }}
                  </span>
                </div>
                <span class="food-macros">
                  每100g {{ food.calories }}kcal · 蛋白{{ food.protein }}g · 钾{{ food.potassium }}mg · 磷{{ food.phosphorus }}mg
                </span>
              </div>
              <van-icon v-if="inputFood?.id === food.id" name="success" color="#07c160" size="16" />
            </div>
          </template>
        </div>
        <div class="food-list empty" v-else>
          <span class="no-result">未找到匹配的食物</span>
        </div>
      </div>
    </van-popup>

    <!-- 餐次选择 -->
    <van-action-sheet v-model:show="showMealPicker" :actions="mealTypeActions" cancel-text="取消" @select="onMealTypeSelect" />

    <!-- 体重设置 -->
    <van-dialog v-model:show="showWeightDialog" title="设置体重" show-cancel-button @confirm="saveWeight">
      <van-field
        v-model.number="weightInput"
        type="number"
        label="体重"
        placeholder="输入体重（30-200kg）"
      >
        <template #extra>kg</template>
      </van-field>
      <div class="weight-dialog-hint">
        系统将根据 {{ dietStore.userMode === 'kidney' ? 'KDIGO 2024' : 'WHO/FAO' }} 标准自动计算每日营养推荐值
      </div>
    </van-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { FoodRecord, FoodDefinition } from '@/types'
import { useDietStore } from '@/stores/diet'
import { MEAL_TYPES, NUTRITION_LABELS, UNIT_LABELS } from '@/constants'
import { getTodayString, evaluateIntake, formatWeight, getNutrientSafeRanges, getCurrentMealType } from '@/utils'
import { calculateNutritionFromDefinition } from '@/constants/nutrition'
import { getPotassiumRisk, getPhosphorusRisk, getPtoProteinRatio, getPtoProteinLevel, getPhosphorusBioavailability, FOOD_CATEGORIES } from '@/data/foods'
import NavBar from '@/components/NavBar.vue'
import TabBar from '@/components/TabBar.vue'
import { showToast } from 'vant'

const dietStore = useDietStore()
const { todayRecords, todayNutrition, allFoods, addRecord, updateRecord, deleteRecord } = dietStore

const isNewUser = computed(() => !dietStore.bodyWeight && todayRecords.length === 0)

// ========== 体重输入（在目标弹窗中使用） ==========

const weightInput = ref<number | undefined>(dietStore.bodyWeight ?? undefined)

let weightTimer: ReturnType<typeof setTimeout> | null = null
watch(weightInput, (val) => {
  if (weightTimer) clearTimeout(weightTimer)
  weightTimer = setTimeout(() => {
    if (val && val >= 30 && val <= 200) {
      dietStore.setBodyWeight(val)
    }
  }, 500)
})

watch(() => dietStore.bodyWeight, (val) => {
  if (val !== weightInput.value) {
    weightInput.value = val ?? undefined
  }
})

// ========== 营养区间 & 评估 ==========

const nutrientRanges = computed(() => {
  const w = dietStore.bodyWeight || 60
  return getNutrientSafeRanges(w, dietStore.userMode)
})

// 保留 evaluation 用于次要指标状态色
const nutritionEvaluation = computed(() => evaluateIntake(todayNutrition, dietStore.userMode))

// ========== 热量环形图 ==========

const ringCircumference = 2 * Math.PI * 52

const calorieRange = computed(() => {
  const r = nutrientRanges.value.calories
  return r.isUpperLimit ? `≤${r.max}` : `${r.min}-${r.max}`
})

const calorieRate = computed(() => {
  const max = nutrientRanges.value.calories.max
  if (max <= 0) return 0
  return Math.min((todayNutrition.totalCalories / max) * 100, 100)
})

const calorieColor = computed(() => {
  const rate = calorieRate.value
  if (rate > 110) return '#ee0a24'
  if (rate > 100) return '#ff976a'
  return dietStore.userMode === 'kidney' ? '#e6a23c' : '#4facfe'
})

const ringOffset = computed(() => {
  const pct = Math.min(calorieRate.value + 1, 100)
  return ringCircumference * (1 - pct / 100)
})

// ========== 3 项关键指标（蛋白质/钾/磷） ==========

const keyMetrics = computed(() => {
  const ranges = nutrientRanges.value
  const isKidney = dietStore.userMode === 'kidney'

  // 肾脏模式：磷用生物可利用磷评估
  const pBio = Math.round(todayNutrition.totalBioavailablePhosphorus)
  const pTotal = Math.round(todayNutrition.totalPhosphorus)
  const pAbsorptionPct = pTotal > 0 ? Math.round((pBio / pTotal) * 100) : 0

  const items: Array<{
    key: string
    current: number
    range: { min: number; max: number; isUpperLimit: boolean; unit: string }
    kidneyDetail?: { totalP: number; absorptionPct: number }
  }> = [
    { key: 'protein',    current: Math.round(todayNutrition.totalProtein * 10) / 10, range: ranges.protein },
    { key: 'potassium',  current: Math.round(todayNutrition.totalPotassium),          range: ranges.potassium },
    {
      key: 'phosphorus', current: pBio, range: ranges.phosphorus,
      kidneyDetail: isKidney ? { totalP: pTotal, absorptionPct: pAbsorptionPct } : undefined,
    },
  ]

  return items.map(item => {
    const { min, max, isUpperLimit } = item.range
    const goalDisplay = isUpperLimit ? `≤${max}` : `${min}-${max}`
    const pct = max > 0 ? Math.min((item.current / max) * 100, 100) : 0
    let statusText = '正常'; let color = '#07c160'; let status = 'ok'

    if (isUpperLimit) {
      if (item.current > max) { statusText = '超标'; color = '#ee0a24'; status = 'danger' }
    } else {
      if (item.current < min) { statusText = '偏低'; color = '#ff976a'; status = 'low' }
      else if (item.current > max) { statusText = '超标'; color = '#ee0a24'; status = 'danger' }
    }

    return { ...item, label: NUTRITION_LABELS[item.key], goalDisplay, statusText, color, pct, status, unit: item.range.unit }
  })
})

// ========== 可展开次要指标（脂肪/碳水/纤维） ==========

const moreMetrics = computed(() => {
  const ev = nutritionEvaluation.value
  const keys = ['fat', 'carbs', 'fiber'] as const
  return keys.map(k => {
    const valueKey = `total${k.charAt(0).toUpperCase() + k.slice(1)}` as keyof typeof todayNutrition
    const val = todayNutrition[valueKey] as number
    const statusInfo = ev[k]
    let statusClass = ''
    if (statusInfo.status === 'danger' || statusInfo.status === 'high') statusClass = 'cell-danger'
    else if (statusInfo.status === 'low') statusClass = 'cell-low'
    return {
      key: k,
      value: Number((val ?? 0).toFixed(1)),
      label: NUTRITION_LABELS[k],
      unit: UNIT_LABELS[k],
      statusClass,
    }
  })
})

const showMoreMetrics = ref(false)

// ========== 按餐次分组 ==========

const mealOrder: Array<keyof typeof MEAL_TYPES> = ['breakfast', 'lunch', 'dinner', 'snack']

const mealGroups = computed(() => {
  return mealOrder
    .filter(type => todayRecords.some(r => r.mealType === type))
    .map(type => {
      const records = todayRecords.filter(r => r.mealType === type)
      const subtotal = records.reduce((s, r) => s + r.calories, 0)
      return { type, records, subtotal }
    })
})

// ========== 添加/编辑记录 ==========

const showAddDialog = ref(false)
const showFoodPicker = ref(false)
const showMealPicker = ref(false)
const showWeightDialog = ref(false)

const isEditing = ref(false)
const editingRecordId = ref<string | null>(null)
const inputFood = ref<FoodDefinition | null>(null)
const inputWeight = ref<number>()
const inputMealType = ref<FoodRecord['mealType']>('breakfast')
const isAutoMeal = ref(true)
const foodSearchText = ref('')
const activeCategory = ref('')

const isCountFood = computed(() => inputFood.value?.unit === '1个')
const isLiquidFood = computed(() => inputFood.value?.displayUnit === 'ml')
const weightFieldLabel = computed(() => isCountFood.value ? '数量(个)' : isLiquidFood.value ? '容量(ml)' : '重量(g)')
const weightFieldPlaceholder = computed(() => isCountFood.value ? '个数' : isLiquidFood.value ? '毫升' : '克数')

const weightQuickUnit = computed(() => {
  if (isCountFood.value) return '个'
  if (isLiquidFood.value) return 'ml'
  return 'g'
})

const quickWeights = computed(() => {
  if (isCountFood.value) return [1, 2, 3, 5]
  if (isLiquidFood.value) return [125, 250, 375, 500]
  return [50, 100, 150, 200]
})

function getActualWeight(): number | null {
  if (!inputFood.value || !inputWeight.value || inputWeight.value <= 0) return null
  if (inputFood.value.unitWeight) return inputWeight.value * inputFood.value.unitWeight
  return inputWeight.value
}

const categoryChips = [...FOOD_CATEGORIES]

const filteredFoods = computed(() => {
  const keyword = foodSearchText.value.trim().toLowerCase()
  let list = allFoods

  if (activeCategory.value) list = list.filter(f => f.category === activeCategory.value)
  if (keyword) list = list.filter(f => f.name.toLowerCase().includes(keyword))
  if (dietStore.userMode === 'kidney') list = [...list].sort((a, b) => a.phosphorus - b.phosphorus)

  const grouped: Record<string, FoodDefinition[]> = {}
  for (const f of list) {
    if (!grouped[f.category]) grouped[f.category] = []
    grouped[f.category].push(f)
  }
  return Object.entries(grouped).map(([category, items]) => ({ category, items }))
})

const mealTypeActions = Object.entries(MEAL_TYPES).map(([key, value]) => ({ name: value, value: key }))

const selectedFoodLabel = computed(() => inputFood.value?.name ?? '')
const selectedFoodWeightHint = computed(() => {
  if (!inputFood.value) return ''
  if (inputFood.value.unit === '1个' && inputFood.value.unitWeight) return `${inputFood.value.unitWeight}g/个`
  if (inputFood.value.displayUnit === 'ml') return '1ml ≈ 1g'
  return ''
})

function formatRecordWeight(record: FoodRecord): string {
  const food = allFoods.find(f => f.id === record.foodType || f.name === record.foodName)
  return formatWeight(record.weight, food?.unit || '100g', food?.unitWeight, food?.displayUnit)
}

const previewNutrition = computed(() => {
  const w = getActualWeight()
  if (!w) return null
  return calculateNutritionFromDefinition(inputFood.value!, w)
})

function openAddDialog(): void {
  isEditing.value = false
  editingRecordId.value = null
  inputFood.value = null
  inputWeight.value = undefined
  inputMealType.value = getCurrentMealType()
  isAutoMeal.value = true
  foodSearchText.value = ''
  activeCategory.value = ''
  showAddDialog.value = true
}

function openEditDialog(record: FoodRecord): void {
  isEditing.value = true
  editingRecordId.value = record.id
  isAutoMeal.value = false
  const food = allFoods.find(f => f.id === record.foodType || f.name === record.foodName)
  inputFood.value = food || null
  if (food?.unitWeight && food.unitWeight > 0) {
    inputWeight.value = Math.round((record.weight / food.unitWeight) * 10) / 10
  } else {
    inputWeight.value = record.weight
  }
  inputMealType.value = record.mealType
  foodSearchText.value = ''
  activeCategory.value = ''
  showAddDialog.value = true
}

function onFoodSelect(food: FoodDefinition): void {
  inputFood.value = food
  foodSearchText.value = ''
  showFoodPicker.value = false
}

function onMealTypeSelect(item: { value: string }): void {
  inputMealType.value = item.value as FoodRecord['mealType']
  isAutoMeal.value = false
  showMealPicker.value = false
}

function handleBeforeClose(action: string): boolean {
  if (action !== 'confirm') return true
  if (!inputFood.value) { showToast('请选择食物'); return false }
  if (!inputWeight.value || inputWeight.value <= 0) { showToast('请选择有效数量'); return false }

  const actualWeight = getActualWeight()
  if (!actualWeight) { showToast('请选择有效数量'); return false }
  const nutrition = calculateNutritionFromDefinition(inputFood.value, actualWeight)
  const bioavailability = getPhosphorusBioavailability(inputFood.value.category)
  const recordData = {
    foodType: inputFood.value.id,
    foodName: inputFood.value.name,
    weight: actualWeight,
    calories: nutrition.calories,
    protein: nutrition.protein,
    fat: nutrition.fat,
    carbs: nutrition.carbs,
    fiber: nutrition.fiber,
    potassium: nutrition.potassium,
    phosphorus: nutrition.phosphorus,
    bioavailablePhosphorus: Math.round(nutrition.phosphorus * bioavailability),
    mealType: inputMealType.value,
    date: getTodayString(),
  }

  if (isEditing.value && editingRecordId.value) {
    updateRecord(editingRecordId.value, recordData)
    showToast({ message: '修改成功', icon: 'success', duration: 1000 })
  } else {
    addRecord(recordData)
    showToast({ message: '添加成功', icon: 'success', duration: 1000 })
  }
  return true
}

function handleDelete(id: string): void { deleteRecord(id) }

// ========== 体重弹窗 ==========

function saveWeight(): void {
  const w = weightInput.value
  if (w && w >= 30 && w <= 200) {
    dietStore.setBodyWeight(w)
    showToast({ message: `已按 ${w}kg 更新每日营养目标`, icon: 'success', duration: 1500 })
  } else if (!w || w <= 0) {
    dietStore.setBodyWeight(null)
    weightInput.value = undefined
    showToast({ message: '已清除体重设置', icon: 'success', duration: 1000 })
  } else {
    showToast('请输入 30-200kg 之间的体重')
  }
}
</script>

<style scoped>
.home-view {
  padding-bottom: 70px;
  background: #f5f7fa;
}

/* 养生提示条 */
.kidney-banner {
  background: linear-gradient(135deg, #fff7e6, #fef0d0);
  padding: 6px 14px;
  font-size: 11px;
  color: #b8860b;
  text-align: center;
  font-weight: 500;
  margin-bottom: 2px;
}

/* ===== 内容区域 ===== */
.content {
  padding: 10px 16px;
}

/* ===== 仪表盘 ===== */
.dashboard {
  background: #fff;
  border-radius: 14px;
  padding: 20px 16px 16px;
  margin-bottom: 14px;
  box-shadow: 0 1px 6px rgba(0,0,0,0.04);
}

/* 首次使用引导卡 */
.welcome-card {
  background: #fff;
  border-radius: 14px;
  padding: 24px 16px;
  margin-bottom: 14px;
  box-shadow: 0 1px 6px rgba(0,0,0,0.04);
}

.welcome-title {
  font-size: 18px;
  font-weight: 700;
  color: #333;
  margin-bottom: 20px;
  text-align: center;
}

.welcome-steps {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.welcome-step {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s;
}

.welcome-step:active {
  background: #f8f8f8;
}

.step-num {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  color: #bbb;
  background: #f5f5f5;
  flex-shrink: 0;
}

.step-num.active {
  background: #4facfe;
  color: #fff;
}

.step-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.step-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.step-desc {
  font-size: 12px;
  color: #999;
}

/* 热量环形图 */
.ring-wrap {
  position: relative;
  width: 120px;
  height: 120px;
  margin: 0 auto 20px;
}

.ring-svg {
  width: 100%;
  height: 100%;
  display: block;
}

.ring-progress {
  transition: stroke-dashoffset 0.6s ease, stroke 0.3s;
}

.ring-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.ring-value {
  font-size: 28px;
  font-weight: 700;
  color: #333;
  line-height: 1;
}

.ring-goal {
  font-size: 11px;
  color: #999;
  margin-top: 3px;
}

/* 关键指标行 */
.key-metrics {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.metric-row {
  background: #f8fafb;
  border-radius: 10px;
  padding: 10px 12px;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.metric-row.danger {
  background: #fff5f5;
  border-color: #ffcccc;
}

.metric-row.low {
  background: #fffaf5;
  border-color: #ffe0cc;
}

.metric-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.metric-label {
  font-size: 12px;
  font-weight: 600;
  color: #666;
  width: 36px;
  flex-shrink: 0;
}

.metric-val {
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.metric-val small {
  font-size: 10px;
  font-weight: 400;
  color: #999;
}

.metric-val-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.metric-sub {
  font-size: 10px;
  color: #aaa;
}

.metric-tag {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  flex-shrink: 0;
}

.tag-ok     { background: #e8f5e9; color: #07c160; }
.tag-danger { background: #ffebee; color: #ee0a24; }
.tag-low    { background: #fff3e0; color: #ff976a; }

.metric-bar {
  height: 5px;
  background: #e8ecf1;
  border-radius: 3px;
  overflow: hidden;
}

.metric-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.4s ease;
}

/* 可展开次要指标 */
.more-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding-top: 12px;
  margin-top: 8px;
  border-top: 1px solid #f0f0f0;
}

.more-item {
  text-align: center;
  padding: 10px 4px;
  background: #f8fafb;
  border-radius: 10px;
  transition: background 0.2s;
}

.more-item.cell-danger { background: #fff5f5; }
.more-item.cell-low    { background: #fffaf5; }

.more-val {
  display: block;
  font-size: 15px;
  font-weight: 700;
  color: #333;
}

.more-val small {
  font-size: 10px;
  font-weight: 400;
  color: #999;
}

.more-label {
  display: block;
  font-size: 11px;
  color: #999;
  margin-top: 3px;
}

.expand-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding-top: 12px;
  font-size: 12px;
  color: #bbb;
  cursor: pointer;
  user-select: none;
}

.expand-row:active { color: #999; }

/* ===== 操作按钮 ===== */
.actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

/* ===== 记录列表 ===== */
.records-section {
  margin-bottom: 16px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.count-badge {
  background: #4facfe;
  color: #fff;
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.mode-kidney .count-badge {
  background: #e6a23c;
}

/* 餐次分组 */
.meal-group {
  margin-bottom: 2px;
}

.meal-group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 4px 8px;
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
  position: relative;
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

.record-delete {
  color: #ccc;
  cursor: pointer;
  padding: 4px;
  flex-shrink: 0;
}

.record-delete:active {
  color: #ee0a24;
}

.swipe-btn {
  height: 100%;
}

/* ===== 添加弹窗 ===== */
.nutrition-preview {
  padding: 12px 16px;
  background: #f0f9ff;
  margin: 0 16px 16px;
  border-radius: 8px;
}

.preview-title {
  font-size: 12px;
  font-weight: 600;
  color: #4facfe;
  margin-bottom: 6px;
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 3px 12px;
  font-size: 12px;
  color: #666;
}

.preview-grid .highlight {
  color: #ee0a24;
  font-weight: 600;
}

.unit-hint {
  font-size: 11px;
  color: #bbb;
}

.quick-weights {
  display: flex;
  gap: 8px;
  padding: 0 16px 8px;
}

.qw-btn {
  flex: 1;
  text-align: center;
  padding: 6px 0;
  font-size: 13px;
  color: #666;
  background: #f5f7fa;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.qw-btn.active {
  background: #4facfe;
  color: #fff;
}

.mode-kidney .qw-btn.active {
  background: #e6a23c;
}

/* ===== 食物选择器 ===== */
.food-picker {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.food-picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px 8px;
}

.picker-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.category-chips {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 0 16px 10px;
  white-space: nowrap;
  -webkit-overflow-scrolling: touch;
}

.category-chips::-webkit-scrollbar { display: none; }

.chip {
  display: inline-block;
  padding: 5px 12px;
  font-size: 11px;
  color: #999;
  background: #f5f5f5;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}

.chip.active {
  background: #4facfe;
  color: #fff;
}

.mode-kidney .chip.active {
  background: #e6a23c;
}

.food-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px 20px;
}

.food-list.empty {
  display: flex;
  justify-content: center;
  align-items: center;
}

.no-result {
  color: #999;
  font-size: 14px;
}

.category-header {
  font-size: 11px;
  font-weight: 700;
  color: #bbb;
  padding: 10px 0 4px;
  text-transform: uppercase;
  letter-spacing: 1px;
  position: sticky;
  top: 0;
  background: #fff;
  z-index: 1;
}

.food-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 4px;
  border-bottom: 1px solid #f5f5f5;
  cursor: pointer;
  transition: background 0.15s;
  border-radius: 6px;
}

.food-item:active { background: #f8f8f8; }
.food-item.food-selected { background: #e8f5e9; }

.food-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.food-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.food-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.ppro-tag {
  font-size: 9px;
  font-weight: 600;
  color: #fff;
  padding: 1px 6px;
  border-radius: 8px;
  flex-shrink: 0;
  margin-left: auto;
}

.risk-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.food-macros {
  font-size: 11px;
  color: #aaa;
}

/* 体重弹窗提示 */
.weight-dialog-hint {
  padding: 12px 16px;
  font-size: 12px;
  color: #999;
  text-align: center;
}
</style>
