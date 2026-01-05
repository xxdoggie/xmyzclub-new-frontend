<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { getMajorSections } from '@/api/rating'
import type { MajorSection } from '@/types/rating'
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'

const router = useRouter()
const toast = useToast()

// 固定学校ID
const SCHOOL_ID = 1

// 状态
const isLoading = ref(true)
const majorSections = ref<MajorSection[]>([])

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

// 进入大分区
function goToMajorSection(section: MajorSection) {
  router.push(`/community/major/${section.id}`)
}

// 获取分区配置（图标、颜色等）
function getSectionConfig(name: string) {
  if (name.includes('食堂') || name.includes('档口') || name.includes('餐')) {
    return {
      icon: 'utensils',
      gradient: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
      emoji: '🍜',
    }
  }
  if (name.includes('建筑') || name.includes('楼') || name.includes('馆')) {
    return {
      icon: 'building',
      gradient: 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)',
      emoji: '🏛️',
    }
  }
  if (name.includes('考试') || name.includes('测验') || name.includes('课程')) {
    return {
      icon: 'clipboard',
      gradient: 'linear-gradient(135deg, #A29BFE 0%, #6C5CE7 100%)',
      emoji: '📝',
    }
  }
  if (name.includes('活动') || name.includes('社团')) {
    return {
      icon: 'users',
      gradient: 'linear-gradient(135deg, #FDCB6E 0%, #F39C12 100%)',
      emoji: '🎉',
    }
  }
  if (name.includes('图书') || name.includes('阅读')) {
    return {
      icon: 'book',
      gradient: 'linear-gradient(135deg, #74B9FF 0%, #0984E3 100%)',
      emoji: '📚',
    }
  }
  if (name.includes('运动') || name.includes('体育')) {
    return {
      icon: 'trophy',
      gradient: 'linear-gradient(135deg, #55EFC4 0%, #00B894 100%)',
      emoji: '⚽',
    }
  }
  return {
    icon: 'star',
    gradient: 'linear-gradient(135deg, #FD79A8 0%, #E84393 100%)',
    emoji: '⭐',
  }
}

onMounted(() => {
  loadMajorSections()
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
          <div class="hero-badge">校园评分</div>
          <h1 class="hero-title">发现 · 评价 · 分享</h1>
          <p class="hero-subtitle">和同学们一起探索校园的每一个角落</p>
        </div>
        <div class="hero-decoration">
          <span class="float-emoji" style="--delay: 0s; --x: 10%; --y: 20%;">⭐</span>
          <span class="float-emoji" style="--delay: 0.5s; --x: 85%; --y: 15%;">🎯</span>
          <span class="float-emoji" style="--delay: 1s; --x: 75%; --y: 70%;">💬</span>
          <span class="float-emoji" style="--delay: 1.5s; --x: 20%; --y: 75%;">👍</span>
        </div>
      </div>

      <!-- 快捷提示 -->
      <div class="quick-tips">
        <div class="tip-item">
          <span class="tip-icon">👆</span>
          <span class="tip-text">点击分区探索更多</span>
        </div>
        <div class="tip-divider"></div>
        <div class="tip-item">
          <span class="tip-icon">⭐</span>
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
        <div class="empty-icon">😅</div>
        <h3>暂无分区</h3>
        <p>稍后再来看看吧</p>
      </div>

      <!-- 分区列表 -->
      <div v-else class="sections-wrapper">
        <div class="section-header">
          <h2 class="section-title">选择分区</h2>
          <span class="section-count">{{ majorSections.length }} 个分区</span>
        </div>

        <div class="section-grid">
          <div
            v-for="section in majorSections"
            :key="section.id"
            class="section-card"
            @click="goToMajorSection(section)"
          >
            <!-- 卡片背景 -->
            <div
              class="card-bg"
              :style="{ background: section.url ? 'none' : getSectionConfig(section.name).gradient }"
            >
              <img
                v-if="section.url"
                :src="section.url"
                :alt="section.name"
                class="card-image"
                loading="lazy"
              />
            </div>

            <!-- 卡片内容 -->
            <div class="card-content">
              <div class="card-icon">
                {{ getSectionConfig(section.name).emoji }}
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

      <!-- 底部提示 -->
      <div class="footer-hint">
        <p>💡 你的每一个评分都在帮助其他同学做出更好的选择</p>
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
  border-radius: var(--radius-xl);
  overflow: hidden;
  margin-bottom: var(--spacing-md);
  padding: var(--spacing-xl) var(--spacing-lg);
  min-height: 140px;
}

.hero-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, var(--color-primary) 0%, #6366F1 50%, #8B5CF6 100%);
}

.hero-pattern {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%),
                    radial-gradient(circle at 80% 20%, rgba(255,255,255,0.08) 0%, transparent 40%);
}

.hero-content {
  position: relative;
  z-index: 1;
  color: white;
}

.hero-badge {
  display: inline-block;
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(4px);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  margin-bottom: var(--spacing-sm);
}

.hero-title {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-xs);
  letter-spacing: -0.02em;
}

.hero-subtitle {
  font-size: var(--text-sm);
  opacity: 0.9;
}

.hero-decoration {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.float-emoji {
  position: absolute;
  left: var(--x);
  top: var(--y);
  font-size: 20px;
  animation: float 3s ease-in-out infinite;
  animation-delay: var(--delay);
  opacity: 0.7;
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
  font-size: 16px;
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
  font-size: 48px;
  margin-bottom: var(--spacing-md);
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

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-md);
}

.section-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
}

.section-count {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  background: var(--color-card);
  padding: 4px 10px;
  border-radius: var(--radius-full);
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

.card-bg {
  position: absolute;
  inset: 0;
}

.card-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
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
  font-size: 24px;
  flex-shrink: 0;
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

/* ===== Footer Hint ===== */
.footer-hint {
  text-align: center;
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-md);
}

.footer-hint p {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

/* ===== Desktop ===== */
@media (min-width: 768px) {
  .page-content {
    padding: var(--spacing-lg);
    max-width: 900px;
  }

  .hero-banner {
    padding: var(--spacing-2xl);
    min-height: 180px;
  }

  .hero-title {
    font-size: var(--text-2xl);
  }

  .hero-subtitle {
    font-size: var(--text-base);
  }

  .float-emoji {
    font-size: 28px;
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
    font-size: 28px;
  }

  .card-title {
    font-size: var(--text-lg);
  }

  .card-desc {
    font-size: var(--text-sm);
  }
}

@media (min-width: 1024px) {
  .page-content {
    padding: var(--spacing-xl);
    max-width: 1000px;
  }

  .hero-banner {
    padding: var(--spacing-2xl) var(--spacing-3xl);
    min-height: 200px;
  }

  .section-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
