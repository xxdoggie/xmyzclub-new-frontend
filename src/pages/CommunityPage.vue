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

// 分区颜色和图标配置
const sectionStyles = [
  { gradient: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)', icon: 'utensils' },
  { gradient: 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)', icon: 'building' },
  { gradient: 'linear-gradient(135deg, #A29BFE 0%, #6C5CE7 100%)', icon: 'clipboard' },
  { gradient: 'linear-gradient(135deg, #FDCB6E 0%, #F39C12 100%)', icon: 'users' },
  { gradient: 'linear-gradient(135deg, #74b9ff 0%, #0984e3 100%)', icon: 'star' },
  { gradient: 'linear-gradient(135deg, #fd79a8 0%, #e84393 100%)', icon: 'heart' },
]

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

// 获取分区样式
function getSectionStyle(index: number) {
  return sectionStyles[index % sectionStyles.length]
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
        <div class="hero-content">
          <h1 class="hero-title">评分社区</h1>
          <p class="hero-subtitle">发现 · 评价 · 分享校园的每一个角落</p>
        </div>
        <div class="hero-stats">
          <div class="stat-item">
            <span class="stat-value">{{ majorSections.length }}</span>
            <span class="stat-label">分区</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-value">{{ hotItems.length + randomItems.length }}+</span>
            <span class="stat-label">评分项</span>
          </div>
        </div>
      </div>

      <!-- 分区入口 -->
      <section class="section">
        <div class="section-header">
          <h2 class="section-title">探索分区</h2>
        </div>

        <!-- 加载状态 -->
        <div v-if="isLoading" class="section-grid">
          <div v-for="i in 4" :key="i" class="section-card-skeleton">
            <div class="skeleton-icon"></div>
            <div class="skeleton-text"></div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else-if="majorSections.length === 0" class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M8 15h8M9 9h.01M15 9h.01"></path>
          </svg>
          <p>暂无分区</p>
        </div>

        <!-- 分区网格 -->
        <div v-else class="section-grid">
          <div
            v-for="(section, index) in majorSections"
            :key="section.id"
            class="section-card"
            :style="{ background: getSectionStyle(index).gradient }"
            @click="goToMajorSection(section)"
          >
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
              <!-- 默认星星图标 -->
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
            </div>
            <div class="card-info">
              <h3 class="card-title">{{ section.name }}</h3>
              <span class="card-arrow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- 热门评分 -->
      <section class="section">
        <div class="section-header">
          <h2 class="section-title">
            <svg class="title-icon hot" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 23c-4.97 0-9-3.58-9-8 0-1.95.7-3.76 1.86-5.14A7.5 7.5 0 0 1 9 5c0 .91.2 1.76.56 2.53.49 1.03 1.24 1.91 2.19 2.55A6.18 6.18 0 0 0 12 5.5a5.87 5.87 0 0 1 5.14 3A9.03 9.03 0 0 1 21 15c0 4.42-4.03 8-9 8z"></path>
            </svg>
            热门评分
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
            v-for="(item, index) in hotItems"
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
              <!-- 排名标签 -->
              <div v-if="index < 3" class="rank-badge" :class="`rank-${index + 1}`">
                {{ index + 1 }}
              </div>
            </div>
            <!-- 信息区 -->
            <div class="item-info">
              <h3 class="item-name">{{ item.name }}</h3>
              <p class="item-breadcrumb">{{ item.breadcrumb.minorSection.name }}</p>
              <div class="item-stats">
                <span class="stat-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                  </svg>
                  {{ item.ratingCount }} 人评分
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else class="empty-state small">
          <p>暂无热门评分</p>
        </div>
      </section>

      <!-- 随机推荐 -->
      <section class="section">
        <div class="section-header">
          <h2 class="section-title">
            <svg class="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <circle cx="15.5" cy="8.5" r="1.5"></circle>
              <circle cx="15.5" cy="15.5" r="1.5"></circle>
              <circle cx="8.5" cy="15.5" r="1.5"></circle>
            </svg>
            随机发现
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
                <span class="stat-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                  </svg>
                  {{ item.ratingCount }} 人评分
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else class="empty-state small">
          <p>暂无推荐</p>
        </div>
      </section>

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
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}

/* ===== Hero Banner ===== */
.hero-banner {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark, #e55039) 100%);
  border-radius: var(--radius-xl);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-md);
}

.hero-content {
  flex: 1;
}

.hero-title {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-xs);
}

.hero-subtitle {
  font-size: var(--text-sm);
  opacity: 0.9;
}

.hero-stats {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(8px);
  border-radius: var(--radius-lg);
  padding: var(--spacing-sm) var(--spacing-md);
}

.hero-stats .stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.hero-stats .stat-value {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
}

.hero-stats .stat-label {
  font-size: var(--text-xs);
  opacity: 0.8;
}

.stat-divider {
  width: 1px;
  height: 32px;
  background: rgba(255, 255, 255, 0.3);
}

/* ===== Section ===== */
.section {
  margin-bottom: var(--spacing-xl);
}

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

.section-title .title-icon.hot {
  color: #FF6B6B;
}

/* ===== Section Grid (分区卡片) ===== */
.section-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-sm);
}

.section-card {
  display: flex;
  flex-direction: column;
  padding: var(--spacing-md);
  border-radius: var(--radius-lg);
  color: white;
  cursor: pointer;
  transition: all var(--transition-normal);
  min-height: 100px;
}

.section-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.section-card:active {
  transform: translateY(0);
}

.card-icon {
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--spacing-sm);
}

.card-icon svg {
  width: 20px;
  height: 20px;
}

.card-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
}

.card-title {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
}

.card-arrow {
  width: 20px;
  height: 20px;
  opacity: 0.7;
}

.card-arrow svg {
  width: 100%;
  height: 100%;
}

/* Skeleton */
.section-card-skeleton {
  background: var(--color-card);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
  min-height: 100px;
}

.skeleton-icon {
  width: 36px;
  height: 36px;
  background: var(--color-border);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-sm);
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-text {
  height: 16px;
  width: 60%;
  background: var(--color-border);
  border-radius: var(--radius-sm);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* ===== Empty State ===== */
.empty-state {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--color-text-secondary);
}

.empty-state svg {
  width: 48px;
  height: 48px;
  margin-bottom: var(--spacing-sm);
  opacity: 0.5;
}

.empty-state.small {
  padding: var(--spacing-lg);
}

.empty-state.small svg {
  width: 32px;
  height: 32px;
}

/* ===== Refresh Button ===== */
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

/* 排名标签 */
.rank-badge {
  position: absolute;
  top: var(--spacing-xs);
  left: var(--spacing-xs);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  color: white;
}

.rank-badge.rank-1 {
  background: linear-gradient(135deg, #FFD700, #FFA500);
}

.rank-badge.rank-2 {
  background: linear-gradient(135deg, #C0C0C0, #A0A0A0);
}

.rank-badge.rank-3 {
  background: linear-gradient(135deg, #CD7F32, #B87333);
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

.item-stats .stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
}

.item-stats .stat-item svg {
  width: 12px;
  height: 12px;
}

/* ===== Desktop ===== */
@media (min-width: 640px) {
  .page-content {
    padding: var(--spacing-lg);
  }

  .hero-banner {
    padding: var(--spacing-xl);
  }

  .hero-title {
    font-size: var(--text-2xl);
  }

  .section-grid {
    gap: var(--spacing-md);
  }

  .section-card {
    padding: var(--spacing-lg);
    min-height: 120px;
  }

  .card-icon {
    width: 44px;
    height: 44px;
  }

  .card-icon svg {
    width: 24px;
    height: 24px;
  }

  .card-title {
    font-size: var(--text-base);
  }

  .item-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spacing-md);
  }

  .item-name {
    font-size: var(--text-base);
  }
}

@media (min-width: 768px) {
  .page-content {
    max-width: 900px;
  }

  .item-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>
