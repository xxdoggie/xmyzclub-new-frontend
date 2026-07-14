import { ref } from 'vue'

/**
 * 跨代留声专用提示弹窗（试卷风），替代站点通用 toast
 * 配合 VxNoticeHost.vue 使用：页面根节点放一个 <VxNoticeHost />
 */

export type VxNoticeType = 'success' | 'error' | 'info'

export interface VxNoticeItem {
  id: number
  message: string
  type: VxNoticeType
}

const current = ref<VxNoticeItem | null>(null)
let seq = 0
let timer: number | null = null

function show(message: string, type: VxNoticeType = 'info', duration = 2600) {
  current.value = { id: ++seq, message, type }
  if (timer) window.clearTimeout(timer)
  timer = window.setTimeout(() => (current.value = null), duration)
}

function close() {
  if (timer) window.clearTimeout(timer)
  timer = null
  current.value = null
}

export function useVxNotice() {
  return {
    current,
    close,
    show,
    success: (message: string) => show(message, 'success'),
    error: (message: string) => show(message, 'error', 3200),
    info: (message: string) => show(message, 'info'),
  }
}
