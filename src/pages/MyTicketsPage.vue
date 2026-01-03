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

// 标签页索引（用于滑块动画）
const tabIndex = computed(() => {
  const tabs = ['all', 'pending', 'confirmed', 'used']
  return tabs.indexOf(statusFilter.value)
})

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
            <!-- 滑块指示器 -->
            <div class="tab-slider" :style="{ transform: `translateX(${tabIndex * 100}%)` }"></div>
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
              <!-- 左侧圆形切口 -->
              <div class="ticket-punch left"></div>

              <!-- 左侧信息区域 -->
              <div class="ticket-left">
                <div class="ticket-status-badge" :class="getStatusInfo(ticket.status).class">
                  {{ getStatusInfo(ticket.status).label }}
                </div>
                <div class="ticket-title">{{ ticket.activityName }}</div>
                <div class="ticket-subtitle">{{ ticket.sessionName }}</div>
              </div>

              <!-- 虚线分隔 -->
              <div class="ticket-divider">
                <div class="divider-line"></div>
              </div>

              <!-- 右侧票码区域 -->
              <div class="ticket-right" @click="copyTicketCode(ticket.ticketCode, $event)">
                <div class="ticket-code-label">票码</div>
                <div class="ticket-code">{{ ticket.ticketCode }}</div>
                <div class="ticket-copy-hint">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
                  </svg>
                  点击复制
                </div>
              </div>

              <!-- 右侧圆形切口 -->
              <div class="ticket-punch right"></div>
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
  position: relative;
  display: flex;
  margin-bottom: var(--spacing-lg);
  padding: 4px;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.tab-slider {
  position: absolute;
  top: 4px;
  left: 4px;
  width: calc(25% - 2px);
  height: calc(100% - 8px);
  background: var(--color-primary-bg);
  border-radius: var(--radius-md);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 0;
}

.status-tab {
  flex: 1;
  position: relative;
  z-index: 1;
  padding: var(--spacing-sm) 0;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: color var(--transition-fast);
  text-align: center;
}

.status-tab:hover {
  color: var(--color-text);
}

.status-tab.active {
  color: var(--color-primary);
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
  gap: var(--spacing-md);
}

/* ===== Ticket Card - Cinema Style ===== */
.ticket-card {
  position: relative;
  display: flex;
  align-items: stretch;
  background: var(--color-card);
  border-radius: var(--radius-lg);
  overflow: visible;
  cursor: pointer;
  transition: all var(--transition-fast);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  min-height: 100px;
}

.ticket-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
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

.ticket-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.ticket-card:active {
  transform: translateY(0);
}

/* Circular punch holes */
.ticket-punch {
  position: absolute;
  width: 16px;
  height: 16px;
  background: var(--color-bg);
  border-radius: 50%;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
}

.ticket-punch.left {
  left: -8px;
  box-shadow: inset -2px 0 4px rgba(0, 0, 0, 0.08);
}

.ticket-punch.right {
  right: -8px;
  box-shadow: inset 2px 0 4px rgba(0, 0, 0, 0.08);
}

/* Left info section */
.ticket-left {
  flex: 1;
  padding: var(--spacing-md) var(--spacing-sm) var(--spacing-md) var(--spacing-lg);
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
}

.ticket-status-badge {
  font-size: 10px;
  font-weight: var(--font-semibold);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  width: fit-content;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.ticket-status-badge.status-pending {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.ticket-status-badge.status-confirmed {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.ticket-status-badge.status-used {
  background: var(--color-border);
  color: var(--color-text-secondary);
}

.ticket-status-badge.status-cancelled {
  background: var(--color-error-bg);
  color: var(--color-error);
}

.ticket-title {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ticket-subtitle {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Dashed divider */
.ticket-divider {
  width: 1px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-sm) 0;
}

.divider-line {
  width: 1px;
  height: 100%;
  background: repeating-linear-gradient(
    to bottom,
    var(--color-border) 0,
    var(--color-border) 4px,
    transparent 4px,
    transparent 8px
  );
}

/* Right code section */
.ticket-right {
  width: 90px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-sm) var(--spacing-md) var(--spacing-sm) var(--spacing-sm);
  text-align: center;
  cursor: pointer;
  transition: all var(--transition-fast);
  border-radius: 0 var(--radius-lg) var(--radius-lg) 0;
}

.ticket-right:hover {
  background: var(--color-primary-bg);
}

.ticket-right:hover .ticket-code {
  color: var(--color-primary);
}

.ticket-code-label {
  font-size: 10px;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 2px;
}

.ticket-code {
  font-size: var(--text-base);
  font-weight: var(--font-bold);
  font-family: var(--font-family-mono);
  color: var(--color-text);
  letter-spacing: 1px;
  transition: color var(--transition-fast);
}

.ticket-copy-hint {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 9px;
  color: var(--color-text-tertiary);
  margin-top: 4px;
}

.ticket-copy-hint svg {
  width: 10px;
  height: 10px;
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
    padding: 5px;
  }

  .tab-slider {
    top: 5px;
    left: 5px;
    width: calc(25% - 2.5px);
    height: calc(100% - 10px);
  }

  .status-tab {
    padding: var(--spacing-sm) var(--spacing-md);
  }

  .tickets-list {
    gap: var(--spacing-lg);
  }

  .ticket-card {
    min-height: 110px;
  }

  .ticket-punch {
    width: 20px;
    height: 20px;
  }

  .ticket-punch.left {
    left: -10px;
  }

  .ticket-punch.right {
    right: -10px;
  }

  .ticket-left {
    padding: var(--spacing-md) var(--spacing-md) var(--spacing-md) var(--spacing-lg);
    gap: 6px;
  }

  .ticket-status-badge {
    font-size: var(--text-xs);
    padding: 3px 10px;
  }

  .ticket-title {
    font-size: var(--text-base);
  }

  .ticket-subtitle {
    font-size: var(--text-sm);
  }

  .ticket-right {
    width: 120px;
    padding: var(--spacing-md) var(--spacing-lg) var(--spacing-md) var(--spacing-md);
  }

  .ticket-code-label {
    font-size: var(--text-xs);
  }

  .ticket-code {
    font-size: var(--text-lg);
  }

  .ticket-copy-hint {
    font-size: 10px;
  }

  .ticket-copy-hint svg {
    width: 12px;
    height: 12px;
  }
}
</style>
