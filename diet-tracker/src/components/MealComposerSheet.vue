<template>
  <van-popup v-model:show="visible" position="bottom" :style="{ height: '88%' }" round>
    <div class="meal-composer">
      <div class="composer-header">
        <div>
          <strong>组合餐记录</strong>
          <small>按实际组成逐项添加，份量可随时调整</small>
        </div>
        <van-icon name="cross" size="18" @click="visible = false" />
      </div>

      <div class="composer-context">
        <div>
          <span>餐次</span>
          <button v-for="option in mealTypes" :key="option.value" type="button" :class="{ active: mealType === option.value }" @click="mealType = option.value">{{ option.label }}</button>
        </div>
        <div>
          <span>场景</span>
          <button v-for="option in sources" :key="option.value" type="button" :class="{ active: source === option.value }" @click="source = option.value">{{ option.label }}</button>
        </div>
      </div>

      <div class="composer-drafts">
        <div class="composer-section-title">
          <span>这顿吃了什么</span>
          <small>{{ drafts.length }} 项 · {{ totalCalories }} kcal</small>
        </div>
        <van-empty v-if="!drafts.length" image-size="54" description="先从下方选择一项食物" />
        <div v-for="draft in drafts" :key="draft.food.id" class="draft-item">
          <div>
            <strong>{{ draft.food.name }}</strong>
            <small>{{ draft.food.calories }} kcal / 100g</small>
          </div>
          <van-stepper v-model="draft.weight" min="1" max="3000" integer input-width="42px" button-size="26px" />
          <span class="draft-unit">g</span>
          <van-icon name="delete-o" size="17" class="draft-delete" @click="removeDraft(draft.food.id)" />
        </div>
      </div>

      <div class="composer-picker">
        <div class="composer-section-title"><span>添加组成</span><small>可多次添加</small></div>
        <van-search v-model="searchText" placeholder="搜索主食、菜、肉蛋、饮品" shape="round" />
        <div class="composer-food-list">
          <button v-for="food in filteredFoods" :key="food.id" type="button" @click="addDraft(food)">
            <span>{{ food.name }}</span>
            <small>每100g {{ food.calories }}kcal · 蛋白{{ food.protein }}g</small>
            <van-icon name="add-o" size="17" />
          </button>
        </div>
      </div>

      <div class="composer-footer">
        <small>该工具汇总已选单品数据；未加入的酱汁、汤和零食不会自动计入。</small>
        <van-button type="primary" block :disabled="!drafts.length" @click="save">记录这顿餐</van-button>
      </div>
    </div>
  </van-popup>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { FoodDefinition, FoodRecord, MealSource } from '@/types'
import { MEAL_TYPES } from '@/constants'

interface MealDraft {
  food: FoodDefinition
  weight: number
}

const props = defineProps<{
  modelValue: boolean
  foods: FoodDefinition[]
  defaultMealType: FoodRecord['mealType']
  defaultSource: MealSource
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: [payload: { items: MealDraft[]; mealType: FoodRecord['mealType']; source: MealSource }]
}>()

const visible = computed({ get: () => props.modelValue, set: value => emit('update:modelValue', value) })
const searchText = ref('')
const drafts = ref<MealDraft[]>([])
const mealType = ref<FoodRecord['mealType']>(props.defaultMealType)
const source = ref<MealSource>(props.defaultSource)

const mealTypes = Object.entries(MEAL_TYPES).map(([value, label]) => ({ value: value as FoodRecord['mealType'], label }))
const sources: Array<{ value: MealSource; label: string }> = [
  { value: 'home', label: '家里' }, { value: 'canteen', label: '食堂' }, { value: 'takeout', label: '外卖' },
  { value: 'convenience', label: '便利店' }, { value: 'mixed', label: '混合' },
]

watch(() => props.modelValue, opened => {
  if (!opened) return
  searchText.value = ''
  drafts.value = []
  mealType.value = props.defaultMealType
  source.value = props.defaultSource
})

const filteredFoods = computed(() => {
  const keyword = searchText.value.trim().toLowerCase()
  return (keyword ? props.foods.filter(food => food.name.toLowerCase().includes(keyword)) : props.foods).slice(0, 60)
})

const totalCalories = computed(() => Math.round(drafts.value.reduce((total, draft) => total + draft.food.calories * draft.weight / 100, 0)))

function addDraft(food: FoodDefinition): void {
  const existing = drafts.value.find(draft => draft.food.id === food.id)
  if (existing) existing.weight += 100
  else drafts.value.push({ food, weight: 100 })
}

function removeDraft(foodId: string): void {
  drafts.value = drafts.value.filter(draft => draft.food.id !== foodId)
}

function save(): void {
  const items = drafts.value.filter(draft => Number.isFinite(draft.weight) && draft.weight > 0).map(draft => ({ ...draft, weight: Math.round(draft.weight) }))
  if (!items.length) return
  emit('save', { items, mealType: mealType.value, source: source.value })
  visible.value = false
}
</script>

<style scoped>
.meal-composer { position: relative; display: flex; height: 100%; flex-direction: column; background: #f6f8f7; }
.composer-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 16px; background: #fff; border-bottom: 1px solid #e7ece9; }
.composer-header > div { display: flex; flex-direction: column; gap: 3px; }
.composer-header strong { color: #2b3f38; font-size: 16px; }
.composer-header small { color: #83918b; font-size: 11px; }
.composer-header .van-icon { color: #74827d; }
.composer-context { display: grid; grid-template-columns: 1fr; gap: 9px; padding: 12px 16px; background: #fff; border-bottom: 1px solid #e7ece9; }
.composer-context > div { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
.composer-context > div > span { width: 30px; color: #61716a; font-size: 11px; font-weight: 700; }
.composer-context button { padding: 5px 8px; color: #64736d; font: inherit; font-size: 11px; background: #f1f5f3; border: 1px solid transparent; border-radius: 5px; }
.composer-context button.active { color: #fff; background: #237a64; }
.composer-drafts { max-height: 36%; overflow-y: auto; padding: 13px 16px; background: #fff; }
.composer-section-title { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 7px; }
.composer-section-title span { color: #34443e; font-size: 13px; font-weight: 700; }
.composer-section-title small { color: #88958f; font-size: 10px; }
.draft-item { display: grid; grid-template-columns: minmax(0, 1fr) auto auto auto; align-items: center; gap: 7px; padding: 10px 0; border-bottom: 1px solid #edf0ee; }
.draft-item > div { display: flex; min-width: 0; flex-direction: column; gap: 2px; }
.draft-item strong { overflow: hidden; color: #34443e; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.draft-item small { color: #8b9892; font-size: 10px; }
.draft-unit { color: #8b9892; font-size: 11px; }
.draft-delete { color: #c58b8b; }
.composer-picker { flex: 1; min-height: 0; overflow-y: auto; padding: 13px 16px 100px; }
.composer-picker :deep(.van-search) { padding: 0 0 8px; }
.composer-food-list { display: flex; flex-direction: column; background: #fff; border: 1px solid #e1e8e4; border-radius: 8px; }
.composer-food-list button { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 3px 10px; padding: 11px 12px; text-align: left; font: inherit; background: transparent; border: 0; border-bottom: 1px solid #edf0ee; }
.composer-food-list button:last-child { border-bottom: 0; }
.composer-food-list button:active { background: #f1f7f4; }
.composer-food-list span { overflow: hidden; color: #35483f; font-size: 13px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.composer-food-list small { color: #89968f; font-size: 10px; }
.composer-food-list .van-icon { grid-row: span 2; align-self: center; color: #237a64; }
.composer-footer { position: absolute; right: 0; bottom: 0; left: 0; padding: 10px 16px calc(10px + env(safe-area-inset-bottom)); background: #fff; border-top: 1px solid #e2e9e5; }
.composer-footer small { display: block; margin-bottom: 7px; color: #89968f; font-size: 10px; line-height: 1.4; }
.composer-footer :deep(.van-button) { height: 40px; background: #237a64; border-color: #237a64; border-radius: 7px; }
</style>
