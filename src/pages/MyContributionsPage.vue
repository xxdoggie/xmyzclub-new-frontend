<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToast } from '@/composables/useToast'
import { useUserStore } from '@/stores/user'
import { getMyContributions } from '@/api/rating'
import type { MyContribution, ContributionStatus } from '@/types/rating'
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'

const toast = useToast()
const userStore = useUserStore()

// 状态
const isLoading = ref(true)
const contributions = ref<MyContribution[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const currentStatus = ref<ContributionStatus | null>(null)

// 状态筛选选项
const statusOptions = [
  { label: '全部', value: null },
  { label: '待审核', value: 0 as ContributionStatus },
  { label: '已通过', value: 1 as ContributionStatus },
  { label: '已拒绝', value: 2 as ContributionStatus },
]

// 是否有更多数据
const hasMore = computed(() => contributions.value.length < total.value)

// 加载贡献列表
async function loadContributions(reset = false) {
  if (!userStore.isLoggedIn) {
    userStore.openLoginModal()
    return
  }

  if (reset) {
    currentPage.value = 1
    contributions.value = []
  }

  isLoading.value = true
  try {
    const params: { page: number; size: number; status?: number } = {
      page: currentPage.value,
      size: pageSize.value,
    }
    if (currentStatus.value !== null) {
      params.status = currentStatus.value
    }

    const res = await getMyContributions(params)
    if (res.data.code === 200) {
      if (reset) {
        contributions.value = res.data.data.items
      } else {
        contributions.value = [...contributions.value, ...res.data.data.items]
      }
      total.value = res.data.data.total
    } else {
      toast.error(res.data.message || '获取反馈列表失败')
    }
  } catch {
    toast.error('获取反馈列表失败')
  } finally {
    isLoading.value = false
  }
}

// 切换状态筛选
function changeStatus(status: ContributionStatus | null) {
  currentStatus.value = status
  loadContributions(true)
}

// 加载更多
function loadMore() {
  if (!hasMore.value || isLoading.value) return
  currentPage.value++
  loadContributions()
}

// 获取状态标签样式类
function getStatusClass(status: ContributionStatus): string {
  switch (status) {
    case 0:
      return 'status-pending'
    case 1:
      return 'status-approved'
    case 2:
      return 'status-rejected'
    default:
      return ''
  }
}

// 获取贡献类型图标
function getTypeIcon(contributionType: number): string {
  return contributionType === 1 ? 'edit' : 'plus'
}

// 格式化时间
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

// 获取字段名称显示
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

onMounted(() => {
  loadContributions(true)
})
</script>

<template>
  <div class="page-container">
    <PageHeader back-to="/community" />

    <main class="page-content">
      <!-- 状态筛选 -->
      <div class="filter-tabs">
        <button
          v-for="option in statusOptions"
          :key="option.value ?? 'all'"
          class="filter-tab"
          :class="{ active: currentStatus === option.value }"
          @click="changeStatus(option.value)"
        >
          {{ option.label }}
        </button>
      </div>

      <!-- 加载状态 -->
      <div v-if="isLoading && contributions.length === 0" class="loading-container">
        <div v-for="i in 3" :key="i" class="skeleton-card">
          <div class="skeleton-header">
            <div class="skeleton-badge"></div>
            <div class="skeleton-time"></div>
          </div>
          <div class="skeleton-title"></div>
          <div class="skeleton-desc"></div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="!isLoading && contributions.length === 0" class="empty-container">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"></path>
          <rect x="9" y="3" width="6" height="4" rx="1"></rect>
          <path d="M9 12h6M9 16h6"></path>
        </svg>
        <h3>暂无反馈记录</h3>
        <p>在评分社区中发现问题或想贡献内容时，可以提交反馈</p>
      </div>

      <!-- 贡献列表 -->
      <div v-else class="contributions-list">
        <div
          v-for="contribution in contributions"
          :key="contribution.id"
          class="contribution-card"
        >
          <!-- 头部 -->
          <div class="card-header">
            <div class="card-badges">
              <span class="type-badge" :class="getTypeIcon(contribution.contributionType)">
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
              <span class="target-badge">{{ contribution.targetTypeDisplay }}</span>
              <span class="status-badge" :class="getStatusClass(contribution.status)">
                {{ contribution.statusDisplay }}
              </span>
            </div>
            <span class="card-time">{{ formatTime(contribution.createdAt) }}</span>
          </div>

          <!-- 内容 -->
          <div class="card-body">
            <!-- 标题：修改现有/新建内容 -->
            <h3 class="card-title">
              <template v-if="contribution.contributionType === 1">
                修改「{{ contribution.targetName || '未知目标' }}」
              </template>
              <template v-else>
                新建{{ contribution.targetTypeDisplay }}
              </template>
            </h3>

            <!-- 提交原因 -->
            <p class="card-reason">提交原因：{{ contribution.reason }}</p>

            <!-- 详细变更内容 -->
            <div class="card-details">
              <div
                v-for="(detail, index) in contribution.details"
                :key="index"
                class="detail-item"
              >
                <!-- 字段标签 -->
                <span class="detail-label">{{ detail.fieldNameDisplay || getFieldNameDisplay(detail.fieldName) }}</span>

                <!-- 图片字段 -->
                <template v-if="detail.fieldName === 'image'">
                  <div class="detail-images">
                    <!-- 修改模式：显示旧图 → 新图 -->
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
                    <!-- 新建模式：只显示新图 -->
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
                    <!-- 修改模式：显示旧值 → 新值 -->
                    <template v-if="contribution.contributionType === 1 && detail.oldValue !== undefined">
                      <div class="text-compare">
                        <span class="old-value">{{ detail.oldValue || '（空）' }}</span>
                        <svg class="arrow-icon small" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M5 12h14M12 5l7 7-7 7"></path>
                        </svg>
                        <span class="new-value">{{ detail.newValue }}</span>
                      </div>
                    </template>
                    <!-- 新建模式：只显示新值 -->
                    <template v-else>
                      <span class="new-value">{{ detail.newValue }}</span>
                    </template>
                  </div>
                </template>
              </div>
            </div>
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

          <!-- 审核时间 -->
          <div v-if="contribution.reviewedAt" class="review-time">
            审核于 {{ formatTime(contribution.reviewedAt) }}
          </div>
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
  padding: var(--spacing-md);
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
}

/* ===== Filter Tabs ===== */
.filter-tabs {
  display: flex;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-md);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.filter-tabs::-webkit-scrollbar {
  display: none;
}

.filter-tab {
  flex-shrink: 0;
  padding: var(--spacing-xs) var(--spacing-md);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.filter-tab:hover {
  background: var(--color-bg-hover);
}

.filter-tab.active {
  color: var(--color-primary);
  background: var(--color-primary-bg);
  border-color: var(--color-primary);
}

/* ===== Loading ===== */
.loading-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.skeleton-card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
}

.skeleton-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--spacing-sm);
}

.skeleton-badge {
  width: 80px;
  height: 20px;
  background: var(--color-border);
  border-radius: var(--radius-sm);
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-time {
  width: 60px;
  height: 16px;
  background: var(--color-border);
  border-radius: var(--radius-sm);
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-title {
  width: 70%;
  height: 18px;
  background: var(--color-border);
  border-radius: var(--radius-sm);
  margin-bottom: var(--spacing-xs);
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-desc {
  width: 90%;
  height: 14px;
  background: var(--color-border);
  border-radius: var(--radius-sm);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* ===== Empty ===== */
.empty-container {
  text-align: center;
  padding: var(--spacing-2xl);
  color: var(--color-text-secondary);
}

.empty-container svg {
  width: 64px;
  height: 64px;
  margin-bottom: var(--spacing-md);
  opacity: 0.4;
}

.empty-container h3 {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-xs);
  color: var(--color-text);
}

.empty-container p {
  font-size: var(--text-sm);
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
  padding: var(--spacing-md);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-sm);
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

.type-badge.edit {
  color: var(--color-primary);
  background: var(--color-primary-bg);
}

.type-badge.plus {
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

.card-time {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
  flex-shrink: 0;
}

.card-body {
  margin-bottom: var(--spacing-xs);
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
  margin-bottom: var(--spacing-sm);
}

/* ===== Detail Items ===== */
.card-details {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  background: var(--color-bg);
  border-radius: var(--radius-md);
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
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

/* ===== Image Display ===== */
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

.review-time {
  margin-top: var(--spacing-sm);
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
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

/* ===== Desktop ===== */
@media (min-width: 640px) {
  .page-content {
    padding: var(--spacing-lg);
  }

  .contribution-card {
    padding: var(--spacing-lg);
  }

  .card-title {
    font-size: var(--text-base);
  }

  .card-reason {
    font-size: var(--text-sm);
  }
}
</style>
