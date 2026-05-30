<template>
  <van-nav-bar :title="title" fixed placeholder />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const title = computed(() => (route.meta.title as string) || '饮食记录')
</script>

<style scoped>
:deep(.van-nav-bar) {
  background-color: #4facfe;
}

:deep(.van-nav-bar__title) {
  color: #fff;
  font-weight: bold;
}

:deep(.van-nav-bar .van-icon) {
  color: #fff;
}
</style>
