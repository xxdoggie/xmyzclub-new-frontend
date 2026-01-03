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

    // ==================== 功能页面 ====================
    {
      path: '/ticket',
      name: 'ticket',
      component: () => import('../pages/TicketPage.vue'),
    },
    {
      path: '/ringtone',
      name: 'ringtone',
      component: () => import('../pages/RingtonePage.vue'),
    },
    {
      path: '/community',
      name: 'community',
      component: () => import('../pages/CommunityPage.vue'),
    },

    // ==================== 需要登录的页面 ====================
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../pages/ProfilePage.vue'),
      meta: { requiresAuth: true },
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
