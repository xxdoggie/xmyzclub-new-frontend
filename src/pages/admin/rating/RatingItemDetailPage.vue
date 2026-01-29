<script setup lang="ts">
import { ref, onMounted, watch, nextTick, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/composables/useToast'
import {
  getAdminRatingItemDetail,
  getAdminComments,
  getAdminRatings,
  deleteAdminComment,
  batchDeleteComments,
  deleteAdminRating,
  batchDeleteRatings,
} from '@/api/rating'
import type {
  AdminRatingItem,
  AdminComment,
  AdminUserRating,
} from '@/types/rating'
import { getClickableBreadcrumb } from '@/types/rating'
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb.vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const toast = useToast()

// 评分项目ID
const itemId = computed(() => Number(route.params.itemId))

// 加载状态
const isLoading = ref(true)

// 评分项目信息
const ratingItem = ref<AdminRatingItem | null>(null)

// Tab管理
const activeTab = ref<'comments' | 'ratings'>('comments')
const tabOrder = ['comments', 'ratings'] as const
const slideDirection = ref<'left' | 'right' | ''>('')
const isAnimating = ref(false)

// 监听 Tab 切换
watch(activeTab, (newVal, oldVal) => {
  if (!oldVal) return
  const oldIndex = tabOrder.indexOf(oldVal)
  const newIndex = tabOrder.indexOf(newVal)
  slideDirection.value = newIndex > oldIndex ? 'left' : 'right'
  isAnimating.value = true

  nextTick(() => {
    setTimeout(() => {
      isAnimating.value = false
      slideDirection.value = ''
    }, 300)
  })
})

// 评论列表
const comments = ref<AdminComment[]>([])
const commentsTotal = ref(0)
const commentsPage = ref(1)
const commentsPageSize = ref(20)
const isLoadingComments = ref(true)

// 用户评分列表
const ratings = ref<AdminUserRating[]>([])
const ratingsTotal = ref(0)
const ratingsPage = ref(1)
const ratingsPageSize = ref(20)
const isLoadingRatings = ref(true)

// 选中的评论/评分（用于批量删除）
const selectedComments = ref<number[]>([])
const selectedRatings = ref<number[]>([])

// 删除确认
const showDeleteConfirm = ref(false)
const deleteType = ref<'comment' | 'rating' | 'batch-comments' | 'batch-ratings'>('comment')
const deleteTargetId = ref<number | null>(null)
const isDeleting = ref(false)

// 加载评分项目详情
async function loadRatingItem() {
  try {
    const res = await getAdminRatingItemDetail(itemId.value)
    if (res.data.code === 200) {
      ratingItem.value = res.data.data
    } else {
      toast.error('获取评分项目信息失败')
      router.push('/admin/rating')
    }
  } catch (error) {
    toast.error('获取评分项目信息失败')
    router.push('/admin/rating')
  }
}

// 加载评论列表
async function loadComments() {
  isLoadingComments.value = true
  try {
    const res = await getAdminComments({
      page: commentsPage.value,
      size: commentsPageSize.value,
      ratingItemId: itemId.value,
    })
    if (res.data.code === 200) {
      comments.value = res.data.data.items
      commentsTotal.value = res.data.data.total
    } else {
      toast.error(res.data.message || '获取评论列表失败')
    }
  } catch (error) {
    toast.error('获取评论列表失败')
  } finally {
    isLoadingComments.value = false
  }
}

// 加载用户评分列表
async function loadRatings() {
  isLoadingRatings.value = true
  try {
    const res = await getAdminRatings({
      page: ratingsPage.value,
      size: ratingsPageSize.value,
      ratingItemId: itemId.value,
    })
    if (res.data.code === 200) {
      ratings.value = res.data.data.items
      ratingsTotal.value = res.data.data.total
    } else {
      toast.error(res.data.message || '获取评分列表失败')
    }
  } catch (error) {
    toast.error('获取评分列表失败')
  } finally {
    isLoadingRatings.value = false
  }
}

// 加载所有数据
async function loadAllData() {
  isLoading.value = true
  try {
    await loadRatingItem()
    await Promise.all([loadComments(), loadRatings()])
  } finally {
    isLoading.value = false
  }
}

// 切换评论选中状态
function toggleCommentSelect(id: number) {
  const index = selectedComments.value.indexOf(id)
  if (index === -1) {
    selectedComments.value.push(id)
  } else {
    selectedComments.value.splice(index, 1)
  }
}

// 全选/取消全选评论
function toggleAllComments() {
  if (selectedComments.value.length === comments.value.length) {
    selectedComments.value = []
  } else {
    selectedComments.value = comments.value.map(c => c.id)
  }
}

// 切换评分选中状态
function toggleRatingSelect(id: number) {
  const index = selectedRatings.value.indexOf(id)
  if (index === -1) {
    selectedRatings.value.push(id)
  } else {
    selectedRatings.value.splice(index, 1)
  }
}

// 全选/取消全选评分
function toggleAllRatings() {
  if (selectedRatings.value.length === ratings.value.length) {
    selectedRatings.value = []
  } else {
    selectedRatings.value = ratings.value.map(r => r.id)
  }
}

// 打开删除确认 - 单个评论
function openDeleteCommentConfirm(id: number) {
  deleteType.value = 'comment'
  deleteTargetId.value = id
  showDeleteConfirm.value = true
}

// 打开删除确认 - 批量评论
function openBatchDeleteCommentsConfirm() {
  if (selectedComments.value.length === 0) {
    toast.warning('请先选择要删除的评论')
    return
  }
  deleteType.value = 'batch-comments'
  showDeleteConfirm.value = true
}

// 打开删除确认 - 单个评分
function openDeleteRatingConfirm(id: number) {
  deleteType.value = 'rating'
  deleteTargetId.value = id
  showDeleteConfirm.value = true
}

// 打开删除确认 - 批量评分
function openBatchDeleteRatingsConfirm() {
  if (selectedRatings.value.length === 0) {
    toast.warning('请先选择要删除的评分')
    return
  }
  deleteType.value = 'batch-ratings'
  showDeleteConfirm.value = true
}

// 确认删除
async function confirmDelete() {
  isDeleting.value = true
  try {
    if (deleteType.value === 'comment' && deleteTargetId.value) {
      const res = await deleteAdminComment(deleteTargetId.value)
      if (res.data.code === 200) {
        toast.success('评论已删除')
        await loadComments()
        await loadRatingItem()
      } else {
        toast.error(res.data.message || '删除失败')
      }
    } else if (deleteType.value === 'batch-comments') {
      const res = await batchDeleteComments({ ids: selectedComments.value })
      if (res.data.code === 200) {
        toast.success(`已删除 ${selectedComments.value.length} 条评论`)
        selectedComments.value = []
        await loadComments()
        await loadRatingItem()
      } else {
        toast.error(res.data.message || '删除失败')
      }
    } else if (deleteType.value === 'rating' && deleteTargetId.value) {
      const res = await deleteAdminRating(deleteTargetId.value)
      if (res.data.code === 200) {
        toast.success('评分已删除')
        await loadRatings()
        await loadRatingItem()
      } else {
        toast.error(res.data.message || '删除失败')
      }
    } else if (deleteType.value === 'batch-ratings') {
      const res = await batchDeleteRatings({ ids: selectedRatings.value })
      if (res.data.code === 200) {
        toast.success(`已删除 ${selectedRatings.value.length} 条评分`)
        selectedRatings.value = []
        await loadRatings()
        await loadRatingItem()
      } else {
        toast.error(res.data.message || '删除失败')
      }
    }
    showDeleteConfirm.value = false
    deleteTargetId.value = null
  } catch (error) {
    toast.error('删除失败')
  } finally {
    isDeleting.value = false
  }
}

// 取消删除
function cancelDelete() {
  showDeleteConfirm.value = false
  deleteTargetId.value = null
}

// 返回
function goBack() {
  if (ratingItem.value) {
    router.push(`/admin/rating/categories/${ratingItem.value.categoryId}`)
  } else {
    router.push('/admin/rating')
  }
}

// 格式化日期
function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 格式化评分
function formatScore(score: number) {
  return score.toFixed(1)
}

// 渲染星级
function renderStars(stars: number) {
  return '★'.repeat(stars) + '☆'.repeat(5 - stars)
}

// 获取删除确认信息
const deleteConfirmInfo = computed(() => {
  switch (deleteType.value) {
    case 'comment':
      return {
        title: '确认删除评论',
        desc: '确定要删除这条评论吗？此操作不可撤销。',
        warning: '注意：会同时删除该评论的所有回复和点赞。',
      }
    case 'batch-comments':
      return {
        title: '确认批量删除评论',
        desc: `确定要删除选中的 ${selectedComments.value.length} 条评论吗？此操作不可撤销。`,
        warning: '注意：会同时删除这些评论的所有回复和点赞。',
      }
    case 'rating':
      return {
        title: '确认删除评分',
        desc: '确定要删除这条评分吗？此操作不可撤销。',
        warning: '',
      }
    case 'batch-ratings':
      return {
        title: '确认批量删除评分',
        desc: `确定要删除选中的 ${selectedRatings.value.length} 条评分吗？此操作不可撤销。`,
        warning: '',
      }
    default:
      return { title: '', desc: '', warning: '' }
  }
})

onMounted(() => {
  if (!userStore.isLoggedIn || !userStore.canManageRating) {
    toast.error('无权访问此页面')
    router.push('/')
    return
  }
  loadAllData()
})
</script>

<template>
  <div class="page-container">
    <PageHeader :back-to="ratingItem ? `/admin/rating/categories/${ratingItem.categoryId}` : '/admin/rating'" />

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

        <template v-else-if="ratingItem">
          <!-- 评分项目信息卡片 -->
          <div class="item-info-card">
            <div class="item-cover" v-if="ratingItem.imageUrl">
              <img :src="ratingItem.imageUrl" :alt="ratingItem.name" />
            </div>
            <div class="item-details">
              <div class="item-breadcrumb">
                <router-link
                  :to="getClickableBreadcrumb(ratingItem.breadcrumb).school.path"
                  class="breadcrumb-link"
                >
                  {{ getClickableBreadcrumb(ratingItem.breadcrumb).school.name }}
                </router-link>
                <template v-for="category in getClickableBreadcrumb(ratingItem.breadcrumb).categories" :key="category.id">
                  <span class="sep">/</span>
                  <router-link
                    v-if="!category.isCurrent"
                    :to="category.path"
                    class="breadcrumb-link"
                  >
                    {{ category.name }}
                  </router-link>
                  <span v-else class="breadcrumb-current">{{ category.name }}</span>
                </template>
              </div>
              <h1 class="item-title">{{ ratingItem.name }}</h1>
              <p v-if="ratingItem.description" class="item-desc">{{ ratingItem.description }}</p>
              <div class="item-stats">
                <div class="stat">
                  <span class="stat-value score">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                    {{ formatScore(ratingItem.averageScore) }}
                  </span>
                  <span class="stat-label">平均分</span>
                </div>
                <div class="stat">
                  <span class="stat-value">{{ ratingItem.ratingCount }}</span>
                  <span class="stat-label">评分数</span>
                </div>
                <div class="stat">
                  <span class="stat-value">{{ ratingItem.commentCount }}</span>
                  <span class="stat-label">评论数</span>
                </div>
              </div>
            </div>
            <button class="back-btn" @click="goBack">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
              返回
            </button>
          </div>

          <!-- Tab切换 -->
          <div class="status-tabs">
            <button
              class="status-tab"
              :class="{ active: activeTab === 'comments' }"
              @click="activeTab = 'comments'"
            >
              评论管理 ({{ commentsTotal }})
            </button>
            <button
              class="status-tab"
              :class="{ active: activeTab === 'ratings' }"
              @click="activeTab = 'ratings'"
            >
              评分管理 ({{ ratingsTotal }})
            </button>
          </div>

          <!-- 内容区域 -->
          <div
            class="content-slide-wrapper"
            :class="{
              'slide-left': isAnimating && slideDirection === 'left',
              'slide-right': isAnimating && slideDirection === 'right'
            }"
          >
            <!-- 评论管理 -->
            <div v-if="activeTab === 'comments'" class="tab-content">
              <!-- 批量操作栏 -->
              <div class="batch-actions" v-if="comments.length > 0">
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    :checked="selectedComments.length === comments.length && comments.length > 0"
                    @change="toggleAllComments"
                  />
                  全选
                </label>
                <button
                  class="batch-btn danger"
                  :disabled="selectedComments.length === 0"
                  @click="openBatchDeleteCommentsConfirm"
                >
                  删除选中 ({{ selectedComments.length }})
                </button>
              </div>

              <!-- 评论列表 -->
              <div v-if="isLoadingComments" class="loading-inline">
                <div class="loading-spinner small"></div>
                加载中...
              </div>
              <div v-else-if="comments.length === 0" class="empty-inline">
                暂无评论
              </div>
              <div v-else class="comments-list">
                <div
                  v-for="comment in comments"
                  :key="comment.id"
                  class="comment-item"
                  :class="{ selected: selectedComments.includes(comment.id) }"
                >
                  <label class="item-checkbox">
                    <input
                      type="checkbox"
                      :checked="selectedComments.includes(comment.id)"
                      @change="toggleCommentSelect(comment.id)"
                    />
                  </label>
                  <div class="comment-content">
                    <div class="comment-header">
                      <span class="comment-user">{{ comment.nickname || comment.username }}</span>
                      <span class="comment-time">{{ formatDate(comment.createdAt) }}</span>
                    </div>
                    <p class="comment-text">{{ comment.commentText }}</p>
                    <div class="comment-meta">
                      <span class="meta-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                        </svg>
                        {{ comment.likeCount }}
                      </span>
                      <span class="meta-item" v-if="comment.replyCount > 0">
                        {{ comment.replyCount }} 回复
                      </span>
                      <span class="meta-item" v-if="comment.parentId">
                        回复评论
                      </span>
                    </div>
                  </div>
                  <button class="delete-btn" @click="openDeleteCommentConfirm(comment.id)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <!-- 评分管理 -->
            <div v-if="activeTab === 'ratings'" class="tab-content">
              <!-- 批量操作栏 -->
              <div class="batch-actions" v-if="ratings.length > 0">
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    :checked="selectedRatings.length === ratings.length && ratings.length > 0"
                    @change="toggleAllRatings"
                  />
                  全选
                </label>
                <button
                  class="batch-btn danger"
                  :disabled="selectedRatings.length === 0"
                  @click="openBatchDeleteRatingsConfirm"
                >
                  删除选中 ({{ selectedRatings.length }})
                </button>
              </div>

              <!-- 评分列表 -->
              <div v-if="isLoadingRatings" class="loading-inline">
                <div class="loading-spinner small"></div>
                加载中...
              </div>
              <div v-else-if="ratings.length === 0" class="empty-inline">
                暂无评分
              </div>
              <div v-else class="ratings-list">
                <div
                  v-for="rating in ratings"
                  :key="rating.id"
                  class="rating-item"
                  :class="{ selected: selectedRatings.includes(rating.id) }"
                >
                  <label class="item-checkbox">
                    <input
                      type="checkbox"
                      :checked="selectedRatings.includes(rating.id)"
                      @change="toggleRatingSelect(rating.id)"
                    />
                  </label>
                  <div class="rating-content">
                    <div class="rating-header">
                      <span class="rating-user">{{ rating.nickname || rating.username }}</span>
                      <span class="rating-time">{{ formatDate(rating.createdAt) }}</span>
                    </div>
                    <div class="rating-score">
                      <span class="stars">{{ renderStars(rating.stars) }}</span>
                      <span class="score-value">{{ formatScore(rating.score) }} 分</span>
                    </div>
                  </div>
                  <button class="delete-btn" @click="openDeleteRatingConfirm(rating.id)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </main>

    <PageFooter />

    <!-- 删除确认弹窗 -->
    <Transition name="modal-fade">
      <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="cancelDelete">
        <Transition name="modal-scale" appear>
          <div v-if="showDeleteConfirm" class="modal-content" @click.stop>
            <h3 class="modal-title">{{ deleteConfirmInfo.title }}</h3>
            <p class="modal-desc">{{ deleteConfirmInfo.desc }}</p>
            <p v-if="deleteConfirmInfo.warning" class="modal-warning">{{ deleteConfirmInfo.warning }}</p>
            <div class="modal-actions">
              <button class="modal-btn cancel" @click="cancelDelete" :disabled="isDeleting">
                取消
              </button>
              <button class="modal-btn confirm danger" @click="confirmDelete" :disabled="isDeleting">
                {{ isDeleting ? '删除中...' : '确认删除' }}
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

.loading-spinner.small {
  width: 20px;
  height: 20px;
  border-width: 2px;
  margin-bottom: 0;
  margin-right: var(--spacing-sm);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-inline {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.empty-inline {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

/* ===== Item Info Card ===== */
.item-info-card {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  margin-bottom: var(--spacing-md);
}

.item-cover {
  width: 100%;
  max-width: 200px;
  aspect-ratio: 16/9;
  border-radius: var(--radius-md);
  overflow: hidden;
}

.item-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-details {
  flex: 1;
}

.item-breadcrumb {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xs);
  flex-wrap: wrap;
}

.item-breadcrumb .sep {
  color: var(--color-border);
}

.item-breadcrumb .breadcrumb-link {
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: color var(--transition-fast);
}

.item-breadcrumb .breadcrumb-link:hover {
  color: var(--color-primary);
  text-decoration: underline;
}

.item-breadcrumb .breadcrumb-current {
  color: var(--color-text);
  font-weight: var(--font-medium);
}

.item-title {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-xs);
}

.item-desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-sm);
}

.item-stats {
  display: flex;
  gap: var(--spacing-lg);
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
}

.stat-value.score {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--color-warning);
}

.stat-value.score svg {
  width: 18px;
  height: 18px;
}

.stat-label {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.back-btn {
  display: none;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text);
  background: var(--color-border);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  align-self: flex-start;
}

.back-btn:hover {
  background: var(--color-text-placeholder);
  color: white;
}

.back-btn svg {
  width: 16px;
  height: 16px;
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
  min-width: 100px;
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
  from { opacity: 0; transform: translateX(30px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes slideInFromLeft {
  from { opacity: 0; transform: translateX(-30px); }
  to { opacity: 1; transform: translateX(0); }
}

/* ===== Tab Content ===== */
.tab-content {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

/* ===== Batch Actions ===== */
.batch-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--text-sm);
  cursor: pointer;
}

.checkbox-label input {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.batch-btn {
  padding: 4px 12px;
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.batch-btn.danger {
  background: var(--color-error-bg);
  color: var(--color-error);
}

.batch-btn.danger:hover:not(:disabled) {
  background: var(--color-error);
  color: white;
}

.batch-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ===== Comments List ===== */
.comments-list {
  display: flex;
  flex-direction: column;
}

.comment-item {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
  transition: background var(--transition-fast);
}

.comment-item:last-child {
  border-bottom: none;
}

.comment-item.selected {
  background: var(--color-primary-bg);
}

.item-checkbox {
  flex-shrink: 0;
  padding-top: 2px;
}

.item-checkbox input {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.comment-content {
  flex: 1;
  min-width: 0;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-xs);
}

.comment-user {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
}

.comment-time {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
}

.comment-text {
  font-size: var(--text-sm);
  color: var(--color-text);
  margin-bottom: var(--spacing-xs);
  word-break: break-word;
}

.comment-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
}

.comment-meta .meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.delete-btn {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: var(--color-text-placeholder);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.delete-btn:hover {
  background: var(--color-error-bg);
  color: var(--color-error);
}

.delete-btn svg {
  width: 16px;
  height: 16px;
}

/* ===== Ratings List ===== */
.ratings-list {
  display: flex;
  flex-direction: column;
}

.rating-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
  transition: background var(--transition-fast);
}

.rating-item:last-child {
  border-bottom: none;
}

.rating-item.selected {
  background: var(--color-primary-bg);
}

.rating-content {
  flex: 1;
  min-width: 0;
}

.rating-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-xs);
}

.rating-user {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
}

.rating-time {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
}

.rating-score {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.stars {
  font-size: var(--text-sm);
  color: var(--color-warning);
  letter-spacing: 2px;
}

.score-value {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
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
  margin-bottom: var(--spacing-sm);
}

.modal-warning {
  font-size: var(--text-xs);
  color: var(--color-warning);
  margin-bottom: var(--spacing-lg);
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

.modal-btn.confirm.danger {
  background: var(--color-error);
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
  .item-info-card {
    flex-direction: row;
    align-items: flex-start;
  }

  .back-btn {
    display: flex;
  }
}

@media (min-width: 1024px) {
  .breadcrumb-wrapper {
    display: block;
  }

  .page-content {
    padding: var(--spacing-xl);
  }

  .item-title {
    font-size: var(--text-xl);
  }

  .status-tab {
    font-size: var(--text-sm);
    padding: var(--spacing-sm) var(--spacing-md);
  }
}
</style>
