<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/composables/useToast'
import { bindQQ } from '@/api/user'

const router = useRouter()
const userStore = useUserStore()
const toast = useToast()

onMounted(async () => {
  // 检查登录状态
  if (!userStore.isLoggedIn) {
    toast.error('请先登录')
    router.push('/')
    return
  }

  const urlParams = new URLSearchParams(window.location.search)
  const code = urlParams.get('code')
  const state = urlParams.get('state')
  const error = urlParams.get('error')

  // 处理授权错误
  if (error) {
    toast.error('QQ授权失败: ' + decodeURIComponent(error))
    router.push('/profile')
    return
  }

  // 参数缺失
  if (!code || !state) {
    toast.error('授权参数缺失')
    router.push('/profile')
    return
  }

  try {
    const res = await bindQQ({ code, state })

    if (res.data.code === 200) {
      toast.success('QQ 绑定成功')
      router.push('/profile')
    } else {
      toast.error(res.data.message || '绑定失败')
      router.push('/profile')
    }
  } catch (err) {
    console.error('QQ绑定失败', err)
    toast.error('网络错误，请稍后重试')
    router.push('/profile')
  }
})
</script>

<template>
  <div class="qq-bind-callback">
    <div class="loading-spinner"></div>
    <p>正在处理 QQ 绑定...</p>
  </div>
</template>

<style scoped>
.qq-bind-callback {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  background: var(--color-bg);
  color: var(--color-text);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
