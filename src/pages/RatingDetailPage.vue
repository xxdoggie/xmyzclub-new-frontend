<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { useUserStore } from '@/stores/user'
import {
  getRatingItemDetail,
  submitRating,
  createComment,
  deleteComment,
  likeComment,
  unlikeComment,
} from '@/api/rating'
import type { RatingItemDetail, Comment } from '@/types/rating'
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'

const route = useRoute()
const toast = useToast()
const userStore = useUserStore()

// 路由参数
const itemId = Number(route.params.itemId)

// 状态
const isLoading = ref(true)
const detail = ref<RatingItemDetail | null>(null)

// 用户评分状态
const userRating = ref(0)
const hoverRating = ref(0)
const isSubmitting = ref(false)

// 评论状态
const replyTarget = ref<{ commentId: number; nickname: string } | null>(null)
const replyText = ref('')
const isReplying = ref(false)

// 加载详情
async function loadDetail() {
  isLoading.value = true
  try {
    const res = await getRatingItemDetail(itemId)
    if (res.data.code === 200) {
      detail.value = res.data.data
      // 如果已有评分，初始化用户评分（myRating 现在是数字）
      if (detail.value?.myRating !== null && detail.value?.myRating !== undefined) {
        // 将 10 分制转换为 5 星
        userRating.value = Math.round(detail.value.myRating / 2)
      }
    } else {
      toast.error(res.data.message || '获取详情失败')
    }
  } catch {
    toast.error('获取详情失败')
  } finally {
    isLoading.value = false
  }
}

// 面包屑文本（只显示大分区和小分区）
const breadcrumbText = computed(() => {
  if (!detail.value?.breadcrumb) return ''
  const b = detail.value.breadcrumb
  return `${b.majorSection.name} / ${b.minorSection.name}`
})

// 评分分布数组（从对象转换为数组便于渲染）
const scoreDistributionList = computed(() => {
  if (!detail.value?.scoreDistribution) return []
  const dist = detail.value.scoreDistribution
  return [
    { star: 5, count: dist.fiveStar, percent: dist.fiveStarPercent },
    { star: 4, count: dist.fourStar, percent: dist.fourStarPercent },
    { star: 3, count: dist.threeStar, percent: dist.threeStarPercent },
    { star: 2, count: dist.twoStar, percent: dist.twoStarPercent },
    { star: 1, count: dist.oneStar, percent: dist.oneStarPercent },
  ]
})

// 显示的评分（悬停时显示悬停值）
const displayRating = computed(() => {
  return hoverRating.value || userRating.value
})

// 星星点击 - 直接提交评分
async function handleStarClick(star: number) {
  if (!userStore.isLoggedIn) {
    userStore.openLoginModal()
    return
  }
  if (isSubmitting.value) return

  userRating.value = star
  isSubmitting.value = true
  try {
    const res = await submitRating(itemId, {
      score: star * 2,
    })
    if (res.data.code === 200) {
      toast.success(detail.value?.myRating !== null ? '评分已更新' : '评分成功')
      await loadDetail()
    } else {
      toast.error(res.data.message || '评分失败')
    }
  } catch {
    toast.error('评分失败')
  } finally {
    isSubmitting.value = false
  }
}

// 星星悬停
function handleStarHover(star: number) {
  hoverRating.value = star
}

// 星星离开
function handleStarLeave() {
  hoverRating.value = 0
}

// 点赞评论
async function handleLike(comment: Comment) {
  if (!userStore.isLoggedIn) {
    userStore.openLoginModal()
    return
  }
  try {
    if (comment.isLiked) {
      await unlikeComment(comment.id)
      comment.isLiked = false
      comment.likeCount--
    } else {
      await likeComment(comment.id)
      comment.isLiked = true
      comment.likeCount++
    }
  } catch {
    toast.error('操作失败')
  }
}

// 开始回复
function startReply(commentId: number, nickname: string) {
  if (!userStore.isLoggedIn) {
    userStore.openLoginModal()
    return
  }
  replyTarget.value = { commentId, nickname }
  replyText.value = ''
}

// 取消回复
function cancelReply() {
  replyTarget.value = null
  replyText.value = ''
}

// 提交回复
async function handleSubmitReply() {
  if (!replyTarget.value || !replyText.value.trim()) return
  isReplying.value = true
  try {
    const res = await createComment(itemId, {
      commentText: replyText.value.trim(),
      parentCommentId: replyTarget.value.commentId,
    })
    if (res.data.code === 200) {
      toast.success('回复成功')
      cancelReply()
      await loadDetail()
    } else {
      toast.error(res.data.message || '回复失败')
    }
  } catch {
    toast.error('回复失败')
  } finally {
    isReplying.value = false
  }
}

// 删除评论
async function handleDeleteComment(commentId: number) {
  if (!confirm('确定要删除这条评论吗？')) return
  try {
    const res = await deleteComment(commentId)
    if (res.data.code === 200) {
      toast.success('删除成功')
      await loadDetail()
    } else {
      toast.error(res.data.message || '删除失败')
    }
  } catch {
    toast.error('删除失败')
  }
}

// 格式化时间
function formatTime(timeStr: string): string {
  const date = new Date(timeStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 30) return `${days}天前`
  return date.toLocaleDateString('zh-CN')
}

// 获取分数条宽度
function getScoreBarWidth(percentage: number): string {
  return `${Math.max(percentage, 2)}%`
}

onMounted(() => {
  loadDetail()
})
</script>

<template>
  <div class="page-container">
    <PageHeader />

    <main class="page-content">
      <!-- 骨架屏加载 -->
      <template v-if="isLoading">
        <div class="skeleton-header">
          <div class="skeleton-image"></div>
          <div class="skeleton-info">
            <div class="skeleton-title"></div>
            <div class="skeleton-breadcrumb"></div>
          </div>
        </div>
        <div class="skeleton-score-card"></div>
        <div class="skeleton-comments">
          <div v-for="i in 3" :key="i" class="skeleton-comment"></div>
        </div>
      </template>

      <!-- 正常内容 -->
      <template v-else-if="detail">
        <!-- 项目头部卡片 -->
        <div class="item-header-card">
          <div class="item-header">
            <div class="item-image-wrapper">
              <img
                v-if="detail.url"
                :src="detail.url"
                :alt="detail.name"
                class="item-image"
              />
              <div v-else class="item-image-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
              </div>
            </div>
            <div class="item-info">
              <h1 class="item-name">{{ detail.name }}</h1>
              <p v-if="breadcrumbText" class="item-breadcrumb">{{ breadcrumbText }}</p>
              <p v-if="detail.description" class="item-desc">{{ detail.description }}</p>
            </div>
          </div>
        </div>

        <!-- 评分卡片 -->
        <div class="score-card">
          <div class="score-content">
            <div class="score-main">
              <div class="score-value">{{ detail.averageScore.toFixed(1) }}</div>
              <div class="rating-count">{{ detail.ratingCount }}人评分</div>
            </div>
            <div class="score-divider-vertical"></div>
            <div v-if="scoreDistributionList.length > 0" class="score-distribution">
              <div
                v-for="dist in scoreDistributionList"
                :key="dist.star"
                class="dist-row"
              >
                <div class="dist-stars">
                  <svg
                    v-for="s in 5"
                    :key="s"
                    class="dist-star-icon"
                    :class="{ inactive: s > dist.star }"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    stroke="currentColor"
                    stroke-width="1"
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                </div>
                <div class="dist-bar-wrapper">
                  <div
                    class="dist-bar"
                    :style="{ width: getScoreBarWidth(dist.percent) }"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <!-- 分隔线 -->
          <div class="score-divider"></div>

          <!-- 用户评分区域 -->
          <div class="user-rating-row">
            <span class="user-rating-label">
              {{ detail.myRating !== null ? '已评分' : '未评分' }}
            </span>
            <div class="user-rating-stars">
              <button
                v-for="star in 5"
                :key="star"
                class="star-btn"
                :class="{ active: star <= displayRating, submitting: isSubmitting }"
                @click="handleStarClick(star)"
                @mouseenter="handleStarHover(star)"
                @mouseleave="handleStarLeave"
              >
                <svg viewBox="0 0 24 24" :fill="star <= displayRating ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.5">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- 评论区域 -->
        <div class="comments-section">
          <h2 class="section-title">全部评论 ({{ detail.comments?.length || 0 }})</h2>

          <!-- 空评论状态 -->
          <div v-if="!detail.comments || detail.comments.length === 0" class="empty-comments">
            <p>暂无评论，快来发表第一条评论吧~</p>
          </div>

          <!-- 评论列表 -->
          <div v-else-if="detail.comments" class="comment-list">
            <div v-for="comment in detail.comments" :key="comment.id" class="comment-item">
              <!-- 主评论 -->
              <div class="comment-main">
                <div class="comment-avatar">
                  {{ comment.nickname.charAt(0) }}
                </div>
                <div class="comment-content">
                  <div class="comment-header">
                    <span class="comment-nickname">{{ comment.nickname }}</span>
                    <span class="comment-time">{{ formatTime(comment.createdAt) }}</span>
                  </div>
                  <p class="comment-text">{{ comment.commentText }}</p>
                  <div class="comment-actions">
                    <button
                      class="action-btn"
                      :class="{ liked: comment.isLiked }"
                      @click="handleLike(comment)"
                    >
                      <svg viewBox="0 0 24 24" :fill="comment.isLiked ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
                        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                      </svg>
                      <span v-if="comment.likeCount > 0">{{ comment.likeCount }}</span>
                    </button>
                    <button class="action-btn" @click="startReply(comment.id, comment.nickname)">
                      回复
                    </button>
                    <button
                      v-if="comment.isMyComment"
                      class="action-btn delete"
                      @click="handleDeleteComment(comment.id)"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>

              <!-- 回复列表 -->
              <div v-if="comment.replies && comment.replies.length > 0" class="reply-list">
                <div v-for="reply in comment.replies" :key="reply.id" class="reply-item">
                  <div class="comment-avatar small">
                    {{ reply.nickname.charAt(0) }}
                  </div>
                  <div class="comment-content">
                    <div class="comment-header">
                      <span class="comment-nickname">{{ reply.nickname }}</span>
                      <span class="comment-time">{{ formatTime(reply.createdAt) }}</span>
                    </div>
                    <p class="comment-text">{{ reply.commentText }}</p>
                    <div class="comment-actions">
                      <button
                        class="action-btn"
                        :class="{ liked: reply.isLiked }"
                        @click="handleLike(reply)"
                      >
                        <svg viewBox="0 0 24 24" :fill="reply.isLiked ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
                          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                        </svg>
                        <span v-if="reply.likeCount > 0">{{ reply.likeCount }}</span>
                      </button>
                      <button class="action-btn" @click="startReply(comment.id, reply.nickname)">
                        回复
                      </button>
                      <button
                        v-if="reply.isMyComment"
                        class="action-btn delete"
                        @click="handleDeleteComment(reply.id)"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 回复输入框 -->
              <div v-if="replyTarget?.commentId === comment.id" class="reply-input-wrapper">
                <textarea
                  v-model="replyText"
                  class="reply-input"
                  :placeholder="`回复 @${replyTarget.nickname}...`"
                  rows="2"
                ></textarea>
                <div class="reply-actions">
                  <button class="cancel-btn" @click="cancelReply">取消</button>
                  <button
                    class="submit-btn small"
                    :disabled="isReplying || !replyText.trim()"
                    @click="handleSubmitReply"
                  >
                    {{ isReplying ? '发送中...' : '发送' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- 错误状态 -->
      <div v-else class="error-container">
        <h2>加载失败</h2>
        <p>无法获取评分项目详情</p>
        <button class="retry-btn" @click="loadDetail">重试</button>
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
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}

/* ===== Item Header Card ===== */
.item-header-card {
  padding: var(--spacing-md);
  background: var(--color-card);
  border-radius: var(--radius-lg);
  margin-bottom: var(--spacing-sm);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.item-header {
  display: flex;
  gap: var(--spacing-md);
}

.item-image-wrapper {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  border-radius: var(--radius-md);
  overflow: hidden;
}

.item-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.item-image-placeholder svg {
  width: 24px;
  height: 24px;
  opacity: 0.8;
}

.item-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
}

.item-name {
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  line-height: 1.3;
}

.item-breadcrumb {
  font-size: 11px;
  color: var(--color-primary);
}

.item-desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ===== Score Card ===== */
.score-card {
  padding: var(--spacing-md);
  background: var(--color-card);
  border-radius: var(--radius-lg);
  margin-bottom: var(--spacing-sm);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.score-content {
  display: flex;
  gap: var(--spacing-md);
  align-items: stretch;
}

.score-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 70px;
  padding: var(--spacing-xs) var(--spacing-sm);
}

.score-value {
  font-size: 28px;
  font-weight: var(--font-bold);
  color: #ffc94d;
  line-height: 1;
}

.rating-count {
  font-size: 11px;
  color: var(--color-text-secondary);
  margin-top: 6px;
  white-space: nowrap;
}

/* 垂直分隔线 */
.score-divider-vertical {
  width: 1px;
  background: rgba(0, 0, 0, 0.06);
  align-self: stretch;
}

.score-distribution {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  justify-content: center;
  padding-left: var(--spacing-sm);
}

.dist-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dist-stars {
  display: flex;
  gap: 0;
  flex-shrink: 0;
}

.dist-star-icon {
  width: 10px;
  height: 10px;
  color: #ffc94d;
}

.dist-star-icon.inactive {
  opacity: 0.2;
}

.dist-bar-wrapper {
  flex: 1;
  height: 6px;
  background: rgba(0, 0, 0, 0.04);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.dist-bar {
  height: 100%;
  background: #3b9dff;
  border-radius: var(--radius-full);
  transition: width 0.3s ease;
}

/* 水平分隔线 */
.score-divider {
  height: 1px;
  background: rgba(0, 0, 0, 0.06);
  margin: var(--spacing-sm) 0;
}

/* 用户评分行 */
.user-rating-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.user-rating-label {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.user-rating-stars {
  display: flex;
  align-items: center;
  gap: 4px;
}

.section-title {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-md);
}

.star-btn {
  width: 16px;
  height: 16px;
  padding: 0;
  background: transparent;
  border: none;
  color: rgba(0, 0, 0, 0.15);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.star-btn:hover,
.star-btn.active {
  color: #ffc94d;
  transform: scale(1.1);
}

.star-btn.submitting {
  pointer-events: none;
  opacity: 0.6;
}

.star-btn svg {
  width: 100%;
  height: 100%;
}

.submit-btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: white;
  background: var(--color-primary);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  align-self: flex-end;
}

.submit-btn:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.submit-btn.small {
  padding: var(--spacing-xs) var(--spacing-md);
}

/* ===== Comments Section ===== */
.comments-section {
  padding: var(--spacing-lg);
  background: var(--color-card);
  border-radius: var(--radius-lg);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.empty-comments {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--color-text-secondary);
}

.comment-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.comment-item {
  padding-bottom: var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
}

.comment-item:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.comment-main {
  display: flex;
  gap: var(--spacing-sm);
}

.comment-avatar {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary);
  color: white;
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  border-radius: var(--radius-full);
}

.comment-avatar.small {
  width: 28px;
  height: 28px;
  font-size: var(--text-xs);
}

.comment-content {
  flex: 1;
  min-width: 0;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  flex-wrap: wrap;
  margin-bottom: 4px;
}

.comment-nickname {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.reply-to {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.reply-target {
  color: var(--color-primary);
}

.comment-time {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
}

.comment-text {
  font-size: var(--text-sm);
  line-height: 1.5;
  color: var(--color-text);
  margin-bottom: var(--spacing-xs);
}

.comment-actions {
  display: flex;
  gap: var(--spacing-md);
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: color var(--transition-fast);
}

.action-btn:hover {
  color: var(--color-text);
}

.action-btn.liked {
  color: var(--color-primary);
}

.action-btn.delete:hover {
  color: var(--color-error);
}

.action-btn svg {
  width: 14px;
  height: 14px;
}

/* ===== Reply List ===== */
.reply-list {
  margin-left: 44px;
  margin-top: var(--spacing-sm);
  padding-left: var(--spacing-sm);
  border-left: 2px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.reply-item {
  display: flex;
  gap: var(--spacing-xs);
}

/* ===== Reply Input ===== */
.reply-input-wrapper {
  margin-left: 44px;
  margin-top: var(--spacing-sm);
}

.reply-input {
  width: 100%;
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--text-sm);
  color: var(--color-text);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  resize: none;
}

.reply-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.reply-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-xs);
  margin-top: var(--spacing-xs);
}

.cancel-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
}

.cancel-btn:hover {
  border-color: var(--color-text-secondary);
}

/* ===== Error State ===== */
.error-container {
  text-align: center;
  padding: var(--spacing-2xl);
}

.error-container h2 {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-sm);
}

.error-container p {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-md);
}

.retry-btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  font-size: var(--text-sm);
  color: var(--color-primary);
  background: transparent;
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-md);
  cursor: pointer;
}

.retry-btn:hover {
  background: var(--color-primary);
  color: white;
}

/* ===== Skeleton Loading ===== */
.skeleton-header {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
  padding: var(--spacing-md);
  background: var(--color-card);
  border-radius: var(--radius-lg);
}

.skeleton-image {
  width: 56px;
  height: 56px;
  background: var(--color-border);
  border-radius: var(--radius-md);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

.skeleton-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
}

.skeleton-title {
  width: 60%;
  height: 18px;
  background: var(--color-border);
  border-radius: var(--radius-sm);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

.skeleton-breadcrumb {
  width: 80%;
  height: 14px;
  background: var(--color-border);
  border-radius: var(--radius-sm);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

.skeleton-score-card {
  height: 120px;
  background: var(--color-card);
  border-radius: var(--radius-lg);
  margin-bottom: var(--spacing-sm);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

.skeleton-comments {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.skeleton-comment {
  height: 80px;
  background: var(--color-card);
  border-radius: var(--radius-lg);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

@keyframes skeleton-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* ===== Desktop ===== */
@media (min-width: 1024px) {
  .page-content {
    padding: var(--spacing-xl);
    max-width: 900px;
  }

  .item-header-card {
    padding: var(--spacing-lg);
  }

  .item-header {
    gap: var(--spacing-lg);
  }

  .item-image-wrapper {
    width: 80px;
    height: 80px;
  }

  .item-name {
    font-size: var(--text-lg);
    font-weight: var(--font-semibold);
  }

  .item-breadcrumb {
    font-size: var(--text-sm);
  }

  .item-desc {
    font-size: var(--text-sm);
  }

  .score-card {
    padding: var(--spacing-lg);
  }

  .score-content {
    gap: var(--spacing-lg);
  }

  .score-main {
    min-width: 90px;
  }

  .score-value {
    font-size: 36px;
  }

  .rating-count {
    font-size: var(--text-xs);
  }

  .score-distribution {
    gap: 6px;
  }

  .dist-star-icon {
    width: 12px;
    height: 12px;
  }

  .dist-bar-wrapper {
    height: 8px;
  }

  .user-rating-label {
    font-size: var(--text-sm);
  }

  .star-btn {
    width: 20px;
    height: 20px;
  }

  .comment-avatar {
    width: 44px;
    height: 44px;
    font-size: var(--text-base);
  }

  .reply-list {
    margin-left: 52px;
  }

  .reply-input-wrapper {
    margin-left: 52px;
  }
}
</style>
