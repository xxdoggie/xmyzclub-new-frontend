import { onMounted, onUnmounted } from 'vue'

/**
 * 单屏页面的整页滚动锁（含移动端回弹）
 * 计数式：多个锁定页之间路由切换时（新页 mounted 早于旧页 unmounted）不会误解锁
 */
let locks = 0

function apply() {
  const value = locks > 0 ? 'hidden' : ''
  document.documentElement.style.overflow = value
  document.body.style.overflow = value
}

export function usePageScrollLock() {
  onMounted(() => {
    locks++
    apply()
  })
  onUnmounted(() => {
    locks = Math.max(0, locks - 1)
    apply()
  })
}
