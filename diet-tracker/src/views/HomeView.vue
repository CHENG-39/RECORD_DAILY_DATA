<template>
  <div class="home-view">
    <NavBar />

    <div class="content">
      <!-- 今日概览 -->
      <van-card
        :title="`今日 ${todayNutrition.date}`"
        :desc="`已摄入 ${todayNutrition.totalCalories} / ${goals.calories} kcal`"
      >
        <template #num>
          <div class="nutrition-summary">
            <div class="nutrition-item">
              <span class="value">{{ todayNutrition.totalProtein }}g</span>
              <span class="label">蛋白质</span>
            </div>
            <div class="nutrition-item">
              <span class="value">{{ todayNutrition.totalCarbs }}g</span>
              <span class="label">碳水</span>
            </div>
            <div class="nutrition-item">
              <span class="value">{{ todayNutrition.totalFat }}g</span>
              <span class="label">脂肪</span>
            </div>
          </div>
        </template>
        <template #thumb>
          <van-progress
            :percentage="(todayNutrition.totalCalories / goals.calories) * 100"
            stroke-width="8"
            color="linear-gradient(to right, #4facfe, #00f2fe)"
          />
        </template>
      </van-card>

      <!-- 添加记录按钮 -->
      <van-button type="primary" block @click="showAddDialog = true">
        + 添加饮食记录
      </van-button>

      <!-- 今日记录列表 -->
      <div class="records-section">
        <h3>今日记录</h3>
        <van-empty v-if="todayRecords.length === 0" description="暂无记录" />
        <van-cell-group v-else inset>
          <van-cell
            v-for="record in todayRecords"
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
      </div>
    </div>

    <TabBar />

    <!-- 添加记录弹窗 -->
    <van-dialog
      v-model:show="showAddDialog"
      title="添加饮食记录"
      show-cancel-button
      @confirm="handleAddRecord"
    >
      <van-field
        v-model="newRecord.name"
        label="食物名称"
        placeholder="请输入食物名称"
      />
      <van-field
        v-model.number="newRecord.calories"
        type="number"
        label="热量 (kcal)"
        placeholder="请输入热量"
      />
      <van-field
        v-model.number="newRecord.protein"
        type="number"
        label="蛋白质 (g)"
        placeholder="请输入蛋白质含量"
      />
      <van-field
        v-model.number="newRecord.carbs"
        type="number"
        label="碳水化合物 (g)"
        placeholder="请输入碳水化合物含量"
      />
      <van-field
        v-model.number="newRecord.fat"
        type="number"
        label="脂肪 (g)"
        placeholder="请输入脂肪含量"
      />
      <van-field label="餐次">
        <template #input>
          <van-picker-group
            :tabs="['选择餐次']"
            @confirm="onPickerConfirm"
          >
            <van-picker
              :columns="mealTypeColumns"
              :model-value="newRecord.mealType"
              @confirm="onMealTypeConfirm"
            />
          </van-picker-group>
        </template>
      </van-field>
    </van-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import type { FoodRecord } from '@/types'
import { useDietStore } from '@/stores/diet'
import { MEAL_TYPES } from '@/constants'
import { getTodayString } from '@/utils'
import NavBar from '@/components/NavBar.vue'
import TabBar from '@/components/TabBar.vue'

const dietStore = useDietStore()
const { todayRecords, todayNutrition, goals, addRecord, deleteRecord } = dietStore

const showAddDialog = ref(false)
const newRecord = reactive<Omit<FoodRecord, 'id' | 'date'>>({
  name: '',
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  mealType: 'breakfast',
})

const mealTypeColumns = Object.entries(MEAL_TYPES).map(([key, value]) => ({
  text: value,
  value: key,
}))

function onMealTypeConfirm(value: string): void {
  newRecord.mealType = value as 'breakfast' | 'lunch' | 'dinner' | 'snack'
}

function onPickerConfirm(): void {
  // 关闭 picker
}

function handleAddRecord(): boolean {
  if (!newRecord.name.trim()) {
    return false
  }
  addRecord({
    ...newRecord,
    date: getTodayString(),
  })
  // 重置表单
  newRecord.name = ''
  newRecord.calories = 0
  newRecord.protein = 0
  newRecord.carbs = 0
  newRecord.fat = 0
  newRecord.mealType = 'breakfast'
  return true
}
</script>

<style scoped>
.home-view {
  padding-bottom: 60px;
}

.content {
  padding: 16px;
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

.records-section {
  margin-top: 20px;
}

.records-section h3 {
  margin-bottom: 12px;
  font-size: 16px;
  color: #333;
}
</style>
