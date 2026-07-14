<script setup lang="ts">
import { computed } from 'vue'

/**
 * 试卷风页签，带滑块动画（等宽布局，滑块按索引位移）
 */
export interface VxTabOption {
  value: string
  label: string
}

const props = defineProps<{
  options: VxTabOption[]
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const activeIndex = computed(() => {
  const idx = props.options.findIndex((o) => o.value === props.modelValue)
  return idx < 0 ? 0 : idx
})
</script>

<template>
  <div
    class="vx-tabs"
    :style="{ '--vx-tabs-count': options.length, '--vx-tabs-index': activeIndex }"
  >
    <span class="vx-tabs-slider"></span>
    <button
      v-for="o in options"
      :key="o.value"
      type="button"
      class="vx-tab"
      :class="{ 'vx-tab--active': o.value === modelValue }"
      @click="emit('update:modelValue', o.value)"
    >
      {{ o.label }}
    </button>
  </div>
</template>
