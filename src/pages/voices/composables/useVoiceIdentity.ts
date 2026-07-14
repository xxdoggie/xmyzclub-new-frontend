import { ref } from 'vue'
import { useUserStore } from '@/stores/user'
import type { VoiceIdentity } from '@/types/voices'

/**
 * 考生身份的本地缓存（localStorage）
 * 身份绑定后不可修改，属于长期不变的数据：
 * - 页面渲染与「去出题」等入口判断直接用缓存，避免等接口造成的跳变
 * - 每次进页面仍会请求 /voices/status，返回后静默同步缓存
 * - 缓存与 userId 绑定，换账号自动失效；退出登录时由 user store 清除
 */

const CACHE_KEY = 'vx-identity'

interface IdentityCache {
  userId: number
  identity: VoiceIdentity
}

// 模块级单例，跨页面共享同一份响应式身份
const identity = ref<VoiceIdentity | null>(null)
let initializedFor: number | null = null

export function useVoiceIdentity() {
  const userStore = useUserStore()

  function currentUserId(): number | null {
    return userStore.user?.id ?? null
  }

  function init() {
    const uid = currentUserId()
    if (uid === null) {
      identity.value = null
      initializedFor = null
      return
    }
    if (initializedFor === uid) return
    initializedFor = uid
    identity.value = null
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (raw) {
        const cached = JSON.parse(raw) as IdentityCache
        if (cached.userId === uid) identity.value = cached.identity
      }
    } catch {
      localStorage.removeItem(CACHE_KEY)
    }
  }

  function setIdentity(value: VoiceIdentity | null) {
    identity.value = value
    const uid = currentUserId()
    if (uid !== null && value) {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ userId: uid, identity: value }))
    } else {
      localStorage.removeItem(CACHE_KEY)
    }
  }

  /**
   * 用 /voices/status 的返回同步缓存（服务端为准）
   */
  function syncFromServer(serverIdentity: VoiceIdentity | null) {
    if (serverIdentity !== identity.value) setIdentity(serverIdentity)
  }

  init()

  return { identity, setIdentity, syncFromServer }
}
