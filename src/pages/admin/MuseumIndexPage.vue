<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/composables/useToast'
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb.vue'

const router = useRouter()
const userStore = useUserStore()
const toast = useToast()

const menuItems = [
  {
    title: '瞬间管理',
    description: '审核和管理用户投稿的瞬间',
    icon: 'moment',
    path: '/admin/museum/moments',
  },
  {
    title: '活动管理',
    description: '创建和管理时间线活动',
    icon: 'event',
    path: '/admin/museum/events',
  },
  {
    title: '标签管理',
    description: '管理活动分类标签',
    icon: 'tag',
    path: '/admin/museum/tags',
  },
]

function navigateTo(path: string) {
  router.push(path)
}

onMounted(() => {
  if (!userStore.isLoggedIn || !userStore.canManageMuseum) {
    toast.error('无权访问此页面')
    router.push('/')
    return
  }
})
</script>

<template>
  <div class="page-container">
    <PageHeader back-to="/" />

    <main class="page-content">
      <div class="content-container">
        <!-- 桌面端面包屑 -->
        <div class="breadcrumb-wrapper">
          <PageBreadcrumb />
        </div>

        <!-- 页面标题 -->
        <div class="page-header-section">
          <div class="header-main">
            <div class="header-text">
              <h1 class="page-title">时间线管理</h1>
              <p class="page-subtitle">管理瞬间、活动和标签</p>
            </div>
          </div>
        </div>

        <!-- 菜单列表 -->
        <div class="menu-list">
          <div
            v-for="item in menuItems"
            :key="item.path"
            class="menu-card"
            @click="navigateTo(item.path)"
          >
            <div class="menu-icon" :class="item.icon">
              <!-- 瞬间图标 -->
              <svg v-if="item.icon === 'moment'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <!-- 活动图标 -->
              <svg v-if="item.icon === 'event'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <!-- 标签图标 -->
              <svg v-if="item.icon === 'tag'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                <line x1="7" y1="7" x2="7.01" y2="7"></line>
              </svg>
            </div>
            <div class="menu-info">
              <h3 class="menu-title">{{ item.title }}</h3>
              <p class="menu-desc">{{ item.description }}</p>
            </div>
            <div class="menu-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </main>

    <PageFooter />
  </div>
</template>

<style scoped>
/* ===== Base ===== */
.page-container {
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--color-bg);
  color: var(--color-text);
  display: flex;
  flex-direction: column;
}

.page-content {
  flex: 1;
  padding: var(--spacing-sm);
}

.content-container {
  max-width: 600px;
  margin: 0 auto;
}

/* ===== Breadcrumb ===== */
.breadcrumb-wrapper {
  display: none;
  margin-bottom: var(--spacing-lg);
}

/* ===== Page Header ===== */
.page-header-section {
  margin-bottom: var(--spacing-lg);
}

.header-main {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.header-text {
  display: none;
}

.page-title {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-xs);
}

.page-subtitle {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

/* ===== Menu List ===== */
.menu-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.menu-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.menu-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.menu-card:active {
  transform: scale(0.98);
}

.menu-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary-bg);
  color: var(--color-primary);
  border-radius: var(--radius-lg);
  flex-shrink: 0;
}

.menu-icon svg {
  width: 24px;
  height: 24px;
}

.menu-info {
  flex: 1;
  min-width: 0;
}

.menu-title {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  margin-bottom: 4px;
}

.menu-desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.menu-arrow {
  color: var(--color-text-placeholder);
  flex-shrink: 0;
}

.menu-arrow svg {
  width: 20px;
  height: 20px;
}

/* ===== Desktop ===== */
@media (min-width: 1024px) {
  .breadcrumb-wrapper {
    display: block;
  }

  .page-content {
    padding: var(--spacing-xl);
  }

  .header-text {
    display: block;
  }

  .page-title {
    font-size: var(--text-2xl);
  }

  .page-subtitle {
    font-size: var(--text-base);
  }

  .menu-card {
    padding: var(--spacing-xl);
  }

  .menu-icon {
    width: 56px;
    height: 56px;
  }

  .menu-icon svg {
    width: 28px;
    height: 28px;
  }

  .menu-title {
    font-size: var(--text-lg);
  }
}
</style>
