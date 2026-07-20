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
        <div class="dashboard-header">
          <div class="dashboard-heading">
            <span>今日营养进度</span>
            <small>已记录 {{ todayRecords.length }} 项</small>
          </div>
          <van-icon
            v-if="dietStore.userMode === 'kidney'"
            name="question-o"
            size="18"
            color="#bbb"
            class="glossary-btn"
            @click="glossaryRef?.open()"
          />
        </div>
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

      <div class="actions actions-primary">
        <van-button type="primary" block round @click="openAddDialog">
          <van-icon name="add-o" /> 添加饮食记录
        </van-button>
        <div class="action-shortcuts">
          <van-button plain @click="copyYesterdayRecords" :disabled="yesterdayRecords.length === 0">
            <van-icon name="replay" /> 复用昨天
          </van-button>
          <van-button plain @click="router.push('/foods')">
            <van-icon name="search" /> 浏览食物库
          </van-button>
        </div>
      </div>

      <div class="lifestyle-card" @click="openLifestyleDialog">
        <div class="lifestyle-icon"><van-icon name="friends-o" size="20" /></div>
        <div class="lifestyle-copy">
          <span class="lifestyle-title">用餐情境</span>
          <span class="lifestyle-desc">{{ lifestyleSummary }}</span>
        </div>
        <van-icon name="arrow" size="15" color="#bbb" />
      </div>

      <div class="next-meal-card">
        <div class="next-meal-heading">
          <span>下一餐小建议</span>
          <span>日常参考</span>
        </div>
        <strong>{{ suggestion.title }}</strong>
        <p>{{ suggestion.action }}</p>
        <small>{{ suggestion.reason }}</small>
        <div class="suggestion-actions">
          <van-button size="small" plain type="primary" @click="markSuggestionDoable">
            <van-icon name="success" /> 能做到
          </van-button>
          <van-button v-if="hasAlternative" size="small" plain @click="requestAlternative">
            <van-icon name="replay" /> 换一个
          </van-button>
        </div>
      </div>

      <section class="meal-rhythm" aria-label="今日用餐节奏">
        <div class="meal-rhythm-header">
          <div>
            <span>今天的用餐节奏</span>
            <small>轻点餐次即可开始记录</small>
          </div>
          <span class="meal-rhythm-count">{{ todayRecords.length }} 项</span>
        </div>
        <div class="meal-rhythm-grid">
          <button
            v-for="meal in mealRhythm"
            :key="meal.type"
            type="button"
            class="meal-rhythm-item"
            :class="`meal-rhythm-${meal.type}`"
            @click="openAddForMeal(meal.type)"
          >
            <span class="meal-rhythm-dot"></span>
            <span class="meal-rhythm-name">{{ meal.label }}</span>
            <strong>{{ meal.count ? `${meal.count} 项` : '待记录' }}</strong>
            <small>{{ meal.count ? `${meal.calories} kcal` : '点击添加' }}</small>
          </button>
        </div>
      </section>

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
      <div v-if="recentFoods.length" class="recent-foods">
        <span class="recent-foods-label">最近记录</span>
        <div class="recent-food-chips">
          <button
            v-for="food in recentFoods"
            :key="food.id"
            type="button"
            class="recent-food-chip"
            :class="{ active: inputFood?.id === food.id }"
            @click="onFoodSelect(food)"
          >{{ food.name }}</button>
        </div>
      </div>
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
          <span>钠 {{ previewNutrition.sodium }}mg</span>
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
                  <span v-if="dietStore.userMode === 'kidney'" class="food-pral" :style="{ color: getPRALStatus(calculatePRAL(food.protein, food.phosphorus, food.potassium)).color }">
                    · PRAL {{ calculatePRAL(food.protein, food.phosphorus, food.potassium) }}
                  </span>
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

    <!-- 术语帮助 -->
    <GlossarySheet ref="glossaryRef" />

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

    <van-dialog v-model:show="showLifestyleDialog" title="设置用餐情境" show-cancel-button @confirm="saveLifestyleProfile">
      <div class="lifestyle-form">
        <span class="lifestyle-form-label">平时主要在哪里吃</span>
        <van-radio-group v-model="lifestyleMealSource" direction="horizontal" class="lifestyle-options">
          <van-radio name="home">家里</van-radio>
          <van-radio name="canteen">食堂</van-radio>
          <van-radio name="takeout">外卖</van-radio>
          <van-radio name="convenience">便利店</van-radio>
          <van-radio name="mixed">混合</van-radio>
        </van-radio-group>

        <span class="lifestyle-form-label">烹饪条件</span>
        <van-radio-group v-model="lifestyleCookingAccess" direction="horizontal" class="lifestyle-options">
          <van-radio name="none">无法做饭</van-radio>
          <van-radio name="limited">简单加热</van-radio>
          <van-radio name="kitchen">有厨房</van-radio>
        </van-radio-group>

        <span class="lifestyle-form-label">当前最看重</span>
        <van-radio-group v-model="lifestylePriority" direction="horizontal" class="lifestyle-options">
          <van-radio name="balance">营养均衡</van-radio>
          <van-radio name="time">省时间</van-radio>
          <van-radio name="budget">省钱</van-radio>
        </van-radio-group>
      </div>
    </van-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import type { FoodRecord, FoodDefinition, MealSource, CookingAccess, LifestylePriority } from '@/types'
import { useDietStore } from '@/stores/diet'
import { MEAL_TYPES } from '@/constants'
import { getTodayString, formatWeight, getCurrentMealType, calculatePRAL, getPRALStatus } from '@/utils'
import { calculateNutritionFromDefinition } from '@/constants/nutrition'
import { getPotassiumRisk, getPhosphorusRisk, getPtoProteinRatio, getPtoProteinLevel, getPhosphorusBioavailability, FOOD_CATEGORIES } from '@/data/foods'
import { useDashboardMetrics } from '@/composables/useDashboardMetrics'
import { useNextMealSuggestion } from '@/composables/useNextMealSuggestion'
import NavBar from '@/components/NavBar.vue'
import TabBar from '@/components/TabBar.vue'
import GlossarySheet from '@/components/GlossarySheet.vue'
import { showConfirmDialog, showToast } from 'vant'

const dietStore = useDietStore()
const router = useRouter()
const { records, todayRecords, todayNutrition, allFoods, addRecord, updateRecord, deleteRecord } = dietStore

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

// ========== 营养仪表盘 ==========

const {
  calorieRange,
  calorieColor,
  ringOffset,
  ringCircumference,
  keyMetrics,
  moreMetrics,
  showMoreMetrics,
} = useDashboardMetrics()
const { suggestion, hasAlternative, showAlternative } = useNextMealSuggestion()

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

const mealRhythm = computed(() => {
  return mealOrder.map(type => {
    const mealRecords = todayRecords.filter(record => record.mealType === type)
    return {
      type,
      label: MEAL_TYPES[type],
      count: mealRecords.length,
      calories: Math.round(mealRecords.reduce((sum, record) => sum + record.calories, 0)),
    }
  })
})

// ========== 添加/编辑记录 ==========

const showAddDialog = ref(false)
const showFoodPicker = ref(false)
const showMealPicker = ref(false)
const showWeightDialog = ref(false)
const showLifestyleDialog = ref(false)
const glossaryRef = ref<InstanceType<typeof GlossarySheet> | null>(null)

const isEditing = ref(false)
const editingRecordId = ref<string | null>(null)
const inputFood = ref<FoodDefinition | null>(null)
const inputWeight = ref<number>()
const inputMealType = ref<FoodRecord['mealType']>('breakfast')
const isAutoMeal = ref(true)
const foodSearchText = ref('')
const activeCategory = ref('')

const lifestyleMealSource = ref<MealSource>(dietStore.lifestyleProfile.mealSource)
const lifestyleCookingAccess = ref<CookingAccess>(dietStore.lifestyleProfile.cookingAccess)
const lifestylePriority = ref<LifestylePriority>(dietStore.lifestyleProfile.priority)

const lifestyleSummary = computed(() => {
  if (!dietStore.lifestyleProfile.configured) return '让建议更贴近你的生活'
  const mealSourceLabels: Record<MealSource, string> = {
    home: '家里吃饭', canteen: '学校/单位食堂', takeout: '外卖为主', convenience: '便利店为主', mixed: '多种方式混合',
  }
  const priorityLabels: Record<LifestylePriority, string> = {
    balance: '优先营养均衡', time: '优先省时间', budget: '优先省钱',
  }
  return `${mealSourceLabels[dietStore.lifestyleProfile.mealSource]} · ${priorityLabels[dietStore.lifestyleProfile.priority]}`
})

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

const recentFoods = computed(() => {
  const seen = new Set<string>()
  const result: FoodDefinition[] = []
  for (const record of [...records].reverse()) {
    if (seen.has(record.foodType)) continue
    const food = allFoods.find(item => item.id === record.foodType || item.name === record.foodName)
    if (!food) continue
    seen.add(record.foodType)
    result.push(food)
    if (result.length === 6) break
  }
  return result
})

const yesterdayRecords = computed(() => {
  const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD')
  return records.filter(record => record.date === yesterday)
})

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

function openAddForMeal(mealType: FoodRecord['mealType']): void {
  openAddDialog()
  inputMealType.value = mealType
  isAutoMeal.value = false
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
    sodium: nutrition.sodium,
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

async function copyYesterdayRecords(): Promise<void> {
  if (yesterdayRecords.value.length === 0) return

  try {
    await showConfirmDialog({
      title: '复用昨天记录',
      message: `将复制昨天的 ${yesterdayRecords.value.length} 条饮食记录到今天。`,
      confirmButtonText: '复制到今天',
    })
    for (const record of yesterdayRecords.value) {
      const { id: _id, date: _date, ...recordData } = record
      addRecord({ ...recordData, date: getTodayString() })
    }
    showToast({ message: '已复制昨天记录', icon: 'success', duration: 1200 })
  } catch {
    // Dialog cancellation is an expected user action.
  }
}

function markSuggestionDoable(): void {
  dietStore.recordSuggestionFeedback({
    date: getTodayString(),
    suggestionKey: suggestion.value.key,
    response: 'doable',
  })
  showToast({ message: '已记下这一步，完成后回来记录就好', icon: 'success', duration: 1400 })
}

function requestAlternative(): void {
  dietStore.recordSuggestionFeedback({
    date: getTodayString(),
    suggestionKey: suggestion.value.key,
    response: 'alternate_requested',
  })
  showAlternative()
}

function openLifestyleDialog(): void {
  const profile = dietStore.lifestyleProfile
  lifestyleMealSource.value = profile.mealSource
  lifestyleCookingAccess.value = profile.cookingAccess
  lifestylePriority.value = profile.priority
  showLifestyleDialog.value = true
}

function saveLifestyleProfile(): void {
  dietStore.updateLifestyleProfile({
    mealSource: lifestyleMealSource.value,
    cookingAccess: lifestyleCookingAccess.value,
    priority: lifestylePriority.value,
  })
  showToast({ message: '已更新用餐情境', icon: 'success', duration: 1000 })
}

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
  background: #fff7e6;
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
  border-radius: 8px;
  padding: 20px 16px 16px;
  margin-bottom: 14px;
  box-shadow: 0 1px 6px rgba(0,0,0,0.04);
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2px;
}

.dashboard-heading { display: flex; flex-direction: column; gap: 2px; }
.dashboard-heading span { color: #333; font-size: 14px; font-weight: 700; }
.dashboard-heading small { color: #999; font-size: 11px; }

.glossary-btn {
  padding: 4px;
  cursor: pointer;
}

.glossary-btn:active { opacity: 0.6; }

/* 首次使用引导卡 */
.welcome-card {
  background: #fff;
  border-radius: 8px;
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

.lifestyle-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  margin-bottom: 14px;
  background: #fff;
  border-radius: 8px;
  cursor: pointer;
}

.lifestyle-card:active { background: #f8f8f8; }

.lifestyle-icon {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  color: #4facfe;
  background: #e8f4fd;
  border-radius: 8px;
}

.lifestyle-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.lifestyle-title { font-size: 14px; font-weight: 600; color: #333; }
.lifestyle-desc { overflow: hidden; color: #999; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }

.lifestyle-form { padding: 4px 20px 10px; }
.lifestyle-form-label { display: block; margin: 14px 0 8px; color: #333; font-size: 13px; font-weight: 600; }
.lifestyle-options { display: flex; flex-wrap: wrap; gap: 10px 14px; }

.next-meal-card {
  margin-bottom: 14px;
  padding: 14px;
  color: #254b42;
  background: #edf8f2;
  border: 1px solid #ccebd9;
  border-radius: 8px;
}

.next-meal-heading { display: flex; justify-content: space-between; margin-bottom: 8px; color: #45836a; font-size: 11px; }
.next-meal-card strong { display: block; font-size: 15px; }
.next-meal-card p { margin: 6px 0; font-size: 13px; line-height: 1.5; }
.next-meal-card small { display: block; color: #658278; font-size: 11px; line-height: 1.45; }
.suggestion-actions { display: flex; gap: 8px; margin-top: 12px; }
.suggestion-actions :deep(.van-button) { min-width: 88px; }

.meal-rhythm {
  margin-bottom: 14px;
  padding: 14px;
  background: #fff;
  border: 1px solid #edf0f2;
  border-radius: 8px;
}

.meal-rhythm-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; }
.meal-rhythm-header > div { display: flex; flex-direction: column; gap: 2px; }
.meal-rhythm-header span { color: #333; font-size: 14px; font-weight: 700; }
.meal-rhythm-header small { color: #999; font-size: 11px; }
.meal-rhythm-count { color: #3b7864 !important; font-size: 11px !important; font-weight: 600 !important; }

.meal-rhythm-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 7px; }
.meal-rhythm-item { min-width: 0; padding: 9px 4px; text-align: center; font: inherit; background: #f8fafb; border: 1px solid transparent; border-radius: 7px; }
.meal-rhythm-item:active { transform: translateY(1px); }
.meal-rhythm-dot { display: block; width: 7px; height: 7px; margin: 0 auto 5px; border-radius: 50%; background: #a9b8be; }
.meal-rhythm-name { display: block; overflow: hidden; color: #59666b; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.meal-rhythm-item strong { display: block; margin-top: 3px; color: #263437; font-size: 12px; }
.meal-rhythm-item small { display: block; margin-top: 2px; color: #9aa6aa; font-size: 10px; white-space: nowrap; }
.meal-rhythm-breakfast .meal-rhythm-dot { background: #e9a84c; }
.meal-rhythm-lunch .meal-rhythm-dot { background: #3b9d7a; }
.meal-rhythm-dinner .meal-rhythm-dot { background: #5e78c9; }
.meal-rhythm-snack .meal-rhythm-dot { background: #d37c9a; }

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
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  padding-top: 12px;
  margin-top: 8px;
  border-top: 1px solid #f0f0f0;
}

.more-item {
  text-align: center;
  padding: 10px 4px;
  background: #f8fafb;
  border-radius: 8px;
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

.actions :deep(.van-button) { height: 44px; font-size: 14px; font-weight: 600; }
.actions :deep(.van-button--plain) { color: #3b7864; border-color: #b9d9cb; background: #fff; }
.action-shortcuts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.action-shortcuts :deep(.van-button) { width: 100%; }

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

.recent-foods {
  padding: 12px 16px 4px;
  border-bottom: 1px solid #f3f5f7;
}

.recent-foods-label {
  display: block;
  margin-bottom: 8px;
  color: #777;
  font-size: 12px;
  font-weight: 600;
}

.recent-food-chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 8px;
  scrollbar-width: none;
}

.recent-food-chips::-webkit-scrollbar { display: none; }

.recent-food-chip {
  flex: 0 0 auto;
  max-width: 130px;
  overflow: hidden;
  padding: 6px 10px;
  color: #456d60;
  font: inherit;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: #f1f8f4;
  border: 1px solid #cce4d6;
  border-radius: 6px;
}

.recent-food-chip.active { color: #fff; background: #3b7864; border-color: #3b7864; }

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

.food-pral {
  font-weight: 600;
}

/* 体重弹窗提示 */
.weight-dialog-hint {
  padding: 12px 16px;
  font-size: 12px;
  color: #999;
  text-align: center;
}

/* Home information hierarchy: status, action, meal rhythm, guidance, context, history. */
.home-view { background: #f6f7f6; }

.content {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 12px 14px 18px;
}

.welcome-card,
.dashboard { order: 1; }

.actions-primary { order: 2; }
.meal-rhythm { order: 3; }
.next-meal-card { order: 4; }
.lifestyle-card { order: 5; }
.records-section { order: 6; }

.dashboard,
.welcome-card {
  border: 1px solid #e6ebe8;
  box-shadow: none;
}

.dashboard { border-radius: 10px; }
.welcome-card { border-radius: 10px; }

.actions { margin: 0 0 14px; }
.actions :deep(.van-button) { height: 44px; font-size: 14px; font-weight: 650; }
.actions :deep(.van-button--primary) { background: #237a64; border-color: #237a64; }
.actions :deep(.van-button--plain) { color: #2e6e5c; background: #fff; border-color: #b9d9cb; }

.lifestyle-card {
  margin-bottom: 14px;
  background: #fff;
  border: 1px solid #e6ebe8;
  border-radius: 10px;
}

.lifestyle-icon { color: #237a64; background: #e8f4ef; }

.next-meal-card {
  background: #eff8f2;
  border-color: #cce5d5;
  border-radius: 10px;
}

.meal-rhythm { border-radius: 10px; }
.meal-rhythm-breakfast { background: #fff8ec; }
.meal-rhythm-lunch { background: #eff8f2; }
.meal-rhythm-dinner { background: #f1f4fc; }
.meal-rhythm-snack { background: #fdf1f5; }

.meal-rhythm-item { border-color: transparent; }
.meal-rhythm-item:active { border-color: #bad8cc; }

.step-num.active,
.count-badge,
.qw-btn.active,
.chip.active { background: #237a64; }

.dot-breakfast { background: #e9a84c; }
.nutrition-preview { background: #edf8f2; }
.preview-title { color: #237a64; }
</style>
