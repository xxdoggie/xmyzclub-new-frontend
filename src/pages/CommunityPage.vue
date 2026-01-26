<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { useUserStore } from '@/stores/user'
import { useScoringTour } from '@/composables/useScoringTour'
import { getMajorSections, getRandomItems, getHotItems, getCollections } from '@/api/rating'
import type { MajorSection, RandomRatingItem, Collection } from '@/types/rating'
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'

const router = useRouter()
const toast = useToast()
const userStore = useUserStore()
const {
  shouldStartTour,
  getCurrentStep,
  TourStep,
  saveStep,
  highlightElement,
  showCenteredPopover,
  destroyDriver,
  completeTour,
} = useScoringTour()

// 固定学校ID
const SCHOOL_ID = 1

// 进入我的反馈
function goToMyContributions() {
  if (!userStore.isLoggedIn) {
    userStore.openLoginModal()
    return
  }
  router.push('/community/contributions')
}

// 状态
const isLoading = ref(true)
const majorSections = ref<MajorSection[]>([])
const hotItems = ref<RandomRatingItem[]>([])
const randomItems = ref<RandomRatingItem[]>([])
const collections = ref<Collection[]>([])
const isLoadingHot = ref(true)
const isLoadingRandom = ref(false)
const isLoadingCollections = ref(true)

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

// 加载合集列表
async function loadCollections() {
  isLoadingCollections.value = true
  try {
    const res = await getCollections()
    if (res.data.code === 200) {
      collections.value = res.data.data
    }
  } catch {
    // 静默失败
  } finally {
    isLoadingCollections.value = false
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

// 进入合集详情
function goToCollection(collection: Collection) {
  router.push(`/community/collection/${collection.id}`)
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
  return 'star'
}

onMounted(() => {
  loadMajorSections()
  loadHotItems()
  loadRandomItems()
  loadCollections()

  // 检查是否需要启动引导
  if (shouldStartTour()) {
    const step = getCurrentStep()
    if (step === TourStep.COMMUNITY_EXPLORE) {
      // 等待数据加载完成后启动引导
      waitForDataAndStartTour()
    } else if (step >= TourStep.COMMUNITY_HOT && step <= TourStep.COMMUNITY_FINAL) {
      // 从详情页返回后继续引导
      waitForDataAndContinueTour(step)
    }
  }
})

onUnmounted(() => {
  destroyDriver()
})

// 等待数据加载完成后启动引导（步骤2）
function waitForDataAndStartTour() {
  const checkInterval = setInterval(() => {
    if (!isLoading.value && majorSections.value.length > 0) {
      clearInterval(checkInterval)
      setTimeout(() => {
        startExploreTour()
      }, 300)
    }
  }, 100)
  // 5秒超时
  setTimeout(() => clearInterval(checkInterval), 5000)
}

// 等待数据加载完成后继续引导（步骤11-15）
function waitForDataAndContinueTour(step: number) {
  const checkInterval = setInterval(() => {
    if (!isLoading.value && !isLoadingHot.value && !isLoadingRandom.value) {
      clearInterval(checkInterval)
      setTimeout(() => {
        continueCommunityTour(step)
      }, 300)
    }
  }, 100)
  setTimeout(() => clearInterval(checkInterval), 5000)
}

// 启动探索分区引导（步骤2）
function startExploreTour() {
  highlightElement(
    '#tour-explore-section',
    '探索分区',
    '你可以在这里根据分类入口找到所有评分项目。',
    {
      side: 'bottom',
      showButtons: ['next', 'close'],
      nextBtnText: '选择分区',
      onNextClick: () => {
        saveStep(TourStep.MINOR_SECTION_INTRO)
        destroyDriver()
        // 点击第一个分区
        if (majorSections.value.length > 0) {
          goToMajorSection(majorSections.value[0]!)
        }
      },
    }
  )
}

// 继续社区引导（步骤11-15）
function continueCommunityTour(step: number) {
  switch (step) {
    case TourStep.COMMUNITY_HOT:
      showHotSectionTour()
      break
    case TourStep.COMMUNITY_RANDOM:
      showRandomSectionTour()
      break
    case TourStep.COMMUNITY_REFRESH:
      showRefreshBtnTour()
      break
    case TourStep.COMMUNITY_COLLECTION:
      showCollectionSectionTour()
      break
    case TourStep.COMMUNITY_FINAL:
      showFinalTour()
      break
  }
}

// 步骤11：热门评分
function showHotSectionTour() {
  // 先滚动到底部
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
  setTimeout(() => {
    highlightElement(
      '#tour-hot-section',
      '热门评分',
      '这里可以看到评分人数最多的评分项目。',
      {
        side: 'top',
        showButtons: ['next', 'close'],
        onNextClick: () => {
          saveStep(TourStep.COMMUNITY_RANDOM)
          destroyDriver()
          nextTick(() => showRandomSectionTour())
        },
      }
    )
  }, 500)
}

// 步骤12：随机发现
function showRandomSectionTour() {
  highlightElement(
    '#tour-random-section',
    '随机发现',
    '这里会随机刷新一些评分项目，帮助你发现更多有趣的内容。',
    {
      side: 'top',
      showButtons: ['next', 'close'],
      onNextClick: () => {
        saveStep(TourStep.COMMUNITY_REFRESH)
        destroyDriver()
        nextTick(() => showRefreshBtnTour())
      },
    }
  )
}

// 步骤13：换一批按钮
function showRefreshBtnTour() {
  highlightElement(
    '#tour-refresh-btn',
    '换一批',
    '你也可以点击它来刷新随机推荐的内容。',
    {
      side: 'left',
      showButtons: ['next', 'close'],
      onNextClick: () => {
        saveStep(TourStep.COMMUNITY_COLLECTION)
        destroyDriver()
        nextTick(() => showCollectionSectionTour())
      },
    }
  )
}

// 步骤14：精选合集
function showCollectionSectionTour() {
  if (collections.value.length === 0) {
    // 如果没有合集，直接跳到最后
    saveStep(TourStep.COMMUNITY_FINAL)
    showFinalTour()
    return
  }
  highlightElement(
    '#tour-collection-section',
    '精选合集',
    '这里有部分热门项目的合集，从这里进入能更快找到你想要的内容。',
    {
      side: 'top',
      showButtons: ['next', 'close'],
      onNextClick: () => {
        saveStep(TourStep.COMMUNITY_FINAL)
        destroyDriver()
        nextTick(() => showFinalTour())
      },
    }
  )
}

// 步骤15：最终欢迎语
function showFinalTour() {
  // 滚动回顶部
  window.scrollTo({ top: 0, behavior: 'smooth' })
  setTimeout(() => {
    showCenteredPopover(
      '欢迎来到评分社区',
      `<p style="margin-bottom: 12px;">我们希望你能够尽可能真实客观地进行评分，共同维护评分社区的良好氛围！</p><p style="font-family: 'Georgia', serif; font-style: italic; color: var(--color-text-secondary); font-size: 0.9em;">—— 2023届玄学狗狗倾情设计</p>`,
      {
        showButtons: ['next'],
        doneBtnText: '开始探索',
        onNextClick: () => {
          completeTour()
          destroyDriver()
        },
      }
    )
  }, 500)
}
</script>

<template>
  <div class="page-container">
    <PageHeader back-to="/" />

    <main class="page-content">
      <!-- Hero Banner -->
      <div class="hero-banner">
        <div class="hero-bg"></div>
        <div class="hero-content">
          <h1 class="hero-title">发现 · 评价 · 分享</h1>
          <p class="hero-subtitle desktop-only">和同学们一起探索校园的每一个角落</p>
          <!-- 我的反馈入口（仅桌面端显示） -->
          <button class="my-contributions-btn desktop-only" @click="goToMyContributions">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"></path>
              <rect x="9" y="3" width="6" height="4" rx="1"></rect>
              <path d="M9 12h6M9 16h6"></path>
            </svg>
            我的反馈
          </button>
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

      <!-- 分区入口 -->
      <div id="tour-explore-section" class="content-card">
        <div class="card-header">
          <h2 class="card-header-title">探索分区</h2>
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
            :id="index === 0 ? 'tour-first-major-section' : undefined"
            class="section-item"
            :class="`section-item-${(index % 4) + 1}`"
            @click="goToMajorSection(section)"
          >
            <div class="section-icon">
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
            <span class="section-name">{{ section.name }}</span>
          </div>
        </div>
      </div>

      <!-- 热门评分 -->
      <div id="tour-hot-section" class="content-card">
        <div class="card-header">
          <h2 class="card-header-title">
            <svg class="title-icon hot" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 23c-4.97 0-9-3.58-9-8 0-1.95.7-3.76 1.86-5.14A7.5 7.5 0 0 1 9 5c0 .91.2 1.76.56 2.53.49 1.03 1.24 1.91 2.19 2.55A6.18 6.18 0 0 0 12 5.5a5.87 5.87 0 0 1 5.14 3A9.03 9.03 0 0 1 21 15c0 4.42-4.03 8-9 8z"></path>
            </svg>
            热门评分
          </h2>
        </div>

        <!-- 热门加载状态 -->
        <div v-if="isLoadingHot" class="item-scroll">
          <div v-for="i in 4" :key="i" class="item-skeleton">
            <div class="skeleton-cover"></div>
            <div class="skeleton-info">
              <div class="skeleton-title"></div>
              <div class="skeleton-meta"></div>
            </div>
          </div>
        </div>

        <!-- 热门列表 -->
        <div v-else-if="hotItems.length > 0" class="item-scroll">
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
                <span class="stat-item">{{ item.ratingCount }} 人评分</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else class="empty-state small">
          <p>暂无热门评分</p>
        </div>
      </div>

      <!-- 随机推荐 -->
      <div id="tour-random-section" class="content-card">
        <div class="card-header">
          <h2 class="card-header-title">
            <svg class="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <circle cx="15.5" cy="8.5" r="1.5"></circle>
              <circle cx="15.5" cy="15.5" r="1.5"></circle>
              <circle cx="8.5" cy="15.5" r="1.5"></circle>
            </svg>
            随机发现
          </h2>
          <button id="tour-refresh-btn" class="refresh-btn" :disabled="isLoadingRandom" @click="refreshRandom">
            <svg :class="{ spinning: isLoadingRandom }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"></polyline>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
            </svg>
            <span>换一批</span>
          </button>
        </div>

        <!-- 推荐加载状态 -->
        <div v-if="isLoadingRandom && randomItems.length === 0" class="item-scroll">
          <div v-for="i in 4" :key="i" class="item-skeleton">
            <div class="skeleton-cover"></div>
            <div class="skeleton-info">
              <div class="skeleton-title"></div>
              <div class="skeleton-meta"></div>
            </div>
          </div>
        </div>

        <!-- 推荐列表 -->
        <div v-else-if="randomItems.length > 0" class="item-scroll">
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
              <!-- 统计 -->
              <div class="item-stats">
                <span class="stat-item">{{ item.ratingCount }} 人评分</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else class="empty-state small">
          <p>暂无推荐</p>
        </div>
      </div>

      <!-- 精选合集 -->
      <div id="tour-collection-section" class="content-card" v-if="isLoadingCollections || collections.length > 0">
        <div class="card-header">
          <h2 class="card-header-title">
            <svg class="title-icon collection" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
            </svg>
            精选合集
          </h2>
        </div>

        <!-- 合集加载状态 -->
        <div v-if="isLoadingCollections" class="item-scroll">
          <div v-for="i in 4" :key="i" class="collection-skeleton">
            <div class="skeleton-cover"></div>
            <div class="skeleton-info">
              <div class="skeleton-title"></div>
              <div class="skeleton-meta"></div>
            </div>
          </div>
        </div>

        <!-- 合集列表 -->
        <div v-else-if="collections.length > 0" class="item-scroll">
          <div
            v-for="collection in collections"
            :key="collection.id"
            class="collection-card"
            @click="goToCollection(collection)"
          >
            <!-- 封面图 -->
            <div class="collection-cover">
              <img
                v-if="collection.coverUrl"
                :src="collection.coverUrl"
                :alt="collection.name"
                loading="lazy"
              />
              <div v-else class="cover-placeholder collection-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                </svg>
              </div>
              <!-- 项目数量标签 -->
              <div class="count-badge">
                <span>{{ collection.itemCount }} 项</span>
              </div>
            </div>
            <!-- 信息区 -->
            <div class="item-info">
              <h3 class="item-name">{{ collection.name }}</h3>
              <p class="item-breadcrumb" v-if="collection.description">{{ collection.description }}</p>
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
  padding: var(--spacing-md);
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}

/* ===== Hero Banner ===== */
.hero-banner {
  position: relative;
  border-radius: var(--radius-lg);
  overflow: hidden;
  margin-bottom: var(--spacing-lg);
  padding: var(--spacing-lg);
}

.hero-bg {
  position: absolute;
  inset: 0;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.hero-content {
  position: relative;
  z-index: 1;
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

/* 仅桌面端显示 */
.desktop-only {
  display: none;
}

.my-contributions-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  margin-top: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.my-contributions-btn:hover {
  color: var(--color-primary);
  border-color: var(--color-primary);
  background: var(--color-primary-bg);
}

.my-contributions-btn svg {
  width: 14px;
  height: 14px;
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

/* ===== Content Card ===== */
.content-card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  margin-bottom: var(--spacing-md);
  overflow: hidden;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
}

.card-header-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
}

.card-header-title .title-icon {
  width: 16px;
  height: 16px;
  color: var(--color-primary);
}

.card-header-title .title-icon.hot {
  color: #FF6B6B;
}

/* ===== Section Grid (分区卡片) ===== */
.section-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-xs);
  padding: var(--spacing-sm);
}

.section-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--spacing-sm);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-normal);
}

.section-item:hover {
  background: var(--color-bg-hover);
}

.section-item:active {
  transform: scale(0.96);
}

/* 分区颜色主题 */
.section-item-1 { --item-color: #FF6B6B; --item-bg: rgba(255, 107, 107, 0.1); }
.section-item-2 { --item-color: #4ECDC4; --item-bg: rgba(78, 205, 196, 0.1); }
.section-item-3 { --item-color: #A29BFE; --item-bg: rgba(162, 155, 254, 0.1); }
.section-item-4 { --item-color: #FDCB6E; --item-bg: rgba(253, 203, 110, 0.1); }

.section-icon {
  width: 36px;
  height: 36px;
  background: var(--item-bg);
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
  color: var(--item-color);
}

.section-icon svg {
  width: 18px;
  height: 18px;
}

.section-name {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-text);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
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

/* ===== Item Horizontal Scroll ===== */
.item-scroll {
  display: flex;
  gap: var(--spacing-sm);
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  padding: var(--spacing-sm);
  padding-right: var(--spacing-md);
}

.item-scroll::before {
  content: '';
  flex: 0 0 calc(var(--spacing-md) - var(--spacing-sm));
  scroll-snap-align: start;
}

.item-scroll::-webkit-scrollbar {
  display: none;
}

.item-scroll {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.item-skeleton {
  flex: 0 0 auto;
  width: 120px;
  background: var(--color-bg);
  border-radius: var(--radius-md);
  overflow: hidden;
  scroll-snap-align: start;
}

.item-skeleton .skeleton-cover {
  aspect-ratio: 1 / 1;
  background: var(--color-border);
  animation: pulse 1.5s ease-in-out infinite;
}

.item-skeleton .skeleton-info {
  padding: var(--spacing-xs);
}

.item-skeleton .skeleton-title {
  height: 12px;
  background: var(--color-border);
  border-radius: var(--radius-sm);
  margin-bottom: var(--spacing-xs);
  animation: pulse 1.5s ease-in-out infinite;
}

.item-skeleton .skeleton-meta {
  height: 10px;
  width: 60%;
  background: var(--color-border);
  border-radius: var(--radius-sm);
  animation: pulse 1.5s ease-in-out infinite;
}

.item-card {
  flex: 0 0 auto;
  width: 120px;
  background: var(--color-bg);
  border-radius: var(--radius-md);
  overflow: hidden;
  cursor: pointer;
  transition: all var(--transition-normal);
  scroll-snap-align: start;
}

.item-card:active {
  transform: scale(0.96);
}

/* 封面 */
.item-cover {
  position: relative;
  aspect-ratio: 1 / 1;
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
  padding: var(--spacing-xs);
}

.item-name {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-breadcrumb {
  font-size: 10px;
  color: var(--color-text-secondary);
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-stats {
  display: flex;
  align-items: center;
}

.item-stats .stat-item {
  font-size: 10px;
  color: var(--color-text-placeholder);
}

/* ===== Collection Card ===== */
.card-header-title .title-icon.collection {
  color: #6366F1;
}

.collection-card,
.collection-skeleton {
  flex: 0 0 auto;
  width: 120px;
  background: var(--color-bg);
  border-radius: var(--radius-md);
  overflow: hidden;
  cursor: pointer;
  transition: all var(--transition-normal);
  scroll-snap-align: start;
}

.collection-card:active {
  transform: scale(0.96);
}

.collection-cover {
  position: relative;
  aspect-ratio: 16 / 9;
  background: var(--color-bg);
  overflow: hidden;
}

.collection-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.collection-placeholder {
  background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
}

:root.dark .collection-placeholder {
  background: linear-gradient(135deg, #312e81 0%, #3730a3 100%);
}

.collection-placeholder svg {
  color: #6366F1;
}

.count-badge {
  position: absolute;
  bottom: var(--spacing-xs);
  right: var(--spacing-xs);
  padding: 2px 6px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  border-radius: var(--radius-sm);
  font-size: 10px;
  font-weight: var(--font-medium);
  color: white;
}

.collection-skeleton .skeleton-cover {
  aspect-ratio: 16 / 9;
  background: var(--color-border);
  animation: pulse 1.5s ease-in-out infinite;
}

.collection-skeleton .skeleton-info {
  padding: var(--spacing-xs);
}

.collection-skeleton .skeleton-title {
  height: 12px;
  background: var(--color-border);
  border-radius: var(--radius-sm);
  margin-bottom: var(--spacing-xs);
  animation: pulse 1.5s ease-in-out infinite;
}

.collection-skeleton .skeleton-meta {
  height: 10px;
  width: 60%;
  background: var(--color-border);
  border-radius: var(--radius-sm);
  animation: pulse 1.5s ease-in-out infinite;
}

/* ===== Desktop ===== */
@media (min-width: 640px) {
  .desktop-only {
    display: block;
  }

  .my-contributions-btn.desktop-only {
    display: inline-flex;
  }

  .page-content {
    padding: var(--spacing-lg);
  }

  .hero-banner {
    padding: var(--spacing-xl);
  }

  .hero-title {
    font-size: var(--text-xl);
  }

  .float-icon {
    width: 24px;
    height: 24px;
  }

  .card-header {
    padding: var(--spacing-md);
  }

  .card-header-title {
    font-size: var(--text-base);
  }

  .section-grid {
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
  }

  .section-icon {
    width: 44px;
    height: 44px;
  }

  .section-icon svg {
    width: 22px;
    height: 22px;
  }

  .section-name {
    font-size: var(--text-sm);
  }

  .item-scroll {
    padding: var(--spacing-md);
    gap: var(--spacing-md);
  }

  .item-card,
  .item-skeleton,
  .collection-card,
  .collection-skeleton {
    width: 140px;
  }

  .item-name {
    font-size: var(--text-sm);
  }

  .item-breadcrumb,
  .item-stats .stat-item {
    font-size: var(--text-xs);
  }
}

@media (min-width: 768px) {
  .page-content {
    max-width: 900px;
  }

  .item-card,
  .item-skeleton,
  .collection-card,
  .collection-skeleton {
    width: 160px;
  }
}
</style>
