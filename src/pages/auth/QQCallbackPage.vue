<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

onMounted(async () => {
  const urlParams = new URLSearchParams(window.location.search)
  const code = urlParams.get('code')
  const state = urlParams.get('state')
  const error = urlParams.get('error')

  // 处理授权错误
  if (error) {
    alert('QQ授权失败: ' + decodeURIComponent(error))
    router.push('/')
    return
  }

  // 参数缺失
  if (!code || !state) {
    alert('授权参数缺失')
    router.push('/')
    return
  }

  try {
    const result = await userStore.qqLogin(code, state)

    if (result.code === 200) {
      // 登录成功
      const redirect = userStore.consumeRedirectRoute()
      router.push(redirect || '/')
    } else if (result.code === 40007 && 'needBinding' in result.data) {
      // 需要绑定或注册
      const data = result.data
      router.push({
        path: '/auth/qq/bindOrRegister',
        query: {
          openid: data.openid,
          unionid: data.unionid || '',
          nickname: data.nickname || '',
          avatar: data.avatar || '',
        },
      })
    } else {
      // 其他错误
      alert(result.message || '登录失败')
      router.push('/')
    }
  } catch (err) {
    console.error('QQ登录失败', err)
    alert('网络错误')
    router.push('/')
  }
})
</script>

<template>
  <div class="qq-callback">
    <div class="loading-spinner"></div>
    <p>正在处理 QQ 登录...</p>
  </div>
</template>

<style scoped>
.qq-callback {
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
