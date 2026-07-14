<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * 试卷左侧密封线 + 竖排"密封线内不得答题"
 * 文字数量随纸张高度自动增加，等间距分布（每约230px一条）
 */
const el = ref<HTMLElement | null>(null)
const count = ref(1)
let observer: ResizeObserver | null = null

onMounted(() => {
  if (!el.value) return
  observer = new ResizeObserver((entries) => {
    const height = entries[0]?.contentRect.height ?? 0
    count.value = Math.max(1, Math.round(height / 230))
  })
  observer.observe(el.value)
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <span class="vx-seal"></span>
  <span ref="el" class="vx-seal-text" aria-hidden="true">
    <span v-for="i in count" :key="i">密封线内不得答题</span>
  </span>
</template>
