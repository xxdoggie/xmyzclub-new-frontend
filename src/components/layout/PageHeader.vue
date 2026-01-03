<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

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
const userStore = useUserStore()

// 主题状态
const isDark = ref(false)

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

// 切换主题
function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
}

// 处理登录
function handleLogin() {
  userStore.openLoginModal()
}

// 跳转到个人中心
function goToProfile() {
  router.push('/profile')
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

    <!-- Desktop Header - 与首页完全一致 -->
    <div class="header-container desktop-header">
      <!-- 左侧标题 -->
      <div class="header-center">
        <router-link to="/" class="brand-link">
          <h1 class="header-title">厦门一中学生社区</h1>
        </router-link>
      </div>

      <!-- 中间导航 -->
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

      <!-- 右侧操作 -->
      <div class="header-right">
        <!-- 主题切换 -->
        <button class="theme-toggle-btn" @click="toggleTheme" title="切换主题">
          <svg v-if="isDark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        </button>

        <!-- 用户操作 -->
        <button v-if="!userStore.isLoggedIn" class="login-btn" @click="handleLogin">
          登录
        </button>
        <button v-else class="user-name-btn" @click="goToProfile">
          {{ userStore.user?.nickname || userStore.user?.username }}
        </button>

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
.header-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: var(--spacing-xs) 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mobile-header {
  display: flex;
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

.header-center {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.brand-link {
  text-decoration: none;
}

.nav-links {
  display: none;
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
  gap: var(--spacing-sm);
}

.theme-toggle-btn {
  display: none;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.theme-toggle-btn:hover {
  background: var(--color-border);
  color: var(--color-text);
}

.theme-toggle-btn svg {
  width: 20px;
  height: 20px;
}

.login-btn {
  display: none;
  padding: var(--spacing-xs) var(--spacing-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: white;
  background: var(--color-primary);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.login-btn:hover {
  background: var(--color-primary-dark);
}

.user-name-btn {
  display: none;
  padding: var(--spacing-xs) var(--spacing-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.user-name-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

/* ===== Desktop Header ===== */
@media (min-width: 1024px) {
  .mobile-header {
    display: none;
  }

  .desktop-header {
    display: flex;
  }

  .header-container {
    padding: var(--spacing-sm) var(--spacing-xl);
    gap: var(--spacing-lg);
  }

  .nav-links {
    display: flex;
    flex: 1;
  }

  .theme-toggle-btn {
    display: inline-flex;
  }

  .login-btn {
    display: inline-flex;
  }

  .user-name-btn {
    display: inline-flex;
  }
}
</style>
