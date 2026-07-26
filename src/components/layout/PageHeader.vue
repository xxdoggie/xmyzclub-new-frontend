<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// 移动端页面顶栏（桌面端由全局 AppSidebar/AppTopbar 接管，本组件不渲染）
interface Props {
  // 移动端标题（默认使用路由 meta.title）
  title?: string
  // 是否显示返回按钮（移动端）
  showBack?: boolean
  // 返回路径（默认 router.back()）
  backTo?: string
}

const props = withDefaults(defineProps<Props>(), {
  showBack: true,
})

const route = useRoute()
const router = useRouter()

// 页面标题
const pageTitle = computed(() => {
  return props.title || (route.meta?.title as string) || ''
})

// 返回上一页
function goBack() {
  if (props.backTo) {
    router.push(props.backTo)
  } else {
    router.back()
  }
}
</script>

<template>
  <header class="page-header">
    <div class="header-container">
      <button v-if="showBack" class="back-btn" @click="goBack">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
      <div v-else class="header-spacer"></div>

      <h1 class="header-title">{{ pageTitle }}</h1>

      <div class="header-spacer">
        <slot name="mobile-right"></slot>
      </div>
    </div>
  </header>
</template>

<style scoped>
.page-header {
  background: var(--color-card);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 100;
}

/* 桌面端由全局导航壳提供顶栏，本组件隐藏 */
@media (min-width: 1024px) {
  .page-header {
    display: none;
  }
}

.header-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: var(--spacing-xs) 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.back-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  color: var(--color-text);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.back-btn:hover {
  background: var(--color-border);
}

.back-btn svg {
  width: 24px;
  height: 24px;
}

.header-title {
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  color: var(--color-text);
  white-space: nowrap;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.header-spacer {
  width: 40px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
</style>
