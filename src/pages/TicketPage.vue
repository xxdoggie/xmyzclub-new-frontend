<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/composables/useToast'
import { getTicketActivities } from '@/api/ticket'
import type { TicketActivityListItem } from '@/types/ticket'
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'

const router = useRouter()
const userStore = useUserStore()
const toast = useToast()

// 状态
const isLoading = ref(true)
const activities = ref<TicketActivityListItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const isLoadingMore = ref(false)

// 筛选状态：undefined=默认(进行中+即将开始), 'all'=全部, 'ended'=已结束
const statusFilter = ref<string | undefined>(undefined)
const isFilterLoading = ref(false)

// 筛选选项
const filterOptions = [
  { value: undefined, label: '进行中' },
  { value: 'all', label: '全部' },
  { value: 'ended', label: '已结束' },
]

// 加载活动列表
async function loadActivities(isLoadMore = false) {
  if (!userStore.isLoggedIn) {
    activities.value = []
    total.value = 0
    isLoading.value = false
    isLoadingMore.value = false
    return
  }

  if (isLoadMore) {
    isLoadingMore.value = true
  } else {
    isLoading.value = true
  }

  try {
    const res = await getTicketActivities(page.value, pageSize.value, statusFilter.value)
    if (res.data.code === 200) {
      if (isLoadMore) {
        activities.value.push(...res.data.data.activities)
      } else {
        activities.value = res.data.data.activities
      }
      total.value = res.data.data.total
    } else {
      toast.error(res.data.message || '获取活动列表失败')
    }
  } catch (error) {
    toast.error('获取活动列表失败')
  } finally {
    isLoading.value = false
    isLoadingMore.value = false
  }
}

// 加载更多
function loadMore() {
  if (activities.value.length < total.value && !isLoadingMore.value) {
    page.value++
    loadActivities(true)
  }
}

// 切换筛选
async function changeFilter(value: string | undefined) {
  if (statusFilter.value === value || isFilterLoading.value) return
  statusFilter.value = value
  page.value = 1
  isFilterLoading.value = true
  try {
    const res = await getTicketActivities(1, pageSize.value, value)
    if (res.data.code === 200) {
      activities.value = res.data.data.activities
      total.value = res.data.data.total
    }
  } catch {
    // 静默失败
  } finally {
    isFilterLoading.value = false
  }
}

// 计算是否有更多
const hasMore = () => activities.value.length < total.value

// 跳转到详情页
function goToDetail(id: number) {
  router.push(`/ticket/${id}`)
}

// 跳转到我的票据
function goToMyTickets() {
  router.push('/ticket/my')
}

// 获取状态标签
function getStatusLabel(status: string) {
  const statusMap: Record<string, { label: string; class: string }> = {
    active: { label: '进行中', class: 'status-active' },
    published: { label: '即将开始', class: 'status-published' },
    ended: { label: '已结束', class: 'status-ended' },
    cancelled: { label: '已取消', class: 'status-cancelled' },
  }
  return statusMap[status] || { label: status, class: '' }
}

// 格式化时间
function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
  })
}

onMounted(() => {
  loadActivities()
})

watch(
  () => userStore.isLoggedIn,
  (isLoggedIn) => {
    if (isLoggedIn) {
      page.value = 1
      loadActivities()
      return
    }

    activities.value = []
    total.value = 0
    page.value = 1
    isLoading.value = false
    isLoadingMore.value = false
    isFilterLoading.value = false
  }
)
</script>

<template>
  <div class="page-container">
    <PageHeader back-to="/" />

    <main class="page-content">
      <div class="content-container">
        <!-- 桌面端标题 -->
        <h1 class="page-title desktop-only">活动抢票</h1>

        <!-- 未登录提示 -->
        <div v-if="!userStore.isLoggedIn" class="login-prompt">
          <div class="prompt-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
          </div>
          <h2>登录后查看活动</h2>
          <p>登录账号即可浏览和参与校园活动抢票</p>
          <button class="login-btn" @click="userStore.openLoginModal('请先登录以查看活动')">
            立即登录
          </button>
        </div>

        <!-- 加载状态 -->
        <div v-else-if="isLoading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>

        <!-- 已登录且加载完成：显示筛选器和内容 -->
        <div v-else class="activities-section">
          <!-- 列表头部：筛选标签 + 我的票据入口 -->
          <div class="section-header">
            <div class="filter-tabs">
              <button
                v-for="option in filterOptions"
                :key="option.value ?? 'default'"
                class="filter-tab"
                :class="{ active: statusFilter === option.value }"
                @click="changeFilter(option.value)"
              >
                {{ option.label }}
              </button>
            </div>
            <button class="my-tickets-btn" @click="goToMyTickets">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
              我的票据
            </button>
          </div>

          <!-- 空状态 -->
          <div v-if="activities.length === 0" class="empty-container">
            <div class="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </div>
            <h2>暂无活动</h2>
            <p>当前筛选条件下没有活动</p>
          </div>

          <!-- 活动列表 -->
          <template v-else>
            <div class="activities-list" :class="{ 'is-loading': isFilterLoading }">
              <div
                v-for="activity in activities"
                :key="activity.id"
                class="activity-card"
                @click="goToDetail(activity.id)"
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
                  <!-- 状态标签 -->
                  <span class="status-badge" :class="getStatusLabel(activity.status).class">
                    {{ getStatusLabel(activity.status).label }}
                  </span>
                </div>

                <!-- 活动信息 -->
                <div class="activity-info">
                  <h3 class="activity-name">{{ activity.name }}</h3>
                  <p v-if="activity.description" class="activity-desc">{{ activity.description }}</p>
                  <div class="activity-meta">
                    <span class="meta-item">{{ activity.sessionCount }} 场次</span>
                    <span class="meta-divider">·</span>
                    <span class="meta-item">{{ formatDate(activity.createdAt) }}</span>
                  </div>
                </div>

                <!-- 箭头 -->
                <div class="activity-arrow">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </div>
              </div>
            </div>

            <!-- 加载更多 -->
            <div v-if="hasMore()" class="load-more">
              <button
                class="load-more-btn"
                :disabled="isLoadingMore"
                @click="loadMore"
              >
                {{ isLoadingMore ? '加载中...' : '加载更多' }}
              </button>
            </div>

            <!-- 没有更多 -->
            <div v-else class="no-more">
              已经到底啦
            </div>
          </template>
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
  padding: var(--spacing-sm) var(--spacing-sm);
}

.content-container {
  max-width: 800px;
  margin: 0 auto;
}

/* ===== Desktop Only Title ===== */
.page-title {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-lg);
}

.desktop-only {
  display: none;
}

/* ===== Section Header ===== */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-sm);
}

.filter-tabs {
  display: flex;
  gap: var(--spacing-xs);
}

.filter-tab {
  padding: 6px 12px;
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.filter-tab:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.filter-tab.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.my-tickets-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-primary);
  background: var(--color-primary-bg);
  border: none;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.my-tickets-btn:hover {
  background: var(--color-primary);
  color: white;
}

.my-tickets-btn:active {
  transform: scale(0.96);
}

.my-tickets-btn svg {
  width: 14px;
  height: 14px;
}

/* ===== Login Prompt ===== */
.login-prompt {
  text-align: center;
  padding: var(--spacing-2xl) var(--spacing-md);
}

.prompt-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto var(--spacing-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary-bg);
  color: var(--color-primary);
  border-radius: var(--radius-xl);
}

.prompt-icon svg {
  width: 40px;
  height: 40px;
}

.login-prompt h2 {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-sm);
}

.login-prompt p {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-lg);
}

.login-btn {
  padding: var(--spacing-sm) var(--spacing-xl);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: white;
  background: var(--color-primary);
  border: none;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.login-btn:hover {
  background: var(--color-primary-dark);
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

/* ===== Empty ===== */
.empty-container {
  text-align: center;
  padding: var(--spacing-2xl) var(--spacing-md);
}

.empty-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto var(--spacing-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-border);
  color: var(--color-text-secondary);
  border-radius: var(--radius-xl);
}

.empty-icon svg {
  width: 40px;
  height: 40px;
}

.empty-container h2 {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-sm);
}

.empty-container p {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

/* ===== Activity Card ===== */
.activities-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  transition: opacity var(--transition-fast);
}

.activities-list.is-loading {
  opacity: 0.5;
  pointer-events: none;
}

.activity-card {
  display: flex;
  flex-direction: column;
  background: var(--color-card);
  border-radius: var(--radius-xl);
  overflow: hidden;
  cursor: pointer;
  transition: all var(--transition-fast);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.activity-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.activity-card:active {
  transform: translateY(0);
}

.activity-cover {
  position: relative;
  width: 100%;
  height: 140px;
  flex-shrink: 0;
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
  background: linear-gradient(135deg, var(--color-border) 0%, var(--color-bg) 100%);
  color: var(--color-text-placeholder);
}

.cover-placeholder svg {
  width: 40px;
  height: 40px;
}

.status-badge {
  position: absolute;
  top: var(--spacing-sm);
  left: var(--spacing-sm);
  padding: 4px 10px;
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  border-radius: var(--radius-full);
  color: white;
  backdrop-filter: blur(4px);
}

.status-badge.status-active {
  background: rgba(34, 197, 94, 0.9);
}

.status-badge.status-published {
  background: rgba(59, 130, 246, 0.9);
}

.status-badge.status-ended {
  background: rgba(107, 114, 128, 0.9);
}

.status-badge.status-cancelled {
  background: rgba(239, 68, 68, 0.9);
}

.activity-info {
  flex: 1;
  padding: var(--spacing-md);
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.activity-name {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.activity-desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.activity-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  margin-top: var(--spacing-xs);
}

.meta-divider {
  color: var(--color-border);
}

.activity-arrow {
  display: none;
}

/* ===== Load More ===== */
.load-more {
  display: flex;
  justify-content: center;
  padding: var(--spacing-md) 0;
}

.load-more-btn {
  padding: var(--spacing-sm) var(--spacing-xl);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-primary);
  background: var(--color-primary-bg);
  border: none;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.load-more-btn:hover:not(:disabled) {
  background: var(--color-primary);
  color: white;
}

.load-more-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.no-more {
  text-align: center;
  padding: var(--spacing-md);
  font-size: var(--text-sm);
  color: var(--color-text-placeholder);
}

/* ===== Desktop ===== */
@media (min-width: 1024px) {
  .desktop-only {
    display: block;
  }

  .page-content {
    padding: var(--spacing-xl);
  }

  .content-container {
    max-width: 900px;
  }

  .section-header {
    margin-bottom: var(--spacing-md);
  }

  .filter-tab {
    padding: 8px 16px;
    font-size: var(--text-sm);
  }

  .my-tickets-btn {
    padding: 8px 16px;
    font-size: var(--text-sm);
  }

  .my-tickets-btn svg {
    width: 16px;
    height: 16px;
  }

  .activities-list {
    gap: var(--spacing-lg);
  }

  .activity-card {
    flex-direction: row;
  }

  .activity-cover {
    width: 180px;
    height: 120px;
  }

  .activity-info {
    padding: var(--spacing-lg);
    justify-content: center;
  }

  .activity-name {
    font-size: var(--text-lg);
  }

  .activity-desc {
    font-size: var(--text-base);
  }

  .activity-meta {
    font-size: var(--text-sm);
  }

  .activity-arrow {
    display: flex;
    align-items: center;
    padding: 0 var(--spacing-lg);
    color: var(--color-text-placeholder);
  }

  .activity-arrow svg {
    width: 20px;
    height: 20px;
  }
}
</style>
