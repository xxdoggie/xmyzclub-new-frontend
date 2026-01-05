<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { getMajorSections, getRandomItems } from '@/api/rating'
import type { MajorSection, RandomRatingItem } from '@/types/rating'
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'

const router = useRouter()
const toast = useToast()

// 固定学校ID
const SCHOOL_ID = 1

// 状态
const isLoading = ref(true)
const majorSections = ref<MajorSection[]>([])
const randomItems = ref<RandomRatingItem[]>([])
const isLoadingRandom = ref(false)

// 加载大分区列表
async function loadMajorSections() {
  isLoading.value = true
  try {
    const res = await getMajorSections(SCHOOL_ID)
    if (res.data.code === 200) {
      majorSections.value = res.data.data
    } else {
      toast.error(res.data.message || '获取分区列表失败')
    }
  } catch {
    toast.error('获取分区列表失败')
  } finally {
    isLoading.value = false
  }
}

// 加载随机推荐
async function loadRandomItems() {
  isLoadingRandom.value = true
  try {
    const res = await getRandomItems(SCHOOL_ID, 10)
    if (res.data.code === 200) {
      // 有图片的排前面
      randomItems.value = res.data.data.sort((a, b) => {
        if (a.url && !b.url) return -1
        if (!a.url && b.url) return 1
        return 0
      })
    }
  } catch {
    // 静默失败，推荐区域可选
  } finally {
    isLoadingRandom.value = false
  }
}

// 刷新推荐
async function refreshRandom() {
  await loadRandomItems()
}

// 进入评分详情
function goToRatingItem(item: RandomRatingItem) {
  router.push(`/community/item/${item.id}`)
}

// 格式化评分显示
function formatScore(score: number): string {
  return score.toFixed(1)
}

// 进入大分区
function goToMajorSection(section: MajorSection) {
  router.push(`/community/major/${section.id}`)
}

// 获取分区图标类型
function getSectionIcon(name: string): string {
  if (name.includes('食堂') || name.includes('档口') || name.includes('餐')) {
    return 'utensils'
  }
  if (name.includes('建筑') || name.includes('楼') || name.includes('馆')) {
    return 'building'
  }
  if (name.includes('考试') || name.includes('测验') || name.includes('课程')) {
    return 'clipboard'
  }
  if (name.includes('活动') || name.includes('社团')) {
    return 'users'
  }
  if (name.includes('图书') || name.includes('阅读')) {
    return 'book'
  }
  if (name.includes('运动') || name.includes('体育')) {
    return 'trophy'
  }
  return 'star'
}

onMounted(() => {
  loadMajorSections()
  loadRandomItems()
})
</script>

<template>
  <div class="page-container">
    <PageHeader back-to="/" />

    <main class="page-content">
      <!-- Hero Banner -->
      <div class="hero-banner">
        <div class="hero-bg">
          <div class="hero-pattern"></div>
        </div>
        <div class="hero-content">
          <h1 class="hero-title">发现 · 评价 · 分享</h1>
          <p class="hero-subtitle">和同学们一起探索校园的每一个角落</p>
        </div>
        <div class="hero-decoration">
          <svg class="float-icon" style="--delay: 0s; --x: 70%; --y: 15%;" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
          <svg class="float-icon" style="--delay: 0.5s; --x: 85%; --y: 35%;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          <svg class="float-icon" style="--delay: 1s; --x: 75%; --y: 65%;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
          </svg>
          <svg class="float-icon" style="--delay: 1.5s; --x: 90%; --y: 75%;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
          </svg>
        </div>
      </div>

      <!-- 快捷提示 -->
      <div class="quick-tips">
        <div class="tip-item">
          <svg class="tip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          <span class="tip-text">点击分区探索更多</span>
        </div>
        <div class="tip-divider"></div>
        <div class="tip-item">
          <svg class="tip-icon" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
          <span class="tip-text">给你喜欢的打分</span>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="isLoading" class="loading-state">
        <div class="skeleton-grid">
          <div v-for="i in 4" :key="i" class="skeleton-card">
            <div class="skeleton-icon"></div>
            <div class="skeleton-text"></div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="majorSections.length === 0" class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M8 15h8"></path>
            <circle cx="9" cy="9" r="1" fill="currentColor"></circle>
            <circle cx="15" cy="9" r="1" fill="currentColor"></circle>
          </svg>
        </div>
        <h3>暂无分区</h3>
        <p>稍后再来看看吧</p>
      </div>

      <!-- 分区列表 -->
      <div v-else class="sections-wrapper">
        <div class="section-grid">
          <div
            v-for="section in majorSections"
            :key="section.id"
            class="section-card"
            @click="goToMajorSection(section)"
          >
            <!-- 卡片内容 -->
            <div class="card-content">
              <div class="card-icon">
                <!-- 餐厅图标 -->
                <svg v-if="getSectionIcon(section.name) === 'utensils'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"></path>
                  <path d="M7 2v20"></path>
                  <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"></path>
                </svg>
                <!-- 建筑图标 -->
                <svg v-else-if="getSectionIcon(section.name) === 'building'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
                  <path d="M9 22v-4h6v4"></path>
                  <path d="M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01"></path>
                </svg>
                <!-- 考试图标 -->
                <svg v-else-if="getSectionIcon(section.name) === 'clipboard'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                  <path d="M9 12h6M9 16h6"></path>
                </svg>
                <!-- 活动图标 -->
                <svg v-else-if="getSectionIcon(section.name) === 'users'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                <!-- 图书图标 -->
                <svg v-else-if="getSectionIcon(section.name) === 'book'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
                <!-- 运动图标 -->
                <svg v-else-if="getSectionIcon(section.name) === 'trophy'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
                  <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
                  <path d="M4 22h16"></path>
                  <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
                  <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
                  <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
                </svg>
                <!-- 默认星星图标 -->
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              </div>
              <div class="card-info">
                <h3 class="card-title">{{ section.name }}</h3>
                <p v-if="section.description" class="card-desc">{{ section.description }}</p>
                <p v-else class="card-desc">点击探索更多内容</p>
              </div>
              <div class="card-arrow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 随机推荐 -->
      <div class="recommend-section">
        <div class="recommend-header">
          <h2 class="recommend-title">
            <svg class="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="7.5 4.21 12 6.81 16.5 4.21"></polyline>
              <polyline points="7.5 19.79 7.5 14.6 3 12"></polyline>
              <polyline points="21 12 16.5 14.6 16.5 19.79"></polyline>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
            <span>随机发现</span>
          </h2>
          <button class="refresh-btn" :disabled="isLoadingRandom" @click="refreshRandom">
            <svg :class="{ spinning: isLoadingRandom }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"></polyline>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
            </svg>
            <span>换一批</span>
          </button>
        </div>

        <!-- 推荐加载状态 -->
        <div v-if="isLoadingRandom && randomItems.length === 0" class="recommend-loading">
          <div v-for="i in 4" :key="i" class="recommend-skeleton">
            <div class="skeleton-cover"></div>
            <div class="skeleton-info">
              <div class="skeleton-title"></div>
              <div class="skeleton-meta"></div>
            </div>
          </div>
        </div>

        <!-- 推荐列表 -->
        <div v-else-if="randomItems.length > 0" class="recommend-grid">
          <div
            v-for="item in randomItems"
            :key="item.id"
            class="recommend-card"
            @click="goToRatingItem(item)"
          >
            <!-- 封面图 -->
            <div class="recommend-cover">
              <img
                v-if="item.url"
                :src="item.url"
                :alt="item.name"
                loading="lazy"
              />
              <div v-else class="cover-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              </div>
              <!-- 评分标签 -->
              <div class="score-badge">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
                <span>{{ formatScore(item.averageScore) }}</span>
              </div>
            </div>
            <!-- 信息区 -->
            <div class="recommend-info">
              <h3 class="recommend-name">{{ item.name }}</h3>
              <p class="recommend-breadcrumb">{{ item.breadcrumb.minorSection.name }}</p>
              <!-- 热评 -->
              <div v-if="item.topComment" class="recommend-comment">
                <span class="comment-text">"{{ item.topComment.commentText }}"</span>
              </div>
              <!-- 统计 -->
              <div class="recommend-stats">
                <span class="stat-item">{{ item.ratingCount }} 人评分</span>
              </div>
            </div>
          </div>
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
  padding: var(--spacing-sm);
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}

/* ===== Hero Banner ===== */
.hero-banner {
  position: relative;
  border-radius: var(--radius-lg);
  overflow: hidden;
  margin-bottom: var(--spacing-md);
  padding: var(--spacing-md) var(--spacing-lg);
}

.hero-bg {
  position: absolute;
  inset: 0;
  background: var(--color-card);
  border: 1px solid var(--color-border);
}

.hero-pattern {
  display: none;
}

.hero-content {
  position: relative;
  z-index: 1;
  color: var(--color-text);
}

.hero-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-xs);
  letter-spacing: -0.02em;
}

.hero-subtitle {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.hero-decoration {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.float-icon {
  position: absolute;
  left: var(--x);
  top: var(--y);
  width: 20px;
  height: 20px;
  color: var(--color-primary);
  opacity: 0.4;
  animation: float 3s ease-in-out infinite;
  animation-delay: var(--delay);
}

@keyframes float {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  50% {
    transform: translateY(-8px) rotate(5deg);
  }
}

/* ===== Quick Tips ===== */
.quick-tips {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-card);
  border-radius: var(--radius-lg);
  margin-bottom: var(--spacing-lg);
}

.tip-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.tip-icon {
  width: 16px;
  height: 16px;
  color: var(--color-primary);
}

.tip-text {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.tip-divider {
  width: 1px;
  height: 16px;
  background: var(--color-border);
}

/* ===== Loading State ===== */
.loading-state {
  padding: var(--spacing-md) 0;
}

.skeleton-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--spacing-sm);
}

.skeleton-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  background: var(--color-card);
  border-radius: var(--radius-lg);
}

.skeleton-icon {
  width: 48px;
  height: 48px;
  background: var(--color-border);
  border-radius: var(--radius-md);
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-text {
  flex: 1;
  height: 20px;
  background: var(--color-border);
  border-radius: var(--radius-sm);
  animation: pulse 1.5s ease-in-out infinite;
  animation-delay: 0.2s;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* ===== Empty State ===== */
.empty-state {
  text-align: center;
  padding: var(--spacing-2xl);
}

.empty-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto var(--spacing-md);
  color: var(--color-text-placeholder);
}

.empty-icon svg {
  width: 100%;
  height: 100%;
}

.empty-state h3 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-xs);
}

.empty-state p {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

/* ===== Sections ===== */
.sections-wrapper {
  margin-bottom: var(--spacing-lg);
}

.section-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--spacing-sm);
}

.section-card {
  position: relative;
  border-radius: var(--radius-lg);
  overflow: hidden;
  cursor: pointer;
  transition: all var(--transition-normal);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.section-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.section-card:active {
  transform: translateY(0);
}

.card-content {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--color-card);
  border-left: 4px solid transparent;
  border-image: var(--card-gradient, linear-gradient(135deg, var(--color-primary), #8B5CF6)) 1;
}

.section-card:nth-child(1) .card-content { --card-gradient: linear-gradient(135deg, #FF6B6B, #FF8E53); }
.section-card:nth-child(2) .card-content { --card-gradient: linear-gradient(135deg, #4ECDC4, #44A08D); }
.section-card:nth-child(3) .card-content { --card-gradient: linear-gradient(135deg, #A29BFE, #6C5CE7); }
.section-card:nth-child(4) .card-content { --card-gradient: linear-gradient(135deg, #FDCB6E, #F39C12); }
.section-card:nth-child(5) .card-content { --card-gradient: linear-gradient(135deg, #74B9FF, #0984E3); }
.section-card:nth-child(6) .card-content { --card-gradient: linear-gradient(135deg, #55EFC4, #00B894); }

.card-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg);
  border-radius: var(--radius-md);
  flex-shrink: 0;
  color: var(--color-text-secondary);
}

.card-icon svg {
  width: 24px;
  height: 24px;
}

.card-info {
  flex: 1;
  min-width: 0;
}

.card-title {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-desc {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-arrow {
  width: 20px;
  height: 20px;
  color: var(--color-text-placeholder);
  flex-shrink: 0;
}

.card-arrow svg {
  width: 100%;
  height: 100%;
}

/* ===== Recommend Section ===== */
.recommend-section {
  margin-top: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
}

.recommend-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-md);
}

.recommend-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
}

.recommend-title .title-icon {
  width: 18px;
  height: 18px;
  color: var(--color-primary);
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.refresh-btn:hover:not(:disabled) {
  background: var(--color-bg-hover);
  color: var(--color-text);
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.refresh-btn svg {
  width: 14px;
  height: 14px;
}

.refresh-btn svg.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 推荐加载骨架 */
.recommend-loading {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-sm);
}

.recommend-skeleton {
  background: var(--color-card);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.recommend-skeleton .skeleton-cover {
  aspect-ratio: 4 / 3;
  background: var(--color-border);
  animation: pulse 1.5s ease-in-out infinite;
}

.recommend-skeleton .skeleton-info {
  padding: var(--spacing-sm);
}

.recommend-skeleton .skeleton-title {
  height: 16px;
  background: var(--color-border);
  border-radius: var(--radius-sm);
  margin-bottom: var(--spacing-xs);
  animation: pulse 1.5s ease-in-out infinite;
}

.recommend-skeleton .skeleton-meta {
  height: 12px;
  width: 60%;
  background: var(--color-border);
  border-radius: var(--radius-sm);
  animation: pulse 1.5s ease-in-out infinite;
}

/* 推荐网格 */
.recommend-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-sm);
}

.recommend-card {
  background: var(--color-card);
  border-radius: var(--radius-lg);
  overflow: hidden;
  cursor: pointer;
  transition: all var(--transition-normal);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.recommend-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.recommend-card:active {
  transform: translateY(0);
}

/* 封面 */
.recommend-cover {
  position: relative;
  aspect-ratio: 4 / 3;
  background: var(--color-bg);
  overflow: hidden;
}

.recommend-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f0f4ff 0%, #e8eeff 100%);
}

:root.dark .cover-placeholder {
  background: linear-gradient(135deg, #1e2538 0%, #252d40 100%);
}

.cover-placeholder svg {
  width: 36px;
  height: 36px;
  color: var(--color-primary);
  opacity: 0.4;
}

/* 评分标签 */
.score-badge {
  position: absolute;
  top: var(--spacing-xs);
  right: var(--spacing-xs);
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  color: #1a1a1a;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.4);
}

.score-badge svg {
  width: 14px;
  height: 14px;
  color: #1a1a1a;
}

/* 信息区 */
.recommend-info {
  padding: var(--spacing-sm);
}

.recommend-name {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recommend-breadcrumb {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xs);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recommend-comment {
  margin-bottom: var(--spacing-xs);
}

.comment-text {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  font-style: italic;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.recommend-stats {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.stat-item {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
}

/* ===== Desktop ===== */
@media (min-width: 768px) {
  .page-content {
    padding: var(--spacing-lg);
    max-width: 900px;
  }

  .hero-banner {
    padding: var(--spacing-lg);
  }

  .hero-title {
    font-size: var(--text-xl);
  }

  .hero-subtitle {
    font-size: var(--text-sm);
  }

  .float-icon {
    width: 28px;
    height: 28px;
  }

  .quick-tips {
    gap: var(--spacing-xl);
  }

  .tip-text {
    font-size: var(--text-sm);
  }

  .section-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-md);
  }

  .card-content {
    padding: var(--spacing-lg);
  }

  .card-icon {
    width: 56px;
    height: 56px;
  }

  .card-icon svg {
    width: 28px;
    height: 28px;
  }

  .card-title {
    font-size: var(--text-lg);
  }

  .card-desc {
    font-size: var(--text-sm);
  }

  .recommend-loading,
  .recommend-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spacing-md);
  }

  .recommend-name {
    font-size: var(--text-base);
  }
}

@media (min-width: 1024px) {
  .page-content {
    padding: var(--spacing-xl);
    max-width: 1000px;
  }

  .hero-banner {
    padding: var(--spacing-lg) var(--spacing-xl);
  }

  .section-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .recommend-loading,
  .recommend-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>
