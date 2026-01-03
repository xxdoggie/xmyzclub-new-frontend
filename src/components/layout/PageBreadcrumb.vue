<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { getBreadcrumbs, type BreadcrumbItem } from '@/router'

// Props
interface Props {
  // 自定义面包屑（可选，不传则自动根据路由生成）
  items?: BreadcrumbItem[]
}

const props = defineProps<Props>()
const route = useRoute()

// 计算面包屑
const breadcrumbs = computed(() => {
  if (props.items && props.items.length > 0) {
    return props.items
  }
  return getBreadcrumbs(route.name as string)
})
</script>

<template>
  <nav class="breadcrumb" aria-label="面包屑导航">
    <template v-for="(item, index) in breadcrumbs" :key="item.path">
      <!-- 分隔符 -->
      <span v-if="index > 0" class="breadcrumb-sep">/</span>

      <!-- 链接（非最后一个） -->
      <router-link
        v-if="index < breadcrumbs.length - 1"
        :to="item.path"
        class="breadcrumb-link"
      >
        {{ item.title }}
      </router-link>

      <!-- 当前页面（最后一个） -->
      <span v-else class="breadcrumb-current">
        {{ item.title }}
      </span>
    </template>
  </nav>
</template>

<style scoped>
.breadcrumb {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--text-sm);
  flex-wrap: wrap;
}

.breadcrumb-link {
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: color var(--transition-fast);
}

.breadcrumb-link:hover {
  color: var(--color-primary);
}

.breadcrumb-sep {
  color: var(--color-text-placeholder);
  user-select: none;
}

.breadcrumb-current {
  color: var(--color-text);
  font-weight: var(--font-medium);
}
</style>
