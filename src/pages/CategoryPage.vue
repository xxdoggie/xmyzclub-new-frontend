<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { useUserStore } from '@/stores/user'
import { useScoringTour } from '@/composables/useScoringTour'
import { getCategoryDetail, submitRating } from '@/api/rating'
import type { CategoryDetail, Category, RatingItem } from '@/types/rating'
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
  isInStarRatingTour,
} = useScoringTour()

// 获取路由参数
const categoryId = computed(() => Number(route.params.categoryId))

// 状态
const isLoading = ref(true)
const categoryDetail = ref<CategoryDetail | null>(null)

// 反馈抽屉状态
const isFeedbackOpen = ref(false)
const feedbackTargetType = ref<1 | 2>(1) // 1: 分类, 2: 评分项目

// FAB 状态
const isFabExpanded = ref(false)

// 筛选相关（用于评分项目列表模式）
const currentFilter = ref<'hot' | 'high' | 'low'>('hot')
const filters = [
  { label: '热门', value: 'hot' as const },
  { label: '高分', value: 'high' as const },
  { label: '低分', value: 'low' as const },
]

// 视图模式
const viewMode = ref<'list' | 'grid'>('list')

// 星星悬停状态
const hoverStars = ref<Record<number, number>>({})

// 判断当前是显示子分类还是评分项目
const showChildren = computed(() => categoryDetail.value?.hasChildren ?? false)

// 子分类列表
const children = computed(() => categoryDetail.value?.children ?? [])

// 评分项目列表（筛选后）
const filteredItems = computed(() => {
  const items = [...(categoryDetail.value?.ratingItems ?? [])]
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

// 面包屑导航
const breadcrumbs = computed(() => {
  if (!categoryDetail.value?.breadcrumb) return []
  const bc = categoryDetail.value.breadcrumb
  const items = [
    { id: 0, name: bc.school.name, path: '/community' },
    ...bc.ancestors.map((a) => ({
      id: a.id,
      name: a.name,
      path: `/community/category/${a.id}`,
    })),
    { id: bc.current.id, name: bc.current.name, path: '' },
  ]
  return items
})

// 学校 ID（用于新建分类时）
const schoolId = computed(() => categoryDetail.value?.breadcrumb?.school?.id ?? null)

// 父级路径（用于新建时显示完整层级）
const parentPath = computed(() => {
  if (!categoryDetail.value?.breadcrumb) return ''
  const bc = categoryDetail.value.breadcrumb
  const parts = [
    bc.school.name,
    ...bc.ancestors.map((a) => a.name),
    bc.current.name,
  ]
  return parts.join(' > ')
})

function openFeedbackDrawer(targetType: 1 | 2) {
  if (!userStore.isLoggedIn) {
    userStore.openLoginModal()
    return
  }
  feedbackTargetType.value = targetType
  isFabExpanded.value = false
  isFeedbackOpen.value = true
}

function closeFeedbackDrawer() {
  isFeedbackOpen.value = false
}

function toggleFab() {
  isFabExpanded.value = !isFabExpanded.value
}

function closeFab() {
  isFabExpanded.value = false
}

function handleFeedbackSuccess() {
  // 可以在这里做额外处理
}

// 加载分类详情
async function loadCategoryDetail() {
  isLoading.value = true
  try {
    const res = await getCategoryDetail(categoryId.value)
    if (res.data.code === 200) {
      categoryDetail.value = res.data.data
    } else {
      toast.error(res.data.message || '获取分类详情失败')
    }
  } catch {
    toast.error('获取分类详情失败')
  } finally {
    isLoading.value = false
  }
}

// 进入子分类
function goToCategory(category: Category) {
  router.push(`/community/category/${category.id}`)
}

// 进入评分详情
function goToDetail(itemId: number) {
  router.push(`/community/item/${itemId}`)
}

// 切换筛选
function handleFilterChange(filter: 'hot' | 'high' | 'low') {
  currentFilter.value = filter
}

// 星星悬停处理
function handleStarHover(itemId: number, star: number) {
  hoverStars.value[itemId] = star
}

function handleStarLeave(itemId: number) {
  hoverStars.value[itemId] = 0
}

function getDisplayStars(item: RatingItem): number {
  if (hoverStars.value[item.id]) {
    return hoverStars.value[item.id] ?? 0
  }
  return item.myStars || 0
}

// 星星评分点击
async function handleStarClick(item: RatingItem, star: number, event: Event) {
  event.stopPropagation()

  // 在引导模式下，只做视觉反馈，不触发登录和实际评分
  if (isInStarRatingTour()) {
    item.myStars = star
    item.myScore = star * 2
    return
  }

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

// 占位渐变色
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

// 监听路由参数变化，重新加载数据
watch(
  () => route.params.categoryId,
  (newId) => {
    if (newId) {
      loadCategoryDetail()
    }
  }
)

onMounted(() => {
  loadCategoryDetail()

  // 检查是否需要启动引导
  if (shouldStartTour()) {
    const step = getCurrentStep()
    if (step >= TourStep.MINOR_SECTION_INTRO && step <= TourStep.MINOR_SECTION_CLICK) {
      waitForDataAndStartTour(step)
    } else if (step >= TourStep.RATING_LIST_INTRO && step <= TourStep.RATING_ITEM_STARS) {
      waitForDataAndStartRatingTour(step)
    }
  }
})

onUnmounted(() => {
  destroyDriver()
})

// 等待数据加载完成后启动引导（子分类模式）
function waitForDataAndStartTour(step: number) {
  const checkInterval = setInterval(() => {
    if (!isLoading.value && categoryDetail.value && showChildren.value && children.value.length > 0) {
      clearInterval(checkInterval)
      setTimeout(() => {
        startMinorSectionTour(step)
      }, 300)
    }
  }, 100)
  setTimeout(() => clearInterval(checkInterval), 5000)
}

// 等待数据加载完成后启动引导（评分项目模式）
function waitForDataAndStartRatingTour(step: number) {
  const checkInterval = setInterval(() => {
    if (!isLoading.value && categoryDetail.value && !showChildren.value && filteredItems.value.length > 0) {
      clearInterval(checkInterval)
      setTimeout(() => {
        startRatingItemsTour(step)
      }, 300)
    }
  }, 100)
  setTimeout(() => clearInterval(checkInterval), 5000)
}

// 启动子分类页面引导
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

// 步骤3：介绍子分类页面
function showSectionIntro() {
  highlightElement(
    '#tour-category-grid',
    '选择子分类',
    '这里将显示该分类下的所有子分类，点击可以查看该分类内的评分项目。',
    {
      side: 'bottom',
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
    '#tour-category-feedback',
    '添加内容',
    '点击这个按钮可以创建新的分类或评分项目。',
    {
      side: 'left',
      nextBtnText: '我知道了',
      onNextClick: () => {
        saveStep(TourStep.MINOR_SECTION_CLICK)
        destroyDriver()
        nextTick(() => showClickTour())
      },
    }
  )
}

// 步骤5：点击子分类
function showClickTour() {
  highlightElement(
    '#tour-first-category',
    '查看评分项目',
    '点击选择子分类查看评分项目列表。',
    {
      side: 'bottom',
      nextBtnText: '查看项目',
      onNextClick: () => {
        saveStep(TourStep.RATING_LIST_INTRO)
        destroyDriver()
        if (children.value.length > 0) {
          goToCategory(children.value[0]!)
        }
      },
    }
  )
}

// 启动评分列表引导
function startRatingItemsTour(step: number) {
  switch (step) {
    case TourStep.RATING_LIST_INTRO:
      showListIntro()
      break
    case TourStep.RATING_LIST_FEEDBACK:
      showRatingFeedbackTour()
      break
    case TourStep.RATING_ITEM_CARD:
      showCardTour()
      break
    case TourStep.RATING_ITEM_STARS:
      showStarsTour()
      break
  }
}

// 步骤6：评分列表介绍
function showListIntro() {
  highlightElement(
    '#tour-rating-list',
    '评分项目列表',
    '这里将显示该分类内的所有评分项目，你可以查看评分、热门评论，并对它们进行评分。',
    {
      side: 'top',
      nextBtnText: '我知道了',
      onNextClick: () => {
        saveStep(TourStep.RATING_LIST_FEEDBACK)
        destroyDriver()
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
        setTimeout(() => showRatingFeedbackTour(), 500)
      },
    }
  )
}

// 步骤7：反馈提示
function showRatingFeedbackTour() {
  highlightElement(
    '#tour-rating-feedback',
    '添加内容',
    '点击这个按钮可以创建新的分类或评分项目。',
    {
      side: 'left',
      nextBtnText: '我知道了',
      onNextClick: () => {
        saveStep(TourStep.RATING_ITEM_CARD)
        destroyDriver()
        window.scrollTo({ top: 0, behavior: 'smooth' })
        setTimeout(() => showCardTour(), 500)
      },
    }
  )
}

// 步骤8：评分项目卡片
function showCardTour() {
  highlightElement(
    '#tour-first-rating-item',
    '评分项目',
    '这是一个单独的评分项目，你可以直接在这里查看总分、热门评论以及对它进行评分。',
    {
      side: 'bottom',
      nextBtnText: '我知道了',
      onNextClick: () => {
        saveStep(TourStep.RATING_ITEM_STARS)
        destroyDriver()
        nextTick(() => showStarsTour())
      },
    }
  )
}

// 步骤9：星星评分
function showStarsTour() {
  const description = userStore.isLoggedIn
    ? '点击星星可以直接对该项目进行评分。现在试试给它打个分吧！'
    : '点击星星可以直接对该项目进行评分。现在试试点击星星体验一下吧！（登录后即可真正评分）'

  highlightElement(
    '#tour-star-rating',
    '快速评分',
    description,
    {
      side: 'left',
      nextBtnText: '进入详情',
      allowInteraction: true,
      onNextClick: () => {
        saveStep(TourStep.RATING_DETAIL_FEEDBACK)
        destroyDriver()
        if (filteredItems.value.length > 0) {
          goToDetail(filteredItems.value[0]!.id)
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
      <!-- 面包屑导航 -->
      <nav v-if="!isLoading && categoryDetail" class="breadcrumb-nav">
        <template v-for="(item, index) in breadcrumbs" :key="item.id">
          <router-link
            v-if="item.path"
            :to="item.path"
            class="breadcrumb-item"
          >
            <svg v-if="index === 0" class="breadcrumb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            {{ item.name }}
          </router-link>
          <span v-else class="breadcrumb-item current">{{ item.name }}</span>
          <svg v-if="index < breadcrumbs.length - 1" class="breadcrumb-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </template>
      </nav>

      <!-- 加载状态 -->
      <div v-if="isLoading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>加载中...</p>
      </div>

      <!-- 空状态 -->
      <div v-else-if="!categoryDetail" class="empty-container">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M8 15h8M9 9h.01M15 9h.01"></path>
          </svg>
        </div>
        <h2>分类不存在</h2>
        <p>该分类可能已被删除或不存在</p>
      </div>

      <!-- 子分类模式 -->
      <template v-else-if="showChildren">
        <div class="content-container">
          <!-- 桌面端标题 -->
          <h1 class="page-title desktop-only">{{ categoryDetail.name }}</h1>

          <!-- 空状态 - 增强版 -->
          <div v-if="children.length === 0" class="empty-state-enhanced">
            <div class="empty-hero">
              <div class="empty-icon-large">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="3" y1="9" x2="21" y2="9"></line>
                  <line x1="9" y1="21" x2="9" y2="9"></line>
                </svg>
              </div>
              <h2>这里还是一片空白</h2>
              <p>成为第一个贡献者，帮助完善这个分类</p>
            </div>
            <div class="action-cards">
              <button class="action-card" @click="openFeedbackDrawer(1)">
                <div class="action-card-icon category">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                    <line x1="12" y1="11" x2="12" y2="17"></line>
                    <line x1="9" y1="14" x2="15" y2="14"></line>
                  </svg>
                </div>
                <div class="action-card-content">
                  <span class="action-card-title">新建子分类</span>
                  <span class="action-card-desc">添加一个新的分类层级</span>
                </div>
              </button>
              <button class="action-card" @click="openFeedbackDrawer(2)">
                <div class="action-card-icon item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                </div>
                <div class="action-card-content">
                  <span class="action-card-title">新建评分项目</span>
                  <span class="action-card-desc">直接创建可评分的内容</span>
                </div>
              </button>
            </div>
          </div>

          <!-- 子分类网格 -->
          <div v-else id="tour-category-grid" class="section-grid">
            <div
              v-for="(category, index) in children"
              :key="category.id"
              :id="index === 0 ? 'tour-first-category' : undefined"
              class="section-card"
              @click="goToCategory(category)"
            >
              <!-- 封面图 -->
              <div class="section-cover">
                <img
                  v-if="category.imageUrl"
                  :src="category.imageUrl"
                  :alt="category.name"
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
                <!-- 子分类数量或评分项目数量标签 -->
                <div v-if="category.hasChildren" class="count-badge">
                  {{ category.childrenCount }} 个子分类
                </div>
                <div v-else-if="category.itemCount > 0" class="count-badge">
                  {{ category.itemCount }} 个项目
                </div>
              </div>
              <!-- 信息 -->
              <div class="section-info">
                <h3 class="section-name">{{ category.name }}</h3>
                <p v-if="category.description" class="section-desc">{{ category.description }}</p>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- 评分项目列表模式 -->
      <template v-else>
        <!-- 筛选区域 - 仅在有内容时显示 -->
        <div v-if="filteredItems.length > 0" class="filter-bar">
          <nav class="filter-nav">
            <span class="filter-count">{{ categoryDetail?.ratingItems?.length ?? 0 }} 个评分</span>
            <span class="filter-separator"></span>
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
        </nav>
          <div class="view-toggle">
            <button
              class="view-btn"
              :class="{ active: viewMode === 'list' }"
              @click="viewMode = 'list'"
              title="列表视图"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
            </button>
            <button
              class="view-btn"
              :class="{ active: viewMode === 'grid' }"
              @click="viewMode = 'grid'"
              title="网格视图"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
            </button>
          </div>
        </div>

        <!-- 空状态 - 增强版 -->
        <div v-if="filteredItems.length === 0" class="empty-state-enhanced">
          <div class="empty-hero">
            <div class="empty-icon-large">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
            </div>
            <h2>这里还是一片空白</h2>
            <p>成为第一个贡献者，帮助完善这个分类</p>
          </div>
          <div class="action-cards">
            <button class="action-card" @click="openFeedbackDrawer(1)">
              <div class="action-card-icon category">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                  <line x1="12" y1="11" x2="12" y2="17"></line>
                  <line x1="9" y1="14" x2="15" y2="14"></line>
                </svg>
              </div>
              <div class="action-card-content">
                <span class="action-card-title">新建子分类</span>
                <span class="action-card-desc">添加一个新的分类层级</span>
              </div>
            </button>
            <button class="action-card" @click="openFeedbackDrawer(2)">
              <div class="action-card-icon item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              </div>
              <div class="action-card-content">
                <span class="action-card-title">新建评分项目</span>
                <span class="action-card-desc">直接创建可评分的内容</span>
              </div>
            </button>
          </div>
        </div>

        <!-- 视图切换容器 -->
        <Transition name="view-switch" mode="out-in">
          <!-- 评分项目列表视图 -->
          <div v-if="viewMode === 'list'" key="list-view" class="view-container">
            <TransitionGroup name="list" tag="div" id="tour-rating-list" class="rating-list">
              <div
                v-for="(item, index) in filteredItems"
                :key="item.id"
                :id="index === 0 ? 'tour-first-rating-item' : undefined"
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
                        :id="index === 0 ? 'tour-star-rating' : undefined"
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
            </TransitionGroup>
          </div>

          <!-- 评分项目网格视图 -->
          <div v-else key="grid-view" class="view-container">
            <TransitionGroup name="grid" tag="div" class="rating-grid">
              <div
                v-for="(item, index) in filteredItems"
                :key="item.id"
                class="grid-item"
                @click="goToDetail(item.id)"
              >
                <!-- 封面图 -->
                <div class="grid-item-cover">
                  <img
                    v-if="item.url"
                    :src="item.url"
                    :alt="item.name"
                    loading="lazy"
                  />
                  <div v-else class="grid-item-placeholder" :style="{ background: getPlaceholderGradient(index) }">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                  </div>
                  <!-- 评分标签 -->
                  <div class="grid-item-score">{{ item.averageScore.toFixed(1) }}</div>
                </div>
                <!-- 名称 -->
                <div class="grid-item-info">
                  <h3 class="grid-item-name">{{ item.name }}</h3>
                  <span class="grid-item-count">{{ item.ratingCount }} 人评分</span>
                </div>
              </div>
            </TransitionGroup>
          </div>
        </Transition>
      </template>
    </main>

    <PageFooter />

    <!-- FAB 浮动操作按钮 -->
    <div v-if="categoryDetail && !isLoading" id="tour-rating-feedback" class="fab-container">
      <!-- FAB 遮罩层 -->
      <Transition name="fade">
        <div v-if="isFabExpanded" class="fab-overlay" @click="closeFab"></div>
      </Transition>

      <!-- FAB 菜单 -->
      <Transition name="fab-menu">
        <div v-if="isFabExpanded" class="fab-menu">
          <button class="fab-menu-item" @click="openFeedbackDrawer(1)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              <line x1="12" y1="11" x2="12" y2="17"></line>
              <line x1="9" y1="14" x2="15" y2="14"></line>
            </svg>
            <span>新建分类</span>
          </button>
          <button class="fab-menu-item" @click="openFeedbackDrawer(2)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            <span>新建评分项目</span>
          </button>
        </div>
      </Transition>

      <!-- FAB 主按钮 -->
      <button
        id="tour-category-feedback"
        class="fab-button"
        :class="{ expanded: isFabExpanded }"
        @click="toggleFab"
      >
        <svg class="fab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
    </div>

    <!-- 反馈抽屉 -->
    <FeedbackDrawer
      :is-open="isFeedbackOpen"
      :contribution-type="2"
      :target-type="feedbackTargetType"
      :parent-id="categoryId"
      :school-id="schoolId"
      :parent-path="parentPath"
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

.content-container {
  max-width: 1200px;
  margin: 0 auto;
}

/* ===== Breadcrumb ===== */
.breadcrumb-nav {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 12px;
  margin-bottom: var(--spacing-md);
  font-size: var(--text-xs);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.breadcrumb-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.breadcrumb-chevron {
  width: 14px;
  height: 14px;
  color: var(--color-text-placeholder);
  flex-shrink: 0;
}

.breadcrumb-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--color-text-secondary);
  text-decoration: none;
  padding: 4px 8px;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.breadcrumb-item:hover:not(.current) {
  color: var(--color-primary);
  background: var(--color-primary-bg);
}

.breadcrumb-item.current {
  color: var(--color-text);
  font-weight: var(--font-medium);
  background: var(--color-primary-bg);
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

/* ===== Section Grid (子分类卡片) ===== */
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

.count-badge {
  position: absolute;
  bottom: var(--spacing-xs);
  right: var(--spacing-xs);
  padding: 2px 8px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  border-radius: var(--radius-sm);
  font-size: 10px;
  font-weight: var(--font-medium);
  color: white;
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

/* ===== Filter Bar ===== */
.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.filter-nav {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  font-size: var(--text-xs);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.filter-count {
  color: var(--color-text-secondary);
  font-weight: var(--font-medium);
  padding: 2px 6px;
}

.filter-separator {
  width: 1px;
  height: 14px;
  background: var(--color-border);
}

.filter-buttons {
  display: flex;
  gap: 2px;
}

.filter-btn {
  padding: 4px 10px;
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.15s ease;
}

.filter-btn:hover:not(.active) {
  color: var(--color-text);
  background: var(--color-primary-bg);
}

.filter-btn.active {
  color: var(--color-primary);
  background: var(--color-primary-bg);
}

/* ===== View Toggle ===== */
.view-toggle {
  display: flex;
  gap: 2px;
  padding: 4px;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.view-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  color: var(--color-text-placeholder);
  cursor: pointer;
  transition: all 0.15s ease;
}

.view-btn svg {
  width: 16px;
  height: 16px;
}

.view-btn:hover:not(.active) {
  color: var(--color-text-secondary);
  background: var(--color-border);
}

.view-btn.active {
  color: var(--color-primary);
  background: var(--color-primary-bg);
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

/* ===== Rating Grid ===== */
.rating-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-sm);
}

.grid-item {
  display: flex;
  flex-direction: column;
  background: var(--color-card);
  border-radius: var(--radius-lg);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
}

.grid-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.grid-item:active {
  transform: translateY(0);
}

.grid-item-cover {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
}

.grid-item-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.grid-item-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.grid-item-placeholder svg {
  width: 28px;
  height: 28px;
  color: white;
  opacity: 0.8;
}

.grid-item-score {
  position: absolute;
  top: var(--spacing-xs);
  right: var(--spacing-xs);
  padding: 2px 6px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  border-radius: var(--radius-sm);
  font-size: 11px;
  font-weight: var(--font-bold);
  color: var(--color-warning);
}

.grid-item-info {
  padding: var(--spacing-xs);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.grid-item-name {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.grid-item-count {
  font-size: 10px;
  color: var(--color-text-placeholder);
}

/* ===== Enhanced Empty State ===== */
.empty-state-enhanced {
  text-align: center;
  padding: var(--spacing-2xl) var(--spacing-md);
  max-width: 420px;
  margin: 0 auto;
}

.empty-hero {
  margin-bottom: var(--spacing-xl);
}

.empty-icon-large {
  width: 80px;
  height: 80px;
  margin: 0 auto var(--spacing-md);
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: var(--color-text-placeholder);
  opacity: 0.6;
}

.empty-icon-large svg {
  width: 64px;
  height: 64px;
  stroke-width: 1;
}

.empty-hero h2 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-xs);
  color: var(--color-text);
}

.empty-hero p {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: 1.5;
}

/* ===== Action Cards ===== */
.action-cards {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.action-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.action-card:hover {
  border-color: transparent;
  background: var(--color-card);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06), 0 0 0 1px var(--color-primary-light, rgba(99, 102, 241, 0.2));
}

.action-card:active {
  transform: scale(0.98);
}

.action-card-icon {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-lg);
  transition: transform 0.2s ease;
}

.action-card:hover .action-card-icon {
  transform: scale(1.05);
}

.action-card-icon.category {
  background: rgba(99, 102, 241, 0.1);
  color: var(--color-primary);
}

.action-card-icon.item {
  background: rgba(251, 146, 60, 0.1);
  color: var(--color-warning);
}

.action-card-icon svg {
  width: 20px;
  height: 20px;
}

.action-card-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.action-card-title {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text);
}

.action-card-desc {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
}

/* Arrow indicator */
.action-card::after {
  content: '';
  width: 16px;
  height: 16px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M9 5l7 7-7 7'/%3E%3C/svg%3E");
  background-size: contain;
  opacity: 0.4;
  transition: all 0.2s ease;
}

.action-card:hover::after {
  opacity: 0.8;
  transform: translateX(2px);
}

/* ===== FAB (Floating Action Button) ===== */
.fab-container {
  position: fixed;
  right: var(--spacing-md);
  bottom: calc(var(--spacing-md) + env(safe-area-inset-bottom, 0px));
  z-index: 100;
}

.fab-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(4px);
  z-index: -1;
}

.fab-menu {
  position: absolute;
  right: 0;
  bottom: 52px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--spacing-xs);
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: var(--radius-lg);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  min-width: 140px;
}

:root.dark .fab-menu {
  background: rgba(40, 40, 40, 0.85);
  border-color: rgba(255, 255, 255, 0.08);
}

.fab-menu-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-normal);
  color: var(--color-text-secondary);
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.fab-menu-item:hover {
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

.fab-menu-item svg {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  opacity: 0.6;
}

.fab-menu-item:hover svg {
  opacity: 1;
}

.fab-button {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(16px);
  color: var(--color-primary);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: var(--radius-lg);
  cursor: pointer;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.04);
  transition: all var(--transition-fast);
}

:root.dark .fab-button {
  background: rgba(50, 50, 50, 0.95);
  border-color: rgba(255, 255, 255, 0.12);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05);
}

.fab-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.04);
}

:root.dark .fab-button:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.08);
}

.fab-button:active {
  transform: scale(0.95);
}

.fab-button.expanded {
  background: var(--color-primary);
  color: white;
  border-color: transparent;
  transform: rotate(45deg);
}

.fab-button.expanded:hover {
  transform: rotate(45deg) translateY(-2px);
}

.fab-icon {
  width: 20px;
  height: 20px;
  stroke-width: 1.5;
  transition: transform var(--transition-fast);
}

/* FAB Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--transition-fast);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fab-menu-enter-active,
.fab-menu-leave-active {
  transition: all var(--transition-fast);
  transform-origin: bottom right;
}

.fab-menu-enter-from,
.fab-menu-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(8px);
}

/* ===== View Container ===== */
.view-container {
  width: 100%;
}

/* ===== List/Grid Sorting Animation ===== */
.list-move,
.grid-move {
  transition: transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
}

/* Prevent layout jump during leave animation */
.list-leave-active,
.grid-leave-active {
  position: absolute;
  opacity: 0;
}

/* Enter animation for new items */
.list-enter-active,
.grid-enter-active {
  transition: all 0.3s ease;
}

.list-enter-from,
.grid-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

/* ===== View Switch Animation ===== */
.view-switch-enter-active,
.view-switch-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.view-switch-enter-from {
  opacity: 0;
  transform: scale(0.96);
}

.view-switch-leave-to {
  opacity: 0;
  transform: scale(1.02);
}

/* ===== Desktop ===== */
@media (min-width: 640px) {
  .breadcrumb-nav {
    font-size: var(--text-sm);
  }
}

@media (min-width: 1024px) {
  .desktop-only {
    display: block;
  }

  .page-content {
    padding: var(--spacing-xl);
    max-width: 900px;
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

  .filter-bar {
    margin-bottom: var(--spacing-lg);
  }

  .filter-nav {
    font-size: var(--text-sm);
    padding: 8px 12px;
  }

  .filter-btn {
    padding: 6px 14px;
    font-size: var(--text-sm);
  }

  .view-btn {
    width: 32px;
    height: 32px;
  }

  .view-btn svg {
    width: 18px;
    height: 18px;
  }

  .rating-list {
    gap: var(--spacing-md);
  }

  .rating-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: var(--spacing-md);
  }

  .grid-item-info {
    padding: var(--spacing-sm);
  }

  .grid-item-name {
    font-size: var(--text-sm);
  }

  .grid-item-count {
    font-size: var(--text-xs);
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

  /* FAB on desktop - positioned with more margin */
  .fab-container {
    right: var(--spacing-lg);
    bottom: calc(var(--spacing-lg) + env(safe-area-inset-bottom, 0px));
  }

  /* Action cards on desktop - keep horizontal layout but wider */
  .action-cards {
    max-width: 480px;
  }

  .action-card {
    padding: var(--spacing-md) var(--spacing-xl);
  }
}
</style>
