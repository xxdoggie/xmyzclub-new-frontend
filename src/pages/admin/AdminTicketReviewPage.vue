<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/composables/useToast'
import { getAdminActivityDetail, getReviewTickets, reviewTicket, batchReviewTickets, exportActivityTickets } from '@/api/ticket'
import type { TicketActivityDetail, AdminTicket, TicketStatus } from '@/types/ticket'
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb.vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const toast = useToast()

const activityId = computed(() => Number(route.params.id))

// 加载状态
const isLoading = ref(true)
const isProcessing = ref(false)

// 数据
const activity = ref<TicketActivityDetail | null>(null)
const tickets = ref<AdminTicket[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

// 筛选
const statusFilter = ref<TicketStatus | 'all'>('pending')
const sessionFilter = ref<number | 'all'>('all')

// 导出状态
const isExporting = ref(false)

// 批量选择
const selectedIds = ref<number[]>([])
const isAllSelected = computed(() => {
  if (tickets.value.length === 0) return false
  return tickets.value.every((t) => selectedIds.value.includes(t.id))
})

// 审核弹窗
const showReviewModal = ref(false)
const reviewAction = ref<'approve' | 'reject'>('approve')
const reviewNote = ref('')
const reviewTargetIds = ref<number[]>([])

// 加载活动信息
async function loadActivity() {
  try {
    const res = await getAdminActivityDetail(activityId.value)
    if (res.data.code === 200) {
      activity.value = res.data.data
    } else {
      toast.error(res.data.message || '获取活动信息失败')
      router.push('/admin/tickets')
    }
  } catch (error) {
    toast.error('获取活动信息失败')
    router.push('/admin/tickets')
  }
}

// 加载票据列表
async function loadTickets() {
  try {
    const status = statusFilter.value === 'all' ? undefined : statusFilter.value
    const sessionId = sessionFilter.value === 'all' ? undefined : sessionFilter.value
    const res = await getReviewTickets(activityId.value, page.value, pageSize.value, status, sessionId)
    if (res.data.code === 200) {
      tickets.value = res.data.data.tickets
      total.value = res.data.data.total
    } else {
      toast.error(res.data.message || '获取票据列表失败')
    }
  } catch (error) {
    toast.error('获取票据列表失败')
  } finally {
    isLoading.value = false
  }
}

// 初始加载
async function loadAll() {
  isLoading.value = true
  await loadActivity()
  await loadTickets()
}

// 切换全选
function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedIds.value = []
  } else {
    selectedIds.value = tickets.value.map((t) => t.id)
  }
}

// 切换单个选择
function toggleSelect(id: number) {
  const index = selectedIds.value.indexOf(id)
  if (index > -1) {
    selectedIds.value.splice(index, 1)
  } else {
    selectedIds.value.push(id)
  }
}

// 打开审核弹窗（单个）
function openReviewSingle(ticket: AdminTicket, action: 'approve' | 'reject') {
  reviewTargetIds.value = [ticket.id]
  reviewAction.value = action
  reviewNote.value = ''
  showReviewModal.value = true
}

// 打开批量审核弹窗
function openBatchReview(action: 'approve' | 'reject') {
  if (selectedIds.value.length === 0) {
    toast.error('请先选择票据')
    return
  }
  reviewTargetIds.value = [...selectedIds.value]
  reviewAction.value = action
  reviewNote.value = ''
  showReviewModal.value = true
}

// 确认审核
async function confirmReview() {
  if (reviewTargetIds.value.length === 0) return

  isProcessing.value = true
  try {
    if (reviewTargetIds.value.length === 1) {
      // 单个审核
      const targetId = reviewTargetIds.value[0]
      if (targetId === undefined) return
      const res = await reviewTicket(targetId, {
        action: reviewAction.value,
        adminNote: reviewNote.value || undefined,
      })
      if (res.data.code === 200) {
        toast.success('审核成功')
        showReviewModal.value = false
        selectedIds.value = []
        loadTickets()
      } else {
        toast.error(res.data.message || '审核失败')
      }
    } else {
      // 批量审核
      const res = await batchReviewTickets({
        ticketIds: reviewTargetIds.value,
        action: reviewAction.value,
        adminNote: reviewNote.value || undefined,
      })
      if (res.data.code === 200) {
        toast.success(`审核完成：成功 ${res.data.data.success_count} 张，失败 ${res.data.data.failed_count} 张`)
        showReviewModal.value = false
        selectedIds.value = []
        loadTickets()
      } else {
        toast.error(res.data.message || '审核失败')
      }
    }
  } catch (error) {
    toast.error('审核失败')
  } finally {
    isProcessing.value = false
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

// 格式化日期时间
function formatDateTime(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 复制票码
function copyTicketCode(code: string) {
  navigator.clipboard.writeText(code).then(() => {
    toast.success('已复制票码')
  })
}

// 导出票据
async function handleExport() {
  if (isExporting.value) return

  isExporting.value = true
  try {
    const status = statusFilter.value === 'all' ? undefined : statusFilter.value
    const sessionId = sessionFilter.value === 'all' ? undefined : sessionFilter.value
    const result = await exportActivityTickets(activityId.value, status, sessionId)

    if (result.success) {
      toast.success('导出成功')
    } else {
      toast.error(result.error || '导出失败，请稍后重试')
    }
  } catch (error) {
    toast.error('导出失败，请稍后重试')
  } finally {
    isExporting.value = false
  }
}

// 监听筛选变化
watch(statusFilter, () => {
  page.value = 1
  selectedIds.value = []
  loadTickets()
})

watch(sessionFilter, () => {
  page.value = 1
  selectedIds.value = []
  loadTickets()
})

onMounted(() => {
  if (!userStore.isLoggedIn || !userStore.canManageTickets) {
    toast.error('无权访问此页面')
    router.push('/')
    return
  }
  loadAll()
})
</script>

<template>
  <div class="page-container">
    <PageHeader :back-to="`/admin/tickets/${activityId}`" />

    <main class="page-content">
      <div class="content-container">
        <!-- 桌面端面包屑 -->
        <div class="breadcrumb-wrapper">
          <PageBreadcrumb />
        </div>

        <!-- 加载状态 -->
        <div v-if="isLoading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>

        <template v-else>
          <!-- 页面标题 -->
          <div class="page-header-section">
            <h1 class="page-title">审票管理</h1>
            <p class="page-subtitle">{{ activity?.name }}</p>
          </div>

          <!-- 状态筛选 -->
          <div class="filter-section">
            <div class="filter-row">
              <div class="status-tabs">
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
                <button
                  class="status-tab"
                  :class="{ active: statusFilter === 'all' }"
                  @click="statusFilter = 'all'"
                >
                  全部
                </button>
              </div>
              <button class="export-btn" @click="handleExport" :disabled="isExporting">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                {{ isExporting ? '导出中...' : '导出' }}
              </button>
            </div>
            <!-- 档期筛选 -->
            <div v-if="activity && activity.sessions.length > 1" class="session-filter">
              <label class="filter-label">档期：</label>
              <select v-model="sessionFilter" class="filter-select">
                <option value="all">全部档期</option>
                <option v-for="session in activity.sessions" :key="session.id" :value="session.id">
                  {{ session.name }}
                </option>
              </select>
            </div>
          </div>

          <!-- 批量操作栏 -->
          <div v-if="tickets.length > 0 && statusFilter === 'pending'" class="batch-actions">
            <label class="select-all">
              <input
                type="checkbox"
                :checked="isAllSelected"
                @change="toggleSelectAll"
              />
              <span>全选</span>
            </label>
            <div class="batch-buttons">
              <button
                class="batch-btn approve"
                :disabled="selectedIds.length === 0"
                @click="openBatchReview('approve')"
              >
                批量通过 ({{ selectedIds.length }})
              </button>
              <button
                class="batch-btn reject"
                :disabled="selectedIds.length === 0"
                @click="openBatchReview('reject')"
              >
                批量驳回 ({{ selectedIds.length }})
              </button>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-if="tickets.length === 0" class="empty-container">
            <div class="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M9 12l2 2 4-4"></path>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              </svg>
            </div>
            <h2>暂无票据</h2>
            <p>没有{{ statusFilter === 'all' ? '' : '该状态的' }}票据</p>
          </div>

          <!-- 票据列表 -->
          <div v-else class="tickets-list">
            <div
              v-for="ticket in tickets"
              :key="ticket.id"
              class="ticket-card"
              :class="{ selected: selectedIds.includes(ticket.id) }"
            >
              <!-- 选择框 -->
              <div v-if="statusFilter === 'pending'" class="ticket-checkbox">
                <input
                  type="checkbox"
                  :checked="selectedIds.includes(ticket.id)"
                  @change="toggleSelect(ticket.id)"
                />
              </div>

              <!-- 票据信息 -->
              <div class="ticket-info">
                <div class="ticket-header">
                  <span class="ticket-code" @click="copyTicketCode(ticket.ticketCode)">
                    {{ ticket.ticketCode }}
                  </span>
                  <span class="status-badge" :class="getStatusInfo(ticket.status).class">
                    {{ getStatusInfo(ticket.status).label }}
                  </span>
                </div>
                <div class="ticket-user">
                  <span class="user-name">{{ ticket.nickname || ticket.username }}</span>
                  <span class="user-id">@{{ ticket.username }}</span>
                </div>
                <div class="ticket-meta">
                  <span>{{ ticket.sessionName }}</span>
                  <span class="meta-divider">·</span>
                  <span>{{ formatDateTime(ticket.createdAt) }}</span>
                </div>
                <div v-if="ticket.userInfo && Object.keys(ticket.userInfo).length > 0" class="ticket-extra">
                  <span v-for="(value, key) in ticket.userInfo" :key="key" class="extra-item">
                    {{ key }}: {{ value }}
                  </span>
                </div>
              </div>

              <!-- 操作按钮 -->
              <div v-if="ticket.status === 'pending'" class="ticket-actions">
                <button
                  class="action-btn approve"
                  @click="openReviewSingle(ticket, 'approve')"
                >
                  通过
                </button>
                <button
                  class="action-btn reject"
                  @click="openReviewSingle(ticket, 'reject')"
                >
                  驳回
                </button>
              </div>
            </div>
          </div>

          <!-- 分页 -->
          <div v-if="total > pageSize" class="pagination">
            <button
              class="page-btn"
              :disabled="page === 1"
              @click="page--; loadTickets()"
            >
              上一页
            </button>
            <span class="page-info">{{ page }} / {{ Math.ceil(total / pageSize) }}</span>
            <button
              class="page-btn"
              :disabled="page >= Math.ceil(total / pageSize)"
              @click="page++; loadTickets()"
            >
              下一页
            </button>
          </div>
        </template>
      </div>
    </main>

    <PageFooter />

    <!-- 审核弹窗 -->
    <div v-if="showReviewModal" class="modal-overlay" @click.self="showReviewModal = false">
      <div class="modal-content">
        <h3 class="modal-title">
          {{ reviewAction === 'approve' ? '确认通过' : '确认驳回' }}
        </h3>
        <p class="modal-desc">
          {{ reviewTargetIds.length === 1 ? '即将审核 1 张票据' : `即将批量审核 ${reviewTargetIds.length} 张票据` }}
        </p>
        <div class="form-group">
          <label class="form-label">备注（可选）</label>
          <textarea
            v-model="reviewNote"
            class="form-textarea"
            placeholder="添加审核备注..."
            rows="2"
          ></textarea>
        </div>
        <div class="modal-actions">
          <button class="modal-btn cancel" @click="showReviewModal = false" :disabled="isProcessing">
            取消
          </button>
          <button
            class="modal-btn confirm"
            :class="{ danger: reviewAction === 'reject' }"
            @click="confirmReview"
            :disabled="isProcessing"
          >
            {{ isProcessing ? '处理中...' : (reviewAction === 'approve' ? '确认通过' : '确认驳回') }}
          </button>
        </div>
      </div>
    </div>
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
  max-width: 700px;
  margin: 0 auto;
}

/* ===== Breadcrumb ===== */
.breadcrumb-wrapper {
  display: none;
  margin-bottom: var(--spacing-lg);
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

/* ===== Filter ===== */
.filter-section {
  margin-bottom: var(--spacing-md);
}

.filter-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.status-tabs {
  display: flex;
  gap: 2px;
  padding: 3px;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow-x: auto;
  flex: 1;
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

.export-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-primary);
  background: var(--color-primary-bg);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.export-btn svg {
  width: 14px;
  height: 14px;
}

.export-btn:hover:not(:disabled) {
  background: var(--color-primary);
  color: white;
}

.export-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.session-filter {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  margin-top: var(--spacing-sm);
}

.filter-label {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.filter-select {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--text-xs);
  color: var(--color-text);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
}

/* ===== Batch Actions ===== */
.batch-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-md);
}

.select-all {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--text-sm);
  cursor: pointer;
}

.batch-buttons {
  display: flex;
  gap: var(--spacing-xs);
}

.batch-btn {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.batch-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.batch-btn.approve {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.batch-btn.approve:hover:not(:disabled) {
  background: var(--color-success);
  color: white;
}

.batch-btn.reject {
  background: var(--color-error-bg);
  color: var(--color-error);
}

.batch-btn.reject:hover:not(:disabled) {
  background: var(--color-error);
  color: white;
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

/* ===== Tickets List ===== */
.tickets-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.ticket-card {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast);
}

.ticket-card.selected {
  border-color: var(--color-primary);
  background: var(--color-primary-bg);
}

.ticket-checkbox {
  display: flex;
  align-items: center;
  padding-top: 2px;
}

.ticket-checkbox input {
  width: 18px;
  height: 18px;
}

.ticket-info {
  flex: 1;
  min-width: 0;
}

.ticket-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: 4px;
}

.ticket-code {
  font-family: monospace;
  font-size: var(--text-base);
  font-weight: var(--font-bold);
  color: var(--color-primary);
  cursor: pointer;
}

.ticket-code:hover {
  text-decoration: underline;
}

.ticket-user {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  margin-bottom: 4px;
}

.user-name {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.user-id {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.ticket-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
}

.meta-divider {
  color: var(--color-border);
}

.ticket-extra {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
  margin-top: var(--spacing-xs);
}

.extra-item {
  font-size: var(--text-xs);
  padding: 2px 6px;
  background: var(--color-border);
  border-radius: var(--radius-sm);
}

.ticket-actions {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.action-btn {
  padding: 6px 12px;
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.action-btn.approve {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.action-btn.approve:hover {
  background: var(--color-success);
  color: white;
}

.action-btn.reject {
  background: var(--color-error-bg);
  color: var(--color-error);
}

.action-btn.reject:hover {
  background: var(--color-error);
  color: white;
}

/* ===== Status Badge ===== */
.status-badge {
  font-size: 10px;
  font-weight: var(--font-semibold);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}

.status-badge.status-pending {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.status-badge.status-confirmed {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.status-badge.status-used {
  background: var(--color-info-bg);
  color: var(--color-info);
}

.status-badge.status-cancelled {
  background: var(--color-error-bg);
  color: var(--color-error);
}

/* ===== Pagination ===== */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--spacing-md);
  margin-top: var(--spacing-lg);
}

.page-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  font-size: var(--text-sm);
  color: var(--color-text);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

/* ===== Modal ===== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--spacing-md);
}

.modal-content {
  background: var(--color-card);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  max-width: 400px;
  width: 100%;
}

.modal-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-sm);
}

.modal-desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-md);
}

.form-group {
  margin-bottom: var(--spacing-md);
}

.form-label {
  display: block;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  margin-bottom: var(--spacing-xs);
}

.form-textarea {
  width: 100%;
  padding: var(--spacing-sm);
  font-size: var(--text-sm);
  color: var(--color-text);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  resize: vertical;
}

.modal-actions {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: flex-end;
}

.modal-btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.modal-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.modal-btn.cancel {
  background: var(--color-border);
  color: var(--color-text);
}

.modal-btn.confirm {
  background: var(--color-success);
  color: white;
}

.modal-btn.confirm.danger {
  background: var(--color-error);
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

  .ticket-actions {
    flex-direction: row;
  }
}
</style>
