import { ref } from 'vue'

export interface ToastItem {
  id: number
  message: string
  type: 'success' | 'warning' | 'error' | 'info'
}

const toasts = ref<ToastItem[]>([])
let toastId = 0

function show(message: string, type: ToastItem['type'] = 'info', duration = 3000) {
  const id = ++toastId
  toasts.value.push({ id, message, type })
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }, duration)
}

function close(id: number) {
  toasts.value = toasts.value.filter((t) => t.id !== id)
}

export function useToast() {
  return {
    toasts,
    show,
    close,
    success: (msg: string) => show(msg, 'success'),
    warning: (msg: string) => show(msg, 'warning'),
    error: (msg: string) => show(msg, 'error'),
    info: (msg: string) => show(msg, 'info'),
  }
}
