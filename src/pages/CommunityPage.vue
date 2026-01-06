<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { getMajorSections, getRandomItems, getHotItems } from '@/api/rating'
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
const hotItems = ref<RandomRatingItem[]>([])
const randomItems = ref<RandomRatingItem[]>([])
const isLoadingHot = ref(true)
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

// 加载热门项目
async function loadHotItems() {
  isLoadingHot.value = true
  try {
    const res = await getHotItems(8)
    if (res.data.code === 200) {
      hotItems.value = res.data.data
    }
  } catch {
    // 静默失败
  } finally {
    isLoadingHot.value = false
  }
}

// 加载随机推荐
async function loadRandomItems() {
  isLoadingRandom.value = true
  try {
    const res = await getRandomItems(SCHOOL_ID, 8)
    if (res.data.code === 200) {
      // 有图片的排前面
      randomItems.value = res.data.data.sort((a, b) => {
        if (a.url && !b.url) return -1
        if (!a.url && b.url) return 1
        return 0
      })
    }
  } catch {
    // 静默失败
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
  loadHotItems()
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

      <!-- 加载状态 -->
      <div v-if="isLoading" class="loading-state">
        <div class="skeleton-circle"></div>
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

      <!-- 四分区圆形导航 -->
      <div v-else class="sections-wrapper">
        <div class="circle-nav">
          <div class="circle-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            <span>探索</span>
          </div>
          <div
            v-for="(section, index) in majorSections.slice(0, 4)"
            :key="section.id"
            class="quarter-section"
            :class="`quarter-${index + 1}`"
            @click="goToMajorSection(section)"
          >
            <div class="quarter-content">
              <div class="quarter-icon">
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
                <!-- 默认星星图标 -->
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              </div>
              <span class="quarter-label">{{ section.name }}</span>
            </div>
          </div>
        </div>

        <!-- 更多分区（如果超过4个） -->
        <div v-if="majorSections.length > 4" class="more-sections">
          <div
            v-for="section in majorSections.slice(4)"
            :key="section.id"
            class="more-section-item"
            @click="goToMajorSection(section)"
          >
            <span class="more-section-name">{{ section.name }}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </div>
        </div>
      </div>

      <!-- 热门评分 -->
      <div class="hot-section">
        <div class="section-header">
          <h2 class="section-title">
            <svg class="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
              <path d="M2 17l10 5 10-5"></path>
              <path d="M2 12l10 5 10-5"></path>
            </svg>
            <span>热门评分</span>
          </h2>
        </div>

        <!-- 热门加载状态 -->
        <div v-if="isLoadingHot" class="item-grid">
          <div v-for="i in 4" :key="i" class="item-skeleton">
            <div class="skeleton-cover"></div>
            <div class="skeleton-info">
              <div class="skeleton-title"></div>
              <div class="skeleton-meta"></div>
            </div>
          </div>
        </div>

        <!-- 热门列表 -->
        <div v-else-if="hotItems.length > 0" class="item-grid">
          <div
            v-for="item in hotItems"
            :key="item.id"
            class="item-card"
            @click="goToRatingItem(item)"
          >
            <!-- 封面图 -->
            <div class="item-cover">
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
              <!-- 热度标签 -->
              <div class="hot-badge">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 23c-4.97 0-9-3.58-9-8 0-1.95.7-3.76 1.86-5.14A7.5 7.5 0 0 1 9 5c0 .91.2 1.76.56 2.53.49 1.03 1.24 1.91 2.19 2.55A6.18 6.18 0 0 0 12 5.5a5.87 5.87 0 0 1 5.14 3A9.03 9.03 0 0 1 21 15c0 4.42-4.03 8-9 8z"></path>
                </svg>
              </div>
            </div>
            <!-- 信息区 -->
            <div class="item-info">
              <h3 class="item-name">{{ item.name }}</h3>
              <p class="item-breadcrumb">{{ item.breadcrumb.minorSection.name }}</p>
              <div class="item-stats">
                <span class="stat-item">{{ item.ratingCount }} 人评分</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 随机推荐 -->
      <div class="recommend-section">
        <div class="section-header">
          <h2 class="section-title">
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
        <div v-if="isLoadingRandom && randomItems.length === 0" class="item-grid">
          <div v-for="i in 4" :key="i" class="item-skeleton">
            <div class="skeleton-cover"></div>
            <div class="skeleton-info">
              <div class="skeleton-title"></div>
              <div class="skeleton-meta"></div>
            </div>
          </div>
        </div>

        <!-- 推荐列表 -->
        <div v-else-if="randomItems.length > 0" class="item-grid">
          <div
            v-for="item in randomItems"
            :key="item.id"
            class="item-card"
            @click="goToRatingItem(item)"
          >
            <!-- 封面图 -->
            <div class="item-cover">
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
            <div class="item-info">
              <h3 class="item-name">{{ item.name }}</h3>
              <p class="item-breadcrumb">{{ item.breadcrumb.minorSection.name }}</p>
              <!-- 热评 -->
              <div v-if="item.topComment" class="item-comment">
                <span class="comment-text">"{{ item.topComment.commentText }}"</span>
              </div>
              <!-- 统计 -->
              <div class="item-stats">
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

/* ===== Loading State ===== */
.loading-state {
  display: flex;
  justify-content: center;
  padding: var(--spacing-lg) 0;
}

.skeleton-circle {
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: var(--color-border);
  animation: pulse 1.5s ease-in-out infinite;
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

/* ===== Circle Navigation ===== */
.sections-wrapper {
  margin-bottom: var(--spacing-lg);
}

.circle-nav {
  position: relative;
  width: 220px;
  height: 220px;
  margin: 0 auto var(--spacing-md);
}

.circle-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 72px;
  height: 72px;
  background: var(--color-card);
  border: 2px solid var(--color-border);
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.circle-center svg {
  width: 20px;
  height: 20px;
  color: var(--color-primary);
}

.circle-center span {
  font-size: 10px;
  font-weight: var(--font-semibold);
  color: var(--color-text-secondary);
}

.quarter-section {
  position: absolute;
  width: 50%;
  height: 50%;
  cursor: pointer;
  transition: all var(--transition-normal);
  overflow: hidden;
}

.quarter-1 {
  top: 0;
  left: 0;
  border-radius: 100% 0 0 0;
  background: linear-gradient(135deg, #FF6B6B, #FF8E53);
}

.quarter-2 {
  top: 0;
  right: 0;
  border-radius: 0 100% 0 0;
  background: linear-gradient(225deg, #4ECDC4, #44A08D);
}

.quarter-3 {
  bottom: 0;
  left: 0;
  border-radius: 0 0 0 100%;
  background: linear-gradient(45deg, #A29BFE, #6C5CE7);
}

.quarter-4 {
  bottom: 0;
  right: 0;
  border-radius: 0 0 100% 0;
  background: linear-gradient(315deg, #FDCB6E, #F39C12);
}

.quarter-section:hover {
  transform: scale(1.05);
  z-index: 5;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.quarter-section:active {
  transform: scale(1);
}

.quarter-content {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: white;
}

.quarter-1 .quarter-content {
  bottom: 16px;
  right: 16px;
}

.quarter-2 .quarter-content {
  bottom: 16px;
  left: 16px;
}

.quarter-3 .quarter-content {
  top: 16px;
  right: 16px;
}

.quarter-4 .quarter-content {
  top: 16px;
  left: 16px;
}

.quarter-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.quarter-icon svg {
  width: 100%;
  height: 100%;
}

.quarter-label {
  font-size: 11px;
  font-weight: var(--font-semibold);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  max-width: 60px;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 更多分区 */
.more-sections {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
  justify-content: center;
}

.more-section-item {
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

.more-section-item:hover {
  background: var(--color-bg-hover);
  color: var(--color-text);
  border-color: var(--color-primary);
}

.more-section-item svg {
  width: 12px;
  height: 12px;
}

/* ===== Sections Common ===== */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-md);
}

.section-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
}

.section-title .title-icon {
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

/* ===== Hot Section ===== */
.hot-section {
  margin-bottom: var(--spacing-lg);
}

/* ===== Recommend Section ===== */
.recommend-section {
  margin-bottom: var(--spacing-lg);
}

/* ===== Item Grid ===== */
.item-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-sm);
}

.item-skeleton {
  background: var(--color-card);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.item-skeleton .skeleton-cover {
  aspect-ratio: 4 / 3;
  background: var(--color-border);
  animation: pulse 1.5s ease-in-out infinite;
}

.item-skeleton .skeleton-info {
  padding: var(--spacing-sm);
}

.item-skeleton .skeleton-title {
  height: 16px;
  background: var(--color-border);
  border-radius: var(--radius-sm);
  margin-bottom: var(--spacing-xs);
  animation: pulse 1.5s ease-in-out infinite;
}

.item-skeleton .skeleton-meta {
  height: 12px;
  width: 60%;
  background: var(--color-border);
  border-radius: var(--radius-sm);
  animation: pulse 1.5s ease-in-out infinite;
}

.item-card {
  background: var(--color-card);
  border-radius: var(--radius-lg);
  overflow: hidden;
  cursor: pointer;
  transition: all var(--transition-normal);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.item-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.item-card:active {
  transform: translateY(0);
}

/* 封面 */
.item-cover {
  position: relative;
  aspect-ratio: 4 / 3;
  background: var(--color-bg);
  overflow: hidden;
}

.item-cover img {
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
  width: 32px;
  height: 32px;
  color: var(--color-primary);
  opacity: 0.4;
}

/* 评分标签 */
.score-badge {
  position: absolute;
  bottom: var(--spacing-xs);
  left: var(--spacing-xs);
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: white;
}

.score-badge svg {
  width: 12px;
  height: 12px;
  color: #FBBF24;
}

/* 热度标签 */
.hot-badge {
  position: absolute;
  top: var(--spacing-xs);
  right: var(--spacing-xs);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 107, 107, 0.9);
  backdrop-filter: blur(8px);
  border-radius: 50%;
}

.hot-badge svg {
  width: 14px;
  height: 14px;
  color: white;
}

/* 信息区 */
.item-info {
  padding: var(--spacing-sm);
}

.item-name {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-breadcrumb {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xs);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-comment {
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

.item-stats {
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

  .circle-nav {
    width: 280px;
    height: 280px;
  }

  .circle-center {
    width: 90px;
    height: 90px;
  }

  .circle-center svg {
    width: 24px;
    height: 24px;
  }

  .circle-center span {
    font-size: 12px;
  }

  .quarter-icon {
    width: 36px;
    height: 36px;
  }

  .quarter-label {
    font-size: 13px;
    max-width: 80px;
  }

  .quarter-1 .quarter-content {
    bottom: 24px;
    right: 24px;
  }

  .quarter-2 .quarter-content {
    bottom: 24px;
    left: 24px;
  }

  .quarter-3 .quarter-content {
    top: 24px;
    right: 24px;
  }

  .quarter-4 .quarter-content {
    top: 24px;
    left: 24px;
  }

  .item-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spacing-md);
  }

  .item-name {
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

  .circle-nav {
    width: 320px;
    height: 320px;
  }

  .circle-center {
    width: 100px;
    height: 100px;
  }

  .circle-center svg {
    width: 28px;
    height: 28px;
  }

  .circle-center span {
    font-size: 13px;
  }

  .quarter-icon {
    width: 40px;
    height: 40px;
  }

  .quarter-label {
    font-size: 14px;
    max-width: 90px;
  }

  .quarter-1 .quarter-content {
    bottom: 32px;
    right: 32px;
  }

  .quarter-2 .quarter-content {
    bottom: 32px;
    left: 32px;
  }

  .quarter-3 .quarter-content {
    top: 32px;
    right: 32px;
  }

  .quarter-4 .quarter-content {
    top: 32px;
    left: 32px;
  }

  .item-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>
