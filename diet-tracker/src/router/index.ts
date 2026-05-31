import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
      meta: { title: '今日记录' },
    },
    {
      path: '/history',
      name: 'history',
      component: () => import('@/views/HistoryView.vue'),
      meta: { title: '历史记录' },
    },
    {
      path: '/stats',
      name: 'stats',
      component: () => import('@/views/StatsView.vue'),
      meta: { title: '统计分析' },
    },
    {
      path: '/foods',
      name: 'foods',
      component: () => import('@/views/FoodsView.vue'),
      meta: { title: '食物管理' },
    },
  ],
})

export default router
