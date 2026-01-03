import type { Router } from 'vue-router'
import { useUserStore } from '@/stores/user'

/**
 * 注册路由守卫
 */
export function setupRouteGuards(router: Router) {
  router.beforeEach((to, _from) => {
    const userStore = useUserStore()

    // 检查是否需要登录
    if (to.meta.requiresAuth && !userStore.isLoggedIn) {
      // 保存目标路由，登录成功后跳转
      userStore.setRedirectRoute(to.fullPath)
      // 弹出登录 Modal
      userStore.openLoginModal()
      // 阻止导航
      return false
    }

    return true
  })
}
