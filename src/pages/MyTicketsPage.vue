<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/composables/useToast'
import { getMyTickets } from '@/api/ticket'
import type { Ticket, TicketStatus } from '@/types/ticket'
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb.vue'

const router = useRouter()
const userStore = useUserStore()
const toast = useToast()

// 状态
const isLoading = ref(true)
const tickets = ref<Ticket[]>([])

// 筛选状态
const statusFilter = ref<TicketStatus | 'all'>('all')

// 筛选后的票据
const filteredTickets = computed(() => {
  if (statusFilter.value === 'all') {
    return tickets.value
  }
  return tickets.value.filter((t) => t.status === statusFilter.value)
})

// 状态统计
const statusCounts = computed(() => {
  return {
    all: tickets.value.length,
    pending: tickets.value.filter((t) => t.status === 'pending').length,
    confirmed: tickets.value.filter((t) => t.status === 'confirmed').length,
    used: tickets.value.filter((t) => t.status === 'used').length,
  }
})

// 加载票据列表
async function loadTickets() {
  try {
    const res = await getMyTickets()
    if (res.data.code === 200) {
      tickets.value = res.data.data.tickets
    } else {
      toast.error(res.data.message || '获取票据列表失败')
    }
  } catch (error) {
    toast.error('获取票据列表失败')
  } finally {
    isLoading.value = false
  }
}

// 获取状态信息
function getStatusInfo(status: TicketStatus) {
  const statusMap: Record<TicketStatus, { label: string; class: string; icon: string }> = {
    pending: {
      label: '待审核',
      class: 'status-pending',
      icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    },
    confirmed: {
      label: '已确认',
      class: 'status-confirmed',
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    },
    used: {
      label: '已使用',
      class: 'status-used',
      icon: 'M5 13l4 4L19 7',
    },
    cancelled: {
      label: '已取消',
      class: 'status-cancelled',
      icon: 'M6 18L18 6M6 6l12 12',
    },
  }
  return statusMap[status] || { label: status, class: '', icon: '' }
}

// 格式化时间
function formatDateTime(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 跳转到活动详情
function goToActivity(activityId: number) {
  router.push(`/ticket/${activityId}`)
}

// 复制票据码
async function copyTicketCode(code: string) {
  try {
    await navigator.clipboard.writeText(code)
    toast.success('票据码已复制')
  } catch (error) {
    toast.error('复制失败，请手动复制')
  }
}

onMounted(() => {
  if (!userStore.isLoggedIn) {
    userStore.openLoginModal('请先登录以查看票据')
    router.push('/ticket')
    return
  }
  loadTickets()
})
</script>

<template>
  <div class="page-container">
    <PageHeader back-to="/ticket" />

    <main class="page-content">
      <div class="content-container">
        <!-- 桌面端面包屑 -->
        <div class="breadcrumb-wrapper">
          <PageBreadcrumb />
        </div>

        <!-- 页面标题 -->
        <div class="page-title-bar">
          <h1 class="page-title">我的票据</h1>
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
              <span class="count">{{ statusCounts.all }}</span>
            </button>
            <button
              class="status-tab"
              :class="{ active: statusFilter === 'pending' }"
              @click="statusFilter = 'pending'"
            >
              待审核
              <span class="count">{{ statusCounts.pending }}</span>
            </button>
            <button
              class="status-tab"
              :class="{ active: statusFilter === 'confirmed' }"
              @click="statusFilter = 'confirmed'"
            >
              已确认
              <span class="count">{{ statusCounts.confirmed }}</span>
            </button>
            <button
              class="status-tab"
              :class="{ active: statusFilter === 'used' }"
              @click="statusFilter = 'used'"
            >
              已使用
              <span class="count">{{ statusCounts.used }}</span>
            </button>
          </div>

          <!-- 空状态 -->
          <div v-if="filteredTickets.length === 0" class="empty-container">
            <div class="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
            </div>
            <h2>{{ statusFilter === 'all' ? '暂无票据' : '暂无相关票据' }}</h2>
            <p>{{ statusFilter === 'all' ? '去参加活动抢票吧' : '没有找到该状态的票据' }}</p>
            <button v-if="statusFilter === 'all'" class="browse-btn" @click="router.push('/ticket')">
              浏览活动
            </button>
          </div>

          <!-- 票据列表 -->
          <div v-else class="tickets-list">
            <div
              v-for="ticket in filteredTickets"
              :key="ticket.id"
              class="ticket-card"
              :class="getStatusInfo(ticket.status).class"
            >
              <!-- 票据头部 -->
              <div class="ticket-header">
                <div class="ticket-activity" @click="goToActivity(ticket.activityId)">
                  <h3 class="activity-name">{{ ticket.activityName }}</h3>
                  <span class="session-name">{{ ticket.sessionName }}</span>
                </div>
                <span class="ticket-status" :class="getStatusInfo(ticket.status).class">
                  {{ getStatusInfo(ticket.status).label }}
                </span>
              </div>

              <!-- 票据码 -->
              <div class="ticket-code-section">
                <div class="code-label">票据码</div>
                <div class="code-value" @click="copyTicketCode(ticket.ticketCode)">
                  {{ ticket.ticketCode }}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
                  </svg>
                </div>
                <div class="code-hint">点击复制</div>
              </div>

              <!-- 票据信息 -->
              <div class="ticket-info">
                <div class="info-row">
                  <span class="info-label">抢票时间</span>
                  <span class="info-value">{{ formatDateTime(ticket.createdAt) }}</span>
                </div>
                <div v-if="ticket.confirmedAt" class="info-row">
                  <span class="info-label">确认时间</span>
                  <span class="info-value">{{ formatDateTime(ticket.confirmedAt) }}</span>
                </div>
                <div v-if="ticket.usedAt" class="info-row">
                  <span class="info-label">使用时间</span>
                  <span class="info-value">{{ formatDateTime(ticket.usedAt) }}</span>
                </div>
                <div v-if="ticket.adminNote" class="info-row">
                  <span class="info-label">备注</span>
                  <span class="info-value note">{{ ticket.adminNote }}</span>
                </div>
              </div>

              <!-- 装饰性切口 -->
              <div class="ticket-cutout left"></div>
              <div class="ticket-cutout right"></div>
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
  padding: var(--spacing-md) 10px;
}

.content-container {
  max-width: 800px;
  margin: 0 auto;
}

/* ===== Breadcrumb ===== */
.breadcrumb-wrapper {
  display: none;
  margin-bottom: var(--spacing-lg);
}

/* ===== Page Title ===== */
.page-title-bar {
  margin-bottom: var(--spacing-lg);
  padding: 0 var(--spacing-xs);
}

.page-title {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
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
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-lg);
  padding: var(--spacing-xs);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow-x: auto;
}

.status-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.status-tab:hover {
  color: var(--color-text);
  background: var(--color-bg);
}

.status-tab.active {
  color: var(--color-primary);
  background: var(--color-primary-bg);
}

.status-tab .count {
  font-size: var(--text-xs);
  padding: 0 6px;
  background: var(--color-border);
  border-radius: var(--radius-full);
}

.status-tab.active .count {
  background: var(--color-primary);
  color: white;
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
  margin-bottom: var(--spacing-lg);
}

.browse-btn {
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

.browse-btn:hover {
  background: var(--color-primary-dark);
}

/* ===== Tickets List ===== */
.tickets-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

/* ===== Ticket Card ===== */
.ticket-card {
  position: relative;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: visible;
}

.ticket-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  border-radius: var(--radius-lg) 0 0 var(--radius-lg);
}

.ticket-card.status-pending::before {
  background: var(--color-warning);
}

.ticket-card.status-confirmed::before {
  background: var(--color-success);
}

.ticket-card.status-used::before {
  background: var(--color-text-secondary);
}

.ticket-card.status-cancelled::before {
  background: var(--color-error);
}

/* Ticket Cutout */
.ticket-cutout {
  position: absolute;
  width: 16px;
  height: 16px;
  background: var(--color-bg);
  border-radius: 50%;
  top: 50%;
  transform: translateY(-50%);
}

.ticket-cutout.left {
  left: -8px;
  border-right: 1px solid var(--color-border);
}

.ticket-cutout.right {
  right: -8px;
  border-left: 1px solid var(--color-border);
}

/* Ticket Header */
.ticket-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: var(--spacing-md);
  padding-left: calc(var(--spacing-md) + 4px);
  border-bottom: 1px dashed var(--color-border);
}

.ticket-activity {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.ticket-activity:hover .activity-name {
  color: var(--color-primary);
}

.activity-name {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  margin-bottom: 2px;
  transition: color var(--transition-fast);
}

.session-name {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.ticket-status {
  flex-shrink: 0;
  padding: 4px 8px;
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  border-radius: var(--radius-sm);
}

.ticket-status.status-pending {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.ticket-status.status-confirmed {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.ticket-status.status-used {
  background: var(--color-border);
  color: var(--color-text-secondary);
}

.ticket-status.status-cancelled {
  background: var(--color-error-bg);
  color: var(--color-error);
}

/* Ticket Code Section */
.ticket-code-section {
  padding: var(--spacing-lg) var(--spacing-md);
  padding-left: calc(var(--spacing-md) + 4px);
  text-align: center;
  border-bottom: 1px dashed var(--color-border);
}

.code-label {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xs);
}

.code-value {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  font-family: var(--font-family-mono);
  color: var(--color-primary);
  letter-spacing: 3px;
  cursor: pointer;
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.code-value:hover {
  background: var(--color-primary-bg);
}

.code-value svg {
  width: 18px;
  height: 18px;
  color: var(--color-text-placeholder);
}

.code-hint {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
  margin-top: var(--spacing-xs);
}

/* Ticket Info */
.ticket-info {
  padding: var(--spacing-md);
  padding-left: calc(var(--spacing-md) + 4px);
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: var(--spacing-xs) 0;
}

.info-row:not(:last-child) {
  border-bottom: 1px solid var(--color-border);
}

.info-label {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.info-value {
  font-size: var(--text-sm);
  color: var(--color-text);
  text-align: right;
}

.info-value.note {
  color: var(--color-text-secondary);
  font-style: italic;
}

/* ===== Desktop ===== */
@media (min-width: 1024px) {
  .breadcrumb-wrapper {
    display: block;
  }

  .page-content {
    padding: var(--spacing-xl);
  }

  .content-container {
    max-width: 900px;
  }

  .page-title {
    font-size: var(--text-2xl);
  }

  .status-tabs {
    gap: var(--spacing-sm);
  }

  .ticket-header {
    padding: var(--spacing-lg);
    padding-left: calc(var(--spacing-lg) + 4px);
  }

  .ticket-code-section {
    padding: var(--spacing-xl) var(--spacing-lg);
    padding-left: calc(var(--spacing-lg) + 4px);
  }

  .code-value {
    font-size: var(--text-3xl);
  }

  .ticket-info {
    padding: var(--spacing-lg);
    padding-left: calc(var(--spacing-lg) + 4px);
  }
}
</style>
