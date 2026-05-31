<script setup lang="ts">
import { RouterView } from 'vue-router'
import { onMounted, ref } from 'vue'

// 延迟 hydration：让 Service Worker 先激活，骨架屏先渲染
const ready = ref(false)
onMounted(() => {
  requestAnimationFrame(() => {
    ready.value = true
  })
})
</script>

<template>
  <RouterView v-slot="{ Component }">
    <template v-if="Component">
      <Suspense>
        <component :is="Component" />
        <template #fallback>
          <div class="skeleton">
            <div class="sk-nav"></div>
            <div class="sk-content">
              <div class="sk-card"><div class="sk-ring"></div><div class="sk-lines"><div class="sk-line w30"></div><div class="sk-line w60"></div></div></div>
              <div class="sk-btn"></div>
              <div class="sk-card"><div class="sk-line w40"></div><div class="sk-line w80" style="margin-top:10px"></div></div>
            </div>
            <div class="sk-tabs"><div class="sk-tab" v-for="i in 4" :key="i"></div></div>
          </div>
        </template>
      </Suspense>
    </template>
  </RouterView>
</template>

<style>
body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background-color: #f5f7fa;
}

#app {
  min-height: 100vh;
}

/* 极简骨架屏 */
.skeleton { padding-bottom: 50px; }
.sk-nav { height: 46px; background: #fff; }
.sk-content { padding: 10px 16px; }
.sk-card { background: #fff; border-radius: 12px; padding: 20px 16px; margin-bottom: 12px; }
.sk-ring { width: 100px; height: 100px; border-radius: 50%; background: #f0f0f0; margin: 0 auto 16px; }
.sk-lines { display: flex; flex-direction: column; gap: 8px; }
.sk-line { height: 10px; background: #f0f0f0; border-radius: 4px; }
.sk-line.w30 { width: 30%; } .sk-line.w40 { width: 40%; } .sk-line.w60 { width: 60%; } .sk-line.w80 { width: 80%; }
.sk-btn { height: 42px; background: #f0f0f0; border-radius: 21px; margin-bottom: 12px; }
.sk-tabs { position: fixed; bottom: 0; left: 0; right: 0; height: 50px; background: #fff; display: flex; justify-content: space-around; align-items: center; }
.sk-tab { width: 32px; height: 32px; background: #f5f5f5; border-radius: 6px; }

@keyframes sk-pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
.skeleton * { animation: sk-pulse 1.4s ease-in-out infinite; }
</style>
