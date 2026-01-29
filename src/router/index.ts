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
  // 页面切换时的滚动行为
  scrollBehavior(_to, _from, savedPosition) {
    // 如果有保存的位置（比如浏览器后退/前进），则恢复到该位置
    if (savedPosition) {
      return savedPosition
    }
    // 否则滚动到页面顶部
    return { top: 0 }
  },
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
      path: '/ringtone/:id/submit',
      name: 'ringtone-submit',
      component: () => import('../pages/CampaignSubmissionPage.vue'),
      meta: {
        requiresAuth: true,
        level: 2,
        title: '铃声投稿',
        parent: 'ringtone',
      },
    },
    {
      path: '/ringtone/:id/vote',
      name: 'ringtone-vote',
      component: () => import('../pages/CampaignVotingPage.vue'),
      meta: {
        requiresAuth: true,
        level: 2,
        title: '铃声投票',
        parent: 'ringtone',
      },
    },
    {
      path: '/grade',
      name: 'grade',
      component: () => import('../pages/GradePage.vue'),
      meta: {
        requiresAuth: true,
        level: 1,
        title: '分数查询',
      },
    },
    {
      path: '/grade/:examId',
      name: 'grade-exam-detail',
      component: () => import('../pages/GradeExamDetailPage.vue'),
      meta: {
        requiresAuth: true,
        level: 2,
        title: '考试详情',
        parent: 'grade',
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
      path: '/community/search',
      name: 'community-search',
      component: () => import('../pages/CommunitySearchPage.vue'),
      meta: {
        level: 2,
        title: '搜索',
        parent: 'community',
      },
    },
    {
      path: '/wall',
      name: 'wall',
      component: () => import('../pages/WallPage.vue'),
      meta: {
        level: 1,
        title: '厦一万能墙',
      },
    },
    {
      path: '/community/category/:categoryId',
      name: 'community-category',
      component: () => import('../pages/CategoryPage.vue'),
      meta: {
        level: 2,
        title: '分类详情',
        parent: 'community',
      },
    },
    // 旧版路由（保留向后兼容）
    {
      path: '/community/major/:majorId',
      name: 'community-major',
      component: () => import('../pages/MinorSectionPage.vue'),
      meta: {
        level: 2,
        title: '选择小分区',
        parent: 'community',
      },
    },
    {
      path: '/community/minor/:minorId',
      name: 'community-minor',
      component: () => import('../pages/RatingItemsPage.vue'),
      meta: {
        level: 3,
        title: '评分列表',
        parent: 'community-major',
      },
    },
    {
      path: '/community/item/:itemId',
      name: 'community-item',
      component: () => import('../pages/RatingDetailPage.vue'),
      meta: {
        level: 4,
        title: '评分详情',
        parent: 'community-minor',
      },
    },
    {
      path: '/community/collection/:collectionId',
      name: 'community-collection',
      component: () => import('../pages/CollectionDetailPage.vue'),
      meta: {
        level: 2,
        title: '合集详情',
        parent: 'community',
      },
    },
    {
      path: '/community/contributions',
      name: 'community-contributions',
      component: () => import('../pages/MyContributionsPage.vue'),
      meta: {
        requiresAuth: true,
        level: 2,
        title: '我的反馈',
        parent: 'community',
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
    {
      path: '/messages',
      name: 'messages',
      component: () => import('../pages/MessagesPage.vue'),
      meta: {
        requiresAuth: true,
        level: 2,
        title: '我的消息',
        parent: 'profile',
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

    // ==================== 用户绑定相关页面 ====================
    {
      path: '/user/bindqq/callback',
      name: 'user-bindqq-callback',
      component: () => import('../pages/user/QQBindCallbackPage.vue'),
      meta: {
        requiresAuth: true,
        level: 2,
        title: 'QQ 绑定',
        parent: 'profile',
      },
    },

    // ==================== 管理后台页面 ====================
    {
      path: '/admin/tickets',
      name: 'admin-tickets',
      component: () => import('../pages/admin/TicketManagePage.vue'),
      meta: {
        requiresAuth: true,
        level: 2,
        title: '票务管理',
        parent: 'home',
      },
    },
    {
      path: '/admin/tickets/new',
      name: 'admin-tickets-new',
      component: () => import('../pages/admin/AdminActivityDetailPage.vue'),
      meta: {
        requiresAuth: true,
        level: 3,
        title: '创建活动',
        parent: 'admin-tickets',
      },
    },
    {
      path: '/admin/tickets/verify',
      name: 'admin-tickets-verify',
      component: () => import('../pages/admin/AdminVerifyPage.vue'),
      meta: {
        requiresAuth: true,
        level: 3,
        title: '验票核销',
        parent: 'admin-tickets',
      },
    },
    {
      path: '/admin/tickets/:id',
      name: 'admin-tickets-detail',
      component: () => import('../pages/admin/AdminActivityDetailPage.vue'),
      meta: {
        requiresAuth: true,
        level: 3,
        title: '编辑活动',
        parent: 'admin-tickets',
      },
    },
    {
      path: '/admin/tickets/:id/review',
      name: 'admin-tickets-review',
      component: () => import('../pages/admin/AdminTicketReviewPage.vue'),
      meta: {
        requiresAuth: true,
        level: 4,
        title: '审票管理',
        parent: 'admin-tickets-detail',
      },
    },
    {
      path: '/admin/dorm',
      name: 'admin-dorm',
      component: () => import('../pages/admin/DormManagePage.vue'),
      meta: {
        requiresAuth: true,
        level: 2,
        title: '宿舍管理',
        parent: 'home',
      },
    },
    {
      path: '/admin/campaigns',
      name: 'admin-campaigns',
      component: () => import('../pages/admin/CampaignManagePage.vue'),
      meta: {
        requiresAuth: true,
        level: 2,
        title: '活动管理',
        parent: 'home',
      },
    },
    {
      path: '/admin/campaigns/:id/review',
      name: 'admin-campaigns-review',
      component: () => import('../pages/admin/CampaignReviewPage.vue'),
      meta: {
        requiresAuth: true,
        level: 3,
        title: '审核投稿',
        parent: 'admin-campaigns',
      },
    },
    {
      path: '/admin/campaigns/:id/results',
      name: 'admin-campaigns-results',
      component: () => import('../pages/admin/CampaignResultsPage.vue'),
      meta: {
        requiresAuth: true,
        level: 3,
        title: '投票结果',
        parent: 'admin-campaigns',
      },
    },
    {
      path: '/admin/rating',
      name: 'admin-rating',
      component: () => import('../pages/admin/rating/RatingSchoolsPage.vue'),
      meta: {
        requiresAuth: true,
        level: 2,
        title: '评分社区管理',
        parent: 'home',
      },
    },
    {
      path: '/admin/rating/schools/:schoolId',
      name: 'admin-rating-major-sections',
      component: () => import('../pages/admin/rating/RatingMajorSectionsPage.vue'),
      meta: {
        requiresAuth: true,
        level: 3,
        title: '大分区管理',
        parent: 'admin-rating',
      },
    },
    {
      path: '/admin/rating/major-sections/:majorSectionId',
      name: 'admin-rating-minor-sections',
      component: () => import('../pages/admin/rating/RatingMinorSectionsPage.vue'),
      meta: {
        requiresAuth: true,
        level: 4,
        title: '小分区管理',
        parent: 'admin-rating-major-sections',
      },
    },
    // 旧版小分区评分项目路由（保留向后兼容）
    {
      path: '/admin/rating/minor-sections/:minorSectionId',
      name: 'admin-rating-items-legacy',
      component: () => import('../pages/admin/rating/RatingItemsListPage.vue'),
      meta: {
        requiresAuth: true,
        level: 5,
        title: '评分项目管理',
        parent: 'admin-rating-minor-sections',
      },
    },
    // 新版分类管理路由
    {
      path: '/admin/rating/categories',
      name: 'admin-rating-categories',
      component: () => import('../pages/admin/rating/RatingCategoriesPage.vue'),
      meta: {
        requiresAuth: true,
        level: 3,
        title: '分类管理',
        parent: 'admin-rating',
      },
    },
    {
      path: '/admin/rating/categories/:categoryId',
      name: 'admin-rating-category',
      component: () => import('../pages/admin/rating/RatingCategoriesPage.vue'),
      meta: {
        requiresAuth: true,
        level: 4,
        title: '子分类管理',
        parent: 'admin-rating-categories',
      },
    },
    {
      path: '/admin/rating/categories/:categoryId/items',
      name: 'admin-rating-category-items',
      component: () => import('../pages/admin/rating/RatingItemsListPage.vue'),
      meta: {
        requiresAuth: true,
        level: 5,
        title: '评分项目管理',
        parent: 'admin-rating-category',
      },
    },
    {
      path: '/admin/rating/items/:itemId',
      name: 'admin-rating-item-detail',
      component: () => import('../pages/admin/rating/RatingItemDetailPage.vue'),
      meta: {
        requiresAuth: true,
        level: 6,
        title: '评分项目详情',
        parent: 'admin-rating-items',
      },
    },
    {
      path: '/admin/rating/collections',
      name: 'admin-rating-collections',
      component: () => import('../pages/admin/rating/RatingCollectionsPage.vue'),
      meta: {
        requiresAuth: true,
        level: 3,
        title: '合集管理',
        parent: 'admin-rating',
      },
    },
    {
      path: '/admin/rating/collections/:collectionId',
      name: 'admin-rating-collection-detail',
      component: () => import('../pages/admin/rating/RatingCollectionDetailPage.vue'),
      meta: {
        requiresAuth: true,
        level: 4,
        title: '合集详情',
        parent: 'admin-rating-collections',
      },
    },
    {
      path: '/admin/rating/contributions',
      name: 'admin-rating-contributions',
      component: () => import('../pages/admin/rating/RatingContributionsPage.vue'),
      meta: {
        requiresAuth: true,
        level: 3,
        title: '审核反馈',
        parent: 'admin-rating',
      },
    },
    {
      path: '/admin/rating/statistics',
      name: 'admin-rating-statistics',
      component: () => import('../pages/admin/rating/RatingStatisticsPage.vue'),
      meta: {
        requiresAuth: true,
        level: 3,
        title: '数据统计',
        parent: 'admin-rating',
      },
    },
    {
      path: '/admin/messages',
      name: 'admin-messages',
      component: () => import('../pages/admin/MessageManagePage.vue'),
      meta: {
        requiresAuth: true,
        level: 2,
        title: '消息管理',
        parent: 'home',
      },
    },
    {
      path: '/admin/qqmusic',
      name: 'admin-qqmusic',
      component: () => import('../pages/admin/QQMusicManagePage.vue'),
      meta: {
        requiresAuth: true,
        level: 2,
        title: 'QQ音乐管理',
        parent: 'home',
      },
    },
    {
      path: '/admin/campus',
      name: 'admin-campus',
      component: () => import('../pages/admin/CampusManagePage.vue'),
      meta: {
        requiresAuth: true,
        level: 2,
        title: '校园网管理',
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
