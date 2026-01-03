<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/composables/useToast'
import { getAdminActivities, updateActivityStatus } from '@/api/ticket'
import type { TicketActivityListItem, ActivityStatus } from '@/types/ticket'
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb.vue'

const router = useRouter()
const userStore = useUserStore()
const toast = useToast()

// 状态
const isLoading = ref(true)
const activities = ref<TicketActivityListItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

// 筛选状态
const statusFilter = ref<ActivityStatus | 'all'>('all')

// 筛选后的活动列表
const filteredActivities = computed(() => {
  if (statusFilter.value === 'all') {
    return activities.value
  }
  return activities.value.filter((a) => a.status === statusFilter.value)
})

// 加载活动列表
async function loadActivities() {
  try {
    const res = await getAdminActivities(page.value, pageSize.value)
    if (res.data.code === 200) {
      activities.value = res.data.data.activities
      total.value = res.data.data.total
    } else {
      toast.error(res.data.message || '获取活动列表失败')
    }
  } catch (error) {
    toast.error('获取活动列表失败')
  } finally {
    isLoading.value = false
  }
}

// 获取状态信息
function getStatusInfo(status: ActivityStatus) {
  const statusMap: Record<ActivityStatus, { label: string; class: string }> = {
    draft: { label: '草稿', class: 'status-draft' },
    published: { label: '已发布', class: 'status-published' },
    active: { label: '进行中', class: 'status-active' },
    ended: { label: '已结束', class: 'status-ended' },
    cancelled: { label: '已取消', class: 'status-cancelled' },
  }
  return statusMap[status] || { label: status, class: '' }
}

// 发布活动
async function publishActivity(id: number, event: Event) {
  event.stopPropagation()
  try {
    const res = await updateActivityStatus(id, 'published')
    if (res.data.code === 200) {
      toast.success('活动已发布')
      loadActivities()
    } else {
      toast.error(res.data.message || '发布失败')
    }
  } catch (error) {
    toast.error('发布失败')
  }
}

// 激活活动
async function activateActivity(id: number, event: Event) {
  event.stopPropagation()
  try {
    const res = await updateActivityStatus(id, 'active')
    if (res.data.code === 200) {
      toast.success('活动已激活')
      loadActivities()
    } else {
      toast.error(res.data.message || '激活失败')
    }
  } catch (error) {
    toast.error('激活失败')
  }
}

// 跳转到活动详情
function goToActivity(id: number) {
  router.push(`/admin/tickets/${id}`)
}

// 格式化日期
function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

onMounted(() => {
  if (!userStore.isLoggedIn || !userStore.canManageTickets) {
    toast.error('无权访问此页面')
    router.push('/')
    return
  }
  loadActivities()
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
          <h1 class="page-title">票务管理</h1>
          <p class="page-subtitle">管理活动、档期和票据</p>
        </div>

        <!-- 加载状态 -->
        <div v-if="isLoading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>

        <template v-else>
          <!-- 状态筛选 -->
          <div class="status-tabs">
            <button
              class="status-tab"
              :class="{ active: statusFilter === 'all' }"
              @click="statusFilter = 'all'"
            >
              全部
            </button>
            <button
              class="status-tab"
              :class="{ active: statusFilter === 'draft' }"
              @click="statusFilter = 'draft'"
            >
              草稿
            </button>
            <button
              class="status-tab"
              :class="{ active: statusFilter === 'published' }"
              @click="statusFilter = 'published'"
            >
              已发布
            </button>
            <button
              class="status-tab"
              :class="{ active: statusFilter === 'active' }"
              @click="statusFilter = 'active'"
            >
              进行中
            </button>
            <button
              class="status-tab"
              :class="{ active: statusFilter === 'ended' }"
              @click="statusFilter = 'ended'"
            >
              已结束
            </button>
          </div>

          <!-- 空状态 -->
          <div v-if="filteredActivities.length === 0" class="empty-container">
            <div class="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </div>
            <h2>{{ statusFilter === 'all' ? '暂无活动' : '暂无相关活动' }}</h2>
            <p>{{ statusFilter === 'all' ? '还没有创建任何活动' : '没有找到该状态的活动' }}</p>
          </div>

          <!-- 活动列表 -->
          <div v-else class="activities-list">
            <div
              v-for="activity in filteredActivities"
              :key="activity.id"
              class="activity-card"
              @click="goToActivity(activity.id)"
            >
              <!-- 活动封面 -->
              <div class="activity-cover">
                <img
                  v-if="activity.imageUrl"
                  :src="activity.imageUrl"
                  :alt="activity.name"
                  class="cover-image"
                />
                <div v-else class="cover-placeholder">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                </div>
              </div>

              <!-- 活动信息 -->
              <div class="activity-info">
                <div class="activity-header">
                  <h3 class="activity-name">{{ activity.name }}</h3>
                  <span class="status-badge" :class="getStatusInfo(activity.status).class">
                    {{ getStatusInfo(activity.status).label }}
                  </span>
                </div>
                <p v-if="activity.description" class="activity-desc">{{ activity.description }}</p>
                <div class="activity-meta">
                  <span class="meta-item">{{ activity.sessionCount }} 场次</span>
                  <span class="meta-divider">·</span>
                  <span class="meta-item">{{ formatDate(activity.createdAt) }}</span>
                </div>
              </div>

              <!-- 操作按钮 -->
              <div class="activity-actions">
                <button
                  v-if="activity.status === 'draft'"
                  class="action-btn publish"
                  @click="publishActivity(activity.id, $event)"
                >
                  发布
                </button>
                <button
                  v-if="activity.status === 'published'"
                  class="action-btn activate"
                  @click="activateActivity(activity.id, $event)"
                >
                  激活
                </button>
                <div class="arrow-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </template>
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
  max-width: 900px;
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

.page-title {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-xs);
}

.page-subtitle {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

/* ===== Loading ===== */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-2xl);
  color: var(--color-text-secondary);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: var(--spacing-md);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ===== Status Tabs ===== */
.status-tabs {
  display: flex;
  gap: 2px;
  margin-bottom: var(--spacing-md);
  padding: 3px;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow-x: auto;
}

.status-tab {
  flex: 1;
  min-width: 60px;
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: center;
  white-space: nowrap;
}

.status-tab:hover {
  color: var(--color-text);
}

.status-tab.active {
  color: var(--color-primary);
  background: var(--color-primary-bg);
}

/* ===== Empty ===== */
.empty-container {
  text-align: center;
  padding: var(--spacing-2xl) var(--spacing-md);
}

.empty-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto var(--spacing-md);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-border);
  color: var(--color-text-secondary);
  border-radius: var(--radius-lg);
}

.empty-icon svg {
  width: 32px;
  height: 32px;
}

.empty-container h2 {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-xs);
}

.empty-container p {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

/* ===== Activity List ===== */
.activities-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.activity-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.activity-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.activity-cover {
  width: 60px;
  height: 60px;
  flex-shrink: 0;
  border-radius: var(--radius-md);
  overflow: hidden;
}

.cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-border);
  color: var(--color-text-placeholder);
}

.cover-placeholder svg {
  width: 24px;
  height: 24px;
}

.activity-info {
  flex: 1;
  min-width: 0;
}

.activity-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: 4px;
  flex-wrap: wrap;
}

.activity-name {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-badge {
  font-size: 10px;
  font-weight: var(--font-semibold);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.status-badge.status-draft {
  background: var(--color-border);
  color: var(--color-text-secondary);
}

.status-badge.status-published {
  background: var(--color-info-bg);
  color: var(--color-info);
}

.status-badge.status-active {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.status-badge.status-ended {
  background: var(--color-border);
  color: var(--color-text-tertiary);
}

.status-badge.status-cancelled {
  background: var(--color-error-bg);
  color: var(--color-error);
}

.activity-desc {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.activity-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
}

.meta-divider {
  color: var(--color-border);
}

.activity-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex-shrink: 0;
}

.action-btn {
  padding: 4px 12px;
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.action-btn.publish {
  background: var(--color-info-bg);
  color: var(--color-info);
}

.action-btn.publish:hover {
  background: var(--color-info);
  color: white;
}

.action-btn.activate {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.action-btn.activate:hover {
  background: var(--color-success);
  color: white;
}

.arrow-icon {
  color: var(--color-text-placeholder);
}

.arrow-icon svg {
  width: 16px;
  height: 16px;
}

/* ===== Desktop ===== */
@media (min-width: 1024px) {
  .breadcrumb-wrapper {
    display: block;
  }

  .page-content {
    padding: var(--spacing-xl);
  }

  .page-title {
    font-size: var(--text-2xl);
  }

  .page-subtitle {
    font-size: var(--text-base);
  }

  .status-tab {
    font-size: var(--text-sm);
    padding: var(--spacing-sm) var(--spacing-md);
  }

  .activity-cover {
    width: 80px;
    height: 80px;
  }

  .activity-name {
    font-size: var(--text-base);
  }

  .activity-desc {
    font-size: var(--text-sm);
  }

  .activity-meta {
    font-size: var(--text-sm);
  }

  .status-badge {
    font-size: var(--text-xs);
    padding: 3px 8px;
  }

  .action-btn {
    padding: 6px 16px;
    font-size: var(--text-sm);
  }
}
</style>
