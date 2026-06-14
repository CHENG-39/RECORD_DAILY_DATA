<template>
  <van-nav-bar :title="title" fixed placeholder>
    <template #right>
      <span v-if="route.path === '/'" class="nav-actions">
        <span class="weight-badge" @click="$emit('openWeight')">
          {{ dietStore.bodyWeight ? dietStore.bodyWeight + 'kg' : '体重' }}
        </span>
        <span class="nav-mode-switch">
          <span
            class="nav-mode-chip"
            :class="{ active: dietStore.userMode === 'normal' }"
            @click="switchMode('normal')"
          >普通</span>
          <span
            class="nav-mode-chip"
            :class="{ active: dietStore.userMode === 'kidney' }"
            @click="switchMode('kidney')"
          >养生</span>
        </span>
      </span>
    </template>
  </van-nav-bar>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useDietStore } from '@/stores/diet'
import { calculateGoalsFromWeight } from '@/utils'

defineEmits<{ openWeight: [] }>()

const route = useRoute()
const dietStore = useDietStore()
const title = computed(() => (route.meta.title as string) || '饮食记录')

function switchMode(mode: 'normal' | 'kidney'): void {
  dietStore.setUserMode(mode)
  if (dietStore.bodyWeight) {
    dietStore.setBodyWeight(dietStore.bodyWeight)
  } else {
    dietStore.updateGoals({ ...calculateGoalsFromWeight(70, mode) })
  }
}
</script>

<style scoped>
:deep(.van-nav-bar) {
  background-color: #fff;
  border-bottom: 1px solid #f0f0f0;
}

:deep(.van-nav-bar__title) {
  color: #333;
  font-weight: 700;
  font-size: 17px;
}

:deep(.van-nav-bar .van-icon) {
  color: #333;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.weight-badge {
  font-size: 11px;
  font-weight: 500;
  color: #4facfe;
  background: #e8f4fd;
  padding: 4px 8px;
  border-radius: 10px;
  cursor: pointer;
  white-space: nowrap;
}

.nav-mode-switch {
  display: flex;
  background: #f5f5f5;
  border-radius: 6px;
  padding: 1px;
}

.nav-mode-chip {
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 600;
  color: #999;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.15s;
}

.nav-mode-chip.active {
  background: #fff;
  color: #4facfe;
  box-shadow: 0 1px 2px rgba(0,0,0,0.06);
}
</style>
