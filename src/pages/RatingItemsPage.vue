<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { useUserStore } from '@/stores/user'
import { getRatingItems, submitRating } from '@/api/rating'
import type { RatingItem } from '@/types/rating'
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'
import FeedbackDrawer from '@/components/feedback/FeedbackDrawer.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const userStore = useUserStore()

// 获取路由参数
const minorId = Number(route.params.minorId)

// 状态
const isLoading = ref(true)
const ratingItems = ref<RatingItem[]>([])
const currentFilter = ref<'hot' | 'high' | 'low'>('hot')

// 反馈抽屉状态
const isFeedbackOpen = ref(false)

function openFeedbackDrawer() {
  if (!userStore.isLoggedIn) {
    userStore.openLoginModal()
    return
  }
  isFeedbackOpen.value = true
}

function closeFeedbackDrawer() {
  isFeedbackOpen.value = false
}

function handleFeedbackSuccess() {
  // 可以在这里做额外处理
}

// 星星悬停状态：记录每个项目的悬停星数
const hoverStars = ref<Record<number, number>>({})

// 筛选选项
const filters = [
  { label: '热门', value: 'hot' as const },
  { label: '高分', value: 'high' as const },
  { label: '低分', value: 'low' as const },
]

// 加载评分项目列表
async function loadRatingItems() {
  isLoading.value = true
  try {
    const res = await getRatingItems(minorId)
    if (res.data.code === 200) {
      ratingItems.value = res.data.data
    } else {
      toast.error(res.data.message || '获取评分列表失败')
    }
  } catch {
    toast.error('获取评分列表失败')
  } finally {
    isLoading.value = false
  }
}

// 筛选后的列表
const filteredItems = computed(() => {
  const items = [...ratingItems.value]
  switch (currentFilter.value) {
    case 'hot':
      return items.sort((a, b) => b.ratingCount - a.ratingCount)
    case 'high':
      return items.sort((a, b) => b.averageScore - a.averageScore)
    case 'low':
      return items.sort((a, b) => a.averageScore - b.averageScore)
    default:
      return items
  }
})

// 切换筛选
function handleFilterChange(filter: 'hot' | 'high' | 'low') {
  currentFilter.value = filter
}

// 进入详情页面
function goToDetail(itemId: number) {
  router.push(`/community/item/${itemId}`)
}

// 星星悬停处理
function handleStarHover(itemId: number, star: number) {
  hoverStars.value[itemId] = star
}

function handleStarLeave(itemId: number) {
  hoverStars.value[itemId] = 0
}

// 获取显示的星数（悬停优先，否则显示已评分数）
function getDisplayStars(item: RatingItem): number {
  if (hoverStars.value[item.id]) {
    return hoverStars.value[item.id] ?? 0
  }
  return item.myStars || 0
}

// 星星评分点击（乐观更新）
async function handleStarClick(item: RatingItem, star: number, event: Event) {
  event.stopPropagation()

  if (!userStore.isLoggedIn) {
    userStore.openLoginModal()
    return
  }

  // 保存原始值用于回滚
  const prevMyStars = item.myStars
  const prevMyScore = item.myScore

  // 乐观更新
  item.myStars = star
  item.myScore = star * 2

  try {
    const res = await submitRating({
      ratingItemId: item.id,
      stars: star,
    })
    if (res.data.code === 200) {
      toast.success('评分成功')
    } else {
      // 失败：回滚
      item.myStars = prevMyStars
      item.myScore = prevMyScore
      toast.error(res.data.message || '评分失败')
    }
  } catch {
    // 失败：回滚
    item.myStars = prevMyStars
    item.myScore = prevMyScore
    toast.error('评分失败')
  }
}

onMounted(() => {
  loadRatingItems()
})
</script>

<template>
  <div class="page-container">
    <PageHeader />

    <main class="page-content">
      <!-- 骨架屏加载状态 -->
      <template v-if="isLoading">
        <div class="skeleton-filter">
          <div class="skeleton-total"></div>
          <div class="skeleton-buttons"></div>
        </div>
        <div class="skeleton-list">
          <div v-for="i in 4" :key="i" class="skeleton-item">
            <div class="skeleton-image"></div>
            <div class="skeleton-content">
              <div class="skeleton-title"></div>
              <div class="skeleton-rating"></div>
              <div class="skeleton-comment"></div>
            </div>
          </div>
        </div>
      </template>

      <!-- 空状态 -->
      <div v-else-if="ratingItems.length === 0" class="empty-container">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
        </div>
        <h2>暂无评分项目</h2>
        <p>该区域暂无可评分的项目</p>
      </div>

      <!-- 正常内容 -->
      <template v-else>
        <!-- 筛选区域 -->
        <div class="filter-section">
          <span class="total-count">全部评分 / {{ ratingItems.length }}</span>
          <div class="filter-buttons">
            <button
              v-for="filter in filters"
              :key="filter.value"
              class="filter-btn"
              :class="{ active: currentFilter === filter.value }"
              @click="handleFilterChange(filter.value)"
            >
              {{ filter.label }}
            </button>
          </div>
        </div>

        <!-- 评分项目列表 -->
        <div class="rating-list">
          <div
            v-for="item in filteredItems"
            :key="item.id"
            class="rating-item"
            @click="goToDetail(item.id)"
          >
            <!-- 项目图片 -->
            <div class="item-image-wrapper">
              <img
                v-if="item.url"
                :src="item.url"
                :alt="item.name"
                class="item-image"
                loading="lazy"
              />
              <div v-else class="item-image-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
              </div>
            </div>

            <!-- 项目信息 -->
            <div class="item-details">
              <div class="item-header">
                <h3 class="item-name">{{ item.name }}</h3>
                <div class="item-rating">
                  <span class="item-score">{{ item.averageScore.toFixed(1) }}分</span>
                  <!-- 星星评分 -->
                  <div
                    class="star-rating"
                    @mouseleave="handleStarLeave(item.id)"
                  >
                    <button
                      v-for="star in 5"
                      :key="star"
                      class="star-btn"
                      :class="{ filled: star <= getDisplayStars(item) }"
                      @click="handleStarClick(item, star, $event)"
                      @mouseenter="handleStarHover(item.id, star)"
                    >
                      <svg viewBox="0 0 24 24" stroke-width="1.5">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              <div class="item-meta">
                <span class="rating-count">{{ item.ratingCount }} 人评分</span>
              </div>
              <!-- 热门评论 -->
              <div class="hot-comment" v-if="item.topComment">
                <span class="comment-text">"{{ item.topComment.commentText }}"</span>
                <span class="comment-author">—— {{ item.topComment.nickname }}</span>
              </div>
              <div class="hot-comment empty" v-else>
                <span class="comment-text">"TA还在等着你评论呢！"</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 反馈提示 -->
        <div class="feedback-prompt">
          <button class="feedback-link" @click="openFeedbackDrawer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="16"></line>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
            没找到想要的评分项目？点我发起新建请求
          </button>
        </div>
      </template>
    </main>

    <PageFooter />

    <!-- 反馈抽屉 -->
    <FeedbackDrawer
      :is-open="isFeedbackOpen"
      :contribution-type="2"
      :target-type="3"
      :parent-id="minorId"
      @close="closeFeedbackDrawer"
      @success="handleFeedbackSuccess"
    />
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

/* ===== Filter Section ===== */
.filter-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
  padding: var(--spacing-xs) 0;
}

.total-count {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.filter-buttons {
  display: flex;
  gap: var(--spacing-xs);
}

.filter-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  background: var(--color-card);
  border: none;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.filter-btn:hover {
  background: var(--color-border);
}

.filter-btn.active {
  color: white;
  background: var(--color-primary);
}

/* ===== Rating List ===== */
.rating-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.rating-item {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--color-card);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.rating-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.rating-item:active {
  transform: translateY(0);
}

/* ===== Item Image ===== */
.item-image-wrapper {
  width: 72px;
  height: 72px;
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
  background: var(--color-border);
  color: var(--color-text-placeholder);
}

.item-image-placeholder svg {
  width: 28px;
  height: 28px;
}

/* ===== Item Details ===== */
.item-details {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--spacing-sm);
}

.item-name {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  line-height: 1.3;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-rating {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}

.item-score {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  color: var(--color-accent);
}

/* ===== Star Rating ===== */
.star-rating {
  display: flex;
  gap: 2px;
}

.star-btn {
  padding: 0;
  width: 18px;
  height: 18px;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.star-btn svg {
  width: 100%;
  height: 100%;
  fill: var(--color-border);
  stroke: var(--color-border);
}

.star-btn:hover svg {
  transform: scale(1.1);
}

.star-btn.filled svg {
  fill: var(--color-warning);
  stroke: var(--color-warning);
}

.item-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.rating-count {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

/* ===== Hot Comment ===== */
.hot-comment {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: var(--spacing-xs);
  border-top: 1px solid var(--color-border);
  margin-top: var(--spacing-xs);
}

.hot-comment.empty .comment-text {
  color: var(--color-text-placeholder);
}

.comment-text {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  font-style: italic;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.comment-author {
  font-size: 10px;
  color: var(--color-text-placeholder);
}

/* ===== Empty State ===== */
.empty-container {
  text-align: center;
  padding: var(--spacing-2xl) var(--spacing-md);
}

.empty-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto var(--spacing-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-border);
  color: var(--color-text-secondary);
  border-radius: var(--radius-xl);
}

.empty-icon svg {
  width: 40px;
  height: 40px;
}

.empty-container h2 {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-sm);
}

.empty-container p {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

/* ===== Skeleton Loading ===== */
.skeleton-filter {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
  padding: var(--spacing-xs) 0;
}

.skeleton-total {
  width: 100px;
  height: 20px;
  background: var(--color-border);
  border-radius: var(--radius-sm);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

.skeleton-buttons {
  width: 150px;
  height: 28px;
  background: var(--color-border);
  border-radius: var(--radius-full);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.skeleton-item {
  display: flex;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--color-card);
  border-radius: var(--radius-lg);
}

.skeleton-image {
  width: 72px;
  height: 72px;
  background: var(--color-border);
  border-radius: var(--radius-md);
  flex-shrink: 0;
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

.skeleton-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.skeleton-title {
  width: 60%;
  height: 20px;
  background: var(--color-border);
  border-radius: var(--radius-sm);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

.skeleton-rating {
  width: 80px;
  height: 16px;
  background: var(--color-border);
  border-radius: var(--radius-sm);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

.skeleton-comment {
  width: 90%;
  height: 14px;
  background: var(--color-border);
  border-radius: var(--radius-sm);
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

/* ===== Feedback Prompt ===== */
.feedback-prompt {
  margin-top: var(--spacing-lg);
  text-align: center;
}

.feedback-link {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  color: var(--color-primary);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: opacity var(--transition-fast);
}

.feedback-link:hover {
  opacity: 0.8;
}

.feedback-link svg {
  width: 16px;
  height: 16px;
}

/* ===== Desktop ===== */
@media (min-width: 1024px) {
  .page-content {
    padding: var(--spacing-xl);
    max-width: 900px;
  }

  .filter-section {
    margin-bottom: var(--spacing-lg);
  }

  .total-count {
    font-size: var(--text-base);
  }

  .filter-btn {
    padding: var(--spacing-sm) var(--spacing-lg);
    font-size: var(--text-sm);
  }

  .rating-list {
    gap: var(--spacing-md);
  }

  .rating-item {
    padding: var(--spacing-lg);
  }

  .item-image-wrapper {
    width: 88px;
    height: 88px;
  }

  .item-name {
    font-size: var(--text-lg);
  }

  .item-score {
    font-size: var(--text-xl);
  }

  .star-btn {
    width: 20px;
    height: 20px;
  }

  .rating-count {
    font-size: var(--text-sm);
  }

  .comment-text {
    font-size: var(--text-sm);
  }

  .comment-author {
    font-size: var(--text-xs);
  }
}
</style>
