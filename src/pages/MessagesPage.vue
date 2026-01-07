<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/composables/useToast'
import {
  getMessages,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteMessage,
} from '@/api/message'
import type { Message, MessageType, UnreadCountResponse } from '@/types/message'
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb.vue'

const router = useRouter()
const userStore = useUserStore()
const toast = useToast()

// 加载状态
const isLoading = ref(true)
const isLoadingMore = ref(false)
const isRefreshing = ref(false)

// 数据
const messages = ref<Message[]>([])
const unreadCount = ref<UnreadCountResponse>({
  total: 0,
  ticket: 0,
  rating: 0,
  contribution: 0,
  system: 0,
})
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const hasMore = computed(() => messages.value.length < total.value)

// 筛选
const activeTab = ref<MessageType | 'all'>('all')

// 操作状态
const isMarkingAll = ref(false)
const deletingId = ref<number | null>(null)

// 消息详情抽屉
const showDetailDrawer = ref(false)
const selectedMessage = ref<Message | null>(null)

// 左滑删除状态
const swipingId = ref<number | null>(null)
const swipeOffset = ref(0)
const startX = ref(0)
const startY = ref(0)
const isSwiping = ref(false)
const DELETE_THRESHOLD = 80

// 标签配置
const tabs = [
  { value: 'all', label: '全部' },
  { value: 'ticket', label: '抢票' },
  { value: 'rating', label: '社区' },
  { value: 'contribution', label: '反馈' },
  { value: 'system', label: '系统' },
] as const

// 获取标签未读数
function getTabUnreadCount(tab: MessageType | 'all'): number {
  if (tab === 'all') return unreadCount.value.total
  return unreadCount.value[tab] || 0
}

// 加载消息列表
async function loadMessages(refresh = false) {
  if (refresh) {
    page.value = 1
    isRefreshing.value = true
  }

  try {
    const res = await getMessages({
      type: activeTab.value === 'all' ? undefined : activeTab.value,
      page: page.value,
      size: pageSize.value,
    })

    if (res.data.code === 200) {
      if (refresh || page.value === 1) {
        messages.value = res.data.data.records
      } else {
        messages.value.push(...res.data.data.records)
      }
      total.value = res.data.data.total
    } else {
      toast.error(res.data.message || '获取消息失败')
    }
  } catch (error) {
    toast.error('获取消息失败')
  } finally {
    isLoading.value = false
    isRefreshing.value = false
    isLoadingMore.value = false
  }
}

// 加载未读数量
async function loadUnreadCount() {
  try {
    const res = await getUnreadCount()
    if (res.data.code === 200) {
      unreadCount.value = res.data.data
    }
  } catch (error) {
    // 静默失败
  }
}

// 加载更多
async function loadMore() {
  if (isLoadingMore.value || !hasMore.value) return

  isLoadingMore.value = true
  page.value++
  await loadMessages()
}

// 打开消息详情
async function openMessage(message: Message) {
  selectedMessage.value = message
  showDetailDrawer.value = true

  // 标记已读
  if (!message.isRead) {
    try {
      await markAsRead(message.id)
      message.isRead = true
      // 更新未读数
      loadUnreadCount()
    } catch (error) {
      // 静默失败
    }
  }
}

// 关闭详情抽屉
function closeDetailDrawer() {
  showDetailDrawer.value = false
  selectedMessage.value = null
}

// 标记全部已读
async function handleMarkAllAsRead() {
  if (isMarkingAll.value) return

  isMarkingAll.value = true
  try {
    const type = activeTab.value === 'all' ? undefined : activeTab.value
    const res = await markAllAsRead(type)
    if (res.data.code === 200) {
      toast.success('已全部标记为已读')
      // 更新本地状态
      messages.value.forEach((m) => {
        if (activeTab.value === 'all' || m.type === activeTab.value) {
          m.isRead = true
        }
      })
      loadUnreadCount()
    } else {
      toast.error(res.data.message || '操作失败')
    }
  } catch (error) {
    toast.error('操作失败')
  } finally {
    isMarkingAll.value = false
  }
}

// 删除消息
async function handleDelete(message: Message, event?: Event) {
  event?.stopPropagation()
  if (deletingId.value === message.id) return

  deletingId.value = message.id
  try {
    const res = await deleteMessage(message.id)
    if (res.data.code === 200) {
      toast.success('删除成功')
      messages.value = messages.value.filter((m) => m.id !== message.id)
      total.value--
      if (!message.isRead) {
        loadUnreadCount()
      }
      // 如果在详情页，关闭
      if (selectedMessage.value?.id === message.id) {
        closeDetailDrawer()
      }
    } else {
      toast.error(res.data.message || '删除失败')
    }
  } catch (error) {
    toast.error('删除失败')
  } finally {
    deletingId.value = null
  }
}

// 跳转到目标
function goToTarget(message: Message) {
  closeDetailDrawer()

  // 评分社区消息优先使用 ratingItemId 跳转到评分项目详情
  if (message.ratingItemId) {
    router.push(`/community/item/${message.ratingItemId}`)
    return
  }

  if (!message.targetType || !message.targetId) return

  switch (message.targetType) {
    case 'ticket':
      router.push(`/ticket/my`)
      break
    case 'activity':
      router.push(`/ticket/${message.targetId}`)
      break
    case 'comment':
      router.push('/community')
      break
    case 'contribution':
      router.push('/community/contributions')
      break
    default:
      break
  }
}

// 获取消息图标
function getMessageIcon(type: MessageType) {
  switch (type) {
    case 'ticket':
      return 'ticket'
    case 'rating':
      return 'star'
    case 'contribution':
      return 'edit'
    case 'system':
      return 'bell'
    default:
      return 'bell'
  }
}

// 获取消息类型样式
function getMessageTypeClass(type: MessageType) {
  return `type-${type}`
}

// 左滑删除相关方法
function handleTouchStart(event: TouchEvent, messageId: number) {
  // 如果已经有其他消息在滑动状态，先重置
  if (swipingId.value && swipingId.value !== messageId) {
    resetSwipe()
  }

  const touch = event.touches[0]
  startX.value = touch.clientX
  startY.value = touch.clientY
  swipingId.value = messageId
  isSwiping.value = false
}

function handleTouchMove(event: TouchEvent, messageId: number) {
  if (swipingId.value !== messageId) return

  const touch = event.touches[0]
  const deltaX = startX.value - touch.clientX
  const deltaY = Math.abs(touch.clientY - startY.value)

  // 如果垂直滑动距离大于水平，不处理
  if (deltaY > Math.abs(deltaX) && !isSwiping.value) {
    return
  }

  isSwiping.value = true

  // 只允许向左滑动
  if (deltaX > 0) {
    // 添加阻尼效果
    swipeOffset.value = Math.min(deltaX, DELETE_THRESHOLD + 20)
    event.preventDefault()
  } else {
    swipeOffset.value = Math.max(deltaX * 0.3, -20)
  }
}

function handleTouchEnd(messageId: number) {
  if (swipingId.value !== messageId) return

  // 如果滑动距离超过阈值，保持展开状态
  if (swipeOffset.value >= DELETE_THRESHOLD) {
    swipeOffset.value = DELETE_THRESHOLD
  } else {
    resetSwipe()
  }
}

function resetSwipe() {
  swipeOffset.value = 0
  swipingId.value = null
  isSwiping.value = false
}

// 通过左滑删除
function handleSwipeDelete(message: Message) {
  resetSwipe()
  handleDelete(message)
}

// 点击消息卡片
function handleCardClick(message: Message) {
  // 如果正在滑动状态，先关闭滑动
  if (swipingId.value === message.id && swipeOffset.value > 10) {
    resetSwipe()
    return
  }
  openMessage(message)
}

// 点击页面其他区域关闭滑动
function handleGlobalClick(event: Event) {
  if (swipingId.value && swipeOffset.value > 0) {
    const target = event.target as HTMLElement
    if (!target.closest('.message-item')) {
      resetSwipe()
    }
  }
}

// 格式化时间
function formatTime(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`

  return date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  })
}

// 监听标签切换
watch(activeTab, () => {
  messages.value = []
  isLoading.value = true
  loadMessages(true)
})

// 初始化
onMounted(async () => {
  document.addEventListener('click', handleGlobalClick)

  if (!userStore.isLoggedIn) {
    toast.error('请先登录')
    router.push('/')
    return
  }

  await Promise.all([loadMessages(), loadUnreadCount()])
})

onUnmounted(() => {
  document.removeEventListener('click', handleGlobalClick)
})
</script>

<template>
  <div class="messages-page">
    <PageHeader back-to="/profile" />

    <main class="page-content">
      <div class="content-container">
        <!-- 桌面端面包屑 -->
        <div class="breadcrumb-wrapper">
          <PageBreadcrumb />
        </div>

        <!-- 消息类型标签 -->
        <div class="tabs-section">
          <div class="tabs-scroll">
            <button
              v-for="tab in tabs"
              :key="tab.value"
              class="tab-btn"
              :class="{ active: activeTab === tab.value }"
              @click="activeTab = tab.value"
            >
              {{ tab.label }}
              <span v-if="getTabUnreadCount(tab.value) > 0" class="tab-badge">
                {{ getTabUnreadCount(tab.value) > 99 ? '99+' : getTabUnreadCount(tab.value) }}
              </span>
            </button>
          </div>
        </div>

        <!-- 未读提示条 -->
        <Transition name="fade">
          <div v-if="unreadCount.total > 0" class="unread-bar">
            <span class="unread-text">
              {{ unreadCount.total }} 条未读消息
            </span>
            <button
              class="mark-all-btn"
              :disabled="isMarkingAll"
              @click="handleMarkAllAsRead"
            >
              {{ isMarkingAll ? '处理中...' : '全部已读' }}
            </button>
          </div>
        </Transition>

        <!-- 加载状态 -->
        <div v-if="isLoading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>

        <!-- 空状态 -->
        <div v-else-if="messages.length === 0" class="empty-container">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </div>
          <h2>暂无消息</h2>
          <p>{{ activeTab === 'all' ? '您还没有收到任何消息' : '该类型暂无消息' }}</p>
        </div>

        <!-- 消息列表 -->
        <div v-else class="messages-list">
          <TransitionGroup name="message-list">
            <div
              v-for="message in messages"
              :key="message.id"
              class="message-item"
              :class="{ deleting: deletingId === message.id }"
            >
              <!-- 删除操作区域（左滑露出） -->
              <div
                class="swipe-action"
                :style="{ opacity: swipingId === message.id ? Math.min(swipeOffset / DELETE_THRESHOLD, 1) : 0 }"
                @click="handleSwipeDelete(message)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                <span>删除</span>
              </div>

              <!-- 消息卡片 -->
              <div
                class="message-card"
                :class="{ unread: !message.isRead }"
                :style="{ transform: swipingId === message.id ? `translateX(-${swipeOffset}px)` : 'translateX(0)' }"
                @click="handleCardClick(message)"
                @touchstart="handleTouchStart($event, message.id)"
                @touchmove="handleTouchMove($event, message.id)"
                @touchend="handleTouchEnd(message.id)"
              >
                <!-- 未读指示器 -->
                <div v-if="!message.isRead" class="unread-indicator"></div>

                <!-- 消息图标 -->
                <div class="message-icon" :class="getMessageTypeClass(message.type)">
                  <!-- Ticket -->
                  <svg v-if="getMessageIcon(message.type) === 'ticket'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"></path>
                    <path d="M13 5v2"></path>
                    <path d="M13 17v2"></path>
                    <path d="M13 11v2"></path>
                  </svg>
                  <!-- Star -->
                  <svg v-else-if="getMessageIcon(message.type) === 'star'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                  <!-- Edit -->
                  <svg v-else-if="getMessageIcon(message.type) === 'edit'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                  <!-- Bell (default) -->
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                  </svg>
                </div>

                <!-- 消息内容 -->
                <div class="message-content">
                  <div class="message-header">
                    <h3 class="message-title">{{ message.title }}</h3>
                    <span class="message-time">{{ formatTime(message.createdAt) }}</span>
                  </div>
                  <p class="message-text">{{ message.content }}</p>
                  <!-- 原始评论引用 -->
                  <div v-if="message.originalComment" class="message-quote">
                    <span class="quote-icon">"</span>
                    <span class="quote-text">{{ message.originalComment }}</span>
                  </div>
                </div>

                <!-- 箭头 -->
                <div class="message-arrow">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </div>
              </div>
            </div>
          </TransitionGroup>

          <!-- 加载更多 -->
          <div v-if="hasMore" class="load-more">
            <button
              class="load-more-btn"
              :disabled="isLoadingMore"
              @click="loadMore"
            >
              {{ isLoadingMore ? '加载中...' : '加载更多' }}
            </button>
          </div>

          <!-- 没有更多 -->
          <div v-else-if="messages.length > 0" class="no-more">
            没有更多消息了
          </div>
        </div>
      </div>
    </main>

    <PageFooter />

    <!-- 消息详情抽屉 -->
    <Transition name="drawer-fade">
      <div v-if="showDetailDrawer" class="drawer-overlay" @click="closeDetailDrawer">
        <Transition name="drawer-slide">
          <div v-if="showDetailDrawer && selectedMessage" class="drawer-content" @click.stop>
            <!-- 抽屉头部 -->
            <div class="drawer-header">
              <div class="drawer-type" :class="getMessageTypeClass(selectedMessage.type)">
                {{ tabs.find(t => t.value === selectedMessage.type)?.label || '消息' }}
              </div>
              <button class="drawer-close" @click="closeDetailDrawer">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <!-- 消息标题 -->
            <h3 class="drawer-title">{{ selectedMessage.title }}</h3>

            <!-- 时间 -->
            <div class="drawer-time">
              {{ new Date(selectedMessage.createdAt).toLocaleString('zh-CN') }}
            </div>

            <!-- 消息内容 -->
            <div class="drawer-body">
              {{ selectedMessage.content }}
            </div>

            <!-- 原始评论引用 -->
            <div v-if="selectedMessage.originalComment" class="drawer-quote">
              <div class="drawer-quote-label">原评论</div>
              <div class="drawer-quote-text">"{{ selectedMessage.originalComment }}"</div>
            </div>

            <!-- 操作按钮 -->
            <div class="drawer-actions">
              <button
                v-if="selectedMessage.ratingItemId || (selectedMessage.targetType && selectedMessage.targetId)"
                class="drawer-btn primary"
                @click="goToTarget(selectedMessage)"
              >
                查看详情
              </button>
              <button
                class="drawer-btn danger"
                :disabled="deletingId === selectedMessage.id"
                @click="handleDelete(selectedMessage)"
              >
                {{ deletingId === selectedMessage.id ? '删除中...' : '删除消息' }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* ===== Base ===== */
.messages-page {
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

/* ===== Tabs - Segmented Control Style ===== */
.tabs-section {
  margin-bottom: var(--spacing-sm);
}

.tabs-scroll {
  display: flex;
  gap: 2px;
  padding: 3px;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.tabs-scroll::-webkit-scrollbar {
  display: none;
}

.tab-btn {
  flex: 1;
  min-width: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: color 0.2s ease, background-color 0.2s ease, transform 0.15s ease;
  white-space: nowrap;
  text-align: center;
}

.tab-btn:hover {
  color: var(--color-text);
}

.tab-btn:active {
  transform: scale(0.96);
}

.tab-btn.active {
  color: var(--color-primary);
  background: var(--color-primary-bg);
}

.tab-badge {
  font-size: 10px;
  font-weight: var(--font-bold);
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--color-error);
  color: white;
  border-radius: 8px;
  line-height: 1;
}

.tab-btn.active .tab-badge {
  background: var(--color-primary);
}

/* ===== Unread Bar ===== */
.unread-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  margin-bottom: var(--spacing-sm);
  background: var(--color-primary-bg);
  border-radius: 12px;
}

.unread-text {
  font-size: 13px;
  color: var(--color-primary);
  font-weight: 500;
}

.mark-all-btn {
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-primary);
  background: white;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.mark-all-btn:hover:not(:disabled) {
  background: var(--color-primary);
  color: white;
}

.mark-all-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Fade animation */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
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
  width: 28px;
  height: 28px;
  border: 2px solid var(--color-border);
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
  width: 64px;
  height: 64px;
  margin: 0 auto var(--spacing-md);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-border);
  border-radius: 16px;
}

.empty-icon svg {
  width: 32px;
  height: 32px;
  color: var(--color-text-placeholder);
}

.empty-container h2 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}

.empty-container p {
  font-size: 14px;
  color: var(--color-text-secondary);
}

/* ===== Messages List ===== */
.messages-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* Message Item Container */
.message-item {
  position: relative;
  overflow: hidden;
  border-radius: 12px;
}

.message-item.deleting {
  opacity: 0.5;
  pointer-events: none;
}

/* Swipe Delete Action */
.swipe-action {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: var(--color-error);
  color: white;
  cursor: pointer;
  transition: opacity 0.1s ease;
}

.swipe-action svg {
  width: 20px;
  height: 20px;
}

.swipe-action span {
  font-size: 11px;
  font-weight: 500;
}

/* Message Card - Clean Modern Style */
.message-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 12px;
  background: var(--color-card);
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease;
  touch-action: pan-y;
  user-select: none;
}

.message-card:active {
  background: var(--color-border);
}

/* Unread Indicator - Left Border */
.unread-indicator {
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 3px;
  background: var(--color-primary);
  border-radius: 0 2px 2px 0;
}

/* Message Icon - Smaller and Cleaner */
.message-icon {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
}

.message-icon svg {
  width: 18px;
  height: 18px;
}

.message-icon.type-ticket {
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
}

.message-icon.type-rating {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.message-icon.type-contribution {
  background: rgba(6, 182, 212, 0.1);
  color: #06b6d4;
}

.message-icon.type-system {
  background: rgba(107, 114, 128, 0.1);
  color: #6b7280;
}

/* Message Content */
.message-content {
  flex: 1;
  min-width: 0;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
}

.message-title {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.message-card.unread .message-title {
  color: var(--color-text);
}

.message-time {
  font-size: 12px;
  color: var(--color-text-placeholder);
  white-space: nowrap;
  flex-shrink: 0;
}

.message-text {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Message Quote */
.message-quote {
  display: flex;
  align-items: flex-start;
  gap: 2px;
  margin-top: 6px;
  padding: 6px 8px;
  background: var(--color-bg);
  border-radius: 6px;
  border-left: 2px solid var(--color-primary);
}

.quote-icon {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-primary);
  line-height: 1;
  opacity: 0.6;
}

.quote-text {
  font-size: 12px;
  color: var(--color-text-secondary);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-style: italic;
}

/* Arrow Indicator */
.message-arrow {
  flex-shrink: 0;
  color: var(--color-text-placeholder);
  opacity: 0.5;
}

.message-arrow svg {
  width: 16px;
  height: 16px;
}

/* Load More */
.load-more {
  padding: var(--spacing-lg) var(--spacing-md);
  text-align: center;
}

.load-more-btn {
  padding: 10px 24px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.load-more-btn:hover:not(:disabled) {
  color: var(--color-primary);
  border-color: var(--color-primary);
}

.load-more-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.no-more {
  padding: var(--spacing-lg);
  text-align: center;
  font-size: 13px;
  color: var(--color-text-placeholder);
}

/* ===== List Animation ===== */
.message-list-enter-active,
.message-list-leave-active {
  transition: all 0.25s ease;
}

.message-list-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}

.message-list-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.message-list-move {
  transition: transform 0.25s ease;
}

/* ===== Drawer ===== */
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
}

.drawer-content {
  background: var(--color-card);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  padding: var(--spacing-lg);
  padding-bottom: calc(var(--spacing-lg) + env(safe-area-inset-bottom, 0px));
  width: 100%;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: var(--shadow-xl);
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-md);
}

.drawer-type {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  padding: 4px 10px;
  border-radius: var(--radius-md);
}

.drawer-type.type-ticket {
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
}

.drawer-type.type-rating {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.drawer-type.type-contribution {
  background: rgba(6, 182, 212, 0.1);
  color: #06b6d4;
}

.drawer-type.type-system {
  background: rgba(107, 114, 128, 0.1);
  color: #6b7280;
}

.drawer-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.drawer-close:hover {
  background: var(--color-bg);
  color: var(--color-text);
}

.drawer-close svg {
  width: 20px;
  height: 20px;
}

.drawer-title {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-xs);
  line-height: 1.4;
}

.drawer-time {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
  margin-bottom: var(--spacing-lg);
}

.drawer-body {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: 1.7;
  white-space: pre-wrap;
  margin-bottom: var(--spacing-md);
}

/* Drawer Quote */
.drawer-quote {
  padding: var(--spacing-sm) var(--spacing-md);
  margin-bottom: var(--spacing-lg);
  background: var(--color-bg);
  border-radius: var(--radius-md);
  border-left: 3px solid var(--color-primary);
}

.drawer-quote-label {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
  margin-bottom: 4px;
}

.drawer-quote-text {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  font-style: italic;
  line-height: 1.5;
}

.drawer-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.drawer-btn {
  flex: 1;
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.drawer-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.drawer-btn.primary {
  background: var(--color-primary);
  color: white;
}

.drawer-btn.primary:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.drawer-btn.danger {
  background: var(--color-error-bg);
  color: var(--color-error);
}

.drawer-btn.danger:hover:not(:disabled) {
  background: var(--color-error);
  color: white;
}

/* Drawer Animation */
.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity var(--transition-normal);
}

.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}

.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: all var(--transition-normal);
}

.drawer-slide-enter-from,
.drawer-slide-leave-to {
  opacity: 0;
  transform: translateY(100%);
}

/* ===== Desktop ===== */
@media (min-width: 1024px) {
  .breadcrumb-wrapper {
    display: block;
  }

  .page-content {
    padding: var(--spacing-xl);
  }

  .tabs-section {
    margin-bottom: var(--spacing-md);
  }

  .tab-btn {
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: var(--text-sm);
  }

  .unread-bar {
    margin-bottom: var(--spacing-md);
  }

  .messages-list {
    gap: 4px;
  }

  .message-item {
    border-radius: 14px;
  }

  .message-card {
    padding: 16px;
    border-radius: 14px;
    border: 1px solid var(--color-border);
  }

  .message-card:hover {
    background: var(--color-card);
    border-color: var(--color-primary);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  }

  .message-icon {
    width: 40px;
    height: 40px;
  }

  .message-icon svg {
    width: 20px;
    height: 20px;
  }

  .message-title {
    font-size: 15px;
  }

  .message-text {
    font-size: 14px;
  }

  /* Hide swipe on desktop, show hover delete */
  .swipe-action {
    display: none;
  }

  .drawer-overlay {
    align-items: center;
  }

  .drawer-content {
    border-radius: var(--radius-xl);
  }
}
</style>
