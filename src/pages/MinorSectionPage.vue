<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { useUserStore } from '@/stores/user'
import { useScoringTour } from '@/composables/useScoringTour'
import { getMinorSections } from '@/api/rating'
import type { MinorSection } from '@/types/rating'
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'
import FeedbackDrawer from '@/components/feedback/FeedbackDrawer.vue'

const router = useRouter()
const route = useRoute()
const toast = useToast()
const userStore = useUserStore()
const {
  shouldStartTour,
  getCurrentStep,
  TourStep,
  saveStep,
  highlightElement,
  destroyDriver,
} = useScoringTour()

// 获取路由参数
const majorId = Number(route.params.majorId)

// 状态
const isLoading = ref(true)
const minorSections = ref<MinorSection[]>([])

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
  // 可以在这里做额外处理，比如显示提示
}

// 加载小分区列表
async function loadMinorSections() {
  isLoading.value = true
  try {
    const res = await getMinorSections(majorId)
    if (res.data.code === 200) {
      minorSections.value = res.data.data
    } else {
      toast.error(res.data.message || '获取分区列表失败')
    }
  } catch {
    toast.error('获取分区列表失败')
  } finally {
    isLoading.value = false
  }
}

// 进入评分项目页面
function goToRatingItems(section: MinorSection) {
  router.push(`/community/minor/${section.id}`)
}

// 获取占位渐变色（使用柔和的颜色）
const PLACEHOLDER_GRADIENTS = [
  'linear-gradient(135deg, #667eea, #764ba2)',
  'linear-gradient(135deg, #f093fb, #f5576c)',
  'linear-gradient(135deg, #4facfe, #00f2fe)',
  'linear-gradient(135deg, #43e97b, #38f9d7)',
  'linear-gradient(135deg, #fa709a, #fee140)',
  'linear-gradient(135deg, #a8edea, #fed6e3)',
]
function getPlaceholderGradient(index: number): string {
  return PLACEHOLDER_GRADIENTS[index % PLACEHOLDER_GRADIENTS.length] || 'linear-gradient(135deg, #667eea, #764ba2)'
}

onMounted(() => {
  loadMinorSections()

  // 检查是否需要启动引导
  if (shouldStartTour()) {
    const step = getCurrentStep()
    if (step >= TourStep.MINOR_SECTION_INTRO && step <= TourStep.MINOR_SECTION_CLICK) {
      waitForDataAndStartTour(step)
    }
  }
})

onUnmounted(() => {
  destroyDriver()
})

// 等待数据加载完成后启动引导
function waitForDataAndStartTour(step: number) {
  const checkInterval = setInterval(() => {
    if (!isLoading.value && minorSections.value.length > 0) {
      clearInterval(checkInterval)
      setTimeout(() => {
        startMinorSectionTour(step)
      }, 300)
    }
  }, 100)
  setTimeout(() => clearInterval(checkInterval), 5000)
}

// 启动小分区页面引导
function startMinorSectionTour(step: number) {
  switch (step) {
    case TourStep.MINOR_SECTION_INTRO:
      showSectionIntro()
      break
    case TourStep.MINOR_SECTION_FEEDBACK:
      showFeedbackTour()
      break
    case TourStep.MINOR_SECTION_CLICK:
      showClickTour()
      break
  }
}

// 步骤3：介绍小分区页面
function showSectionIntro() {
  highlightElement(
    '#tour-minor-section-grid',
    '选择小分区',
    '这里将显示该分类下的所有小分区，点击可以查看该分区内的评分项目。',
    {
      side: 'bottom',
      showButtons: ['next', 'close'],
      nextBtnText: '我知道了',
      onNextClick: () => {
        saveStep(TourStep.MINOR_SECTION_FEEDBACK)
        destroyDriver()
        nextTick(() => showFeedbackTour())
      },
    }
  )
}

// 步骤4：反馈提示
function showFeedbackTour() {
  highlightElement(
    '#tour-minor-feedback',
    '新建分区',
    '如果没找到想要的分区，可以点击这里发起添加请求。',
    {
      side: 'top',
      showButtons: ['next', 'close'],
      nextBtnText: '我知道了',
      onNextClick: () => {
        saveStep(TourStep.MINOR_SECTION_CLICK)
        destroyDriver()
        nextTick(() => showClickTour())
      },
    }
  )
}

// 步骤5：点击小分区
function showClickTour() {
  highlightElement(
    '#tour-first-minor-section',
    '查看评分项目',
    '点击选择小分区查看评分项目列表。',
    {
      side: 'bottom',
      showButtons: ['next', 'close'],
      nextBtnText: '查看项目',
      onNextClick: () => {
        saveStep(TourStep.RATING_LIST_INTRO)
        destroyDriver()
        // 点击第一个小分区
        if (minorSections.value.length > 0) {
          goToRatingItems(minorSections.value[0]!)
        }
      },
    }
  )
}
</script>

<template>
  <div class="page-container">
    <PageHeader />

    <main class="page-content">
      <div class="content-container">
        <!-- 桌面端标题 -->
        <h1 class="page-title desktop-only">选择小分区</h1>

        <!-- 加载状态 -->
        <div v-if="isLoading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>

        <!-- 空状态 -->
        <div v-else-if="minorSections.length === 0" class="empty-container">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="9" y1="21" x2="9" y2="9"></line>
            </svg>
          </div>
          <h2>暂无区域</h2>
          <p>该分区暂无可用区域</p>
        </div>

        <!-- 小分区网格 -->
        <div v-else id="tour-minor-section-grid" class="section-grid">
          <div
            v-for="(section, index) in minorSections"
            :key="section.id"
            :id="index === 0 ? 'tour-first-minor-section' : undefined"
            class="section-card"
            @click="goToRatingItems(section)"
          >
            <!-- 封面图 -->
            <div class="section-cover">
              <img
                v-if="section.url"
                :src="section.url"
                :alt="section.name"
                loading="lazy"
              />
              <div
                v-else
                class="section-placeholder"
                :style="{ background: getPlaceholderGradient(index) }"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="3" y1="9" x2="21" y2="9"></line>
                  <line x1="9" y1="21" x2="9" y2="9"></line>
                </svg>
              </div>
            </div>
            <!-- 信息 -->
            <div class="section-info">
              <h3 class="section-name">{{ section.name }}</h3>
              <p v-if="section.description" class="section-desc">{{ section.description }}</p>
            </div>
          </div>
        </div>

        <!-- 反馈提示 -->
        <div class="feedback-prompt" v-if="!isLoading">
          <button id="tour-minor-feedback" class="feedback-link" @click="openFeedbackDrawer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="16"></line>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
            没找到想要的分区？点我发起新建请求
          </button>
        </div>
      </div>
    </main>

    <PageFooter />

    <!-- 反馈抽屉 -->
    <FeedbackDrawer
      :is-open="isFeedbackOpen"
      :contribution-type="2"
      :target-type="2"
      :parent-id="majorId"
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
}

.content-container {
  max-width: 1200px;
  margin: 0 auto;
}

/* ===== Desktop Only Title ===== */
.page-title {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-lg);
}

.desktop-only {
  display: none;
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

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ===== Empty ===== */
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

/* ===== Section Grid ===== */
.section-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-sm);
}

.section-card {
  display: flex;
  flex-direction: column;
  background: var(--color-card);
  border-radius: var(--radius-lg);
  overflow: hidden;
  cursor: pointer;
  transition: all var(--transition-fast);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.section-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.section-card:active {
  transform: translateY(0);
}

.section-cover {
  position: relative;
  aspect-ratio: 16 / 10;
  overflow: hidden;
}

.section-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.section-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.section-placeholder svg {
  width: 36px;
  height: 36px;
  color: white;
  opacity: 0.8;
}

.section-info {
  flex: 1;
  padding: var(--spacing-sm);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.section-name {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.section-desc {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  .desktop-only {
    display: block;
  }

  .page-content {
    padding: var(--spacing-xl);
  }

  .section-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: var(--spacing-md);
  }

  .section-placeholder svg {
    width: 48px;
    height: 48px;
  }

  .section-info {
    padding: var(--spacing-md);
  }

  .section-name {
    font-size: var(--text-base);
  }

  .section-desc {
    font-size: var(--text-sm);
  }

  .feedback-prompt {
    margin-top: var(--spacing-xl);
  }
}
</style>
