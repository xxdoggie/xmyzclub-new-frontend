<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// Props
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

// 导航链接
const navLinks = [
  { path: '/', name: 'home', label: '首页' },
  { path: '/ticket', name: 'ticket', label: '活动抢票' },
  { path: '/ringtone', name: 'ringtone', label: '宿舍铃声' },
  { path: '/community', name: 'community', label: '评分社区' },
]

// 判断导航链接是否激活
function isNavActive(name: string): boolean {
  return route.name === name
}

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
    <!-- Mobile Header -->
    <div class="header-container mobile-header">
      <button v-if="showBack" class="back-btn" @click="goBack">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
      <div v-else class="header-spacer"></div>

      <h1 class="header-title mobile-title">{{ pageTitle }}</h1>

      <div class="header-spacer">
        <slot name="mobile-right"></slot>
      </div>
    </div>

    <!-- Desktop Header -->
    <div class="header-container desktop-header">
      <div class="header-brand">
        <router-link to="/" class="brand-link">
          <h1 class="header-title">厦门一中学生社区</h1>
        </router-link>
      </div>

      <nav class="nav-links">
        <router-link
          v-for="link in navLinks"
          :key="link.name"
          :to="link.path"
          class="nav-link"
          :class="{ active: isNavActive(link.name) }"
        >
          {{ link.label }}
        </router-link>
      </nav>

      <div class="header-right">
        <span class="current-page">{{ pageTitle }}</span>
        <slot name="desktop-right"></slot>
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

/* ===== Mobile Header ===== */
.mobile-header {
  display: flex;
  max-width: 1400px;
  margin: 0 auto;
  padding: var(--spacing-xs) 10px;
  align-items: center;
  justify-content: space-between;
}

.desktop-header {
  display: none;
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
}

.mobile-title {
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

/* ===== Desktop Header ===== */
@media (min-width: 1024px) {
  .mobile-header {
    display: none;
  }

  .desktop-header {
    display: flex;
    max-width: 1400px;
    margin: 0 auto;
    padding: var(--spacing-sm) var(--spacing-xl);
    align-items: center;
    gap: var(--spacing-lg);
  }

  .header-brand {
    display: flex;
    align-items: center;
  }

  .brand-link {
    text-decoration: none;
  }

  .nav-links {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    flex: 1;
  }

  .nav-link {
    padding: var(--spacing-xs) var(--spacing-md);
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    text-decoration: none;
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);
  }

  .nav-link:hover {
    color: var(--color-text);
    background: var(--color-border);
  }

  .nav-link.active {
    color: var(--color-primary);
    font-weight: var(--font-medium);
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
  }

  .current-page {
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: var(--color-primary);
  }
}
</style>
