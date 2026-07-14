<script setup lang="ts">
import { useRouter } from 'vue-router'

/**
 * 左上角的轻量圆形按钮
 * 传 to 则跳转指定路由，否则 router.back()；home 变体显示小房子图标
 */
const props = defineProps<{
  to?: string
  home?: boolean
}>()

const router = useRouter()

function go() {
  if (props.to) router.push(props.to)
  else router.back()
}
</script>

<template>
  <button class="vx-back-circle" type="button" :aria-label="home ? '回到主页' : '返回'" @click="go">
    <svg v-if="home" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M4 11 L12 4 L20 11" />
      <path d="M6 10 V19 a1 1 0 0 0 1 1 h10 a1 1 0 0 0 1-1 V10" />
      <path d="M10 20 v-6 h4 v6" />
    </svg>
    <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M15 5 L8 12 L15 19" />
    </svg>
  </button>
</template>
