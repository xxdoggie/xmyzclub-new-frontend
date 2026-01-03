<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useUserStore } from '@/stores/user'
import LoginModal from '@/components/auth/LoginModal.vue'

const userStore = useUserStore()

// 应用启动时恢复登录状态
onMounted(() => {
  userStore.restoreSession()

  // 监听 token 过期事件
  window.addEventListener('auth:token-expired', handleTokenExpired)
})

onUnmounted(() => {
  window.removeEventListener('auth:token-expired', handleTokenExpired)
})

function handleTokenExpired() {
  userStore.openLoginModal('登录已过期，请重新登录')
}

function handleCloseModal() {
  userStore.closeLoginModal()
}
</script>

<template>
  <RouterView />

  <!-- 全局登录 Modal -->
  <LoginModal
    :show="userStore.showLoginModal"
    :message="userStore.loginModalMessage"
    @close="handleCloseModal"
  />
</template>
