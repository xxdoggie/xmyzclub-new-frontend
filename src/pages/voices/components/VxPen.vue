<script setup lang="ts">
/**
 * 按钮内的"写字中"小钢笔（配合加载态使用）
 */
withDefaults(
  defineProps<{
    size?: number
  }>(),
  { size: 14 }
)
</script>

<template>
  <svg
    class="vx-pen-writing"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M4 20 l1.2 -4.2 L16.6 4.4 a2 2 0 0 1 2.8 0 l0.2 0.2 a2 2 0 0 1 0 2.8 L8.2 18.8 Z" />
    <path d="M14.5 6.5 l3 3" />
  </svg>
</template>

<style scoped>
.vx-pen-writing {
  animation: vx-pen-writing 0.45s ease-in-out infinite alternate;
}

@keyframes vx-pen-writing {
  from {
    transform: translateX(-2px) rotate(-8deg);
  }
  to {
    transform: translateX(2px) rotate(6deg);
  }
}
</style>
