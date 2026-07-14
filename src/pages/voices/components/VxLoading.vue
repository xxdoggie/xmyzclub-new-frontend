<script setup lang="ts">
/**
 * 试卷风加载动画：一支笔在横线上来回写字
 */
withDefaults(
  defineProps<{
    text?: string
  }>(),
  { text: '加载中…' }
)
</script>

<template>
  <div class="vx-loading">
    <div class="vx-loading-stage">
      <svg
        class="vx-loading-pen"
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M4 20 l1.2 -4.2 L16.6 4.4 a2 2 0 0 1 2.8 0 l0.2 0.2 a2 2 0 0 1 0 2.8 L8.2 18.8 Z" />
        <path d="M14.5 6.5 l3 3" />
      </svg>
      <span class="vx-loading-line"></span>
    </div>
    <span class="vx-loading-text vx-kaiti">{{ text }}</span>
  </div>
</template>

<style scoped>
.vx-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 44px 16px;
  color: var(--vx-ink-faint);
}

.vx-loading-stage {
  position: relative;
  width: 88px;
  height: 34px;
}

.vx-loading-pen {
  position: absolute;
  left: 50%;
  bottom: 6px;
  margin-left: -13px;
  animation: vx-pen-write 1.15s ease-in-out infinite alternate;
}

.vx-loading-line {
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 72px;
  margin-left: -36px;
  border-bottom: 1.5px dashed var(--vx-line-dash);
  transform-origin: left center;
  animation: vx-pen-line 1.15s ease-in-out infinite alternate;
}

.vx-loading-text {
  font-size: 14px;
  letter-spacing: 3px;
}

@keyframes vx-pen-write {
  0% {
    transform: translate(-26px, 0) rotate(-3deg);
  }
  30% {
    transform: translate(-10px, -3px) rotate(4deg);
  }
  60% {
    transform: translate(8px, -1px) rotate(-5deg);
  }
  100% {
    transform: translate(26px, -3px) rotate(3deg);
  }
}

@keyframes vx-pen-line {
  0% {
    transform: scaleX(0.15);
  }
  100% {
    transform: scaleX(1);
  }
}
</style>
