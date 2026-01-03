import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../pages/HomePage.vue'
import { setupRouteGuards } from './guards'

// 面包屑项类型
export interface BreadcrumbItem {
  title: string
  path: string
}

// 扩展路由元信息类型
declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    // 页面层级：1=一级页面（首页同级），2=二级页面，3=三级页面...
    level?: number
    // 页面标题（用于面包屑）
    title?: string
    // 父级路由名称（用于构建面包屑链）
    parent?: string
  }
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // ==================== 一级页面 (level: 1) ====================
    {
      path: '/',
      name: 'home',
      component: HomePage,
      meta: {
        level: 1,
        title: '首页',
      },
    },
    {
      path: '/ticket',
      name: 'ticket',
      component: () => import('../pages/TicketPage.vue'),
      meta: {
        level: 1,
        title: '活动抢票',
      },
    },
    {
      path: '/ticket/my',
      name: 'my-tickets',
      component: () => import('../pages/MyTicketsPage.vue'),
      meta: {
        requiresAuth: true,
        level: 2,
        title: '我的票据',
        parent: 'ticket',
      },
    },
    {
      path: '/ticket/:id',
      name: 'ticket-detail',
      component: () => import('../pages/TicketDetailPage.vue'),
      meta: {
        level: 2,
        title: '活动详情',
        parent: 'ticket',
      },
    },
    {
      path: '/ringtone',
      name: 'ringtone',
      component: () => import('../pages/RingtonePage.vue'),
      meta: {
        level: 1,
        title: '宿舍铃声',
      },
    },
    {
      path: '/community',
      name: 'community',
      component: () => import('../pages/CommunityPage.vue'),
      meta: {
        level: 1,
        title: '评分社区',
      },
    },
    {
      path: '/design-system',
      name: 'design-system',
      component: () => import('../pages/DesignSystemPage.vue'),
      meta: {
        level: 1,
        title: '设计系统',
      },
    },

    // ==================== 二级页面 (level: 2) ====================
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../pages/ProfilePage.vue'),
      meta: {
        requiresAuth: true,
        level: 2,
        title: '个人中心',
        parent: 'home',
      },
    },

    // ==================== 认证相关页面 ====================
    {
      path: '/auth/qq/callback',
      name: 'qq-callback',
      component: () => import('../pages/auth/QQCallbackPage.vue'),
      meta: {
        level: 2,
        title: 'QQ 登录',
        parent: 'home',
      },
    },
    {
      path: '/auth/qq/bindOrRegister',
      name: 'qq-bindOrRegister',
      component: () => import('../pages/auth/QQBindPage.vue'),
      meta: {
        level: 2,
        title: 'QQ 绑定',
        parent: 'home',
      },
    },

    // ==================== 404 ====================
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('../pages/NotFoundPage.vue'),
      meta: {
        level: 1,
        title: '页面未找到',
      },
    },
  ],
})

// 注册路由守卫
setupRouteGuards(router)

/**
 * 根据路由名称获取完整的面包屑链
 * @param routeName 当前路由名称
 * @returns 面包屑数组
 */
export function getBreadcrumbs(routeName: string): BreadcrumbItem[] {
  const breadcrumbs: BreadcrumbItem[] = []
  let currentName: string | undefined = routeName

  while (currentName) {
    const route = router.getRoutes().find((r) => r.name === currentName)
    if (route && route.meta?.title) {
      breadcrumbs.unshift({
        title: route.meta.title as string,
        path: route.path,
      })
      currentName = route.meta.parent as string | undefined
    } else {
      break
    }
  }

  return breadcrumbs
}

export default router
