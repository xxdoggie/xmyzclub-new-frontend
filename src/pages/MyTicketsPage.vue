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
  const statusMap: Record<TicketStatus, { label: string; class: string }> = {
    pending: { label: '待审核', class: 'status-pending' },
    confirmed: { label: '已确认', class: 'status-confirmed' },
    used: { label: '已使用', class: 'status-used' },
    cancelled: { label: '已取消', class: 'status-cancelled' },
  }
  return statusMap[status] || { label: status, class: '' }
}

// 跳转到活动详情
function goToActivity(activityId: number) {
  router.push(`/ticket/${activityId}`)
}

// 复制票据码
async function copyTicketCode(code: string, event: Event) {
  event.stopPropagation()
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

        <!-- 桌面端页面标题 -->
        <h1 class="page-title desktop-only">我的票据</h1>

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
              :class="{ active: statusFilter === 'pending' }"
              @click="statusFilter = 'pending'"
            >
              待审核
            </button>
            <button
              class="status-tab"
              :class="{ active: statusFilter === 'confirmed' }"
              @click="statusFilter = 'confirmed'"
            >
              已确认
            </button>
            <button
              class="status-tab"
              :class="{ active: statusFilter === 'used' }"
              @click="statusFilter = 'used'"
            >
              已使用
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
              @click="goToActivity(ticket.activityId)"
            >
              <!-- 左侧状态指示条 -->
              <div class="ticket-indicator"></div>

              <!-- 票据主体内容 -->
              <div class="ticket-main">
                <div class="ticket-info">
                  <div class="ticket-title">{{ ticket.activityName }}</div>
                  <div class="ticket-subtitle">{{ ticket.sessionName }}</div>
                </div>
                <div class="ticket-right">
                  <div class="ticket-code" @click="copyTicketCode(ticket.ticketCode, $event)">
                    {{ ticket.ticketCode }}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
                    </svg>
                  </div>
                  <div class="ticket-status" :class="getStatusInfo(ticket.status).class">
                    {{ getStatusInfo(ticket.status).label }}
                  </div>
                </div>
              </div>

              <!-- 装饰性切口 -->
              <div class="ticket-notch top"></div>
              <div class="ticket-notch bottom"></div>
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
  max-width: 800px;
  margin: 0 auto;
}

/* ===== Breadcrumb ===== */
.breadcrumb-wrapper {
  display: none;
  margin-bottom: var(--spacing-lg);
}

/* ===== Page Title ===== */
.page-title {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-lg);
}

.desktop-only {
  display: none;
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
}

.status-tab {
  flex: 1;
  padding: var(--spacing-xs) 0;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: center;
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
  margin-bottom: var(--spacing-md);
}

.browse-btn {
  padding: var(--spacing-xs) var(--spacing-lg);
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
  gap: var(--spacing-sm);
}

/* ===== Ticket Card - Compact Horizontal Style ===== */
.ticket-card {
  position: relative;
  display: flex;
  align-items: stretch;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: visible;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.ticket-card:hover {
  border-color: var(--color-primary);
}

.ticket-card:active {
  background: var(--color-bg);
}

/* Status indicator bar on the left */
.ticket-indicator {
  width: 4px;
  flex-shrink: 0;
  border-radius: var(--radius-lg) 0 0 var(--radius-lg);
}

.ticket-card.status-pending .ticket-indicator {
  background: var(--color-warning);
}

.ticket-card.status-confirmed .ticket-indicator {
  background: var(--color-success);
}

.ticket-card.status-used .ticket-indicator {
  background: var(--color-text-secondary);
}

.ticket-card.status-cancelled .ticket-indicator {
  background: var(--color-error);
}

/* Main content area */
.ticket-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  gap: var(--spacing-md);
  min-width: 0;
}

.ticket-info {
  flex: 1;
  min-width: 0;
}

.ticket-title {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 2px;
}

.ticket-subtitle {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ticket-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}

.ticket-code {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  font-family: var(--font-family-mono);
  color: var(--color-primary);
  letter-spacing: 1px;
  padding: 2px 6px;
  background: var(--color-primary-bg);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.ticket-code:hover {
  background: var(--color-primary);
  color: white;
}

.ticket-code:hover svg {
  color: white;
}

.ticket-code svg {
  width: 12px;
  height: 12px;
  color: var(--color-primary);
}

.ticket-status {
  font-size: 10px;
  font-weight: var(--font-medium);
  padding: 2px 6px;
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

/* Decorative notches */
.ticket-notch {
  position: absolute;
  right: -6px;
  width: 12px;
  height: 12px;
  background: var(--color-bg);
  border-radius: 50%;
  border-left: 1px solid var(--color-border);
}

.ticket-notch.top {
  top: 8px;
}

.ticket-notch.bottom {
  bottom: 8px;
}

/* ===== Desktop ===== */
@media (min-width: 1024px) {
  .breadcrumb-wrapper {
    display: block;
  }

  .desktop-only {
    display: block;
  }

  .page-content {
    padding: var(--spacing-xl);
  }

  .content-container {
    max-width: 900px;
  }

  .status-tabs {
    gap: var(--spacing-xs);
    padding: var(--spacing-xs);
  }

  .status-tab {
    padding: var(--spacing-sm) var(--spacing-md);
  }

  .tickets-list {
    gap: var(--spacing-md);
  }

  .ticket-main {
    padding: var(--spacing-md) var(--spacing-lg);
  }

  .ticket-title {
    font-size: var(--text-base);
  }

  .ticket-subtitle {
    font-size: var(--text-sm);
  }

  .ticket-code {
    font-size: var(--text-base);
    padding: 4px 10px;
  }

  .ticket-code svg {
    width: 14px;
    height: 14px;
  }

  .ticket-status {
    font-size: var(--text-xs);
    padding: 3px 8px;
  }
}
</style>
