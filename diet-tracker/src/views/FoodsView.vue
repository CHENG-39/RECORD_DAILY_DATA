<template>
  <div class="foods-view">
    <NavBar />

    <div class="content">
      <div class="page-heading">
        <span>食物库</span>
        <small>{{ builtInFoods.length + customFoodList.length }} 种食物 · 来源清晰可查</small>
      </div>
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
          <div class="food-library-actions">
            <van-button plain size="small" icon="search" @click="openBarcodeDialog">条码导入</van-button>
            <van-button type="primary" size="small" @click="openAddFoodDialog">+ 添加</van-button>
          </div>
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
            <span class="food-card-source">{{ getDataSourceLabel(food) }}</span>
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
      <van-field v-model="foodForm.dataSource" label="数据来源" placeholder="可选：包装营养成分表或资料名称" />
      <van-field v-model="foodForm.sourceReference" label="来源定位" placeholder="可选：品牌、规格、网页链接或照片备注" />
    </van-dialog>

    <!-- 分类选择器 -->
    <van-action-sheet
      v-model:show="showCategoryPicker"
      :actions="categoryActions"
      cancel-text="取消"
      @select="onCategorySelect"
    />

    <van-dialog v-model:show="showBarcodeDialog" title="包装食品条码导入" show-cancel-button @confirm="importBarcodeFood">
      <van-field v-model="barcodeInput" type="number" label="条码" placeholder="输入包装上的 8-14 位条码" :required="true" />
      <p class="barcode-hint">数据来自 Open Food Facts（ODbL）。导入后请核对包装标签；缺失的矿物质会标记为待核实。</p>
    </van-dialog>
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
const showBarcodeDialog = ref(false)
const editingFoodId = ref<string | null>(null)
const barcodeInput = ref('')

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
  dataSource: '',
  sourceReference: '',
  dataConfidence: 'user' as const,
})

const foodForm = reactive(emptyForm())

function openAddFoodDialog(): void {
  editingFoodId.value = null
  Object.assign(foodForm, emptyForm())
  showFoodDialog.value = true
}

function openBarcodeDialog(): void {
  barcodeInput.value = ''
  showBarcodeDialog.value = true
}

function nutrientValue(nutrients: Record<string, unknown>, key: string, targetUnit: 'g' | 'mg'): number | undefined {
  const value = nutrients[`${key}_100g`]
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return undefined
  const unit = nutrients[`${key}_unit`]
  if (targetUnit === 'g') {
    if (unit === 'mg') return value / 1000
    if (unit === 'µg' || unit === 'ug') return value / 1_000_000
    return value
  }
  if (unit === 'g' || !unit) return value * 1000
  if (unit === 'µg' || unit === 'ug') return value / 1000
  return value
}

async function importBarcodeFood(): Promise<void> {
  const barcode = barcodeInput.value.trim()
  if (!/^\d{8,14}$/.test(barcode)) {
    showToast('请输入 8-14 位数字条码')
    return
  }
  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`)
    if (!response.ok) throw new Error('条码服务暂时不可用')
    const result = await response.json() as { status?: number; product?: Record<string, unknown> }
    const product = result.product
    if (result.status !== 1 || !product) throw new Error('未找到该条码对应的食品')
    const nutrients = product.nutriments as Record<string, unknown> | undefined
    if (!nutrients) throw new Error('该产品没有可用的营养标签数据')

    const kcal = nutrientValue(nutrients, 'energy-kcal', 'g') ?? (() => {
      const kj = nutrientValue(nutrients, 'energy-kj', 'g')
      return kj === undefined ? undefined : kj / 4.184
    })()
    if (!kcal || kcal <= 0) throw new Error('该产品缺少每 100g 热量信息')
    const potassium = nutrientValue(nutrients, 'potassium', 'mg')
    const phosphorus = nutrientValue(nutrients, 'phosphorus', 'mg')
    const sodium = nutrientValue(nutrients, 'sodium', 'mg')
    const mineralDataComplete = potassium !== undefined && phosphorus !== undefined && sodium !== undefined
    const name = String(product.product_name || product.product_name_zh || product.brands || `包装食品 ${barcode}`).trim()

    addCustomFood({
      name,
      category: '包装食品',
      calories: Math.round(kcal * 10) / 10,
      protein: nutrientValue(nutrients, 'proteins', 'g') ?? 0,
      fat: nutrientValue(nutrients, 'fat', 'g') ?? 0,
      carbs: nutrientValue(nutrients, 'carbohydrates', 'g') ?? 0,
      fiber: nutrientValue(nutrients, 'fiber', 'g') ?? 0,
      potassium: potassium ?? 0,
      phosphorus: phosphorus ?? 0,
      sodium: sodium ?? 0,
      unit: '100g',
      dataSource: 'Open Food Facts (ODbL)',
      sourceReference: `https://world.openfoodfacts.org/product/${barcode}`,
      dataConfidence: mineralDataComplete ? 'label' : 'estimate',
    })
    showToast({ message: mineralDataComplete ? '已导入，请核对包装标签' : '已导入，但矿物质数据待核实', icon: 'success', duration: 1600 })
  } catch (error) {
    showToast({ message: error instanceof Error ? error.message : '条码导入失败', icon: 'fail', duration: 1800 })
  }
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
    dataSource: food.dataSource || '',
    sourceReference: food.sourceReference || '',
    dataConfidence: food.dataConfidence || 'user',
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
  if (!Number.isFinite(foodForm.calories) || foodForm.calories <= 0) {
    showToast('请输入有效的热量值')
    return
  }

  const dataSource = foodForm.dataSource?.trim()
  const sourceReference = foodForm.sourceReference?.trim()
  const safeNumber = (value: number): number => Number.isFinite(value) && value >= 0 ? value : 0
  const data = {
    name: foodForm.name.trim(),
    category: foodForm.category || FOOD_CATEGORIES[0],
    calories: safeNumber(foodForm.calories),
    protein: safeNumber(foodForm.protein),
    fat: safeNumber(foodForm.fat),
    carbs: safeNumber(foodForm.carbs),
    fiber: safeNumber(foodForm.fiber),
    potassium: safeNumber(foodForm.potassium),
    phosphorus: safeNumber(foodForm.phosphorus),
    sodium: safeNumber(foodForm.sodium),
    unit: '100g' as const,
    dataSource: dataSource || undefined,
    sourceReference: sourceReference || undefined,
    dataConfidence: (dataSource || sourceReference) ? 'label' as const : 'user' as const,
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

.foods-view { background: #f6f7f6; }
.content { padding: 14px; }
.page-heading { display: flex; flex-direction: column; gap: 3px; margin: 2px 2px 8px; }
.page-heading span { color: #263437; font-size: 19px; font-weight: 700; }
.page-heading small { color: #85918d; font-size: 12px; }

:deep(.van-search) { padding: 8px 0 14px; }
.food-card { border: 1px solid #e1e8e4; border-radius: 8px; box-shadow: none; }
.category-tag { color: #237a64; background: #e8f4ef; }
.builtin-tag { background: #f1f4f2; }
.section-header :deep(.van-button--primary) { background: #237a64; border-color: #237a64; }
.food-library-actions { display: flex; gap: 7px; }
.food-library-actions :deep(.van-button) { height: 30px; border-radius: 6px; font-size: 11px; }
.food-library-actions :deep(.van-button--plain) { color: #2e6e5c; border-color: #b9d9cb; }
.barcode-hint { margin: 0; padding: 4px 16px 14px; color: #81908b; font-size: 11px; line-height: 1.5; }
</style>
