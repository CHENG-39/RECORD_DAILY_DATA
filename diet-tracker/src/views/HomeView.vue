<template>
  <div class="home-view">
    <NavBar />

    <div class="content">
      <!-- 今日营养概览 -->
      <div class="nutrition-dashboard">
        <div class="calorie-ring">
          <van-circle
            :rate="calorieRate"
            :text="`${todayNutrition.totalCalories}`"
            color="linear-gradient(to bottom, #4facfe, #00f2fe)"
            size="140"
            layer-color="#ebedf0"
            stroke-width="10"
          />
          <span class="ring-label">已摄入 / {{ goals.calories }} kcal</span>
        </div>

        <div class="nutrient-grid">
          <div class="nutrient-item">
            <span class="n-value">{{ todayNutrition.totalProtein }}<small>g</small></span>
            <span class="n-label">蛋白质</span>
          </div>
          <div class="nutrient-item">
            <span class="n-value">{{ todayNutrition.totalFat }}<small>g</small></span>
            <span class="n-label">脂肪</span>
          </div>
          <div class="nutrient-item">
            <span class="n-value">{{ todayNutrition.totalCarbs }}<small>g</small></span>
            <span class="n-label">碳水</span>
          </div>
          <div class="nutrient-item">
            <span class="n-value">{{ todayNutrition.totalFiber }}<small>g</small></span>
            <span class="n-label">膳食纤维</span>
          </div>
          <div class="nutrient-item">
            <span class="n-value">{{ todayNutrition.totalPotassium }}<small>mg</small></span>
            <span class="n-label">钾</span>
          </div>
          <div class="nutrient-item">
            <span class="n-value">{{ todayNutrition.totalPhosphorus }}<small>mg</small></span>
            <span class="n-label">磷</span>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <van-button type="primary" block @click="openAddDialog">
        + 添加饮食记录
      </van-button>

      <!-- 今日记录列表 -->
      <div class="records-section">
        <h3>今日记录（{{ todayRecords.length }} 条）</h3>
        <van-empty v-if="todayRecords.length === 0" description="暂无记录" />
        <van-cell-group v-else inset>
          <van-swipe-cell v-for="record in todayRecords" :key="record.id">
            <van-cell
              :title="`${record.foodName} ${record.weight}g`"
              :label="mealLabel(record)"
              :value="`${record.calories} kcal`"
            />
            <template #right>
              <van-button
                square type="danger" text="删除"
                class="delete-btn"
                @click="handleDelete(record.id)"
              />
            </template>
          </van-swipe-cell>
        </van-cell-group>
      </div>
    </div>

    <TabBar />

    <!-- ========= 添加记录弹窗 ========= -->
    <van-dialog
      v-model:show="showAddDialog"
      title="添加饮食记录"
      show-cancel-button
      :before-close="handleBeforeClose"
    >
      <!-- 选择食物种类 -->
      <van-field
        :model-value="selectedFoodLabel"
        label="食物种类"
        placeholder="请选择"
        readonly
        is-link
        :required="true"
        @click="showFoodPicker = true"
      />
      <!-- 输入重量 -->
      <van-field
        v-model.number="inputWeight"
        type="number"
        label="重量"
        placeholder="请输入重量（克）"
        :required="true"
      >
        <template #extra>
          <span class="unit-hint" v-if="selectedFoodWeightHint">{{ selectedFoodWeightHint }}</span>
        </template>
      </van-field>
      <!-- 选择餐次 -->
      <van-field
        :model-value="MEAL_TYPES[inputMealType]"
        label="餐次"
        readonly
        is-link
        @click="showMealPicker = true"
      />
      <!-- 营养预估 -->
      <div class="nutrition-preview" v-if="previewNutrition">
        <div class="preview-title">预计营养摄入</div>
        <div class="preview-grid">
          <span>热量 {{ previewNutrition.calories }} kcal</span>
          <span>蛋白质 {{ previewNutrition.protein }}g</span>
          <span>脂肪 {{ previewNutrition.fat }}g</span>
          <span>碳水 {{ previewNutrition.carbs }}g</span>
          <span>膳食纤维 {{ previewNutrition.fiber }}g</span>
          <span>钾 {{ previewNutrition.potassium }}mg</span>
          <span class="highlight">磷 {{ previewNutrition.phosphorus }}mg</span>
        </div>
      </div>
    </van-dialog>

    <!-- 食物种类选择 -->
    <van-action-sheet
      v-model:show="showFoodPicker"
      :actions="foodTypeActions"
      cancel-text="取消"
      @select="onFoodTypeSelect"
    />

    <!-- 餐次选择 -->
    <van-action-sheet
      v-model:show="showMealPicker"
      :actions="mealTypeActions"
      cancel-text="取消"
      @select="onMealTypeSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { FoodRecord } from '@/types'
import { useDietStore } from '@/stores/diet'
import { MEAL_TYPES } from '@/constants'
import { getTodayString } from '@/utils'
import { calculateNutrition, getFoodTypeOptions, getFoodName, formatWeight } from '@/constants/nutrition'
import type { FoodType } from '@/types/diet'
import NavBar from '@/components/NavBar.vue'
import TabBar from '@/components/TabBar.vue'
import { showToast } from 'vant'

const dietStore = useDietStore()
const { todayRecords, todayNutrition, goals, addRecord, deleteRecord } = dietStore

// 热量环形图比例
const calorieRate = computed(() => {
  if (goals.calories <= 0) return 0
  return Math.min((todayNutrition.totalCalories / goals.calories) * 100, 100)
})

// 添加对话框状态
const showAddDialog = ref(false)
const showFoodPicker = ref(false)
const showMealPicker = ref(false)

// 输入数据
const inputFoodType = ref<FoodType | null>(null)
const inputWeight = ref<number>()
const inputMealType = ref<FoodRecord['mealType']>('breakfast')

// 食物类型选项
const foodTypeActions = getFoodTypeOptions().map(item => ({
  name: item.label,
  value: item.value,
}))

// 餐次选项
const mealTypeActions = Object.entries(MEAL_TYPES).map(([key, value]) => ({
  name: value,
  value: key,
}))

// 已选食物标签
const selectedFoodLabel = computed(() => {
  if (!inputFoodType.value) return ''
  return getFoodName(inputFoodType.value)
})

// 食物重量参考提示
const selectedFoodWeightHint = computed(() => {
  if (!inputFoodType.value) return ''
  const dummyWeight = inputFoodType.value === 'EGG' ? 50 : 150
  return `参考：${formatWeight(inputFoodType.value, dummyWeight)}`
})

// 实时营养预估
const previewNutrition = computed(() => {
  if (!inputFoodType.value || !inputWeight.value || inputWeight.value <= 0) return null
  return calculateNutrition(inputFoodType.value, inputWeight.value)
})

// 记录项标签
function mealLabel(record: FoodRecord): string {
  return `${MEAL_TYPES[record.mealType]} | 蛋白质${record.protein}g | 脂肪${record.fat}g | 碳水${record.carbs}g | 钾${record.potassium}mg | 磷${record.phosphorus}mg`
}

// 打开对话框
function openAddDialog(): void {
  inputFoodType.value = null
  inputWeight.value = undefined
  inputMealType.value = 'breakfast'
  showAddDialog.value = true
}

// 选择食物种类
function onFoodTypeSelect(item: { value: FoodType }): void {
  inputFoodType.value = item.value
  showFoodPicker.value = false
}

// 选择餐次
function onMealTypeSelect(item: { value: string }): void {
  inputMealType.value = item.value as FoodRecord['mealType']
  showMealPicker.value = false
}

// 提交验证
function handleBeforeClose(action: string): boolean {
  if (action !== 'confirm') return true

  if (!inputFoodType.value) {
    showToast('请选择食物种类')
    return false
  }
  if (!inputWeight.value || inputWeight.value <= 0) {
    showToast('请输入有效的重量')
    return false
  }

  const nutrition = calculateNutrition(inputFoodType.value, inputWeight.value)

  addRecord({
    foodType: inputFoodType.value,
    foodName: getFoodName(inputFoodType.value),
    weight: inputWeight.value,
    calories: nutrition.calories,
    protein: nutrition.protein,
    fat: nutrition.fat,
    carbs: nutrition.carbs,
    fiber: nutrition.fiber,
    potassium: nutrition.potassium,
    phosphorus: nutrition.phosphorus,
    mealType: inputMealType.value,
    date: getTodayString(),
  })

  showToast({ message: '添加成功', icon: 'success', duration: 1000 })
  return true
}

// 删除记录
function handleDelete(id: string): void {
  deleteRecord(id)
}
</script>

<style scoped>
.home-view {
  padding-bottom: 70px;
}

.content {
  padding: 16px;
}

/* 营养仪表盘 */
.nutrition-dashboard {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.calorie-ring {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 12px;
}

.ring-label {
  font-size: 13px;
  color: #999;
  margin-top: 4px;
}

.nutrient-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.nutrient-item {
  text-align: center;
  padding: 8px 4px;
  background: #f7f8fa;
  border-radius: 8px;
}

.n-value {
  display: block;
  font-size: 18px;
  font-weight: 700;
  color: #333;
}

.n-value small {
  font-size: 11px;
  font-weight: 400;
  color: #999;
}

.n-label {
  display: block;
  font-size: 11px;
  color: #999;
  margin-top: 2px;
}

/* 记录列表 */
.records-section {
  margin-top: 20px;
}

.records-section h3 {
  margin-bottom: 12px;
  font-size: 15px;
  color: #333;
}

.delete-btn {
  height: 100%;
}

/* 营养预估 */
.nutrition-preview {
  padding: 12px 16px;
  background: #f0f9ff;
  margin: 0 16px 16px;
  border-radius: 8px;
}

.preview-title {
  font-size: 13px;
  font-weight: 600;
  color: #4facfe;
  margin-bottom: 8px;
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px 12px;
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
</style>
