<script setup lang="ts">
import { useVxNotice } from '../composables/useVxNotice'

/**
 * 试卷风提示弹窗宿主：一张盖章的小纸条落在屏幕中央
 * 成功=「已阅」 失败=「驳回」 提示=「提示」
 */
const { current, close } = useVxNotice()

const STAMP_TEXT = { success: '已阅', error: '驳回', info: '提示' } as const
</script>

<template>
  <Transition name="vx-notice">
    <div v-if="current" class="vx-notice-mask" @click="close">
      <div :key="current.id" class="vx-notice-card" :class="`vx-notice-card--${current.type}`">
        <span class="vx-notice-stamp">{{ STAMP_TEXT[current.type] }}</span>
        <p class="vx-notice-text vx-kaiti">{{ current.message }}</p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.vx-notice-mask {
  position: fixed;
  inset: 0;
  background: rgba(26, 22, 17, 0.28);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 18vh 20px 20px;
  z-index: 1200;
}

.vx-notice-card {
  position: relative;
  max-width: 340px;
  min-width: 220px;
  background: var(--vx-paper, #fdfbf4);
  border: 1px solid var(--vx-line, #d8d2c0);
  box-shadow: 3px 5px 0 rgba(0, 0, 0, 0.28);
  padding: 20px 22px 16px;
}

.vx-notice-stamp {
  position: absolute;
  right: 12px;
  top: -12px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2px solid var(--vx-red, #c0392b);
  color: var(--vx-red, #c0392b);
  background: rgba(253, 251, 244, 0.92);
  font-family: 'SimSun', 'Songti SC', serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 2px;
  transform: rotate(12deg);
  animation: vx-notice-stamp 0.4s cubic-bezier(0.2, 1.5, 0.4, 1);
}

.vx-notice-card--info .vx-notice-stamp {
  border-color: var(--vx-ink-soft, #33302a);
  color: var(--vx-ink-soft, #33302a);
}

.vx-notice-text {
  margin: 0;
  font-size: 16px;
  line-height: 1.7;
  color: var(--vx-ink, #1a1611);
  word-break: break-word;
  padding-right: 26px;
}

@keyframes vx-notice-stamp {
  0% {
    transform: rotate(30deg) scale(1.9);
    opacity: 0;
  }
  60% {
    transform: rotate(9deg) scale(0.94);
    opacity: 1;
  }
  100% {
    transform: rotate(12deg) scale(1);
  }
}

.vx-notice-enter-active {
  transition: opacity 0.2s ease;
}

.vx-notice-enter-active .vx-notice-card {
  transition: transform 0.3s cubic-bezier(0.2, 0.9, 0.3, 1.15);
}

.vx-notice-leave-active {
  transition: opacity 0.18s ease;
}

.vx-notice-enter-from,
.vx-notice-leave-to {
  opacity: 0;
}

.vx-notice-enter-from .vx-notice-card {
  transform: translateY(-20px) rotate(-1.5deg);
}
</style>
