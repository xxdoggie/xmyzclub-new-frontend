<script setup lang="ts">
import { ref, onMounted, onUnmounted, h } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/composables/useToast'
import { useScoringTour } from '@/composables/useScoringTour'

const router = useRouter()
const userStore = useUserStore()
const toast = useToast()
const {
  shouldStartTour,
  getCurrentStep,
  TourStep,
  saveStep,
  highlightElement,
  destroyDriver,
} = useScoringTour()

const isDark = ref(document.documentElement.classList.contains('dark'))
const isMobileMenuOpen = ref(false)

// ===== Banner Carousel =====
const currentBannerIndex = ref(0)
let bannerInterval: ReturnType<typeof setInterval> | null = null

// 预留Banner数据 - 后续由API获取
// TODO: 替换为真实API数据
interface BannerItem {
  id: number
  tag: string
  title: string
  description: string
  gradient: string
  link?: string
  icon: ReturnType<typeof h>
}

const banners = ref<BannerItem[]>([
  {
    id: 1,
    tag: '公告',
    title: '欢迎来到厦门一中学生社区',
    description: '在这里发现校园生活的无限可能',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    link: '/community',
    icon: h('svg', { viewBox: '0 0 80 80', fill: 'none' }, [
      h('circle', { cx: '40', cy: '40', r: '35', fill: 'rgba(255,255,255,0.2)' }),
      h('path', { d: 'M25 50 L40 30 L55 50', stroke: 'white', 'stroke-width': '3', fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
      h('circle', { cx: '40', cy: '25', r: '5', fill: 'white' }),
    ]),
  },
  {
    id: 2,
    tag: '活动',
    title: '新活动即将上线',
    description: '敬请期待精彩校园活动',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    link: '/ticket',
    icon: h('svg', { viewBox: '0 0 80 80', fill: 'none' }, [
      h('rect', { x: '15', y: '20', width: '50', height: '40', rx: '4', fill: 'rgba(255,255,255,0.2)' }),
      h('path', { d: 'M15 32 L65 32', stroke: 'white', 'stroke-width': '2' }),
      h('circle', { cx: '28', cy: '45', r: '6', fill: 'white', opacity: '0.8' }),
      h('path', { d: 'M40 42 L55 42 M40 48 L50 48', stroke: 'white', 'stroke-width': '2', 'stroke-linecap': 'round' }),
    ]),
  },
  {
    id: 3,
    tag: '功能',
    title: '评分社区全新上线',
    description: '为食堂、教学楼、考试打分吧',
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    link: '/community',
    icon: h('svg', { viewBox: '0 0 80 80', fill: 'none' }, [
      h('polygon', { points: '40,15 47,32 65,32 51,43 56,60 40,50 24,60 29,43 15,32 33,32', fill: 'rgba(255,255,255,0.9)' }),
    ]),
  },
])

function goToBanner(index: number) {
  currentBannerIndex.value = index
  resetBannerInterval()
}

function handleBannerClick(banner: BannerItem) {
  if (banner.link) {
    router.push(banner.link)
  }
}

function startBannerAutoPlay() {
  bannerInterval = setInterval(() => {
    currentBannerIndex.value = (currentBannerIndex.value + 1) % banners.value.length
  }, 5000)
}

function resetBannerInterval() {
  if (bannerInterval) {
    clearInterval(bannerInterval)
  }
  startBannerAutoPlay()
}

// 退出确认弹窗
const showLogoutConfirm = ref(false)

// 抽屉分组折叠状态（默认全部展开）
const drawerSections = ref({
  nav: true,      // 导航
  admin: true,    // 管理
  account: true,  // 账户
})

// 切换分组折叠状态
function toggleSection(section: 'nav' | 'admin' | 'account') {
  drawerSections.value[section] = !drawerSections.value[section]
}

onMounted(() => {
  // 启动Banner轮播
  startBannerAutoPlay()

  // 检查是否需要启动评分社区引导
  if (shouldStartTour() && getCurrentStep() === TourStep.HOME_COMMUNITY_ENTRY) {
    setTimeout(() => {
      startHomeTour()
    }, 500)
  }
})

onUnmounted(() => {
  // 清理Banner轮播定时器
  if (bannerInterval) {
    clearInterval(bannerInterval)
  }
  destroyDriver()
})

// 启动主页引导
function startHomeTour() {
  highlightElement(
    '#tour-community-entry',
    '评分社区',
    '这是评分社区入口，你可以在这里为校园里的各种事物打分、发表评论，和同学们分享你的看法。',
    {
      side: 'top',
      nextBtnText: '进入看看',
      showSkipButton: true, // 显示跳过向导按钮
      onNextClick: () => {
        saveStep(TourStep.COMMUNITY_EXPLORE)
        destroyDriver()
        router.push('/community')
      },
    }
  )
}

function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
}

function handleLogin() {
  userStore.openLoginModal()
}

// 打开退出确认弹窗
function openLogoutConfirm() {
  showLogoutConfirm.value = true
  isMobileMenuOpen.value = false
}

// 确认退出
function confirmLogout() {
  userStore.logout()
  showLogoutConfirm.value = false
  toast.success('已退出登录')
}

// 取消退出
function cancelLogout() {
  showLogoutConfirm.value = false
}

// 跳转到个人中心
function goToProfile() {
  if (userStore.isLoggedIn) {
    router.push('/profile')
  } else {
    userStore.openLoginModal()
  }
}

// 导航跳转
function navigateTo(path: string) {
  isMobileMenuOpen.value = false
  router.push(path)
}

function toggleMobileMenu() {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}
</script>

<template>
  <div class="home">
    <!-- Header -->
    <header class="header">
      <div class="header-container">
        <!-- Mobile Menu Button (Left) -->
        <button class="mobile-menu-btn" @click="toggleMobileMenu">
          <svg v-if="!isMobileMenuOpen" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <!-- Title (Center) -->
        <div class="header-center">
          <h1 class="header-title">厦门一中学生社区</h1>
        </div>

        <!-- Desktop Navigation -->
        <nav class="nav-links">
          <router-link to="/" class="nav-link active">首页</router-link>
          <router-link to="/ticket" class="nav-link">活动抢票</router-link>
          <router-link to="/ringtone" class="nav-link">宿舍铃声</router-link>
          <router-link to="/grade" class="nav-link">分数查询</router-link>
          <router-link to="/community" class="nav-link">评分社区</router-link>
        </nav>

        <!-- Right Actions -->
        <div class="header-right">
          <button class="theme-toggle-btn" @click="toggleTheme" title="切换主题">
            <svg v-if="isDark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          </button>

          <!-- Desktop Auth Buttons -->
          <template v-if="userStore.isLoggedIn">
            <button class="user-name-btn" @click="goToProfile">
              {{ userStore.user?.nickname }}
            </button>
          </template>
          <template v-else>
            <button class="btn btn-primary btn-sm desktop-only" @click="handleLogin">登录</button>
          </template>
        </div>
      </div>
    </header>

    <!-- Content Wrapper (用于桌面端侧边栏布局) -->
    <div class="content-wrapper">
      <!-- Desktop Sidebar -->
      <aside class="desktop-sidebar">
        <!-- 用户区域 -->
        <div class="sidebar-user-section" @click="goToProfile">
          <template v-if="userStore.isLoggedIn">
            <div class="sidebar-user-info">
              <span class="sidebar-user-name">{{ userStore.user?.nickname }}</span>
              <span class="sidebar-user-signature" v-if="userStore.user?.signature">{{ userStore.user.signature }}</span>
              <span class="sidebar-user-status" v-else>点击查看个人中心</span>
            </div>
          </template>
          <template v-else>
            <div class="sidebar-user-info">
              <span class="sidebar-user-name">游客</span>
              <button class="sidebar-login-btn" @click.stop="handleLogin">点击登录</button>
            </div>
          </template>
        </div>

        <!-- 可滚动内容区域 -->
        <div class="sidebar-scroll-content">
          <!-- 管理区域 -->
          <div class="sidebar-nav-section" v-if="userStore.canManageTickets || userStore.canManageCampaigns || userStore.canManageRating || userStore.canManageMessages || userStore.canManageUsers">
            <div class="sidebar-section-header">
              <span class="sidebar-section-title">管理后台</span>
            </div>
            <nav class="sidebar-nav">
              <router-link v-if="userStore.canManageTickets" to="/admin/tickets" class="sidebar-nav-item">
                <div class="sidebar-nav-icon admin">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                </div>
                <span>票务管理</span>
              </router-link>
              <router-link v-if="userStore.canManageCampaigns" to="/admin/dorm" class="sidebar-nav-item">
                <div class="sidebar-nav-icon admin">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 21h18M3 7v14M21 7v14M6 11h4M6 15h4M14 11h4M14 15h4M12 3l9 4H3l9-4z"></path>
                  </svg>
                </div>
                <span>宿舍管理</span>
              </router-link>
              <router-link v-if="userStore.canManageCampaigns" to="/admin/campaigns" class="sidebar-nav-item">
                <div class="sidebar-nav-icon admin">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 18V5l12-2v13"></path>
                    <circle cx="6" cy="18" r="3"></circle>
                    <circle cx="18" cy="16" r="3"></circle>
                  </svg>
                </div>
                <span>活动管理</span>
              </router-link>
              <router-link v-if="userStore.canManageRating" to="/admin/rating" class="sidebar-nav-item">
                <div class="sidebar-nav-icon admin">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                </div>
                <span>评分社区</span>
              </router-link>
              <router-link v-if="userStore.canManageMessages" to="/admin/messages" class="sidebar-nav-item">
                <div class="sidebar-nav-icon admin">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                </div>
                <span>消息管理</span>
              </router-link>
              <router-link v-if="userStore.canManageCampaigns" to="/admin/qqmusic" class="sidebar-nav-item">
                <div class="sidebar-nav-icon admin">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 18V5l12-2v13"></path>
                    <circle cx="6" cy="18" r="3"></circle>
                    <circle cx="18" cy="16" r="3"></circle>
                  </svg>
                </div>
                <span>QQ音乐管理</span>
              </router-link>
              <router-link v-if="userStore.canManageUsers" to="/admin/campus" class="sidebar-nav-item">
                <div class="sidebar-nav-icon admin">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </div>
                <span>校园网管理</span>
              </router-link>
            </nav>
          </div>

          <!-- 账户区域 -->
          <div class="sidebar-nav-section" v-if="userStore.isLoggedIn">
            <div class="sidebar-section-header">
              <span class="sidebar-section-title">我的账户</span>
            </div>
            <nav class="sidebar-nav">
              <router-link to="/profile" class="sidebar-nav-item">
                <div class="sidebar-nav-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </div>
                <span>个人中心</span>
              </router-link>
              <router-link to="/messages" class="sidebar-nav-item">
                <div class="sidebar-nav-icon messages">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                  </svg>
                </div>
                <span>我的消息</span>
              </router-link>
              <button class="sidebar-nav-item logout-item" @click="openLogoutConfirm">
                <div class="sidebar-nav-icon logout">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                </div>
                <span>退出登录</span>
              </button>
            </nav>
          </div>
        </div>

        <!-- 底部信息 -->
        <div class="sidebar-footer">
          <p class="sidebar-brand">厦门一中学生社区</p>
          <p class="sidebar-credit">designed by 23届玄学狗狗</p>
        </div>
      </aside>

      <!-- Main Content Area -->
      <div class="main-content-area">

    <!-- Mobile Menu Overlay -->
    <Transition name="menu-fade">
      <div v-if="isMobileMenuOpen" class="mobile-menu-overlay" @click="toggleMobileMenu"></div>
    </Transition>
    <Transition name="menu-slide">
      <div v-if="isMobileMenuOpen" class="mobile-menu">
        <!-- 用户区域（固定在顶部） -->
        <div class="drawer-user-section" @click="goToProfile">
          <template v-if="userStore.isLoggedIn">
            <div class="drawer-user-info">
              <span class="drawer-user-name">{{ userStore.user?.nickname }}</span>
              <span class="drawer-user-signature" v-if="userStore.user?.signature">{{ userStore.user.signature }}</span>
              <span class="drawer-user-status" v-else>点击查看个人中心</span>
            </div>
          </template>
          <template v-else>
            <div class="drawer-user-info">
              <span class="drawer-user-name">游客</span>
              <button class="drawer-login-btn" @click.stop="handleLogin">点击登录</button>
            </div>
          </template>
        </div>

        <!-- 可滚动内容区域 -->
        <div class="drawer-scroll-content">
          <!-- 导航区域 -->
        <div class="drawer-nav-section">
          <button class="drawer-section-header" @click="toggleSection('nav')">
            <span class="drawer-section-title">导航</span>
            <svg class="drawer-section-arrow" :class="{ collapsed: !drawerSections.nav }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          <Transition name="collapse">
            <nav v-show="drawerSections.nav" class="drawer-nav">
              <a class="drawer-nav-item active" @click="navigateTo('/')">
                <div class="drawer-nav-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                  </svg>
                </div>
                <span>首页</span>
              </a>
              <a class="drawer-nav-item" @click="navigateTo('/ticket')">
                <div class="drawer-nav-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                </div>
                <span>活动抢票</span>
              </a>
              <a class="drawer-nav-item" @click="navigateTo('/ringtone')">
                <div class="drawer-nav-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                  </svg>
                </div>
                <span>宿舍铃声</span>
              </a>
              <a class="drawer-nav-item" @click="navigateTo('/grade')">
                <div class="drawer-nav-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                </div>
                <span>分数查询</span>
              </a>
              <a class="drawer-nav-item" @click="navigateTo('/community')">
                <div class="drawer-nav-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                </div>
                <span>评分社区</span>
              </a>
            </nav>
          </Transition>
        </div>

        <!-- 管理区域 -->
        <div class="drawer-nav-section" v-if="userStore.canManageTickets || userStore.canManageCampaigns || userStore.canManageRating || userStore.canManageMessages || userStore.canManageUsers">
          <button class="drawer-section-header" @click="toggleSection('admin')">
            <span class="drawer-section-title">管理</span>
            <svg class="drawer-section-arrow" :class="{ collapsed: !drawerSections.admin }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          <Transition name="collapse">
            <nav v-show="drawerSections.admin" class="drawer-nav">
              <a v-if="userStore.canManageTickets" class="drawer-nav-item" @click="navigateTo('/admin/tickets')">
                <div class="drawer-nav-icon admin">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                </div>
                <span>票务管理</span>
              </a>
              <a v-if="userStore.canManageCampaigns" class="drawer-nav-item" @click="navigateTo('/admin/dorm')">
                <div class="drawer-nav-icon admin">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 21h18M3 7v14M21 7v14M6 11h4M6 15h4M14 11h4M14 15h4M12 3l9 4H3l9-4z"></path>
                  </svg>
                </div>
                <span>宿舍管理</span>
              </a>
              <a v-if="userStore.canManageCampaigns" class="drawer-nav-item" @click="navigateTo('/admin/campaigns')">
                <div class="drawer-nav-icon admin">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 18V5l12-2v13"></path>
                    <circle cx="6" cy="18" r="3"></circle>
                    <circle cx="18" cy="16" r="3"></circle>
                  </svg>
                </div>
                <span>活动管理</span>
              </a>
              <a v-if="userStore.canManageRating" class="drawer-nav-item" @click="navigateTo('/admin/rating')">
                <div class="drawer-nav-icon admin">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                </div>
                <span>评分社区</span>
              </a>
              <a v-if="userStore.canManageMessages" class="drawer-nav-item" @click="navigateTo('/admin/messages')">
                <div class="drawer-nav-icon admin">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                </div>
                <span>消息管理</span>
              </a>
              <a v-if="userStore.canManageCampaigns" class="drawer-nav-item" @click="navigateTo('/admin/qqmusic')">
                <div class="drawer-nav-icon admin">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 18V5l12-2v13"></path>
                    <circle cx="6" cy="18" r="3"></circle>
                    <circle cx="18" cy="16" r="3"></circle>
                  </svg>
                </div>
                <span>QQ音乐管理</span>
              </a>
              <a v-if="userStore.canManageUsers" class="drawer-nav-item" @click="navigateTo('/admin/campus')">
                <div class="drawer-nav-icon admin">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </div>
                <span>校园网管理</span>
              </a>
            </nav>
          </Transition>
        </div>

        <!-- 设置区域 -->
        <div class="drawer-settings-section" v-if="userStore.isLoggedIn">
          <button class="drawer-section-header" @click="toggleSection('account')">
            <span class="drawer-section-title">账户</span>
            <svg class="drawer-section-arrow" :class="{ collapsed: !drawerSections.account }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          <Transition name="collapse">
            <div v-show="drawerSections.account" class="drawer-nav">
              <a class="drawer-nav-item" @click="navigateTo('/profile')">
                <div class="drawer-nav-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </div>
                <span>个人中心</span>
              </a>
              <a class="drawer-nav-item" @click="navigateTo('/messages')">
                <div class="drawer-nav-icon messages">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                  </svg>
                </div>
                <span>我的消息</span>
              </a>
              <button class="drawer-settings-item" @click="openLogoutConfirm">
                <div class="drawer-nav-icon logout">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                </div>
                <span>退出登录</span>
              </button>
            </div>
          </Transition>
        </div>
        </div>

        <!-- 底部信息（固定在抽屉底部） -->
        <div class="drawer-footer">
          <p class="drawer-brand">厦门一中学生社区</p>
          <p class="drawer-credit">designed by 23届玄学狗狗</p>
        </div>
      </div>
    </Transition>

    <!-- Main Content -->
    <main class="main">
      <!-- Banner Carousel -->
      <section class="banner-section">
        <div class="banner-container">
          <div class="banner-carousel">
            <!-- 轮播内容 - 将由API填充 -->
            <div
              v-for="(banner, index) in banners"
              :key="banner.id"
              class="banner-slide"
              :class="{ active: currentBannerIndex === index }"
              @click="handleBannerClick(banner)"
            >
              <div class="banner-content" :style="{ background: banner.gradient }">
                <div class="banner-text">
                  <span class="banner-tag">{{ banner.tag }}</span>
                  <h3 class="banner-title">{{ banner.title }}</h3>
                  <p class="banner-desc">{{ banner.description }}</p>
                </div>
                <div class="banner-illustration">
                  <component :is="banner.icon" />
                </div>
              </div>
            </div>
          </div>
          <!-- 轮播指示器 -->
          <div class="banner-dots">
            <button
              v-for="(_, index) in banners"
              :key="index"
              class="banner-dot"
              :class="{ active: currentBannerIndex === index }"
              @click="goToBanner(index)"
            ></button>
          </div>
        </div>
      </section>

      <!-- Main Entry Cards -->
      <section class="entry-section">
        <div class="entry-container">
          <!-- 活动票务 -->
          <router-link to="/ticket" class="entry-card entry-card-ticket">
            <div class="entry-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </div>
            <div class="entry-content">
              <h3 class="entry-title">活动票务</h3>
              <p class="entry-desc">在线抢票，不再错过精彩活动</p>
            </div>
            <div class="entry-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </div>
          </router-link>

          <!-- 评分社区 -->
          <router-link to="/community" id="tour-community-entry" class="entry-card entry-card-community">
            <div class="entry-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
            </div>
            <div class="entry-content">
              <h3 class="entry-title">评分社区</h3>
              <p class="entry-desc">在这里给食堂、考试、甚至教学楼打分……</p>
            </div>
            <div class="entry-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </div>
          </router-link>

          <!-- 宿舍铃声 -->
          <router-link to="/ringtone" class="entry-card entry-card-ringtone">
            <div class="entry-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M9 18V5l12-2v13"></path>
                <circle cx="6" cy="18" r="3"></circle>
                <circle cx="18" cy="16" r="3"></circle>
              </svg>
            </div>
            <div class="entry-content">
              <h3 class="entry-title">宿舍铃声</h3>
              <p class="entry-desc">给宿舍铃声投稿和投票！</p>
            </div>
            <div class="entry-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </div>
          </router-link>

          <!-- 次要入口 -->
          <div class="secondary-entries">
            <router-link to="/grade" class="secondary-card secondary-card-grade">
              <div class="secondary-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
              </div>
              <span class="secondary-label">成绩查询</span>
            </router-link>

            <router-link to="/wall" class="secondary-card secondary-card-wall">
              <div class="secondary-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="3" y1="9" x2="21" y2="9"></line>
                  <line x1="9" y1="21" x2="9" y2="9"></line>
                </svg>
              </div>
              <span class="secondary-label">厦一万能墙</span>
            </router-link>
          </div>
        </div>
      </section>
    </main>

    <!-- Footer -->
    <footer class="footer">
      <div class="footer-container">
        <div class="footer-links">
          <a href="#">关于我们</a>
          <a href="#">使用条款</a>
          <a href="#">隐私政策</a>
          <a href="#">帮助中心</a>
        </div>
        <p class="copyright">&copy; 2026 厦门一中学生社区 · designed by 23届玄学狗狗</p>
        <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener" class="icp-link">闽ICP备2024074144号-4</a>
      </div>
    </footer>
      </div><!-- /.main-content-area -->
    </div><!-- /.content-wrapper -->

    <!-- 退出确认弹窗 -->
    <Transition name="modal-fade">
      <div v-if="showLogoutConfirm" class="modal-overlay" @click="cancelLogout">
        <Transition name="modal-scale">
          <div v-if="showLogoutConfirm" class="modal-content" @click.stop>
            <h3 class="modal-title">确认退出</h3>
            <p class="modal-message">确定要退出登录吗？</p>
            <div class="modal-actions">
              <button class="modal-btn cancel" @click="cancelLogout">取消</button>
              <button class="modal-btn confirm" @click="confirmLogout">确定</button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* ===== Base ===== */
.home {
  min-height: 100vh;
  min-height: 100dvh; /* 动态视口高度，移动端更准确 */
  background: var(--color-bg);
  color: var(--color-text);
  display: flex;
  flex-direction: column;
}

/* ===== Header ===== */
.header {
  background: var(--color-card);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: var(--spacing-xs) 10px; /* 移动端更小边距 */
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-center {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.header-title {
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  color: var(--color-text);
  white-space: nowrap;
}

/* Navigation */
.nav-links {
  display: none;
  align-items: center;
  gap: var(--spacing-xs);
  flex: 1;
}

.nav-link {
  padding: var(--spacing-xs) var(--spacing-md);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  text-decoration: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
  position: relative;
}

.nav-link:hover {
  color: var(--color-text);
  background: var(--color-border);
}

.nav-link.active {
  color: var(--color-primary);
  font-weight: var(--font-medium);
}

.nav-link.active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 3px;
  background: var(--color-primary);
  border-radius: var(--radius-full);
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-left: auto;
}

.desktop-only {
  display: none;
}

.theme-toggle-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.theme-toggle-btn:hover {
  background: var(--color-border);
  color: var(--color-text);
}

.theme-toggle-btn svg {
  width: 20px;
  height: 20px;
}

.mobile-menu-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  color: var(--color-text);
  cursor: pointer;
}

.mobile-menu-btn svg {
  width: 24px;
  height: 24px;
}

/* ===== Desktop Sidebar ===== */
.desktop-sidebar {
  display: none; /* 默认隐藏，桌面端显示 */
}

/* Mobile Menu - Overlay Drawer */
.mobile-menu-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 200;
  backdrop-filter: blur(2px);
}

/* ===== Modern Drawer ===== */
.mobile-menu {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 280px;
  max-width: 80vw;
  background: var(--color-card);
  z-index: 201;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-xl);
  overflow: hidden;
  border-radius: 0 var(--radius-xl) var(--radius-xl) 0;
}

/* 可滚动内容区域 */
.drawer-scroll-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  /* iOS 弹性滚动 */
  -webkit-overflow-scrolling: touch;
}


/* 用户区域 */
.drawer-user-section {
  display: flex;
  align-items: center;
  padding: var(--spacing-lg);
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  color: white;
  cursor: pointer;
  transition: opacity var(--transition-fast);
}

.drawer-user-section:hover {
  opacity: 0.95;
}

.drawer-user-avatar {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  flex-shrink: 0;
}

.drawer-user-avatar.guest {
  background: rgba(255, 255, 255, 0.15);
}

.drawer-user-avatar.guest svg {
  width: 24px;
  height: 24px;
  opacity: 0.9;
}

.drawer-user-info {
  flex: 1;
  min-width: 0;
}

.drawer-user-name {
  display: block;
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.drawer-user-status {
  display: block;
  font-size: var(--text-xs);
  opacity: 0.8;
  margin-top: 2px;
}

.drawer-user-signature {
  display: block;
  font-size: var(--text-xs);
  opacity: 0.85;
  margin-top: 2px;
  font-style: italic;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 150px;
}

.drawer-login-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  font-size: var(--text-xs);
  padding: 4px 12px;
  border-radius: var(--radius-full);
  cursor: pointer;
  margin-top: 4px;
  transition: all var(--transition-fast);
}

.drawer-login-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.drawer-close-btn {
  position: absolute;
  top: var(--spacing-sm);
  right: var(--spacing-sm);
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.15);
  border: none;
  border-radius: 50%;
  color: white;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.drawer-close-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: rotate(90deg);
}

.drawer-close-btn svg {
  width: 16px;
  height: 16px;
}

/* 导航区域 */
.drawer-nav-section {
  padding: var(--spacing-sm) var(--spacing-md);
}

.drawer-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: var(--spacing-xs) var(--spacing-sm);
  background: transparent;
  border: none;
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: background var(--transition-fast);
}

.drawer-section-header:hover {
  background: var(--color-border);
}

.drawer-section-header:active {
  background: var(--color-bg);
}

.drawer-section-title {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.drawer-section-arrow {
  width: 16px;
  height: 16px;
  color: var(--color-text-placeholder);
  transition: transform 0.25s ease;
}

.drawer-section-arrow.collapsed {
  transform: rotate(-90deg);
}

.drawer-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.drawer-nav-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text);
  text-decoration: none;
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast);
  position: relative;
}

.drawer-nav-item:hover {
  background: var(--color-border);
}

.drawer-nav-item.active {
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

.drawer-nav-item.active .drawer-nav-icon {
  background: var(--color-primary);
  color: white;
}

.drawer-nav-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-border);
  border-radius: var(--radius-md);
  flex-shrink: 0;
  transition: all var(--transition-fast);
}

.drawer-nav-icon svg {
  width: 18px;
  height: 18px;
}

.drawer-nav-icon.logout {
  background: rgba(239, 68, 68, 0.1);
  color: #EF4444;
}

.drawer-nav-icon.admin {
  background: rgba(139, 92, 246, 0.1);
  color: #8B5CF6;
}

.drawer-nav-icon.messages {
  background: rgba(139, 92, 246, 0.1);
  color: #8B5CF6;
}

/* 设置区域 */
.drawer-settings-section {
  padding: 0 var(--spacing-md) var(--spacing-md);
}

.drawer-settings-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: #EF4444;
  background: transparent;
  border: none;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: left;
}

.drawer-settings-item:hover {
  background: rgba(239, 68, 68, 0.1);
}

/* 底部信息（固定在抽屉底部） */
.drawer-footer {
  flex-shrink: 0;
  padding: var(--spacing-md);
  padding-bottom: calc(var(--spacing-md) + env(safe-area-inset-bottom, 20px));
  border-top: 1px solid var(--color-border);
  text-align: center;
  background: var(--color-card);
}

.drawer-brand {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--color-text-secondary);
  margin-bottom: 4px;
}

.drawer-credit {
  font-size: 10px;
  color: var(--color-text-placeholder);
}

/* User Menu */
.user-menu {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.user-avatar {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
}

.user-name {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  display: none;
}

.user-name-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  display: none;
}

.user-name-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-primary-bg);
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-sm) var(--spacing-md);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-decoration: none;
}

.btn-sm {
  padding: var(--spacing-xs) var(--spacing-sm);
}

.btn-block {
  width: 100%;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  background: var(--color-primary-dark);
  transform: translateY(-1px);
}

.btn-primary:active {
  transform: translateY(0) scale(0.98);
}

.btn-ghost {
  background: transparent;
  color: var(--color-text);
}

.btn-ghost:hover {
  background: var(--color-border);
}

.btn-text {
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  cursor: pointer;
  padding: 0;
}

.btn-text:hover {
  color: var(--color-primary);
}

.link-btn {
  background: none;
  border: none;
  color: var(--color-primary);
  font-size: inherit;
  cursor: pointer;
  padding: 0;
}

.link-btn:hover {
  text-decoration: underline;
}

/* ===== Main Content ===== */
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* ===== Banner Section ===== */
.banner-section {
  padding: var(--spacing-md) var(--spacing-md);
  padding-bottom: var(--spacing-sm);
}

.banner-container {
  max-width: 600px;
  margin: 0 auto;
  position: relative;
}

.banner-carousel {
  position: relative;
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.banner-slide {
  display: none;
  cursor: pointer;
}

.banner-slide.active {
  display: block;
  animation: bannerFadeIn 0.5s ease;
}

@keyframes bannerFadeIn {
  from {
    opacity: 0;
    transform: translateX(10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.banner-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-lg) var(--spacing-md);
  min-height: 140px;
  color: white;
}

.banner-text {
  flex: 1;
  min-width: 0;
}

.banner-tag {
  display: inline-block;
  padding: 2px 10px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: var(--radius-full);
  font-size: 11px;
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-xs);
  backdrop-filter: blur(4px);
}

.banner-title {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  margin-bottom: 4px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.banner-desc {
  font-size: var(--text-sm);
  opacity: 0.9;
}

.banner-illustration {
  width: 80px;
  height: 80px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.banner-illustration svg {
  width: 100%;
  height: 100%;
}

.banner-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: var(--spacing-sm);
}

.banner-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-border);
  border: none;
  padding: 0;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.banner-dot.active {
  background: var(--color-primary);
  width: 24px;
  border-radius: 4px;
}

.banner-dot:hover:not(.active) {
  background: var(--color-text-placeholder);
}

/* ===== Entry Section ===== */
.entry-section {
  flex: 1;
  padding: var(--spacing-sm) var(--spacing-md);
  padding-bottom: var(--spacing-lg);
}

.entry-container {
  max-width: 600px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

/* Main Entry Cards */
.entry-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  text-decoration: none;
  transition: all var(--transition-fast);
  position: relative;
  overflow: hidden;
}

.entry-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--entry-color);
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.entry-card:hover {
  border-color: var(--entry-color, var(--color-primary));
  box-shadow: 0 4px 20px var(--entry-shadow, rgba(0, 0, 0, 0.08));
  transform: translateY(-2px);
}

.entry-card:hover::before {
  opacity: 1;
}

.entry-card:active {
  transform: translateY(0) scale(0.995);
}

/* Entry card colors - vibrant theme */
.entry-card-ticket {
  --entry-color: #FF6B6B;
  --entry-bg: linear-gradient(135deg, rgba(255, 107, 107, 0.15) 0%, rgba(255, 107, 107, 0.05) 100%);
  --entry-shadow: rgba(255, 107, 107, 0.15);
}
.entry-card-community {
  --entry-color: #FDCB6E;
  --entry-bg: linear-gradient(135deg, rgba(253, 203, 110, 0.15) 0%, rgba(253, 203, 110, 0.05) 100%);
  --entry-shadow: rgba(253, 203, 110, 0.15);
}
.entry-card-ringtone {
  --entry-color: #A29BFE;
  --entry-bg: linear-gradient(135deg, rgba(162, 155, 254, 0.15) 0%, rgba(162, 155, 254, 0.05) 100%);
  --entry-shadow: rgba(162, 155, 254, 0.15);
}

.entry-icon {
  width: 48px;
  height: 48px;
  background: var(--entry-bg);
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--entry-color);
  flex-shrink: 0;
}

.entry-icon svg {
  width: 24px;
  height: 24px;
}

.entry-content {
  flex: 1;
  min-width: 0;
}

.entry-title {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-text);
  margin-bottom: 2px;
}

.entry-desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.entry-arrow {
  width: 20px;
  height: 20px;
  color: var(--color-text-placeholder);
  flex-shrink: 0;
}

.entry-arrow svg {
  width: 20px;
  height: 20px;
}

.entry-card:hover .entry-arrow {
  color: var(--entry-color);
}

/* Secondary Entry Cards */
.secondary-entries {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-sm);
  margin-top: var(--spacing-xs);
}

.secondary-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  text-decoration: none;
  transition: all var(--transition-fast);
}

.secondary-card:hover {
  border-color: var(--secondary-color, var(--color-primary));
  background: var(--secondary-bg);
}

.secondary-card:active {
  transform: scale(0.98);
}

/* Secondary card colors */
.secondary-card-grade { --secondary-color: #4ECDC4; --secondary-bg: rgba(78, 205, 196, 0.08); }
.secondary-card-wall { --secondary-color: #74B9FF; --secondary-bg: rgba(116, 185, 255, 0.08); }

.secondary-icon {
  width: 40px;
  height: 40px;
  background: var(--secondary-bg, var(--color-border));
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--secondary-color, var(--color-text-secondary));
}

.secondary-icon svg {
  width: 20px;
  height: 20px;
}

.secondary-label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text);
}

/* ===== Footer ===== */
.footer {
  border-top: 1px solid var(--color-border);
  padding: var(--spacing-md) 10px;
  padding-bottom: calc(var(--spacing-md) + env(safe-area-inset-bottom, 0px));
  margin-top: auto;
  background: var(--color-card);
}

.footer-container {
  max-width: 1400px;
  margin: 0 auto;
  text-align: center;
}

.icp-link {
  display: block;
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
  text-decoration: none;
  margin-top: var(--spacing-sm);
  transition: color var(--transition-fast);
}

.icp-link:hover {
  color: var(--color-text-secondary);
}

.footer-links {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.footer-links a {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: color var(--transition-fast);
}

.footer-links a:hover {
  color: var(--color-primary);
}

.copyright {
  color: var(--color-text-secondary);
  font-size: var(--text-xs);
}

/* ===== Animations ===== */
/* Collapse Animation */
.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}

.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-8px);
}

.collapse-enter-to,
.collapse-leave-from {
  opacity: 1;
  max-height: 500px;
  transform: translateY(0);
}

/* Menu Fade */
.menu-fade-enter-active,
.menu-fade-leave-active {
  transition: opacity var(--transition-normal);
}

.menu-fade-enter-from,
.menu-fade-leave-to {
  opacity: 0;
}

/* Menu Slide */
.menu-slide-enter-active,
.menu-slide-leave-active {
  transition: transform 280ms cubic-bezier(0.4, 0, 0.2, 1);
}

.menu-slide-enter-from,
.menu-slide-leave-to {
  transform: translateX(-100%);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--transition-fast);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ===== Responsive - Tablet ===== */
@media (min-width: 640px) {
  .user-name {
    display: block;
  }

  /* Banner Section */
  .banner-section {
    padding: var(--spacing-lg) var(--spacing-lg);
    padding-bottom: var(--spacing-md);
  }

  .banner-content {
    padding: var(--spacing-xl) var(--spacing-lg);
    min-height: 160px;
  }

  .banner-title {
    font-size: var(--text-xl);
  }

  .banner-illustration {
    width: 100px;
    height: 100px;
  }

  /* Entry Section */
  .entry-section {
    padding: var(--spacing-md) var(--spacing-lg);
  }

  .entry-card {
    padding: var(--spacing-lg);
  }

  .entry-icon {
    width: 56px;
    height: 56px;
  }

  .entry-icon svg {
    width: 28px;
    height: 28px;
  }

  .entry-title {
    font-size: var(--text-lg);
  }

  .secondary-card {
    padding: var(--spacing-lg);
  }

  .secondary-icon {
    width: 48px;
    height: 48px;
  }

  .secondary-icon svg {
    width: 24px;
    height: 24px;
  }
}

/* ===== Responsive - Desktop ===== */
@media (min-width: 1024px) {
  .header-container {
    padding: var(--spacing-sm) var(--spacing-xl);
    gap: var(--spacing-lg);
  }

  .header-center {
    position: static;
    transform: none;
  }

  /* 桌面端显示顶部导航链接 */
  .nav-links {
    display: flex;
    flex: 1;
  }

  .mobile-menu-btn {
    display: none;
  }

  .desktop-only {
    display: inline-flex;
  }

  .user-name-btn {
    display: inline-flex;
  }

  /* 桌面端内容包裹器 - 侧边栏和主内容并排 */
  .content-wrapper {
    display: flex;
    flex: 1;
  }

  /* 桌面端侧边栏显示 */
  .desktop-sidebar {
    display: flex;
    flex-direction: column;
    width: 240px;
    flex-shrink: 0;
    background: var(--color-card);
    border-right: 1px solid var(--color-border);
    height: calc(100vh - 57px);
    position: sticky;
    top: 57px;
    overflow: hidden;
  }

  /* 主内容区域 */
  .main-content-area {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  /* 侧边栏用户区域 */
  .sidebar-user-section {
    display: flex;
    align-items: center;
    padding: var(--spacing-lg);
    background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
    color: white;
    cursor: pointer;
    transition: opacity var(--transition-fast);
  }

  .sidebar-user-section:hover {
    opacity: 0.95;
  }

  .sidebar-user-info {
    flex: 1;
    min-width: 0;
  }

  .sidebar-user-name {
    display: block;
    font-size: var(--text-base);
    font-weight: var(--font-semibold);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .sidebar-user-status {
    display: block;
    font-size: var(--text-xs);
    opacity: 0.8;
    margin-top: 2px;
  }

  .sidebar-user-signature {
    display: block;
    font-size: var(--text-xs);
    opacity: 0.85;
    margin-top: 2px;
    font-style: italic;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sidebar-login-btn {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    font-size: var(--text-xs);
    padding: 4px 12px;
    border-radius: var(--radius-full);
    cursor: pointer;
    margin-top: 4px;
    transition: all var(--transition-fast);
  }

  .sidebar-login-btn:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  /* 侧边栏可滚动内容区域 */
  .sidebar-scroll-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    display: flex;
    flex-direction: column;
    -webkit-overflow-scrolling: touch;
  }

  /* 侧边栏导航区域 */
  .sidebar-nav-section {
    padding: var(--spacing-sm) var(--spacing-md);
  }

  .sidebar-section-header {
    display: flex;
    align-items: center;
    padding: var(--spacing-xs) var(--spacing-sm);
  }

  .sidebar-section-title {
    font-size: var(--text-xs);
    font-weight: var(--font-semibold);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .sidebar-nav {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .sidebar-nav-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: var(--color-text);
    text-decoration: none;
    border-radius: var(--radius-lg);
    transition: all var(--transition-fast);
    background: transparent;
    border: none;
    cursor: pointer;
    width: 100%;
    text-align: left;
  }

  .sidebar-nav-item:hover {
    background: var(--color-border);
  }

  .sidebar-nav-item.active,
  .sidebar-nav-item.router-link-exact-active {
    background: var(--color-primary-bg);
    color: var(--color-primary);
  }

  .sidebar-nav-item.active .sidebar-nav-icon,
  .sidebar-nav-item.router-link-exact-active .sidebar-nav-icon {
    background: var(--color-primary);
    color: white;
  }

  .sidebar-nav-icon {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-border);
    border-radius: var(--radius-md);
    flex-shrink: 0;
    transition: all var(--transition-fast);
  }

  .sidebar-nav-icon svg {
    width: 18px;
    height: 18px;
  }

  .sidebar-nav-icon.logout {
    background: rgba(239, 68, 68, 0.1);
    color: #EF4444;
  }

  .sidebar-nav-icon.admin {
    background: rgba(139, 92, 246, 0.1);
    color: #8B5CF6;
  }

  .sidebar-nav-icon.messages {
    background: rgba(139, 92, 246, 0.1);
    color: #8B5CF6;
  }

  .sidebar-nav-item.logout-item {
    color: #EF4444;
  }

  .sidebar-nav-item.logout-item:hover {
    background: rgba(239, 68, 68, 0.1);
  }

  /* 侧边栏底部信息 */
  .sidebar-footer {
    flex-shrink: 0;
    padding: var(--spacing-md);
    border-top: 1px solid var(--color-border);
    text-align: center;
    background: var(--color-card);
  }

  .sidebar-brand {
    font-size: var(--text-xs);
    font-weight: var(--font-semibold);
    color: var(--color-text-secondary);
    margin-bottom: 4px;
  }

  .sidebar-credit {
    font-size: 10px;
    color: var(--color-text-placeholder);
  }

  /* 主内容区域占据剩余空间 */
  .main {
    flex: 1;
    min-width: 0;
  }

  /* Banner & Entry Desktop 适配 */
  .banner-section {
    padding: var(--spacing-xl) var(--spacing-xl);
    padding-bottom: var(--spacing-md);
  }

  .banner-container,
  .entry-container {
    max-width: 700px;
  }

  .banner-content {
    min-height: 180px;
    padding: var(--spacing-xl);
  }

  .banner-title {
    font-size: var(--text-2xl);
  }

  .banner-illustration {
    width: 120px;
    height: 120px;
  }

  .entry-section {
    padding: var(--spacing-md) var(--spacing-xl);
    padding-bottom: var(--spacing-2xl);
  }

  .entry-card {
    padding: var(--spacing-lg);
  }

  .footer {
    padding: var(--spacing-xl);
  }

  .footer-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    text-align: left;
  }

  .footer-links {
    margin-bottom: 0;
  }

  .copyright {
    font-size: var(--text-sm);
  }
}

/* ===== Responsive - Large Desktop ===== */
@media (min-width: 1280px) {
  .header-container,
  .banner-container,
  .entry-container,
  .footer-container {
    padding-left: var(--spacing-2xl);
    padding-right: var(--spacing-2xl);
  }

  .banner-container,
  .entry-container {
    max-width: 800px;
  }
}

/* ===== Modal ===== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--spacing-md);
}

.modal-content {
  background: var(--color-card);
  border-radius: var(--radius-xl);
  padding: var(--spacing-xl);
  max-width: 320px;
  width: 100%;
  text-align: center;
  box-shadow: var(--shadow-xl);
}

.modal-title {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-sm);
}

.modal-message {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-lg);
}

.modal-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.modal-btn {
  flex: 1;
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.modal-btn.cancel {
  background: var(--color-border);
  border: none;
  color: var(--color-text);
}

.modal-btn.cancel:hover {
  background: var(--color-text-placeholder);
}

.modal-btn.confirm {
  background: var(--color-error);
  border: none;
  color: white;
}

.modal-btn.confirm:hover {
  background: #dc2626;
}

/* Modal Animations */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity var(--transition-normal);
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-scale-enter-active,
.modal-scale-leave-active {
  transition: all var(--transition-normal);
}

.modal-scale-enter-from,
.modal-scale-leave-to {
  opacity: 0;
  transform: scale(0.9);
}
</style>
