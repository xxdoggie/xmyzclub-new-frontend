<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { useUserStore } from '@/stores/user'
import { useScoringTour } from '@/composables/useScoringTour'
import { getCategories, getRandomItems, getHotItems, getCollections } from '@/api/rating'
import type { Category, RandomRatingItem, Collection } from '@/types/rating'
import { getBreadcrumbDisplayName } from '@/types/rating'
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
  forceStartTour,
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

// 手动开始引导
function startGuidedTour() {
  // 强制从社区探索步骤开始（因为已经在社区主页了）
  forceStartTour(TourStep.COMMUNITY_EXPLORE)
  waitForDataAndStartTour()
}

// 状态
const isLoading = ref(true)
const categories = ref<Category[]>([])
const hotItems = ref<RandomRatingItem[]>([])
const randomItems = ref<RandomRatingItem[]>([])
const collections = ref<Collection[]>([])
const isLoadingHot = ref(true)
const isLoadingRandom = ref(false)
const isLoadingCollections = ref(true)

// 加载顶级分类列表
async function loadCategories() {
  isLoading.value = true
  try {
    const res = await getCategories(SCHOOL_ID)
    if (res.data.code === 200) {
      categories.value = res.data.data
    } else {
      toast.error(res.data.message || '获取分类列表失败')
    }
  } catch {
    toast.error('获取分类列表失败')
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

// 进入分类
function goToCategory(category: Category) {
  router.push(`/community/category/${category.id}`)
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
  loadCategories()
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
    if (!isLoading.value && categories.value.length > 0) {
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
      nextBtnText: '选择分区',
      onNextClick: () => {
        saveStep(TourStep.MINOR_SECTION_INTRO)
        destroyDriver()
        // 点击第一个分类
        if (categories.value.length > 0) {
          goToCategory(categories.value[0]!)
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
      <!-- 顶部操作区 -->
      <div class="top-section">
        <!-- 搜索框 -->
        <div class="search-box" @click="$router.push('/community/search')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <span>搜索食堂、建筑、课程...</span>
        </div>

        <!-- 快捷操作 -->
        <div class="quick-actions">
          <button class="quick-action-btn" @click="goToMyContributions">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"></path>
              <rect x="9" y="3" width="6" height="4" rx="1"></rect>
            </svg>
          </button>
          <button class="quick-action-btn" @click="startGuidedTour">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 16v-4"></path>
              <path d="M12 8h.01"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- 分类胶囊 -->
      <div id="tour-explore-section" class="category-pills">
        <!-- 加载状态 -->
        <template v-if="isLoading">
          <div v-for="i in 4" :key="i" class="category-pill-skeleton"></div>
        </template>

        <!-- 分类列表 -->
        <template v-else>
          <button
            v-for="(category, index) in categories"
            :key="category.id"
            :id="index === 0 ? 'tour-first-category' : undefined"
            class="category-pill"
            :class="`category-pill-${(index % 4) + 1}`"
            @click="goToCategory(category)"
          >
            <!-- 餐厅图标 -->
            <svg v-if="getSectionIcon(category.name) === 'utensils'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"></path>
              <path d="M7 2v20"></path>
              <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"></path>
            </svg>
            <!-- 建筑图标 -->
            <svg v-else-if="getSectionIcon(category.name) === 'building'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
              <path d="M9 22v-4h6v4"></path>
              <path d="M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01"></path>
            </svg>
            <!-- 考试图标 -->
            <svg v-else-if="getSectionIcon(category.name) === 'clipboard'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
              <path d="M9 12h6M9 16h6"></path>
            </svg>
            <!-- 活动图标 -->
            <svg v-else-if="getSectionIcon(category.name) === 'users'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <!-- 默认星星图标 -->
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            <span>{{ category.name }}</span>
          </button>
        </template>
      </div>

      <!-- 热门评分 -->
      <div id="tour-hot-section" class="content-card hot-section">
        <div class="card-header">
          <h2 class="card-header-title">
            <svg class="title-icon hot" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 23c-4.97 0-9-3.58-9-8 0-1.95.7-3.76 1.86-5.14A7.5 7.5 0 0 1 9 5c0 .91.2 1.76.56 2.53.49 1.03 1.24 1.91 2.19 2.55A6.18 6.18 0 0 0 12 5.5a5.87 5.87 0 0 1 5.14 3A9.03 9.03 0 0 1 21 15c0 4.42-4.03 8-9 8z"></path>
            </svg>
            热门评分
          </h2>
          <span v-if="hotItems.length > 0" class="header-stat">{{ hotItems.reduce((sum, item) => sum + item.ratingCount, 0).toLocaleString() }}+ 评价</span>
        </div>

        <!-- 加载状态 -->
        <template v-if="isLoadingHot">
          <div class="hot-top-skeleton">
            <div v-for="i in 3" :key="i" class="hot-card-skeleton">
              <div class="skeleton-cover-sm"></div>
              <div class="skeleton-content">
                <div class="skeleton-line w60"></div>
                <div class="skeleton-line w40"></div>
                <div class="skeleton-line w80"></div>
              </div>
            </div>
          </div>
        </template>

        <!-- 热门列表 -->
        <template v-else-if="hotItems.length > 0">
          <!-- Top 3 大卡片 -->
          <div class="hot-top-list">
            <div
              v-for="(item, index) in hotItems.slice(0, 3)"
              :key="item.id"
              class="hot-card"
              @click="goToRatingItem(item)"
            >
              <div class="hot-card-rank" :class="`rank-${index + 1}`">{{ index + 1 }}</div>
              <div class="hot-card-cover">
                <img v-if="item.url" :src="item.url" :alt="item.name" loading="lazy" />
                <div v-else class="cover-placeholder-mini">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                </div>
              </div>
              <div class="hot-card-info">
                <h3 class="hot-card-name">{{ item.name }}</h3>
                <div class="hot-card-rating">
                  <div class="stars-display">
                    <svg v-for="star in 5" :key="star" viewBox="0 0 24 24" :class="{ filled: star <= Math.round(item.averageScore / 2) }">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                  </div>
                  <span class="score-text">{{ formatScore(item.averageScore) }}</span>
                  <span class="rating-count">{{ item.ratingCount }}人评分</span>
                </div>
                <div v-if="item.topComment" class="hot-card-comment">
                  <span class="comment-text">"{{ item.topComment.commentText }}"</span>
                </div>
                <div v-else class="hot-card-comment empty">
                  <span class="comment-text">"快来抢沙发吧！"</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 更多热门（横向滚动） -->
          <div v-if="hotItems.length > 3" class="hot-more">
            <div class="hot-more-header">
              <span class="hot-more-label">更多热门</span>
            </div>
            <div class="hot-scroll">
              <div
                v-for="(item, index) in hotItems.slice(3)"
                :key="item.id"
                class="hot-scroll-card"
                @click="goToRatingItem(item)"
              >
                <div class="hot-scroll-cover">
                  <img v-if="item.url" :src="item.url" :alt="item.name" loading="lazy" />
                  <div v-else class="cover-placeholder-mini">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                  </div>
                  <div class="scroll-score-badge">{{ formatScore(item.averageScore) }}</div>
                </div>
                <div class="hot-scroll-info">
                  <h4 class="hot-scroll-name">{{ item.name }}</h4>
                  <span class="hot-scroll-count">{{ item.ratingCount }}人评分</span>
                </div>
              </div>
            </div>
          </div>
        </template>

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
              <p class="item-breadcrumb">{{ getBreadcrumbDisplayName(item.breadcrumb) }}</p>
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

/* ===== Top Section ===== */
.top-section {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.search-box:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-bg);
}

.search-box:active {
  transform: scale(0.99);
}

.search-box svg {
  width: 18px;
  height: 18px;
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.search-box span {
  font-size: var(--text-sm);
  color: var(--color-text-placeholder);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.quick-actions {
  display: flex;
  gap: var(--spacing-xs);
}

.quick-action-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.quick-action-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-primary-bg);
}

.quick-action-btn:active {
  transform: scale(0.95);
}

.quick-action-btn svg {
  width: 18px;
  height: 18px;
  color: var(--color-text-secondary);
}

.quick-action-btn:hover svg {
  color: var(--color-primary);
}

/* ===== Category Pills ===== */
.category-pills {
  display: flex;
  gap: var(--spacing-xs);
  overflow-x: auto;
  padding-bottom: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.category-pills::-webkit-scrollbar {
  display: none;
}

.category-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-text);
  white-space: nowrap;
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.category-pill:hover {
  border-color: var(--pill-color, var(--color-primary));
  background: var(--pill-bg, var(--color-primary-bg));
  color: var(--pill-color, var(--color-primary));
}

.category-pill:active {
  transform: scale(0.96);
}

.category-pill svg {
  width: 14px;
  height: 14px;
  color: var(--pill-color, var(--color-text-secondary));
}

/* 胶囊颜色主题 */
.category-pill-1 { --pill-color: #FF6B6B; --pill-bg: rgba(255, 107, 107, 0.1); }
.category-pill-2 { --pill-color: #4ECDC4; --pill-bg: rgba(78, 205, 196, 0.1); }
.category-pill-3 { --pill-color: #A29BFE; --pill-bg: rgba(162, 155, 254, 0.1); }
.category-pill-4 { --pill-color: #FDCB6E; --pill-bg: rgba(253, 203, 110, 0.1); }

.category-pill-skeleton {
  width: 80px;
  height: 32px;
  background: var(--color-border);
  border-radius: var(--radius-full);
  flex-shrink: 0;
  animation: pulse 1.5s ease-in-out infinite;
}

/* ===== Hot Section ===== */
.hot-section.content-card {
  overflow: visible;
}

.header-stat {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

/* Hot Top List (Top 3) */
.hot-top-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm);
}

.hot-card {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  background: var(--color-bg);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  position: relative;
}

.hot-card:hover {
  background: var(--color-bg-hover);
}

.hot-card:active {
  transform: scale(0.995);
}

.hot-card-rank {
  position: absolute;
  top: -4px;
  left: -4px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: var(--font-bold);
  color: white;
  border-radius: var(--radius-sm);
  z-index: 1;
}

.hot-card-rank.rank-1 { background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); }
.hot-card-rank.rank-2 { background: linear-gradient(135deg, #C0C0C0 0%, #A0A0A0 100%); }
.hot-card-rank.rank-3 { background: linear-gradient(135deg, #CD7F32 0%, #B8860B 100%); }

.hot-card-cover {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-md);
  overflow: hidden;
  flex-shrink: 0;
}

.hot-card-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder-mini {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f0f4ff 0%, #e8eeff 100%);
}

:root.dark .cover-placeholder-mini {
  background: linear-gradient(135deg, #1e2538 0%, #252d40 100%);
}

.cover-placeholder-mini svg {
  width: 20px;
  height: 20px;
  color: var(--color-primary);
  opacity: 0.5;
}

.hot-card-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.hot-card-name {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hot-card-rating {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.stars-display {
  display: flex;
  gap: 1px;
}

.stars-display svg {
  width: 12px;
  height: 12px;
  fill: var(--color-border);
  stroke: none;
}

.stars-display svg.filled {
  fill: var(--color-warning);
}

.score-text {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--color-accent);
}

.rating-count {
  font-size: 11px;
  color: var(--color-text-placeholder);
}

.hot-card-comment {
  margin-top: 2px;
}

.hot-card-comment .comment-text {
  font-size: 11px;
  color: var(--color-text-secondary);
  font-style: italic;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.hot-card-comment.empty .comment-text {
  color: var(--color-text-placeholder);
}

/* Hot More (Horizontal Scroll) */
.hot-more {
  padding: 0 var(--spacing-sm) var(--spacing-sm);
  border-top: 1px solid var(--color-border);
  margin-top: var(--spacing-xs);
  padding-top: var(--spacing-sm);
}

.hot-more-header {
  margin-bottom: var(--spacing-xs);
}

.hot-more-label {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.hot-scroll {
  display: flex;
  gap: var(--spacing-sm);
  overflow-x: auto;
  padding-bottom: var(--spacing-xs);
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.hot-scroll::-webkit-scrollbar {
  display: none;
}

.hot-scroll-card {
  flex-shrink: 0;
  width: 100px;
  cursor: pointer;
  transition: transform var(--transition-fast);
}

.hot-scroll-card:hover {
  transform: translateY(-2px);
}

.hot-scroll-card:active {
  transform: scale(0.98);
}

.hot-scroll-cover {
  width: 100px;
  height: 100px;
  border-radius: var(--radius-md);
  overflow: hidden;
  position: relative;
  margin-bottom: var(--spacing-xs);
}

.hot-scroll-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.scroll-score-badge {
  position: absolute;
  bottom: 4px;
  right: 4px;
  padding: 2px 6px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  border-radius: var(--radius-sm);
  font-size: 11px;
  font-weight: var(--font-semibold);
  color: var(--color-warning);
}

.hot-scroll-info {
  text-align: center;
}

.hot-scroll-name {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
}

.hot-scroll-count {
  font-size: 10px;
  color: var(--color-text-placeholder);
}

/* Hot Skeleton */
.hot-top-skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm);
}

.hot-card-skeleton {
  display: flex;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  background: var(--color-bg);
  border-radius: var(--radius-md);
}

.skeleton-cover-sm {
  width: 52px;
  height: 52px;
  background: var(--color-border);
  border-radius: var(--radius-md);
  flex-shrink: 0;
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.skeleton-line {
  height: 12px;
  background: var(--color-border);
  border-radius: var(--radius-sm);
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-line.w60 { width: 60%; }
.skeleton-line.w40 { width: 40%; }
.skeleton-line.w80 { width: 80%; }

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
  .page-content {
    padding: var(--spacing-lg);
  }

  .search-box {
    padding: var(--spacing-sm) var(--spacing-lg);
  }

  .search-box span {
    font-size: var(--text-base);
  }

  .quick-action-btn {
    width: 44px;
    height: 44px;
  }

  .category-pill {
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: var(--text-sm);
  }

  .category-pill svg {
    width: 16px;
    height: 16px;
  }

  /* Hot section desktop styles */
  .hot-top-list {
    padding: var(--spacing-md);
  }

  .hot-more {
    padding: 0 var(--spacing-md) var(--spacing-md);
    padding-top: var(--spacing-sm);
  }

  .hot-card {
    padding: var(--spacing-md);
  }

  .hot-card-cover {
    width: 60px;
    height: 60px;
  }

  .hot-card-name {
    font-size: var(--text-base);
  }

  .hot-card-rank {
    width: 22px;
    height: 22px;
    font-size: 12px;
  }

  .stars-display svg {
    width: 14px;
    height: 14px;
  }

  .score-text {
    font-size: var(--text-sm);
  }

  .hot-card-comment .comment-text {
    font-size: var(--text-xs);
  }

  .hot-scroll-card {
    width: 120px;
  }

  .hot-scroll-cover {
    width: 120px;
    height: 120px;
  }

  .hot-scroll-name {
    font-size: var(--text-sm);
  }

  .card-header {
    padding: var(--spacing-md);
  }

  .card-header-title {
    font-size: var(--text-base);
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

  .hot-card-cover {
    width: 68px;
    height: 68px;
  }

  .hot-scroll-card {
    width: 140px;
  }

  .hot-scroll-cover {
    width: 140px;
    height: 140px;
  }

  .item-card,
  .item-skeleton,
  .collection-card,
  .collection-skeleton {
    width: 160px;
  }
}
</style>
