<script setup lang="ts">
/**
 * 身份线描图标（统一用 currentColor，靠图形区分身份）
 * 1初中生=书包 2高中生=书堆 3大学生=学士帽 4社会人=公文包
 */
withDefaults(
  defineProps<{
    identity: number
    size?: number
  }>(),
  { size: 18 }
)
</script>

<template>
  <svg
    class="vx-identity-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <!-- 初中生 · 书包 -->
    <template v-if="identity === 1">
      <path d="M9 7.5 C9 4.5 15 4.5 15 7.5" />
      <rect x="5" y="7.5" width="14" height="12.5" rx="3" />
      <path d="M5 12.5 h14" />
      <rect x="8.5" y="14.5" width="7" height="5.5" rx="1.5" />
      <path d="M12 14.5 v2" />
    </template>

    <!-- 高中生 · 书堆 -->
    <template v-else-if="identity === 2">
      <rect x="4.5" y="4.5" width="15" height="4.4" rx="1" />
      <rect x="6" y="8.9" width="14" height="4.4" rx="1" />
      <rect x="4" y="13.3" width="15.5" height="4.4" rx="1" />
      <path d="M16 4.5 v4.4" />
      <path d="M9.5 8.9 v4.4" />
      <path d="M14.5 13.3 v4.4" />
      <path d="M7 20.8 h10" />
    </template>

    <!-- 大学生 · 学士帽 -->
    <template v-else-if="identity === 3">
      <path d="M12 4.5 L21.5 9 L12 13.5 L2.5 9 Z" />
      <path d="M7 11.5 v3.8 c0 2 10 2 10 0 v-3.8" />
      <path d="M21.5 9 v4.5" />
      <circle cx="21.5" cy="14.6" r="0.9" />
    </template>

    <!-- 社会人 · 公文包 -->
    <template v-else>
      <path d="M9.5 8.5 V7 c0-1.2 5-1.2 5 0 v1.5" />
      <rect x="4" y="8.5" width="16" height="11" rx="2" />
      <path d="M4 13.5 h16" />
      <path d="M10.8 13.5 h2.4 v2 h-2.4 z" />
    </template>
  </svg>
</template>
