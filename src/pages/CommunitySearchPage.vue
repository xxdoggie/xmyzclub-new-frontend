<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
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

// 搜索
async function handleSearch() {
  const keyword = searchKeyword.value.trim()
  if (!keyword) {
    toast.error('请输入搜索关键词')
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

// 返回
function goBack() {
  router.back()
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
    <PageHeader />

    <main class="page-content">
      <!-- 搜索区域 -->
      <div class="search-section">
        <button class="back-btn" @click="goBack">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <div class="search-input-wrapper">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            ref="searchInputRef"
            v-model="searchKeyword"
            type="text"
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
        </div>
        <button class="search-btn" @click="handleSearch" :disabled="isLoading">
          搜索
        </button>
      </div>

      <!-- 加载状态 -->
      <div v-if="isLoading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>搜索中...</p>
      </div>

      <!-- 空状态：未搜索 -->
      <div v-else-if="!hasSearched" class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
        <h3>搜索评分项目</h3>
        <p>输入关键词搜索你想评分的内容</p>
      </div>

      <!-- 空状态：无结果 -->
      <div v-else-if="searchResults.length === 0" class="empty-state">
        <div class="empty-icon empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <h3>未找到相关结果</h3>
        <p>换个关键词试试吧</p>
      </div>

      <!-- 搜索结果 -->
      <template v-else>
        <div class="result-header">
          <span class="result-count">找到 {{ totalCount }} 个结果</span>
        </div>

        <div class="result-list">
          <div
            v-for="item in searchResults"
            :key="item.id"
            class="result-item"
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

              <!-- 面包屑导航 -->
              <div class="item-breadcrumb" v-if="item.breadcrumb">
                <span>{{ item.breadcrumb }}</span>
              </div>

              <div class="item-meta">
                <span class="rating-count">{{ item.ratingCount }} 人评分</span>
              </div>

              <!-- 热门评论 -->
              <div class="hot-comment" v-if="item.topComment">
                <span class="comment-text">"{{ item.topComment.commentText }}"</span>
              </div>
            </div>

            <!-- 箭头 -->
            <div class="item-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
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
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-lg);
  position: sticky;
  top: 0;
  background: var(--color-bg);
  padding: var(--spacing-sm) 0;
  z-index: 10;
}

.back-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  color: var(--color-text);
  cursor: pointer;
  flex-shrink: 0;
  transition: background var(--transition-fast);
}

.back-btn:hover {
  background: var(--color-card);
}

.back-btn svg {
  width: 20px;
  height: 20px;
}

.search-input-wrapper {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: var(--spacing-sm);
  width: 18px;
  height: 18px;
  color: var(--color-text-secondary);
  pointer-events: none;
}

.search-input {
  width: 100%;
  height: 40px;
  padding: 0 var(--spacing-xl) 0 calc(var(--spacing-sm) + 26px);
  font-size: var(--text-sm);
  color: var(--color-text);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  outline: none;
  transition: all var(--transition-fast);
}

.search-input::placeholder {
  color: var(--color-text-placeholder);
}

.search-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.1);
}

.clear-btn {
  position: absolute;
  right: var(--spacing-xs);
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.clear-btn:hover {
  background: var(--color-border);
  color: var(--color-text);
}

.clear-btn svg {
  width: 16px;
  height: 16px;
}

.search-btn {
  height: 40px;
  padding: 0 var(--spacing-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: white;
  background: var(--color-primary);
  border: none;
  border-radius: var(--radius-lg);
  cursor: pointer;
  flex-shrink: 0;
  transition: all var(--transition-fast);
}

.search-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.search-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ===== Loading State ===== */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-2xl);
  gap: var(--spacing-md);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-container p {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

/* ===== Empty State ===== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-2xl);
  text-align: center;
}

.empty-icon {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-card);
  border-radius: var(--radius-xl);
  margin-bottom: var(--spacing-md);
  color: var(--color-text-secondary);
}

.empty-icon.empty {
  background: rgba(var(--color-warning-rgb, 234, 179, 8), 0.1);
  color: var(--color-warning);
}

.empty-icon svg {
  width: 32px;
  height: 32px;
}

.empty-state h3 {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-xs);
}

.empty-state p {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

/* ===== Result Header ===== */
.result-header {
  margin-bottom: var(--spacing-md);
}

.result-count {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

/* ===== Result List ===== */
.result-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.result-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--color-card);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.result-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.result-item:active {
  transform: translateY(0);
}

/* ===== Item Image ===== */
.item-image-wrapper {
  width: 60px;
  height: 60px;
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
  width: 24px;
  height: 24px;
}

/* ===== Item Details ===== */
.item-details {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--spacing-sm);
}

.item-name {
  font-size: var(--text-sm);
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
  gap: 2px;
  flex-shrink: 0;
}

.item-score {
  font-size: var(--text-base);
  font-weight: var(--font-bold);
  color: var(--color-accent);
}

/* ===== Star Rating ===== */
.star-rating {
  display: flex;
  gap: 1px;
}

.star-btn {
  padding: 0;
  width: 14px;
  height: 14px;
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

/* ===== Item Breadcrumb ===== */
.item-breadcrumb {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  margin-top: 2px;
}

.comment-text {
  font-size: 11px;
  color: var(--color-text-secondary);
  font-style: italic;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

/* ===== Item Arrow ===== */
.item-arrow {
  flex-shrink: 0;
  color: var(--color-text-placeholder);
}

.item-arrow svg {
  width: 16px;
  height: 16px;
}

/* ===== Desktop ===== */
@media (min-width: 768px) {
  .page-content {
    padding: var(--spacing-lg);
  }

  .search-section {
    gap: var(--spacing-md);
    padding: var(--spacing-md) 0;
  }

  .back-btn {
    width: 40px;
    height: 40px;
  }

  .search-input {
    height: 44px;
    font-size: var(--text-base);
  }

  .search-btn {
    height: 44px;
    padding: 0 var(--spacing-lg);
    font-size: var(--text-base);
  }

  .result-item {
    padding: var(--spacing-md) var(--spacing-lg);
  }

  .item-image-wrapper {
    width: 72px;
    height: 72px;
  }

  .item-name {
    font-size: var(--text-base);
  }

  .item-score {
    font-size: var(--text-lg);
  }

  .star-btn {
    width: 16px;
    height: 16px;
  }

  .item-breadcrumb {
    font-size: var(--text-xs);
  }

  .rating-count {
    font-size: var(--text-xs);
  }

  .comment-text {
    font-size: var(--text-xs);
  }
}

@media (min-width: 1024px) {
  .page-content {
    padding: var(--spacing-xl);
    max-width: 900px;
  }

  .result-item {
    padding: var(--spacing-lg);
  }

  .item-image-wrapper {
    width: 80px;
    height: 80px;
  }

  .item-details {
    gap: var(--spacing-xs);
  }

  .star-btn {
    width: 18px;
    height: 18px;
  }
}
</style>
