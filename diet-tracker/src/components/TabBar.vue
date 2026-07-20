<template>
  <van-tabbar v-model="active" fixed placeholder>
    <van-tabbar-item icon="home-o" to="/">今日记录</van-tabbar-item>
    <van-tabbar-item icon="records" to="/history">历史记录</van-tabbar-item>
    <van-tabbar-item icon="chart-trending-o" to="/stats">统计分析</van-tabbar-item>
    <van-tabbar-item icon="shop-o" to="/foods">食物管理</van-tabbar-item>
  </van-tabbar>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const pathMap: Record<string, number> = {
  '/': 0,
  '/history': 1,
  '/stats': 2,
  '/foods': 3,
}

const active = computed(() => pathMap[route.path] ?? 0)
</script>

<style scoped>
:deep(.van-tabbar) {
  background-color: #fff;
}

:deep(.van-tabbar-item--active) {
  color: #237a64;
}
</style>
