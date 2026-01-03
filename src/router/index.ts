import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../pages/HomePage.vue'
import { setupRouteGuards } from './guards'

// 扩展路由元信息类型
declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
  }
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // ==================== 公开页面 ====================
    {
      path: '/',
      name: 'home',
      component: HomePage,
    },
    {
      path: '/design-system',
      name: 'design-system',
      component: () => import('../pages/DesignSystemPage.vue'),
    },

    // ==================== QQ OAuth 回调页面 ====================
    {
      path: '/auth/qq/callback',
      name: 'qq-callback',
      component: () => import('../pages/auth/QQCallbackPage.vue'),
    },
    {
      path: '/auth/qq/bindOrRegister',
      name: 'qq-bindOrRegister',
      component: () => import('../pages/auth/QQBindPage.vue'),
    },

    // ==================== 需要登录的页面 (占位) ====================
    // TODO: 后续添加
    // {
    //   path: '/profile',
    //   name: 'profile',
    //   component: () => import('../pages/ProfilePage.vue'),
    //   meta: { requiresAuth: true },
    // },

    // ==================== 404 ====================
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('../pages/NotFoundPage.vue'),
    },
  ],
})

// 注册路由守卫
setupRouteGuards(router)

export default router
