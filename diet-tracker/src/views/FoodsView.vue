<template>
  <div class="foods-view">
    <NavBar />

    <div class="content">
      <van-search v-model="searchText" placeholder="搜索食物" shape="round" />

      <!-- 内置食物 -->
      <div class="section" v-if="filteredBuiltIn.length > 0">
        <div class="section-header">
          <h4>内置食物</h4>
          <span class="section-count">{{ filteredBuiltIn.length }} 种</span>
        </div>
        <div class="food-cards">
          <div
            v-for="food in filteredBuiltIn"
            :key="food.id"
            class="food-card"
          >
            <div class="food-card-top">
              <div class="food-card-name-row">
                <span class="food-card-name">{{ food.name }}</span>
                <span class="builtin-tag">内置</span>
                <span class="risk-dot" :style="{ background: getPotassiumRisk(food.potassium).color }"></span>
                <span class="risk-dot" :style="{ background: getPhosphorusRisk(food.phosphorus).color }"></span>
              </div>
            </div>
            <span class="food-card-macros">
              每100g {{ food.calories }}kcal · 蛋白{{ food.protein }}g · 钾{{ food.potassium }}mg · 磷{{ food.phosphorus }}mg
            </span>
            <span class="food-card-source">{{ getDataSourceLabel(food) }}</span>
          </div>
        </div>
      </div>

      <!-- 自定义食物 -->
      <div class="section">
        <div class="section-header">
          <h4>自定义食物</h4>
          <van-button type="primary" size="small" @click="openAddFoodDialog">+ 添加</van-button>
        </div>
        <van-empty v-if="filteredCustom.length === 0 && searchText" description="无匹配结果" />
        <van-empty v-else-if="filteredCustom.length === 0 && !searchText" description="暂无自定义食物，点击上方添加" />
        <div v-else class="food-cards">
          <van-swipe-cell v-for="food in filteredCustom" :key="food.id">
            <div class="food-card food-card-custom" @click="openEditFoodDialog(food)">
              <div class="food-card-top">
                <div class="food-card-name-row">
                  <span class="food-card-name">{{ food.name }}</span>
                  <span class="category-tag">{{ food.category }}</span>
                  <span class="risk-dot" :style="{ background: getPotassiumRisk(food.potassium).color }"></span>
                  <span class="risk-dot" :style="{ background: getPhosphorusRisk(food.phosphorus).color }"></span>
                </div>
              </div>
              <span class="food-card-macros">
                每100g {{ food.calories }}kcal · 蛋白{{ food.protein }}g · 钾{{ food.potassium }}mg · 磷{{ food.phosphorus }}mg
              </span>
            </div>
            <template #right>
              <van-button square type="danger" text="删除" class="swipe-btn" @click="handleDelete(food.id)" />
            </template>
          </van-swipe-cell>
        </div>
      </div>
    </div>

    <TabBar />

    <!-- 添加/编辑自定义食物弹窗 -->
    <van-dialog
      v-model:show="showFoodDialog"
      :title="editingFoodId ? '编辑食物' : '添加自定义食物'"
      show-cancel-button
      @confirm="saveFood"
    >
      <van-field v-model="foodForm.name" label="食物名称" placeholder="如：豆腐、三文鱼" :required="true" />
      <van-field
        :model-value="foodForm.category"
        label="分类"
        readonly
        is-link
        @click="showCategoryPicker = true"
      />
      <van-field v-model.number="foodForm.calories" type="number" label="热量" placeholder="kcal/100g" :required="true">
        <template #extra>kcal</template>
      </van-field>
      <van-field v-model.number="foodForm.protein" type="number" label="蛋白质" placeholder="g/100g" :required="true">
        <template #extra>g</template>
      </van-field>
      <van-field v-model.number="foodForm.fat" type="number" label="脂肪" placeholder="g/100g">
        <template #extra>g</template>
      </van-field>
      <van-field v-model.number="foodForm.carbs" type="number" label="碳水化合物" placeholder="g/100g">
        <template #extra>g</template>
      </van-field>
      <van-field v-model.number="foodForm.fiber" type="number" label="膳食纤维" placeholder="g/100g">
        <template #extra>g</template>
      </van-field>
      <van-field v-model.number="foodForm.potassium" type="number" label="钾" placeholder="mg/100g" :required="true">
        <template #extra>mg</template>
      </van-field>
      <van-field v-model.number="foodForm.phosphorus" type="number" label="磷" placeholder="mg/100g" :required="true">
        <template #extra>mg</template>
      </van-field>
      <van-field v-model.number="foodForm.sodium" type="number" label="钠" placeholder="mg/100g">
        <template #extra>mg</template>
      </van-field>
    </van-dialog>

    <!-- 分类选择器 -->
    <van-action-sheet
      v-model:show="showCategoryPicker"
      :actions="categoryActions"
      cancel-text="取消"
      @select="onCategorySelect"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useDietStore } from '@/stores/diet'
import type { FoodDefinition } from '@/types'
import { FOOD_CATEGORIES, getPotassiumRisk, getPhosphorusRisk } from '@/data/foods'
import NavBar from '@/components/NavBar.vue'
import TabBar from '@/components/TabBar.vue'
import { showToast } from 'vant'

const dietStore = useDietStore()
const { allFoods, addCustomFood, updateCustomFood, deleteCustomFood } = dietStore

const searchText = ref('')

const builtInFoods = computed(() => allFoods.filter(f => f.isBuiltIn))
const customFoodList = computed(() => allFoods.filter(f => !f.isBuiltIn))

const filteredBuiltIn = computed(() =>
  builtInFoods.value.filter(f => f.name.includes(searchText.value))
)

const filteredCustom = computed(() =>
  customFoodList.value.filter(f => f.name.includes(searchText.value))
)

function getDataSourceLabel(food: FoodDefinition): string {
  if (food.dataSource && food.sourceReference) return `来源：${food.dataSource} · ${food.sourceReference}`
  if (food.isBuiltIn) return '来源：内置参考数据'
  return '来源：用户录入'
}

// ========== 添加/编辑食物 ==========

const showFoodDialog = ref(false)
const showCategoryPicker = ref(false)
const editingFoodId = ref<string | null>(null)

const categoryActions = FOOD_CATEGORIES.map(c => ({ name: c, value: c }))

const emptyForm = (): Omit<FoodDefinition, 'id' | 'isBuiltIn'> => ({
  name: '',
  category: FOOD_CATEGORIES[0],
  calories: 0,
  protein: 0,
  fat: 0,
  carbs: 0,
  fiber: 0,
  potassium: 0,
  phosphorus: 0,
  sodium: 0,
  unit: '100g' as const,
})

const foodForm = reactive(emptyForm())

function openAddFoodDialog(): void {
  editingFoodId.value = null
  Object.assign(foodForm, emptyForm())
  showFoodDialog.value = true
}

function openEditFoodDialog(food: FoodDefinition): void {
  editingFoodId.value = food.id
  Object.assign(foodForm, {
    name: food.name,
    category: food.category,
    calories: food.calories,
    protein: food.protein,
    fat: food.fat,
    carbs: food.carbs,
    fiber: food.fiber,
    potassium: food.potassium,
    phosphorus: food.phosphorus,
    sodium: food.sodium,
    unit: food.unit,
  })
  showFoodDialog.value = true
}

function onCategorySelect(item: { value: string }): void {
  foodForm.category = item.value
  showCategoryPicker.value = false
}

function saveFood(): void {
  if (!foodForm.name.trim()) {
    showToast('请输入食物名称')
    return
  }
  if (!foodForm.calories || foodForm.calories <= 0) {
    showToast('请输入有效的热量值')
    return
  }

  const data = {
    name: foodForm.name.trim(),
    category: foodForm.category || FOOD_CATEGORIES[0],
    calories: foodForm.calories,
    protein: foodForm.protein || 0,
    fat: foodForm.fat || 0,
    carbs: foodForm.carbs || 0,
    fiber: foodForm.fiber || 0,
    potassium: foodForm.potassium || 0,
    phosphorus: foodForm.phosphorus || 0,
    sodium: foodForm.sodium || 0,
    unit: '100g' as const,
  }

  if (editingFoodId.value) {
    updateCustomFood(editingFoodId.value, data)
    showToast({ message: '已更新', icon: 'success', duration: 1000 })
  } else {
    addCustomFood(data)
    showToast({ message: '已添加', icon: 'success', duration: 1000 })
  }
}

function handleDelete(id: string): void {
  deleteCustomFood(id)
}
</script>

<style scoped>
.foods-view {
  padding-bottom: 70px;
  background: #f5f7fa;
}

.content {
  padding: 0 16px 16px;
}

.section {
  margin-bottom: 18px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.section-header h4 {
  font-size: 15px;
  color: #333;
  font-weight: 600;
  margin: 0;
}

.section-count {
  font-size: 12px;
  color: #999;
}

.food-card-source {
  display: block;
  margin-top: 4px;
  font-size: 10px;
  color: #999;
  line-height: 1.4;
}

/* 食物卡片列表 */
.food-cards {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.food-card {
  background: #fff;
  border-radius: 10px;
  padding: 12px 14px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.03);
}

.food-card-custom {
  cursor: pointer;
}

.food-card-custom:active {
  background: #f8f8f8;
}

.food-card-top {
  margin-bottom: 6px;
}

.food-card-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.food-card-name {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.builtin-tag {
  font-size: 9px;
  color: #999;
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.category-tag {
  font-size: 9px;
  color: #4facfe;
  background: #e8f4fd;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.risk-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.food-card-macros {
  font-size: 11px;
  color: #aaa;
}

.swipe-btn {
  height: 100%;
}
</style>
