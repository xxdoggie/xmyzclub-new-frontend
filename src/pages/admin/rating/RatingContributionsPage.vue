<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/composables/useToast'
import {
  getAdminContributions,
  getAdminContributionsPendingCount,
  reviewContribution,
} from '@/api/rating'
import type {
  Contribution,
  ContributionStatus,
  ContributionType,
  TargetType,
} from '@/types/rating'
import {
  getContributionStatusInfo,
  getContributionTypeInfo,
  getTargetTypeInfo,
} from '@/types/rating'
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb.vue'

const router = useRouter()
const userStore = useUserStore()
const toast = useToast()

// ==================== 状态 ====================
const isLoading = ref(true)
const contributions = ref<Contribution[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const pendingCount = ref(0)

// 筛选条件
const statusFilter = ref<ContributionStatus | 'all'>('all')
const contributionTypeFilter = ref<ContributionType | 'all'>('all')
const targetTypeFilter = ref<TargetType | 'all'>('all')

// Tab 动画方向
const tabOrder = ['all', 0, 1, 2] as const
const slideDirection = ref<'left' | 'right' | ''>('')
const isAnimating = ref(false)

// 审核相关
const showReviewModal = ref(false)
const reviewTarget = ref<Contribution | null>(null)
const reviewAction = ref<'approve' | 'reject'>('approve')
const rejectReason = ref('')
const isReviewing = ref(false)

// 详情展开状态
const expandedIds = ref<Set<number>>(new Set())

// ==================== 计算属性 ====================
const hasMore = computed(() => contributions.value.length < total.value)

// ==================== 监听筛选条件变化 ====================
watch(statusFilter, (newVal, oldVal) => {
  if (oldVal === undefined) return
  const oldIndex = tabOrder.indexOf(oldVal as typeof tabOrder[number])
  const newIndex = tabOrder.indexOf(newVal as typeof tabOrder[number])
  slideDirection.value = newIndex > oldIndex ? 'left' : 'right'
  isAnimating.value = true
  loadContributions(true)

  nextTick(() => {
    setTimeout(() => {
      isAnimating.value = false
      slideDirection.value = ''
    }, 300)
  })
})

watch([contributionTypeFilter, targetTypeFilter], () => {
  loadContributions(true)
})

// ==================== 数据加载 ====================
async function loadContributions(reset = false) {
  if (reset) {
    page.value = 1
    contributions.value = []
  }

  isLoading.value = true
  try {
    const params: {
      page: number
      size: number
      status?: ContributionStatus
      contributionType?: ContributionType
      targetType?: TargetType
    } = {
      page: page.value,
      size: pageSize.value,
    }
    if (statusFilter.value !== 'all') {
      params.status = statusFilter.value
    }
    if (contributionTypeFilter.value !== 'all') {
      params.contributionType = contributionTypeFilter.value
    }
    if (targetTypeFilter.value !== 'all') {
      params.targetType = targetTypeFilter.value
    }

    const res = await getAdminContributions(params)
    if (res.data.code === 200) {
      if (reset) {
        contributions.value = res.data.data.items
      } else {
        contributions.value = [...contributions.value, ...res.data.data.items]
      }
      total.value = res.data.data.total
    } else {
      toast.error(res.data.message || '获取贡献列表失败')
    }
  } catch {
    toast.error('获取贡献列表失败')
  } finally {
    isLoading.value = false
  }
}

async function loadPendingCount() {
  try {
    const res = await getAdminContributionsPendingCount()
    if (res.data.code === 200) {
      pendingCount.value = res.data.data
    }
  } catch {
    // 忽略错误
  }
}

// 加载更多
function loadMore() {
  if (!hasMore.value || isLoading.value) return
  page.value++
  loadContributions()
}

// ==================== 展开/收起详情 ====================
function toggleExpand(id: number) {
  if (expandedIds.value.has(id)) {
    expandedIds.value.delete(id)
  } else {
    expandedIds.value.add(id)
  }
}

function isExpanded(id: number): boolean {
  return expandedIds.value.has(id)
}

// ==================== 审核操作 ====================
function openReviewModal(contribution: Contribution, action: 'approve' | 'reject') {
  reviewTarget.value = contribution
  reviewAction.value = action
  rejectReason.value = ''
  showReviewModal.value = true
}

function closeReviewModal() {
  showReviewModal.value = false
  reviewTarget.value = null
  rejectReason.value = ''
}

async function confirmReview() {
  if (!reviewTarget.value) return

  if (reviewAction.value === 'reject' && !rejectReason.value.trim()) {
    toast.error('请填写拒绝原因')
    return
  }

  isReviewing.value = true
  try {
    const data = {
      status: reviewAction.value === 'approve' ? 1 : 2,
      rejectReason: reviewAction.value === 'reject' ? rejectReason.value.trim() : undefined,
    } as const

    const res = await reviewContribution(reviewTarget.value.id, data)
    if (res.data.code === 200) {
      toast.success(reviewAction.value === 'approve' ? '已通过审核' : '已拒绝')
      closeReviewModal()
      await Promise.all([loadContributions(true), loadPendingCount()])
    } else {
      toast.error(res.data.message || '审核失败')
    }
  } catch {
    toast.error('审核失败')
  } finally {
    isReviewing.value = false
  }
}

// ==================== 辅助函数 ====================
function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours === 0) {
      const minutes = Math.floor(diff / (1000 * 60))
      return minutes <= 0 ? '刚刚' : `${minutes}分钟前`
    }
    return `${hours}小时前`
  } else if (days === 1) {
    return '昨天'
  } else if (days < 7) {
    return `${days}天前`
  } else {
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }
}

function getFieldNameDisplay(fieldName: string): string {
  switch (fieldName) {
    case 'name':
      return '名称'
    case 'description':
      return '描述'
    case 'image':
      return '图片'
    default:
      return fieldName
  }
}

// ==================== 生命周期 ====================
onMounted(() => {
  if (!userStore.isLoggedIn || !userStore.canManageRating) {
    toast.error('无权访问此页面')
    router.push('/')
    return
  }
  loadContributions(true)
  loadPendingCount()
})
</script>

<template>
  <div class="page-container">
    <PageHeader back-to="/admin/rating" />

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
              <h1 class="page-title">审核反馈</h1>
              <p class="page-subtitle">
                审核用户提交的内容修改和新增请求
                <span v-if="pendingCount > 0" class="pending-badge">{{ pendingCount }} 条待审核</span>
              </p>
            </div>
          </div>
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
            <span v-if="pendingCount > 0 && statusFilter !== 0" class="tab-count">{{ pendingCount }}</span>
          </button>
          <button
            class="status-tab"
            :class="{ active: statusFilter === 1 }"
            @click="statusFilter = 1"
          >
            已通过
          </button>
          <button
            class="status-tab"
            :class="{ active: statusFilter === 2 }"
            @click="statusFilter = 2"
          >
            已拒绝
          </button>
        </div>

        <!-- 更多筛选 -->
        <div class="filter-row">
          <div class="filter-group">
            <label class="filter-label">贡献类型</label>
            <select v-model="contributionTypeFilter" class="filter-select">
              <option value="all">全部类型</option>
              <option :value="1">修改现有</option>
              <option :value="2">新增内容</option>
            </select>
          </div>
          <div class="filter-group">
            <label class="filter-label">目标类型</label>
            <select v-model="targetTypeFilter" class="filter-select">
              <option value="all">全部目标</option>
              <option :value="1">大分区</option>
              <option :value="2">小分区</option>
              <option :value="3">评分项目</option>
              <option :value="4">合集</option>
            </select>
          </div>
        </div>

        <!-- 加载状态 -->
        <div v-if="isLoading && contributions.length === 0" class="loading-container">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>

        <!-- 内容区域（带动画） -->
        <div
          v-else
          class="content-slide-wrapper"
          :class="{
            'slide-left': isAnimating && slideDirection === 'left',
            'slide-right': isAnimating && slideDirection === 'right'
          }"
        >
          <!-- 空状态 -->
          <div v-if="contributions.length === 0" class="empty-container">
            <div class="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"></path>
                <rect x="9" y="3" width="6" height="4" rx="1"></rect>
                <path d="M9 12h6M9 16h6"></path>
              </svg>
            </div>
            <h2>暂无反馈</h2>
            <p>{{ statusFilter === 'all' ? '还没有用户提交任何反馈' : '没有找到符合条件的反馈' }}</p>
          </div>

          <!-- 贡献列表 -->
          <div v-else class="contributions-list">
            <div
              v-for="contribution in contributions"
              :key="contribution.id"
              class="contribution-card"
              :class="{ expanded: isExpanded(contribution.id) }"
            >
              <!-- 头部 -->
              <div class="card-header" @click="toggleExpand(contribution.id)">
                <div class="card-badges">
                  <span class="type-badge" :class="getContributionTypeInfo(contribution.contributionType).class">
                    <svg v-if="contribution.contributionType === 1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="16"></line>
                      <line x1="8" y1="12" x2="16" y2="12"></line>
                    </svg>
                    {{ contribution.contributionTypeDisplay }}
                  </span>
                  <span class="target-badge" :class="getTargetTypeInfo(contribution.targetType).class">
                    {{ contribution.targetTypeDisplay }}
                  </span>
                  <span class="status-badge" :class="getContributionStatusInfo(contribution.status).class">
                    {{ contribution.statusDisplay }}
                  </span>
                </div>
                <div class="card-meta">
                  <span class="card-user">{{ contribution.nickname || contribution.username }}</span>
                  <span class="card-time">{{ formatTime(contribution.createdAt) }}</span>
                  <div class="expand-icon" :class="{ expanded: isExpanded(contribution.id) }">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </div>
                </div>
              </div>

              <!-- 内容摘要 -->
              <div class="card-summary">
                <h3 class="card-title">
                  <template v-if="contribution.contributionType === 1">
                    修改「{{ contribution.targetName || '未知目标' }}」
                  </template>
                  <template v-else>
                    新建{{ contribution.targetTypeDisplay }}
                    <template v-if="contribution.parentName">
                      （位于「{{ contribution.parentName }}」下）
                    </template>
                  </template>
                </h3>
                <p class="card-reason">{{ contribution.reason }}</p>
              </div>

              <!-- 详细内容（展开时显示） -->
              <Transition name="expand">
                <div v-if="isExpanded(contribution.id)" class="card-details">
                  <div
                    v-for="(detail, index) in contribution.details"
                    :key="index"
                    class="detail-item"
                  >
                    <span class="detail-label">{{ detail.fieldNameDisplay || getFieldNameDisplay(detail.fieldName) }}</span>

                    <!-- 图片字段 -->
                    <template v-if="detail.fieldName === 'image'">
                      <div class="detail-images">
                        <!-- 修改模式 -->
                        <template v-if="contribution.contributionType === 1">
                          <div class="image-compare">
                            <div class="image-box">
                              <span class="image-label">修改前</span>
                              <img
                                v-if="detail.oldImageUrl"
                                :src="detail.oldImageUrl"
                                alt="修改前图片"
                                class="detail-image"
                              />
                              <div v-else class="image-placeholder">无图片</div>
                            </div>
                            <svg class="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M5 12h14M12 5l7 7-7 7"></path>
                            </svg>
                            <div class="image-box">
                              <span class="image-label">修改后</span>
                              <img
                                v-if="detail.newImageUrl"
                                :src="detail.newImageUrl"
                                alt="修改后图片"
                                class="detail-image"
                              />
                              <div v-else class="image-placeholder">无图片</div>
                            </div>
                          </div>
                        </template>
                        <!-- 新建模式 -->
                        <template v-else>
                          <img
                            v-if="detail.newImageUrl"
                            :src="detail.newImageUrl"
                            alt="新建图片"
                            class="detail-image single"
                          />
                          <div v-else class="image-placeholder">未上传图片</div>
                        </template>
                      </div>
                    </template>

                    <!-- 文本字段 -->
                    <template v-else>
                      <div class="detail-content">
                        <!-- 修改模式 -->
                        <template v-if="contribution.contributionType === 1 && detail.oldValue !== undefined">
                          <div class="text-compare">
                            <span class="old-value">{{ detail.oldValue || '（空）' }}</span>
                            <svg class="arrow-icon small" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M5 12h14M12 5l7 7-7 7"></path>
                            </svg>
                            <span class="new-value">{{ detail.newValue }}</span>
                          </div>
                        </template>
                        <!-- 新建模式 -->
                        <template v-else>
                          <span class="new-value">{{ detail.newValue }}</span>
                        </template>
                      </div>
                    </template>
                  </div>

                  <!-- 拒绝原因 -->
                  <div v-if="contribution.status === 2 && contribution.rejectReason" class="reject-reason">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <span>拒绝原因：{{ contribution.rejectReason }}</span>
                  </div>

                  <!-- 审核信息 -->
                  <div v-if="contribution.reviewedAt" class="review-info">
                    <span>审核人：{{ contribution.reviewerUsername || '未知' }}</span>
                    <span>审核于 {{ formatTime(contribution.reviewedAt) }}</span>
                  </div>

                  <!-- 审核操作 -->
                  <div v-if="contribution.status === 0" class="review-actions">
                    <button class="review-btn approve" @click.stop="openReviewModal(contribution, 'approve')">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      通过
                    </button>
                    <button class="review-btn reject" @click.stop="openReviewModal(contribution, 'reject')">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                      拒绝
                    </button>
                  </div>
                </div>
              </Transition>
            </div>

            <!-- 加载更多 -->
            <div v-if="hasMore" class="load-more">
              <button class="load-more-btn" :disabled="isLoading" @click="loadMore">
                {{ isLoading ? '加载中...' : '加载更多' }}
              </button>
            </div>

            <!-- 已加载完 -->
            <div v-else-if="contributions.length > 0" class="no-more">
              已加载全部
            </div>
          </div>
        </div>
      </div>
    </main>

    <PageFooter />

    <!-- 审核确认弹窗 -->
    <Transition name="modal-fade">
      <div v-if="showReviewModal" class="modal-overlay" @click.self="closeReviewModal">
        <Transition name="modal-scale" appear>
          <div v-if="showReviewModal" class="modal-content" @click.stop>
            <h3 class="modal-title">
              {{ reviewAction === 'approve' ? '确认通过' : '确认拒绝' }}
            </h3>
            <p class="modal-desc">
              {{ reviewAction === 'approve' ? '确定要通过这条反馈吗？审核通过后内容将被更新。' : '请填写拒绝原因，以便用户了解情况。' }}
            </p>

            <!-- 拒绝原因输入 -->
            <div v-if="reviewAction === 'reject'" class="form-group">
              <label class="form-label">拒绝原因 <span class="required">*</span></label>
              <textarea
                v-model="rejectReason"
                class="form-textarea"
                placeholder="请说明拒绝的原因，帮助用户改进..."
                rows="3"
                maxlength="200"
              ></textarea>
              <div class="char-count">{{ rejectReason.length }}/200</div>
            </div>

            <div class="modal-actions">
              <button class="modal-btn cancel" @click="closeReviewModal" :disabled="isReviewing">
                取消
              </button>
              <button
                class="modal-btn confirm"
                :class="reviewAction === 'approve' ? 'primary' : 'danger'"
                @click="confirmReview"
                :disabled="isReviewing"
              >
                {{ isReviewing ? '处理中...' : (reviewAction === 'approve' ? '确认通过' : '确认拒绝') }}
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
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.pending-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: #F59E0B;
  background: rgba(245, 158, 11, 0.1);
  border-radius: var(--radius-full);
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
  min-width: 60px;
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
  transition: color 0.2s ease, background-color 0.3s ease;
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

.tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  font-size: 10px;
  font-weight: var(--font-bold);
  color: white;
  background: #F59E0B;
  border-radius: var(--radius-full);
}

/* ===== Filter Row ===== */
.filter-row {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  flex-wrap: wrap;
  overflow: hidden;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  flex: 1;
  min-width: 0;
}

.filter-label {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  white-space: nowrap;
  flex-shrink: 0;
}

.filter-select {
  flex: 1;
  min-width: 0;
  max-width: 100%;
  padding: var(--spacing-xs) var(--spacing-sm);
  padding-right: calc(var(--spacing-sm) + 18px);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-text);
  background-color: var(--color-bg);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 6px center;
  background-size: 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  box-sizing: border-box;
}

.filter-select:hover {
  border-color: var(--color-primary);
}

.filter-select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-bg);
}

.filter-select option {
  padding: var(--spacing-sm);
  background: var(--color-card);
  color: var(--color-text);
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

/* ===== Contributions List ===== */
.contributions-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.contribution-card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: all var(--transition-fast);
}

.contribution-card:hover {
  border-color: var(--color-primary);
}

.contribution-card.expanded {
  border-color: var(--color-primary);
}

/* Card Header */
.card-header {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  padding: var(--spacing-md);
  cursor: pointer;
}

.card-badges {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.type-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  background: var(--color-bg);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
}

.type-badge svg {
  width: 12px;
  height: 12px;
}

.type-badge.type-modify {
  color: var(--color-primary);
  background: var(--color-primary-bg);
}

.type-badge.type-create {
  color: #10B981;
  background: rgba(16, 185, 129, 0.1);
}

.target-badge {
  padding: 2px 8px;
  font-size: var(--text-xs);
  background: var(--color-bg);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
}

.status-badge {
  padding: 2px 8px;
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  border-radius: var(--radius-sm);
}

.status-badge.status-pending {
  color: #F59E0B;
  background: rgba(245, 158, 11, 0.1);
}

.status-badge.status-approved {
  color: #10B981;
  background: rgba(16, 185, 129, 0.1);
}

.status-badge.status-rejected {
  color: #EF4444;
  background: rgba(239, 68, 68, 0.1);
}

.card-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
}

.card-user {
  color: var(--color-text-secondary);
  font-weight: var(--font-medium);
}

.expand-icon {
  margin-left: auto;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
}

.expand-icon svg {
  width: 14px;
  height: 14px;
}

.expand-icon.expanded {
  transform: rotate(180deg);
}

/* Card Summary */
.card-summary {
  padding: 0 var(--spacing-md) var(--spacing-md);
}

.card-title {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  margin-bottom: 4px;
  line-height: 1.4;
}

.card-reason {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  line-height: 1.5;
}

/* Card Details */
.card-details {
  padding: var(--spacing-md);
  background: var(--color-bg);
  border-top: 1px solid var(--color-border);
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: var(--spacing-sm);
}

.detail-item:last-child {
  margin-bottom: 0;
}

.detail-label {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
}

.detail-content {
  font-size: var(--text-sm);
  line-height: 1.5;
}

.text-compare {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-xs);
}

.old-value {
  color: var(--color-text-secondary);
  text-decoration: line-through;
  background: rgba(239, 68, 68, 0.1);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  word-break: break-word;
}

.new-value {
  color: var(--color-text);
  background: rgba(16, 185, 129, 0.1);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  word-break: break-word;
}

.arrow-icon {
  width: 16px;
  height: 16px;
  color: var(--color-text-placeholder);
  flex-shrink: 0;
}

.arrow-icon.small {
  width: 14px;
  height: 14px;
}

/* Image Display */
.detail-images {
  margin-top: 4px;
}

.image-compare {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.image-box {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 100px;
  max-width: 200px;
}

.image-label {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
}

.detail-image {
  width: 100%;
  max-height: 120px;
  object-fit: cover;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.detail-image.single {
  max-width: 200px;
}

.image-placeholder {
  width: 100%;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-hover);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
}

/* Reject Reason */
.reject-reason {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm);
  margin-top: var(--spacing-sm);
  background: rgba(239, 68, 68, 0.05);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  color: #EF4444;
}

.reject-reason svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  margin-top: 1px;
}

/* Review Info */
.review-info {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
  padding-top: var(--spacing-sm);
  border-top: 1px dashed var(--color-border);
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
}

/* Review Actions */
.review-actions {
  display: flex;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-border);
}

.review-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.review-btn svg {
  width: 16px;
  height: 16px;
}

.review-btn.approve {
  background: rgba(16, 185, 129, 0.1);
  color: #10B981;
}

.review-btn.approve:hover {
  background: #10B981;
  color: white;
}

.review-btn.reject {
  background: rgba(239, 68, 68, 0.1);
  color: #EF4444;
}

.review-btn.reject:hover {
  background: #EF4444;
  color: white;
}

/* ===== Load More ===== */
.load-more {
  text-align: center;
  padding: var(--spacing-md);
}

.load-more-btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  font-size: var(--text-sm);
  color: var(--color-primary);
  background: transparent;
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.load-more-btn:hover:not(:disabled) {
  background: var(--color-primary-bg);
}

.load-more-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.no-more {
  text-align: center;
  padding: var(--spacing-md);
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
}

/* ===== Expand Animation ===== */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
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

.form-label .required {
  color: #EF4444;
}

.form-textarea {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  color: var(--color-text);
  resize: vertical;
  font-family: inherit;
  transition: border-color var(--transition-fast);
}

.form-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
}

.form-textarea::placeholder {
  color: var(--color-text-placeholder);
}

.char-count {
  text-align: right;
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
  margin-top: 4px;
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

.modal-btn.cancel:hover:not(:disabled) {
  background: var(--color-text-placeholder);
}

.modal-btn.confirm.primary {
  background: #10B981;
  color: white;
}

.modal-btn.confirm.primary:hover:not(:disabled) {
  background: #059669;
}

.modal-btn.confirm.danger {
  background: #EF4444;
  color: white;
}

.modal-btn.confirm.danger:hover:not(:disabled) {
  opacity: 0.9;
}

/* ===== Modal Transitions ===== */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-scale-enter-active,
.modal-scale-leave-active {
  transition: all 0.2s ease;
}

.modal-scale-enter-from,
.modal-scale-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

/* ===== Desktop ===== */
@media (min-width: 768px) {
  .card-header {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .filter-row {
    gap: var(--spacing-md);
  }

  .filter-group {
    flex: none;
    gap: var(--spacing-sm);
  }

  .filter-label {
    font-size: var(--text-sm);
  }

  .filter-select {
    padding: var(--spacing-sm) var(--spacing-md);
    padding-right: calc(var(--spacing-md) + 20px);
    font-size: var(--text-sm);
    background-position: right var(--spacing-sm) center;
    background-size: 16px;
  }
}

@media (min-width: 1024px) {
  .breadcrumb-wrapper {
    display: block;
  }

  .page-content {
    padding: var(--spacing-xl);
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

  .card-title {
    font-size: var(--text-base);
  }

  .card-reason {
    font-size: var(--text-sm);
  }
}
</style>
