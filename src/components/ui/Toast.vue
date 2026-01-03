<script setup lang="ts">
import { ref, readonly } from 'vue'

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

// 暴露给外部使用
defineExpose({
  show,
  success: (msg: string) => show(msg, 'success'),
  warning: (msg: string) => show(msg, 'warning'),
  error: (msg: string) => show(msg, 'error'),
  info: (msg: string) => show(msg, 'info'),
})
</script>

<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast"
          :class="'toast-' + toast.type"
          @click="close(toast.id)"
        >
          <span class="toast-icon">
            <template v-if="toast.type === 'success'">&#10003;</template>
            <template v-else-if="toast.type === 'warning'">!</template>
            <template v-else-if="toast.type === 'error'">&times;</template>
            <template v-else>i</template>
          </span>
          <span class="toast-message">{{ toast.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: calc(env(safe-area-inset-top, 0px) + var(--spacing-md));
  left: 50%;
  transform: translateX(-50%);
  z-index: 3000;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  background: var(--color-card);
  box-shadow: var(--shadow-lg);
  font-size: var(--text-sm);
  pointer-events: auto;
  cursor: pointer;
  max-width: 90vw;
}

.toast-icon {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: var(--font-bold);
  flex-shrink: 0;
}

.toast-message {
  color: var(--color-text);
}

.toast-success .toast-icon {
  background: var(--color-success);
  color: white;
}

.toast-warning .toast-icon {
  background: var(--color-warning);
  color: white;
}

.toast-error .toast-icon {
  background: var(--color-error);
  color: white;
}

.toast-info .toast-icon {
  background: var(--color-info);
  color: white;
}

/* 动画 */
.toast-enter-active,
.toast-leave-active {
  transition: all var(--transition-normal);
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(0.9);
}

.toast-move {
  transition: transform var(--transition-normal);
}
</style>
