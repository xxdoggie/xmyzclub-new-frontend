<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import LoginModal from '@/components/auth/LoginModal.vue'
import ToastContainer from '@/components/ui/ToastContainer.vue'

const router = useRouter()
const userStore = useUserStore()

// 过渡动画方向
const transitionName = ref('page-slide-left')

// 应用启动时恢复登录状态
onMounted(() => {
  userStore.restoreSession()

  // 监听 token 过期事件
  window.addEventListener('auth:token-expired', handleTokenExpired)
})

onUnmounted(() => {
  window.removeEventListener('auth:token-expired', handleTokenExpired)
})

// 路由导航守卫 - 设置过渡动画方向
router.beforeEach((to, from) => {
  const toLevel = (to.meta?.level as number) || 1
  const fromLevel = (from.meta?.level as number) || 1

  if (toLevel > fromLevel) {
    // 进入更深层级 - 向左滑动
    transitionName.value = 'page-slide-left'
  } else if (toLevel < fromLevel) {
    // 返回上级 - 向右滑动
    transitionName.value = 'page-slide-right'
  } else {
    // 同级切换 - 淡入淡出
    transitionName.value = 'page-fade'
  }
})

function handleTokenExpired() {
  userStore.openLoginModal('登录已过期，请重新登录')
}

function handleCloseModal() {
  userStore.closeLoginModal()
}
</script>

<template>
  <router-view v-slot="{ Component, route }">
    <transition :name="transitionName" mode="out-in">
      <component :is="Component" :key="route.path" />
    </transition>
  </router-view>

  <!-- 全局登录 Modal -->
  <LoginModal
    :show="userStore.showLoginModal"
    :message="userStore.loginModalMessage"
    @close="handleCloseModal"
  />

  <!-- 全局 Toast 提示 -->
  <ToastContainer />
</template>

<style>
/* ===== 页面过渡动画 ===== */

/* 向左滑动（进入子页面） */
.page-slide-left-enter-active,
.page-slide-left-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.page-slide-left-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.page-slide-left-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

/* 向右滑动（返回上级） */
.page-slide-right-enter-active,
.page-slide-right-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.page-slide-right-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.page-slide-right-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

/* 淡入淡出（同级切换） */
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.2s ease;
}

.page-fade-enter-from,
.page-fade-leave-to {
  opacity: 0;
}
</style>
