<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/composables/useToast'
import { verifyTicket, useTicket } from '@/api/ticket'
import type { VerifyTicketResponse, TicketStatus } from '@/types/ticket'
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb.vue'

const router = useRouter()
const userStore = useUserStore()
const toast = useToast()

// 输入状态
const ticketCode = ref('')
const isSearching = ref(false)
const isUsing = ref(false)

// 票据信息
const ticket = ref<VerifyTicketResponse | null>(null)
const searchError = ref('')

// 核销结果
const showResult = ref(false)
const resultSuccess = ref(false)
const resultMessage = ref('')
const resultDetails = ref<{
  userName?: string
  activityName?: string
  sessionName?: string
  usedAt?: string
}>({})

// 输入框引用
const inputRef = ref<HTMLInputElement | null>(null)

// 搜索票据
async function searchTicket() {
  const code = ticketCode.value.trim().toUpperCase()
  if (!code) {
    toast.error('请输入票码')
    return
  }
  if (code.length !== 5) {
    toast.error('票码应为5位')
    return
  }

  isSearching.value = true
  searchError.value = ''
  ticket.value = null

  try {
    const res = await verifyTicket(code)
    if (res.data.code === 200) {
      ticket.value = res.data.data
    } else {
      searchError.value = res.data.message || '未找到票据'
    }
  } catch (error) {
    searchError.value = '查询失败，请重试'
  } finally {
    isSearching.value = false
  }
}

// 核销票据
async function confirmUseTicket() {
  if (!ticket.value) return

  isUsing.value = true
  try {
    const res = await useTicket(ticket.value.ticketCode)
    if (res.data.code === 200) {
      const data = res.data.data
      if (data.success) {
        resultSuccess.value = true
        resultMessage.value = data.message || '核销成功'
        resultDetails.value = {
          userName: data.userName,
          activityName: data.activityName,
          sessionName: data.sessionName,
          usedAt: data.usedAt,
        }
      } else {
        resultSuccess.value = false
        resultMessage.value = data.message || '核销失败'
      }
      showResult.value = true
    } else {
      toast.error(res.data.message || '核销失败')
    }
  } catch (error) {
    toast.error('核销失败，请重试')
  } finally {
    isUsing.value = false
  }
}

// 重置
function resetSearch() {
  ticketCode.value = ''
  ticket.value = null
  searchError.value = ''
  showResult.value = false
  resultSuccess.value = false
  resultMessage.value = ''
  resultDetails.value = {}
  nextTick(() => {
    inputRef.value?.focus()
  })
}

// 继续验票
function continueVerify() {
  showResult.value = false
  ticketCode.value = ''
  ticket.value = null
  nextTick(() => {
    inputRef.value?.focus()
  })
}

// 获取状态信息
function getStatusInfo(status: TicketStatus) {
  const statusMap: Record<TicketStatus, { label: string; class: string; canUse: boolean }> = {
    pending: { label: '待审核', class: 'status-pending', canUse: false },
    confirmed: { label: '已确认', class: 'status-confirmed', canUse: true },
    used: { label: '已使用', class: 'status-used', canUse: false },
    cancelled: { label: '已取消', class: 'status-cancelled', canUse: false },
  }
  return statusMap[status] || { label: status, class: '', canUse: false }
}

// 格式化日期时间
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

// 处理回车键
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    searchTicket()
  }
}

onMounted(() => {
  if (!userStore.isLoggedIn || !userStore.canManageTickets) {
    toast.error('无权访问此页面')
    router.push('/')
    return
  }
  inputRef.value?.focus()
})
</script>

<template>
  <div class="page-container">
    <PageHeader back-to="/admin/tickets" />

    <main class="page-content">
      <div class="content-container">
        <!-- 桌面端面包屑 -->
        <div class="breadcrumb-wrapper">
          <PageBreadcrumb />
        </div>

        <!-- 页面标题 -->
        <div class="page-header-section">
          <h1 class="page-title">验票核销</h1>
          <p class="page-subtitle">输入票码查询并核销票据</p>
        </div>

        <!-- 核销结果 -->
        <div v-if="showResult" class="result-section">
          <div class="result-card" :class="{ success: resultSuccess, error: !resultSuccess }">
            <div class="result-icon">
              <svg v-if="resultSuccess" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
            </div>
            <h2 class="result-title">{{ resultMessage }}</h2>
            <div v-if="resultSuccess && resultDetails.userName" class="result-details">
              <p><strong>用户：</strong>{{ resultDetails.userName }}</p>
              <p><strong>活动：</strong>{{ resultDetails.activityName }}</p>
              <p><strong>档期：</strong>{{ resultDetails.sessionName }}</p>
              <p v-if="resultDetails.usedAt"><strong>核销时间：</strong>{{ formatDateTime(resultDetails.usedAt) }}</p>
            </div>
            <button class="continue-btn" @click="continueVerify">
              继续验票
            </button>
          </div>
        </div>

        <!-- 搜索区域 -->
        <template v-else>
          <div class="search-section">
            <div class="search-box">
              <input
                ref="inputRef"
                v-model="ticketCode"
                type="text"
                class="search-input"
                placeholder="请输入5位票码"
                maxlength="5"
                @keydown="handleKeydown"
              />
              <button
                class="search-btn"
                @click="searchTicket"
                :disabled="isSearching"
              >
                {{ isSearching ? '查询中...' : '查询' }}
              </button>
            </div>
            <p class="search-hint">输入票码后按回车或点击查询按钮</p>
          </div>

          <!-- 错误信息 -->
          <div v-if="searchError" class="error-section">
            <div class="error-card">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <p>{{ searchError }}</p>
              <button class="retry-btn" @click="resetSearch">重新输入</button>
            </div>
          </div>

          <!-- 票据信息 -->
          <div v-if="ticket" class="ticket-section">
            <div class="ticket-card">
              <div class="ticket-header">
                <div class="ticket-code">{{ ticket.ticketCode }}</div>
                <span class="status-badge" :class="getStatusInfo(ticket.status).class">
                  {{ getStatusInfo(ticket.status).label }}
                </span>
              </div>

              <div class="ticket-info">
                <div class="info-row">
                  <span class="info-label">用户</span>
                  <span class="info-value">{{ ticket.nickname || ticket.username }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">活动</span>
                  <span class="info-value">{{ ticket.activityName }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">档期</span>
                  <span class="info-value">{{ ticket.sessionName }}</span>
                </div>
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
              </div>

              <!-- 额外信息 -->
              <div v-if="ticket.userInfo && Object.keys(ticket.userInfo).length > 0" class="extra-info">
                <h3 class="extra-title">用户填写信息</h3>
                <div class="extra-content">
                  <div v-for="(value, key) in ticket.userInfo" :key="key" class="extra-row">
                    <span class="extra-label">{{ key }}</span>
                    <span class="extra-value">{{ value }}</span>
                  </div>
                </div>
              </div>

              <!-- 操作按钮 -->
              <div class="ticket-actions">
                <button class="reset-btn" @click="resetSearch">
                  重新查询
                </button>
                <button
                  v-if="getStatusInfo(ticket.status).canUse"
                  class="use-btn"
                  @click="confirmUseTicket"
                  :disabled="isUsing"
                >
                  {{ isUsing ? '核销中...' : '确认核销' }}
                </button>
                <div v-else class="status-hint">
                  <template v-if="ticket.status === 'pending'">
                    该票据尚未审核通过，无法核销
                  </template>
                  <template v-else-if="ticket.status === 'used'">
                    该票据已于 {{ formatDateTime(ticket.usedAt!) }} 使用
                  </template>
                  <template v-else-if="ticket.status === 'cancelled'">
                    该票据已被取消
                  </template>
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
  max-width: 500px;
  margin: 0 auto;
}

/* ===== Breadcrumb ===== */
.breadcrumb-wrapper {
  display: none;
  margin-bottom: var(--spacing-lg);
}

/* ===== Page Header ===== */
.page-header-section {
  display: none;
  text-align: center;
  margin-bottom: var(--spacing-xl);
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

/* ===== Search ===== */
.search-section {
  margin-bottom: var(--spacing-lg);
}

.search-box {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.search-input {
  flex: 1;
  padding: var(--spacing-md);
  font-size: var(--text-lg);
  font-family: monospace;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.3em;
  color: var(--color-text);
  background: var(--color-card);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast);
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.search-input::placeholder {
  letter-spacing: normal;
  text-transform: none;
}

.search-btn {
  padding: var(--spacing-md) var(--spacing-lg);
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  color: white;
  background: var(--color-primary);
  border: none;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
  width: 100%;
}

.search-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.search-btn:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.search-hint {
  text-align: center;
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
  margin-top: var(--spacing-sm);
}

/* ===== Error ===== */
.error-section {
  margin-bottom: var(--spacing-lg);
}

.error-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--spacing-xl);
  background: var(--color-error-bg);
  border: 1px solid var(--color-error);
  border-radius: var(--radius-lg);
  text-align: center;
}

.error-card svg {
  width: 48px;
  height: 48px;
  color: var(--color-error);
  margin-bottom: var(--spacing-md);
}

.error-card p {
  font-size: var(--text-base);
  color: var(--color-error);
  margin-bottom: var(--spacing-md);
}

.retry-btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-error);
  background: white;
  border: 1px solid var(--color-error);
  border-radius: var(--radius-md);
  cursor: pointer;
}

/* ===== Ticket ===== */
.ticket-section {
  margin-bottom: var(--spacing-lg);
}

.ticket-card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.ticket-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  background: var(--color-primary-bg);
  border-bottom: 1px solid var(--color-border);
}

.ticket-code {
  font-family: monospace;
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-primary);
  letter-spacing: 0.2em;
}

.ticket-info {
  padding: var(--spacing-md);
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: var(--spacing-sm) 0;
  border-bottom: 1px solid var(--color-border);
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.info-value {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.extra-info {
  padding: var(--spacing-md);
  border-top: 1px solid var(--color-border);
  background: var(--color-bg);
}

.extra-title {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-sm);
}

.extra-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.extra-row {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-sm);
}

.extra-label {
  color: var(--color-text-secondary);
}

.ticket-actions {
  display: flex;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  border-top: 1px solid var(--color-border);
}

.reset-btn {
  flex: 1;
  padding: var(--spacing-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text);
  background: var(--color-border);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
}

.use-btn {
  flex: 2;
  padding: var(--spacing-md);
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: white;
  background: var(--color-success);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.use-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.use-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.status-hint {
  flex: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-md);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  background: var(--color-bg);
  border-radius: var(--radius-md);
  text-align: center;
}

/* ===== Status Badge ===== */
.status-badge {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  padding: 4px 12px;
  border-radius: var(--radius-md);
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

/* ===== Result ===== */
.result-section {
  display: flex;
  justify-content: center;
  padding: var(--spacing-xl) 0;
}

.result-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--spacing-2xl);
  border-radius: var(--radius-xl);
  text-align: center;
  width: 100%;
}

.result-card.success {
  background: var(--color-success-bg);
  border: 2px solid var(--color-success);
}

.result-card.error {
  background: var(--color-error-bg);
  border: 2px solid var(--color-error);
}

.result-icon {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  margin-bottom: var(--spacing-lg);
}

.result-card.success .result-icon {
  background: var(--color-success);
  color: white;
}

.result-card.error .result-icon {
  background: var(--color-error);
  color: white;
}

.result-icon svg {
  width: 48px;
  height: 48px;
}

.result-title {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-md);
}

.result-card.success .result-title {
  color: var(--color-success);
}

.result-card.error .result-title {
  color: var(--color-error);
}

.result-details {
  margin-bottom: var(--spacing-lg);
}

.result-details p {
  font-size: var(--text-sm);
  margin-bottom: var(--spacing-xs);
}

.continue-btn {
  padding: var(--spacing-md) var(--spacing-xl);
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  color: white;
  background: var(--color-primary);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.continue-btn:hover {
  background: var(--color-primary-dark);
}

/* ===== Desktop ===== */
@media (min-width: 1024px) {
  .breadcrumb-wrapper {
    display: block;
  }

  .page-header-section {
    display: block;
  }

  .page-content {
    padding: var(--spacing-xl);
  }

  .page-title {
    font-size: var(--text-2xl);
  }

  .search-box {
    flex-direction: row;
  }

  .search-btn {
    width: auto;
  }
}
</style>
