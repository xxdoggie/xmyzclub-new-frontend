<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/composables/useToast'
import { getTicketActivityDetail, grabTicket, getMyTicketsForActivity } from '@/api/ticket'
import type { TicketActivityDetail, ActivitySession, Ticket, GrabTicketRequest } from '@/types/ticket'
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const toast = useToast()

// 活动ID
const activityId = computed(() => Number(route.params.id))

// 状态
const isLoading = ref(true)
const activity = ref<TicketActivityDetail | null>(null)
const myTickets = ref<Ticket[]>([])

// 抢票相关
const isGrabbing = ref(false)
const selectedSession = ref<ActivitySession | null>(null)
const showGrabModal = ref(false)
const extraInfo = ref<Record<string, string>>({})

// 成功弹窗
const showSuccessModal = ref(false)
const successTicketCode = ref('')

// 倒计时
const countdowns = ref<Record<number, string>>({})
let countdownTimer: ReturnType<typeof setInterval> | null = null

// 校园网绑定检查
const requiresCampusBinding = computed(() => activity.value?.config?.require_campus_binding ?? false)
const isCampusBound = computed(() => userStore.campusBinding?.isBound ?? false)
const isCampusExpired = computed(() => userStore.campusBinding?.isClassInfoExpired ?? false)

// 校园网绑定状态：是否可以抢票
const canGrabWithCampus = computed(() => {
  if (!requiresCampusBinding.value) return true
  return isCampusBound.value && !isCampusExpired.value
})

// 加载活动详情
async function loadActivity() {
  try {
    const [activityRes, ticketsRes] = await Promise.all([
      getTicketActivityDetail(activityId.value),
      getMyTicketsForActivity(activityId.value),
    ])

    if (activityRes.data.code === 200) {
      activity.value = activityRes.data.data
      initExtraInfo()

      // 如果活动需要校园网绑定，获取校园网绑定信息
      if (activity.value?.config?.require_campus_binding) {
        await userStore.fetchCampusBinding()
      }
    } else {
      toast.error(activityRes.data.message || '获取活动详情失败')
      router.push('/ticket')
    }

    if (ticketsRes.data.code === 200) {
      myTickets.value = ticketsRes.data.data.tickets
    }
  } catch (error) {
    toast.error('获取活动详情失败')
    router.push('/ticket')
  } finally {
    isLoading.value = false
  }
}

// 初始化额外信息表单
function initExtraInfo() {
  if (activity.value?.config?.extra_info_fields) {
    extraInfo.value = {}
    activity.value.config.extra_info_fields.forEach((field) => {
      extraInfo.value[field.name] = ''
    })
  }
}

// 开始抢票流程
function startGrab(session: ActivitySession) {
  if (!session.canGrab) {
    if (session.status === 'waiting') {
      toast.info('该场次尚未开始抢票')
    } else if (session.status === 'ended') {
      toast.info('该场次已结束')
    } else if (session.availableTickets <= 0) {
      toast.info('该场次票已售罄')
    }
    return
  }

  // 检查是否已有该场次的票
  const existingTicket = myTickets.value.find(
    (t) => t.sessionId === session.id && t.status !== 'cancelled'
  )
  if (existingTicket) {
    toast.warning('您已有该场次的票据')
    return
  }

  // 检查最大抢票数
  const maxTickets = activity.value?.config?.max_tickets_per_user || 1
  const userTicketCount = myTickets.value.filter((t) => t.status !== 'cancelled').length
  if (userTicketCount >= maxTickets) {
    toast.warning(`每人最多抢 ${maxTickets} 张票`)
    return
  }

  // 检查是否需要校园网绑定
  if (activity.value?.config?.require_campus_binding) {
    if (!userStore.campusBinding?.isBound) {
      toast.warning('该活动需要绑定校园网账号')
      return
    }
    if (userStore.campusBinding?.isClassInfoExpired) {
      toast.warning('校园网账号需要更新，请重新绑定')
      return
    }
  }

  selectedSession.value = session

  // 如果需要额外信息，显示弹窗
  if (activity.value?.config?.require_extra_info && activity.value.config.extra_info_fields?.length) {
    showGrabModal.value = true
  } else {
    confirmGrab()
  }
}

// 确认抢票
async function confirmGrab() {
  if (!selectedSession.value) return

  // 验证额外信息
  if (activity.value?.config?.require_extra_info && activity.value.config.extra_info_fields?.length) {
    for (const field of activity.value.config.extra_info_fields) {
      if (field.required && !extraInfo.value[field.name]?.trim()) {
        toast.warning(`请填写${field.label}`)
        return
      }
    }
  }

  isGrabbing.value = true

  try {
    const data: GrabTicketRequest = {
      sessionId: selectedSession.value.id,
    }

    if (activity.value?.config?.require_extra_info) {
      data.userInfo = { ...extraInfo.value }
    }

    const res = await grabTicket(data)

    if (res.data.code === 200 && res.data.data.success) {
      showGrabModal.value = false
      successTicketCode.value = res.data.data.ticketCode || ''
      showSuccessModal.value = true

      // 刷新票据列表
      const ticketsRes = await getMyTicketsForActivity(activityId.value)
      if (ticketsRes.data.code === 200) {
        myTickets.value = ticketsRes.data.data.tickets
      }

      // 刷新活动详情（更新剩余票数）
      const activityRes = await getTicketActivityDetail(activityId.value)
      if (activityRes.data.code === 200) {
        activity.value = activityRes.data.data
      }
    } else {
      toast.error(res.data.data?.message || res.data.message || '抢票失败')
    }
  } catch (error) {
    toast.error('抢票失败，请重试')
  } finally {
    isGrabbing.value = false
  }
}

// 关闭抢票弹窗
function closeGrabModal() {
  showGrabModal.value = false
  selectedSession.value = null
  initExtraInfo()
}

// 关闭成功弹窗
function closeSuccessModal() {
  showSuccessModal.value = false
  successTicketCode.value = ''
}

// 跳转到我的票据
function goToMyTickets() {
  router.push('/ticket/my')
}

// 跳转到个人中心（校园网绑定）
function goToProfile() {
  router.push('/profile')
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

// 获取档期状态
function getSessionStatusLabel(session: ActivitySession) {
  if (session.status === 'cancelled') {
    return { label: '已取消', class: 'session-cancelled' }
  }
  if (session.status === 'ended') {
    return { label: '已结束', class: 'session-ended' }
  }
  if (session.status === 'waiting') {
    return { label: '未开始', class: 'session-waiting' }
  }
  if (session.availableTickets <= 0) {
    return { label: '已售罄', class: 'session-soldout' }
  }
  return { label: '抢票中', class: 'session-active' }
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

// 计算倒计时
function calculateCountdown(startTime: string): string {
  const now = new Date().getTime()
  const start = new Date(startTime).getTime()
  const diff = start - now

  if (diff <= 0) return ''

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  if (days > 0) {
    return `${days}天${hours}小时后开始`
  } else if (hours > 0) {
    return `${hours}小时${minutes}分钟后开始`
  } else if (minutes > 0) {
    return `${minutes}分${seconds}秒后开始`
  } else {
    return `${seconds}秒后开始`
  }
}

// 更新倒计时
function updateCountdowns() {
  if (!activity.value?.sessions) return

  const newCountdowns: Record<number, string> = {}
  activity.value.sessions.forEach((session) => {
    if (session.status === 'waiting') {
      newCountdowns[session.id] = calculateCountdown(session.startTime)
    }
  })
  countdowns.value = newCountdowns
}

// 检查用户是否已有该场次的票
function hasTicketForSession(sessionId: number): boolean {
  return myTickets.value.some((t) => t.sessionId === sessionId && t.status !== 'cancelled')
}

onMounted(() => {
  loadActivity()
  countdownTimer = setInterval(updateCountdowns, 1000)
})

onUnmounted(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
  }
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

        <!-- 加载状态 -->
        <div v-if="isLoading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>

        <template v-else-if="activity">
          <!-- 活动头部 -->
          <div class="activity-header">
            <div v-if="activity.imageUrl" class="activity-cover">
              <img :src="activity.imageUrl" :alt="activity.name" />
            </div>
            <div class="activity-info">
              <div class="activity-title-row">
                <h1 class="activity-title">{{ activity.name }}</h1>
                <span class="status-tag" :class="getStatusLabel(activity.status).class">
                  {{ getStatusLabel(activity.status).label }}
                </span>
              </div>
              <p v-if="activity.description" class="activity-desc">{{ activity.description }}</p>
              <div class="activity-meta">
                <span v-if="activity.config.require_campus_binding" class="meta-tag campus">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                    <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
                  </svg>
                  需绑定校园网
                </span>
                <span v-if="activity.config.require_approval" class="meta-tag approval">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 12l2 2 4-4"></path>
                    <circle cx="12" cy="12" r="10"></circle>
                  </svg>
                  需审核
                </span>
                <span class="meta-tag limit">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                  每人限 {{ activity.config.max_tickets_per_user }} 张
                </span>
              </div>
            </div>
          </div>

          <!-- 校园网绑定提示 -->
          <div v-if="requiresCampusBinding && !isCampusBound" class="campus-notice">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
              <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
            </svg>
            <span>该活动需要绑定校园网账号</span>
            <button class="notice-btn" @click="goToProfile">前往绑定</button>
          </div>

          <!-- 校园网账号过期提示 -->
          <div v-else-if="requiresCampusBinding && isCampusExpired" class="campus-notice warning">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <span>校园网账号需要更新，请重新绑定以更新高二分班信息</span>
            <button class="notice-btn" @click="goToProfile">前往更新</button>
          </div>

          <!-- 我的票据提示 -->
          <div v-if="myTickets.length > 0" class="my-tickets-notice" @click="goToMyTickets">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
            <span>您已有 {{ myTickets.length }} 张票据</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </div>

          <!-- 场次列表 -->
          <section class="sessions-section">
            <h2 class="section-title">场次列表</h2>

            <div v-if="activity.sessions.length === 0" class="empty-sessions">
              <p>暂无场次信息</p>
            </div>

            <div v-else class="sessions-list">
              <div
                v-for="session in activity.sessions"
                :key="session.id"
                class="session-card"
                :class="{
                  'session-disabled': !session.canGrab,
                  'session-has-ticket': hasTicketForSession(session.id),
                }"
              >
                <div class="session-main">
                  <div class="session-info">
                    <h3 class="session-name">{{ session.name }}</h3>
                    <p v-if="session.description" class="session-desc">{{ session.description }}</p>
                    <div class="session-time">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                      {{ formatDateTime(session.startTime) }} - {{ formatDateTime(session.endTime) }}
                    </div>
                  </div>

                  <div class="session-stats">
                    <div class="tickets-count">
                      <span class="available">{{ session.availableTickets }}</span>
                      <span class="divider">/</span>
                      <span class="total">{{ session.totalTickets }}</span>
                    </div>
                    <div class="tickets-label">剩余/总数</div>
                  </div>
                </div>

                <div class="session-footer">
                  <span class="session-status" :class="getSessionStatusLabel(session).class">
                    {{ getSessionStatusLabel(session).label }}
                  </span>

                  <!-- 倒计时 -->
                  <span v-if="session.status === 'waiting' && countdowns[session.id]" class="countdown">
                    {{ countdowns[session.id] }}
                  </span>

                  <!-- 已有票据提示 -->
                  <span v-else-if="hasTicketForSession(session.id)" class="has-ticket-hint">
                    已抢到
                  </span>

                  <button
                    v-if="session.canGrab && !hasTicketForSession(session.id)"
                    class="grab-btn"
                    :disabled="isGrabbing || !canGrabWithCampus"
                    @click="startGrab(session)"
                  >
                    立即抢票
                  </button>
                </div>
              </div>
            </div>
          </section>
        </template>
      </div>
    </main>

    <PageFooter />

    <!-- 抢票信息填写弹窗 -->
    <Transition name="modal-fade">
      <div v-if="showGrabModal" class="modal-overlay" @click="closeGrabModal">
        <Transition name="modal-scale">
          <div v-if="showGrabModal" class="modal-content grab-modal" @click.stop>
            <h3 class="modal-title">填写信息</h3>
            <p class="modal-subtitle">请填写以下信息完成抢票</p>

            <div class="grab-form">
              <div
                v-for="field in activity?.config?.extra_info_fields"
                :key="field.name"
                class="form-group"
              >
                <label class="form-label">
                  {{ field.label }}
                  <span v-if="field.required" class="required">*</span>
                </label>
                <textarea
                  v-if="field.type === 'textarea'"
                  v-model="extraInfo[field.name]"
                  class="form-textarea"
                  :placeholder="`请输入${field.label}`"
                  rows="3"
                ></textarea>
                <input
                  v-else
                  v-model="extraInfo[field.name]"
                  :type="field.type === 'phone' ? 'tel' : field.type"
                  class="form-input"
                  :placeholder="`请输入${field.label}`"
                />
              </div>
            </div>

            <div class="modal-actions">
              <button class="modal-btn cancel" @click="closeGrabModal" :disabled="isGrabbing">取消</button>
              <button class="modal-btn confirm" @click="confirmGrab" :disabled="isGrabbing">
                {{ isGrabbing ? '抢票中...' : '确认抢票' }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>

    <!-- 抢票成功弹窗 -->
    <Transition name="modal-fade">
      <div v-if="showSuccessModal" class="modal-overlay" @click="closeSuccessModal">
        <Transition name="modal-scale">
          <div v-if="showSuccessModal" class="modal-content success-modal" @click.stop>
            <div class="success-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <h3 class="modal-title">抢票成功</h3>
            <p class="ticket-code-label">您的票据码</p>
            <div class="ticket-code">{{ successTicketCode }}</div>
            <p class="ticket-code-hint">
              {{ activity?.config?.require_approval ? '请等待管理员审核后方可使用' : '请妥善保管您的票据码' }}
            </p>

            <div class="modal-actions">
              <button class="modal-btn secondary" @click="closeSuccessModal">继续浏览</button>
              <button class="modal-btn confirm" @click="goToMyTickets">查看票据</button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
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

/* ===== Activity Header ===== */
.activity-header {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  margin-bottom: var(--spacing-md);
}

.activity-cover {
  width: 100%;
  height: 200px;
}

.activity-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.activity-info {
  padding: var(--spacing-md);
}

.activity-title-row {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
}

.activity-title {
  flex: 1;
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  line-height: var(--leading-tight);
}

.status-tag {
  flex-shrink: 0;
  padding: 4px 8px;
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  border-radius: var(--radius-sm);
  color: white;
}

.status-tag.status-active {
  background: var(--color-success);
}

.status-tag.status-published {
  background: var(--color-info);
}

.status-tag.status-ended {
  background: var(--color-text-secondary);
}

.status-tag.status-cancelled {
  background: var(--color-error);
}

.activity-desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: var(--leading-relaxed);
  margin-bottom: var(--spacing-md);
}

.activity-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.meta-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  font-size: var(--text-xs);
  border-radius: var(--radius-sm);
}

.meta-tag svg {
  width: 12px;
  height: 12px;
}

.meta-tag.campus {
  background: rgba(6, 182, 212, 0.1);
  color: var(--color-secondary);
}

.meta-tag.approval {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.meta-tag.limit {
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

/* ===== My Tickets Notice ===== */
.my-tickets-notice {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background: var(--color-success-bg);
  border: 1px solid var(--color-success);
  border-radius: var(--radius-lg);
  margin-bottom: var(--spacing-md);
  color: var(--color-success);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.my-tickets-notice:hover {
  background: var(--color-success);
  color: white;
}

/* ===== Campus Notice - 轻量设计 ===== */
.campus-notice {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  margin-bottom: var(--spacing-md);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.campus-notice svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: var(--color-secondary);
}

.campus-notice.warning svg {
  color: var(--color-warning);
}

.campus-notice span {
  flex: 1;
}

.campus-notice .notice-btn {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-primary);
  background: transparent;
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
  white-space: nowrap;
}

.campus-notice .notice-btn:hover {
  background: var(--color-primary);
  color: white;
}

.my-tickets-notice svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.my-tickets-notice span {
  flex: 1;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

/* ===== Sessions Section ===== */
.sessions-section {
  margin-bottom: var(--spacing-lg);
}

.section-title {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-md);
  padding: 0 var(--spacing-xs);
}

.empty-sessions {
  padding: var(--spacing-xl);
  text-align: center;
  color: var(--color-text-secondary);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.sessions-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

/* ===== Session Card ===== */
.session-card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: all var(--transition-fast);
}

.session-card:not(.session-disabled):hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-md);
}

.session-card.session-disabled {
  opacity: 0.7;
}

.session-card.session-has-ticket {
  border-color: var(--color-success);
  background: var(--color-success-bg);
}

.session-main {
  display: flex;
  padding: var(--spacing-md);
  gap: var(--spacing-md);
}

.session-info {
  flex: 1;
  min-width: 0;
}

.session-name {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-xs);
}

.session-desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xs);
}

.session-time {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
}

.session-time svg {
  width: 12px;
  height: 12px;
}

.session-stats {
  flex-shrink: 0;
  text-align: center;
}

.tickets-count {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
}

.tickets-count .available {
  color: var(--color-primary);
}

.tickets-count .divider {
  color: var(--color-text-placeholder);
  margin: 0 2px;
}

.tickets-count .total {
  color: var(--color-text-secondary);
}

.tickets-label {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
}

.session-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg);
  border-top: 1px solid var(--color-border);
}

.session-status {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}

.session-status.session-active {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.session-status.session-waiting {
  background: var(--color-info-bg);
  color: var(--color-info);
}

.session-status.session-ended {
  background: var(--color-border);
  color: var(--color-text-secondary);
}

.session-status.session-soldout {
  background: var(--color-error-bg);
  color: var(--color-error);
}

.session-status.session-cancelled {
  background: var(--color-border);
  color: var(--color-text-placeholder);
}

.countdown {
  font-size: var(--text-xs);
  color: var(--color-info);
  font-weight: var(--font-medium);
}

.has-ticket-hint {
  font-size: var(--text-xs);
  color: var(--color-success);
  font-weight: var(--font-medium);
}

.grab-btn {
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

.grab-btn:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.grab-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ===== Modal ===== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--spacing-md);
}

.modal-content {
  background: var(--color-card);
  border-radius: var(--radius-xl);
  padding: var(--spacing-xl);
  max-width: 400px;
  width: 100%;
  box-shadow: var(--shadow-xl);
}

.modal-title {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  text-align: center;
  margin-bottom: var(--spacing-xs);
}

.modal-subtitle {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  text-align: center;
  margin-bottom: var(--spacing-lg);
}

/* Grab Form */
.grab-form {
  margin-bottom: var(--spacing-lg);
}

.form-group {
  margin-bottom: var(--spacing-md);
}

.form-label {
  display: block;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xs);
}

.form-label .required {
  color: var(--color-error);
  margin-left: 2px;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  color: var(--color-text);
  outline: none;
  transition: all var(--transition-fast);
}

.form-input:focus,
.form-textarea:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-bg);
}

.form-textarea {
  resize: none;
  line-height: var(--leading-relaxed);
}

/* Success Modal */
.success-modal {
  text-align: center;
}

.success-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto var(--spacing-md);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-success-bg);
  color: var(--color-success);
  border-radius: 50%;
}

.success-icon svg {
  width: 32px;
  height: 32px;
}

.ticket-code-label {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xs);
}

.ticket-code {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  font-family: var(--font-family-mono);
  color: var(--color-primary);
  letter-spacing: 4px;
  margin-bottom: var(--spacing-sm);
}

.ticket-code-hint {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
  margin-bottom: var(--spacing-lg);
}

/* Modal Actions */
.modal-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.modal-btn {
  flex: 1;
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.modal-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.modal-btn.cancel {
  background: var(--color-border);
  border: none;
  color: var(--color-text);
}

.modal-btn.cancel:hover:not(:disabled) {
  background: var(--color-text-placeholder);
}

.modal-btn.secondary {
  background: var(--color-border);
  border: none;
  color: var(--color-text);
}

.modal-btn.secondary:hover:not(:disabled) {
  background: var(--color-text-placeholder);
}

.modal-btn.confirm {
  background: var(--color-primary);
  border: none;
  color: white;
}

.modal-btn.confirm:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

/* Modal Animations */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity var(--transition-normal);
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-scale-enter-active,
.modal-scale-leave-active {
  transition: all var(--transition-normal);
}

.modal-scale-enter-from,
.modal-scale-leave-to {
  opacity: 0;
  transform: scale(0.9);
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

  .activity-cover {
    height: 280px;
  }

  .activity-info {
    padding: var(--spacing-lg);
  }

  .activity-title {
    font-size: var(--text-2xl);
  }

  .session-main {
    padding: var(--spacing-lg);
  }

  .session-footer {
    padding: var(--spacing-md) var(--spacing-lg);
  }
}
</style>
