import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../pages/HomePage.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage,
    },
    {
      path: '/design-system',
      name: 'design-system',
      // 设计系统参考页面 - 包含完整的 UI 组件库
      // Claude Code 可以参考此页面了解所有可用组件和样式
      component: () => import('../pages/DesignSystemPage.vue'),
    },
  ],
})

export default router
