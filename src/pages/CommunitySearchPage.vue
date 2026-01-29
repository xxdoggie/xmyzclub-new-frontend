<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { useUserStore } from '@/stores/user'
import { searchRatingItems, submitRating } from '@/api/rating'
import type { RatingItem } from '@/types/rating'
import PageHeader from '@/components/layout/PageHeader.vue'

const router = useRouter()
const toast = useToast()
const userStore = useUserStore()

// 状态
const searchKeyword = ref('')
const searchResults = ref<RatingItem[]>([])
const totalCount = ref(0)
const isLoading = ref(false)
const hasSearched = ref(false)
const searchInputRef = ref<HTMLInputElement | null>(null)

// 星星悬停状态
const hoverStars = ref<Record<number, number>>({})

// 格式化面包屑
function formatBreadcrumb(breadcrumb: any): string {
  if (!breadcrumb) return ''

  const parts: string[] = []

  // 添加祖先分类
  if (breadcrumb.ancestors && Array.isArray(breadcrumb.ancestors)) {
    breadcrumb.ancestors.forEach((ancestor: any) => {
      if (ancestor.name) {
        parts.push(ancestor.name)
      }
    })
  }

  // 添加当前分类
  if (breadcrumb.current && breadcrumb.current.name) {
    parts.push(breadcrumb.current.name)
  }

  return parts.join(' / ')
}

// 搜索
async function handleSearch() {
  const keyword = searchKeyword.value.trim()
  if (!keyword) {
    return
  }

  isLoading.value = true
  hasSearched.value = true

  try {
    const res = await searchRatingItems(keyword)
    if (res.data.code === 200) {
      searchResults.value = res.data.data.items
      totalCount.value = res.data.data.total
    } else {
      toast.error(res.data.message || '搜索失败')
    }
  } catch {
    toast.error('搜索失败')
  } finally {
    isLoading.value = false
  }
}

// 清空搜索
function clearSearch() {
  searchKeyword.value = ''
  searchResults.value = []
  totalCount.value = 0
  hasSearched.value = false
  nextTick(() => {
    searchInputRef.value?.focus()
  })
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

// 获取显示的星数
function getDisplayStars(item: RatingItem): number {
  if (hoverStars.value[item.id]) {
    return hoverStars.value[item.id] ?? 0
  }
  return item.myStars || 0
}

// 星星评分点击
async function handleStarClick(item: RatingItem, star: number, event: Event) {
  event.stopPropagation()

  if (!userStore.isLoggedIn) {
    userStore.openLoginModal()
    return
  }

  const prevMyStars = item.myStars
  const prevMyScore = item.myScore

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
      item.myStars = prevMyStars
      item.myScore = prevMyScore
      toast.error(res.data.message || '评分失败')
    }
  } catch {
    item.myStars = prevMyStars
    item.myScore = prevMyScore
    toast.error('评分失败')
  }
}

// 处理键盘事件
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    handleSearch()
  }
}

onMounted(() => {
  nextTick(() => {
    searchInputRef.value?.focus()
  })
})
</script>

<template>
  <div class="page-container">
    <PageHeader back-to="/community" />

    <main class="page-content">
      <!-- 搜索框 -->
      <div class="search-section">
        <div class="search-box">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input
            ref="searchInputRef"
            v-model="searchKeyword"
            type="search"
            enterkeyhint="search"
            class="search-input"
            placeholder="搜索食堂、建筑、课程..."
            @keydown="handleKeydown"
          />
          <button v-if="searchKeyword" class="clear-btn" @click="clearSearch">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <button class="search-trigger-btn" @click="handleSearch" :disabled="!searchKeyword.trim()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
      </div>

      <!-- 加载状态 -->
      <template v-if="isLoading">
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

      <!-- 空状态：未搜索 -->
      <div v-else-if="!hasSearched" class="empty-container">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
        </div>
        <h2>搜索评分项目</h2>
        <p>输入关键词，点击箭头或按回车搜索</p>
      </div>

      <!-- 空状态：无结果 -->
      <div v-else-if="searchResults.length === 0" class="empty-container">
        <div class="empty-icon warning">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <h2>未找到相关结果</h2>
        <p>换个关键词试试吧</p>
      </div>

      <!-- 搜索结果 -->
      <template v-else>
        <div class="filter-section">
          <span class="total-count">搜索结果 / {{ totalCount }}</span>
        </div>

        <div class="rating-list">
          <div
            v-for="item in searchResults"
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
                  <div class="star-rating" @mouseleave="handleStarLeave(item.id)">
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
                <span v-if="formatBreadcrumb(item.breadcrumb)" class="item-breadcrumb">{{ formatBreadcrumb(item.breadcrumb) }}</span>
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
      </template>
    </main>
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

/* ===== Search Section ===== */
.search-section {
  margin-bottom: var(--spacing-md);
}

.search-box {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  transition: all var(--transition-fast);
}

.search-box:focus-within {
  border-color: var(--color-primary);
  background: var(--color-primary-bg);
}

.search-icon {
  width: 18px;
  height: 18px;
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  min-width: 0;
  font-size: var(--text-sm);
  color: var(--color-text);
  background: transparent;
  border: none;
  outline: none;
}

.search-input::placeholder {
  color: var(--color-text-placeholder);
}

.clear-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-border);
  border: none;
  border-radius: var(--radius-full);
  color: var(--color-text-secondary);
  cursor: pointer;
  flex-shrink: 0;
  transition: all var(--transition-fast);
}

.clear-btn:hover {
  background: var(--color-text-secondary);
  color: white;
}

.clear-btn svg {
  width: 12px;
  height: 12px;
}

.search-trigger-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary);
  border: none;
  border-radius: var(--radius-full);
  color: white;
  cursor: pointer;
  flex-shrink: 0;
  transition: all var(--transition-fast);
}

.search-trigger-btn:hover:not(:disabled) {
  opacity: 0.9;
  transform: scale(1.05);
}

.search-trigger-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.search-trigger-btn:disabled {
  background: var(--color-border);
  color: var(--color-text-placeholder);
  cursor: not-allowed;
}

.search-trigger-btn svg {
  width: 16px;
  height: 16px;
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
  flex-wrap: wrap;
}

.rating-count {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.item-breadcrumb {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
  padding-left: var(--spacing-sm);
  border-left: 1px solid var(--color-border);
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

.empty-icon.warning {
  background: rgba(234, 179, 8, 0.1);
  color: var(--color-warning);
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

/* ===== Desktop ===== */
@media (min-width: 1024px) {
  .page-content {
    padding: var(--spacing-xl);
    max-width: 900px;
  }

  .search-box {
    padding: var(--spacing-sm) var(--spacing-lg);
  }

  .search-input {
    font-size: var(--text-base);
  }

  .filter-section {
    margin-bottom: var(--spacing-lg);
  }

  .total-count {
    font-size: var(--text-base);
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

  .item-breadcrumb {
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
