import { onBeforeUnmount, ref } from 'vue'

/**
 * 桌面端断点（与页面内 @media (min-width: 920px) 保持一致）
 * 用于模板级的桌面/移动分支：桌面端主页为「整张试卷」布局
 */
export const VX_DESKTOP_QUERY = '(min-width: 920px)'

export function useIsDesktop() {
  const mq = window.matchMedia(VX_DESKTOP_QUERY)
  const isDesktop = ref(mq.matches)
  const onChange = (e: MediaQueryListEvent) => {
    isDesktop.value = e.matches
  }
  mq.addEventListener('change', onChange)
  onBeforeUnmount(() => mq.removeEventListener('change', onChange))
  return isDesktop
}
