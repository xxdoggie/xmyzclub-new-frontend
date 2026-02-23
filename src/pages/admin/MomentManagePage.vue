<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/composables/useToast'
import {
  adminGetMoments,
  adminApproveMoment,
  adminRejectMoment,
  adminTakedownMoment,
  adminDeleteMoment,
  adminBatchMomentAction,
} from '@/api/museum'
import type { Moment, MomentStatus, GetMomentsParams } from '@/types/museum'
import { getMomentStatusInfo } from '@/types/museum'
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb.vue'

const router = useRouter()
const userStore = useUserStore()
const toast = useToast()

// 状态
const isLoading = ref(true)
const moments = ref<Moment[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)

// 筛选状态
const statusFilter = ref<'all' | MomentStatus>('all')
const keyword = ref('')

// Tab 切换动画
const tabOrder = ['all', 0, 1, 2, 3] as const
const slideDirection = ref<'left' | 'right' | ''>('')
const isAnimating = ref(false)

// 监听 Tab 切换
watch(statusFilter, (newVal, oldVal) => {
  if (oldVal === undefined) return
  const oldIndex = tabOrder.indexOf(oldVal as (typeof tabOrder)[number])
  const newIndex = tabOrder.indexOf(newVal as (typeof tabOrder)[number])
  slideDirection.value = newIndex > oldIndex ? 'left' : 'right'
  isAnimating.value = true
  currentPage.value = 1
  loadMoments()

  nextTick(() => {
    setTimeout(() => {
      isAnimating.value = false
      slideDirection.value = ''
    }, 300)
  })
})

// 删除确认
const showDeleteConfirm = ref(false)
const deleteTarget = ref<Moment | null>(null)
const isDeleting = ref(false)

// 拒绝/下架 Modal
const showRejectModal = ref(false)
const rejectTarget = ref<Moment | null>(null)
const rejectReason = ref('')
const isRejecting = ref(false)
const rejectAction = ref<'reject' | 'takedown'>('reject')

// 详情 Modal
const showDetailModal = ref(false)
const detailTarget = ref<Moment | null>(null)

// 批量选择
const selectedIds = ref<number[]>([])
const isAllSelected = computed(() => {
  if (moments.value.length === 0) return false
  return moments.value.every((m) => selectedIds.value.includes(m.id))
})

// 计算总页数
const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

// 加载瞬间列表
async function loadMoments() {
  isLoading.value = true
  try {
    const params: GetMomentsParams = {
      page: currentPage.value,
      size: pageSize.value,
    }
    if (statusFilter.value !== 'all') {
      params.status = statusFilter.value
    }
    if (keyword.value.trim()) {
      params.keyword = keyword.value.trim()
    }
    const data = await adminGetMoments(params)
    moments.value = data.list
    total.value = data.total
    selectedIds.value = []
  } catch (error) {
    toast.error('获取瞬间列表失败')
  } finally {
    isLoading.value = false
  }
}

// 搜索
function handleSearch() {
  currentPage.value = 1
  loadMoments()
}

// 翻页
function goToPage(page: number) {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  loadMoments()
}

// 审核通过
async function approveMoment(moment: Moment, event?: Event) {
  event?.stopPropagation()
  try {
    await adminApproveMoment(moment.id)
    toast.success('已通过审核')
    loadMoments()
  } catch (error) {
    toast.error('操作失败')
  }
}

// 打开拒绝 Modal
function openRejectModal(moment: Moment, action: 'reject' | 'takedown', event?: Event) {
  event?.stopPropagation()
  rejectTarget.value = moment
  rejectAction.value = action
  rejectReason.value = ''
  showRejectModal.value = true
}

// 确认拒绝/下架
async function confirmReject() {
  if (!rejectTarget.value) return
  if (!rejectReason.value.trim()) {
    toast.error('请输入原因')
    return
  }

  isRejecting.value = true
  try {
    if (rejectAction.value === 'reject') {
      await adminRejectMoment(rejectTarget.value.id, { reason: rejectReason.value.trim() })
      toast.success('已拒绝')
    } else {
      await adminTakedownMoment(rejectTarget.value.id, { reason: rejectReason.value.trim() })
      toast.success('已下架')
    }
    showRejectModal.value = false
    rejectTarget.value = null
    loadMoments()
  } catch (error) {
    toast.error('操作失败')
  } finally {
    isRejecting.value = false
  }
}

// 关闭拒绝 Modal
function closeRejectModal() {
  showRejectModal.value = false
  rejectTarget.value = null
  rejectReason.value = ''
}

// 打开删除确认
function openDeleteConfirm(moment: Moment, event?: Event) {
  event?.stopPropagation()
  deleteTarget.value = moment
  showDeleteConfirm.value = true
}

// 确认删除
async function confirmDelete() {
  if (!deleteTarget.value) return

  isDeleting.value = true
  try {
    await adminDeleteMoment(deleteTarget.value.id)
    toast.success('删除成功')
    showDeleteConfirm.value = false
    deleteTarget.value = null
    loadMoments()
  } catch (error) {
    toast.error('删除失败')
  } finally {
    isDeleting.value = false
  }
}

// 取消删除
function cancelDelete() {
  showDeleteConfirm.value = false
  deleteTarget.value = null
}

// 打开详情 Modal
function openDetailModal(moment: Moment) {
  detailTarget.value = moment
  showDetailModal.value = true
}

// 关闭详情 Modal
function closeDetailModal() {
  showDetailModal.value = false
  detailTarget.value = null
}

// 切换选择
function toggleSelect(id: number) {
  const index = selectedIds.value.indexOf(id)
  if (index === -1) {
    selectedIds.value.push(id)
  } else {
    selectedIds.value.splice(index, 1)
  }
}

// 全选/取消全选
function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedIds.value = []
  } else {
    selectedIds.value = moments.value.map((m) => m.id)
  }
}

// 批量操作
async function batchAction(action: 'approve' | 'reject' | 'takedown' | 'delete') {
  if (selectedIds.value.length === 0) {
    toast.error('请先选择要操作的瞬间')
    return
  }

  const actionLabels = {
    approve: '通过',
    reject: '拒绝',
    takedown: '下架',
    delete: '删除',
  }

  try {
    await adminBatchMomentAction({
      ids: selectedIds.value,
      action,
    })
    toast.success(`批量${actionLabels[action]}成功`)
    loadMoments()
  } catch (error) {
    toast.error(`批量${actionLabels[action]}失败`)
  }
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
  if (!userStore.isLoggedIn || !userStore.canManageMuseum) {
    toast.error('无权访问此页面')
    router.push('/')
    return
  }
  loadMoments()
})
</script>

<template>
  <div class="page-container">
    <PageHeader back-to="/admin/museum" />

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
              <h1 class="page-title">瞬间管理</h1>
              <p class="page-subtitle">审核和管理用户投稿的瞬间</p>
            </div>
          </div>
        </div>

        <!-- 搜索栏 -->
        <div class="search-bar">
          <div class="search-input-wrapper">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="M21 21l-4.35-4.35"></path>
            </svg>
            <input
              v-model="keyword"
              type="text"
              class="search-input"
              placeholder="搜索瞬间内容..."
              @keyup.enter="handleSearch"
            />
          </div>
          <button class="search-btn" @click="handleSearch">搜索</button>
        </div>

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
            :class="{ active: statusFilter === 0 }"
            @click="statusFilter = 0"
          >
            待审核
          </button>
          <button
            class="status-tab"
            :class="{ active: statusFilter === 1 }"
            @click="statusFilter = 1"
          >
            已发布
          </button>
          <button
            class="status-tab"
            :class="{ active: statusFilter === 2 }"
            @click="statusFilter = 2"
          >
            已拒绝
          </button>
          <button
            class="status-tab"
            :class="{ active: statusFilter === 3 }"
            @click="statusFilter = 3"
          >
            已下架
          </button>
        </div>

        <!-- 批量操作栏 -->
        <div v-if="moments.length > 0" class="batch-actions">
          <label class="select-all">
            <input
              type="checkbox"
              :checked="isAllSelected"
              @change="toggleSelectAll"
            />
            <span>全选</span>
          </label>
          <div class="batch-btns">
            <button
              v-if="statusFilter === 0 || statusFilter === 'all'"
              class="batch-btn approve"
              :disabled="selectedIds.length === 0"
              @click="batchAction('approve')"
            >
              批量通过
            </button>
            <button
              v-if="statusFilter === 0 || statusFilter === 'all'"
              class="batch-btn reject"
              :disabled="selectedIds.length === 0"
              @click="batchAction('reject')"
            >
              批量拒绝
            </button>
            <button
              v-if="statusFilter === 1 || statusFilter === 'all'"
              class="batch-btn takedown"
              :disabled="selectedIds.length === 0"
              @click="batchAction('takedown')"
            >
              批量下架
            </button>
            <button
              class="batch-btn delete"
              :disabled="selectedIds.length === 0"
              @click="batchAction('delete')"
            >
              批量删除
            </button>
          </div>
        </div>

        <!-- 加载状态 -->
        <div v-if="isLoading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>

        <template v-else>
          <!-- 内容区域（带动画） -->
          <div
            class="content-slide-wrapper"
            :class="{
              'slide-left': isAnimating && slideDirection === 'left',
              'slide-right': isAnimating && slideDirection === 'right',
            }"
          >
            <!-- 空状态 -->
            <div v-if="moments.length === 0" class="empty-container">
              <div class="empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
              <h2>{{ statusFilter === 'all' ? '暂无瞬间' : '暂无相关瞬间' }}</h2>
              <p>{{ statusFilter === 'all' ? '还没有用户投稿瞬间' : '没有找到该状态的瞬间' }}</p>
            </div>

            <!-- 瞬间列表 -->
            <div v-else class="moments-list">
              <div
                v-for="moment in moments"
                :key="moment.id"
                class="moment-card"
                @click="openDetailModal(moment)"
              >
                <!-- 选择框 -->
                <div class="moment-checkbox" @click.stop>
                  <input
                    type="checkbox"
                    :checked="selectedIds.includes(moment.id)"
                    @change="toggleSelect(moment.id)"
                  />
                </div>

                <!-- 用户信息 -->
                <div class="moment-user">
                  <div class="user-avatar">
                    {{ moment.isAnonymous ? '匿' : moment.nickname?.charAt(0) || moment.username.charAt(0) }}
                  </div>
                  <div class="user-info">
                    <span class="user-name">
                      {{ moment.isAnonymous ? '匿名用户' : (moment.nickname || moment.username) }}
                    </span>
                    <span v-if="moment.isAnonymous" class="anonymous-badge">匿名</span>
                  </div>
                </div>

                <!-- 瞬间内容 -->
                <div class="moment-content">
                  <p class="content-text">{{ moment.content }}</p>
                  <!-- 图片预览 -->
                  <div v-if="moment.images && moment.images.length > 0" class="content-images">
                    <img
                      v-for="(img, index) in moment.images.slice(0, 3)"
                      :key="index"
                      :src="img"
                      class="content-image"
                    />
                    <div v-if="moment.images.length > 3" class="more-images">
                      +{{ moment.images.length - 3 }}
                    </div>
                  </div>
                </div>

                <!-- 瞬间元信息 -->
                <div class="moment-meta">
                  <span class="status-badge" :class="getMomentStatusInfo(moment.status).class">
                    {{ getMomentStatusInfo(moment.status).label }}
                  </span>
                  <span v-if="moment.eventTitle" class="event-tag">{{ moment.eventTitle }}</span>
                  <span class="meta-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                    {{ moment.likeCount }}
                  </span>
                  <span class="meta-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    {{ moment.commentCount }}
                  </span>
                  <span class="meta-time">{{ formatDate(moment.createdAt) }}</span>
                </div>

                <!-- 操作按钮 -->
                <div class="moment-actions">
                  <button
                    v-if="moment.status === 0"
                    class="action-btn approve"
                    @click="approveMoment(moment, $event)"
                  >
                    通过
                  </button>
                  <button
                    v-if="moment.status === 0"
                    class="action-btn reject"
                    @click="openRejectModal(moment, 'reject', $event)"
                  >
                    拒绝
                  </button>
                  <button
                    v-if="moment.status === 1"
                    class="action-btn takedown"
                    @click="openRejectModal(moment, 'takedown', $event)"
                  >
                    下架
                  </button>
                  <button
                    class="action-btn delete"
                    @click="openDeleteConfirm(moment, $event)"
                  >
                    删除
                  </button>
                  <div class="arrow-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <!-- 分页 -->
            <div v-if="totalPages > 1" class="pagination">
              <button
                class="page-btn"
                :disabled="currentPage === 1"
                @click="goToPage(currentPage - 1)"
              >
                上一页
              </button>
              <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
              <button
                class="page-btn"
                :disabled="currentPage === totalPages"
                @click="goToPage(currentPage + 1)"
              >
                下一页
              </button>
            </div>
          </div>
        </template>
      </div>
    </main>

    <PageFooter />

    <!-- 拒绝/下架 Modal -->
    <div v-if="showRejectModal" class="modal-overlay" @click.self="closeRejectModal">
      <div class="modal-content">
        <h3 class="modal-title">{{ rejectAction === 'reject' ? '拒绝审核' : '下架瞬间' }}</h3>
        <div class="form-group">
          <label class="form-label">
            {{ rejectAction === 'reject' ? '拒绝原因' : '下架原因' }}
            <span class="required">*</span>
          </label>
          <textarea
            v-model="rejectReason"
            class="form-textarea"
            :placeholder="rejectAction === 'reject' ? '请输入拒绝原因' : '请输入下架原因'"
            rows="3"
          ></textarea>
        </div>
        <div class="modal-actions">
          <button class="modal-btn cancel" @click="closeRejectModal" :disabled="isRejecting">
            取消
          </button>
          <button class="modal-btn confirm danger" @click="confirmReject" :disabled="isRejecting">
            {{ isRejecting ? '处理中...' : '确认' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 删除确认弹窗 -->
    <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="cancelDelete">
      <div class="modal-content">
        <h3 class="modal-title">确认删除</h3>
        <p class="modal-desc">
          确定要删除这条瞬间吗？此操作不可撤销。
        </p>
        <div class="modal-actions">
          <button class="modal-btn cancel" @click="cancelDelete" :disabled="isDeleting">
            取消
          </button>
          <button class="modal-btn confirm danger" @click="confirmDelete" :disabled="isDeleting">
            {{ isDeleting ? '删除中...' : '确认删除' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 详情 Modal -->
    <div v-if="showDetailModal && detailTarget" class="modal-overlay" @click.self="closeDetailModal">
      <div class="modal-content modal-lg">
        <h3 class="modal-title">瞬间详情</h3>

        <!-- 用户信息 -->
        <div class="detail-user">
          <div class="user-avatar large">
            {{ detailTarget.isAnonymous ? '匿' : detailTarget.nickname?.charAt(0) || detailTarget.username.charAt(0) }}
          </div>
          <div class="user-info">
            <span class="user-name">
              {{ detailTarget.isAnonymous ? '匿名用户' : (detailTarget.nickname || detailTarget.username) }}
            </span>
            <span v-if="!detailTarget.isAnonymous" class="user-username">@{{ detailTarget.username }}</span>
            <span v-if="detailTarget.isAnonymous" class="anonymous-badge">匿名投稿</span>
          </div>
          <span class="status-badge" :class="getMomentStatusInfo(detailTarget.status).class">
            {{ getMomentStatusInfo(detailTarget.status).label }}
          </span>
        </div>

        <!-- 内容 -->
        <div class="detail-content">
          <p>{{ detailTarget.content }}</p>
        </div>

        <!-- 图片 -->
        <div v-if="detailTarget.images && detailTarget.images.length > 0" class="detail-images">
          <img
            v-for="(img, index) in detailTarget.images"
            :key="index"
            :src="img"
            class="detail-image"
          />
        </div>

        <!-- 元信息 -->
        <div class="detail-meta">
          <div class="meta-row">
            <span class="meta-label">瞬间时间：</span>
            <span class="meta-value">{{ formatDateTime(detailTarget.momentTime) }}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">投稿时间：</span>
            <span class="meta-value">{{ formatDateTime(detailTarget.createdAt) }}</span>
          </div>
          <div v-if="detailTarget.eventTitle" class="meta-row">
            <span class="meta-label">关联活动：</span>
            <span class="meta-value">{{ detailTarget.eventTitle }}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">点赞数：</span>
            <span class="meta-value">{{ detailTarget.likeCount }}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">评论数：</span>
            <span class="meta-value">{{ detailTarget.commentCount }}</span>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="detail-actions">
          <button
            v-if="detailTarget.status === 0"
            class="action-btn approve"
            @click="approveMoment(detailTarget); closeDetailModal()"
          >
            通过审核
          </button>
          <button
            v-if="detailTarget.status === 0"
            class="action-btn reject"
            @click="closeDetailModal(); openRejectModal(detailTarget, 'reject')"
          >
            拒绝
          </button>
          <button
            v-if="detailTarget.status === 1"
            class="action-btn takedown"
            @click="closeDetailModal(); openRejectModal(detailTarget, 'takedown')"
          >
            下架
          </button>
          <button
            class="action-btn delete"
            @click="closeDetailModal(); openDeleteConfirm(detailTarget)"
          >
            删除
          </button>
          <button class="modal-btn cancel" @click="closeDetailModal">
            关闭
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
  margin-bottom: var(--spacing-md);
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

/* ===== Search Bar ===== */
.search-bar {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.search-input-wrapper {
  flex: 1;
  position: relative;
}

.search-icon {
  position: absolute;
  left: var(--spacing-sm);
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  color: var(--color-text-placeholder);
}

.search-input {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-sm) var(--spacing-sm) 40px;
  font-size: var(--text-sm);
  color: var(--color-text);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-primary-bg);
}

.search-btn {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: white;
  background: var(--color-primary);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.search-btn:hover {
  background: var(--color-primary-dark);
}

/* ===== Status Tabs ===== */
.status-tabs {
  position: relative;
  display: flex;
  gap: 2px;
  margin-bottom: var(--spacing-md);
  padding: 3px;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.status-tabs::-webkit-scrollbar {
  display: none;
}

.status-tab {
  flex: 1;
  min-width: 50px;
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: color 0.2s ease, background-color 0.3s ease, transform 0.2s ease;
  text-align: center;
  white-space: nowrap;
}

.status-tab:hover {
  color: var(--color-text);
}

.status-tab:active {
  transform: scale(0.95);
}

.status-tab.active {
  color: var(--color-primary);
  background: var(--color-primary-bg);
}

/* ===== Batch Actions ===== */
.batch-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  margin-bottom: var(--spacing-md);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.select-all {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  cursor: pointer;
}

.select-all input {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.batch-btns {
  display: flex;
  gap: var(--spacing-xs);
  flex-wrap: wrap;
}

.batch-btn {
  padding: 4px 10px;
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
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.batch-btn.reject:hover:not(:disabled) {
  background: var(--color-warning);
  color: white;
}

.batch-btn.takedown {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.batch-btn.takedown:hover:not(:disabled) {
  background: var(--color-warning);
  color: white;
}

.batch-btn.delete {
  background: var(--color-error-bg);
  color: var(--color-error);
}

.batch-btn.delete:hover:not(:disabled) {
  background: var(--color-error);
  color: white;
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

/* ===== Content Slide Animation ===== */
.content-slide-wrapper {
  animation-fill-mode: both;
}

.content-slide-wrapper.slide-left {
  animation: slideInFromRight 0.3s ease;
}

.content-slide-wrapper.slide-right {
  animation: slideInFromLeft 0.3s ease;
}

@keyframes slideInFromRight {
  from {
    opacity: 0;
    transform: translateX(30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideInFromLeft {
  from {
    opacity: 0;
    transform: translateX(-30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
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

/* ===== Moment List ===== */
.moments-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.moment-card {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
  position: relative;
}

.moment-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.moment-checkbox {
  position: absolute;
  top: var(--spacing-md);
  right: var(--spacing-md);
}

.moment-checkbox input {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

/* ===== User Info ===== */
.moment-user {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--color-primary-bg);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  flex-shrink: 0;
}

.user-avatar.large {
  width: 48px;
  height: 48px;
  font-size: var(--text-base);
}

.user-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  flex-wrap: wrap;
}

.user-name {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
}

.user-username {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
}

.anonymous-badge {
  font-size: 10px;
  padding: 2px 6px;
  background: var(--color-border);
  color: var(--color-text-secondary);
  border-radius: var(--radius-sm);
}

/* ===== Moment Content ===== */
.moment-content {
  padding-right: 30px;
}

.content-text {
  font-size: var(--text-sm);
  line-height: 1.6;
  color: var(--color-text);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.content-images {
  display: flex;
  gap: var(--spacing-xs);
  margin-top: var(--spacing-sm);
}

.content-image {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: var(--radius-md);
}

.more-images {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-border);
  color: var(--color-text-secondary);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

/* ===== Moment Meta ===== */
.moment-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
}

.status-badge {
  font-size: 10px;
  font-weight: var(--font-semibold);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.status-badge.status-pending {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.status-badge.status-published {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.status-badge.status-rejected {
  background: var(--color-error-bg);
  color: var(--color-error);
}

.status-badge.status-takedown {
  background: var(--color-border);
  color: var(--color-text-secondary);
}

.event-tag {
  font-size: 10px;
  padding: 2px 6px;
  background: var(--color-primary-bg);
  color: var(--color-primary);
  border-radius: var(--radius-sm);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 2px;
}

.meta-item svg {
  width: 12px;
  height: 12px;
}

.meta-time {
  margin-left: auto;
}

/* ===== Moment Actions ===== */
.moment-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding-top: var(--spacing-sm);
  border-top: 1px solid var(--color-border);
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

.action-btn.approve {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.action-btn.approve:hover {
  background: var(--color-success);
  color: white;
}

.action-btn.reject {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.action-btn.reject:hover {
  background: var(--color-warning);
  color: white;
}

.action-btn.takedown {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.action-btn.takedown:hover {
  background: var(--color-warning);
  color: white;
}

.action-btn.delete {
  background: var(--color-error-bg);
  color: var(--color-error);
}

.action-btn.delete:hover {
  background: var(--color-error);
  color: white;
}

.arrow-icon {
  margin-left: auto;
  color: var(--color-text-placeholder);
}

.arrow-icon svg {
  width: 16px;
  height: 16px;
}

/* ===== Pagination ===== */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  margin-top: var(--spacing-lg);
}

.page-btn {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.page-btn:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
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

.modal-content.modal-lg {
  max-width: 500px;
  max-height: 85vh;
  overflow-y: auto;
}

.modal-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-md);
}

.modal-desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-lg);
}

/* ===== Form ===== */
.form-group {
  margin-bottom: var(--spacing-md);
}

.form-label {
  display: block;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text);
  margin-bottom: var(--spacing-xs);
}

.form-label .required {
  color: var(--color-error);
}

.form-textarea {
  width: 100%;
  padding: var(--spacing-sm);
  font-size: var(--text-sm);
  color: var(--color-text);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
  resize: vertical;
  min-height: 80px;
}

.form-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-primary-bg);
}

.modal-actions {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: flex-end;
  margin-top: var(--spacing-lg);
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

.modal-btn.cancel:hover:not(:disabled) {
  background: var(--color-text-placeholder);
}

.modal-btn.confirm {
  background: var(--color-primary);
  color: white;
}

.modal-btn.confirm:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.modal-btn.confirm.danger {
  background: var(--color-error);
}

.modal-btn.confirm.danger:hover:not(:disabled) {
  opacity: 0.9;
}

/* ===== Detail Modal ===== */
.detail-user {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
  flex-wrap: wrap;
}

.detail-user .status-badge {
  margin-left: auto;
}

.detail-content {
  padding: var(--spacing-md);
  background: var(--color-bg);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-md);
}

.detail-content p {
  font-size: var(--text-sm);
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
}

.detail-images {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.detail-image {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: var(--radius-md);
  cursor: pointer;
}

.detail-meta {
  padding: var(--spacing-md);
  background: var(--color-bg);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-md);
}

.meta-row {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-xs);
  font-size: var(--text-sm);
}

.meta-row:last-child {
  margin-bottom: 0;
}

.meta-label {
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.meta-value {
  color: var(--color-text);
}

.detail-actions {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.detail-actions .action-btn {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
}

/* ===== Desktop ===== */
@media (min-width: 1024px) {
  .breadcrumb-wrapper {
    display: block;
  }

  .page-content {
    padding: var(--spacing-xl);
  }

  .page-header-section {
    margin-bottom: var(--spacing-lg);
  }

  .header-main {
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-start;
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

  .status-tab {
    font-size: var(--text-sm);
    padding: var(--spacing-sm) var(--spacing-md);
  }

  .moment-card {
    flex-direction: row;
    align-items: flex-start;
    gap: var(--spacing-md);
  }

  .moment-checkbox {
    position: static;
    display: flex;
    align-items: center;
  }

  .moment-user {
    flex-shrink: 0;
    width: 120px;
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
  }

  .moment-content {
    flex: 1;
    min-width: 0;
    padding-right: 0;
  }

  .content-text {
    -webkit-line-clamp: 2;
  }

  .moment-meta {
    width: 100%;
  }

  .moment-actions {
    flex-shrink: 0;
    padding-top: 0;
    padding-left: var(--spacing-md);
    border-top: none;
    border-left: 1px solid var(--color-border);
    flex-direction: column;
    align-items: flex-end;
  }

  .arrow-icon {
    margin-left: 0;
    margin-top: auto;
  }

  .action-btn {
    padding: 6px 16px;
    font-size: var(--text-sm);
  }

  .batch-btn {
    padding: 6px 14px;
    font-size: var(--text-sm);
  }
}
</style>
