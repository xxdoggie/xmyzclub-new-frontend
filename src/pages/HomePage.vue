<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
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
const currentBannerIndex = ref(0)

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

// Banner 轮播数据
const banners: Array<{
  title: string
  subtitle: string
  gradient: string
}> = [
  {
    title: '欢迎来到厦门一中学生社区',
    subtitle: '厦门一中学生社区，又名文园九四三站台，于2023年底启用，是厦门一中最大的非官方学生社区，集成宿舍铃声投稿投票、活动抢票、评分社区、成绩查询等功能为一体，为所有厦门一中学生提供便捷的一站式服务。',
    gradient: 'from-primary to-primary-dark',
  },
  {
    title: '评分社区重新上线',
    subtitle: '评分社区于2024年首次公开测试，模仿虎扑平台评分模式，一经推出便受到广泛好评。后续将开放用户自主上传评分项目功能，更多评分由你做主！',
    gradient: 'from-secondary to-info',
  },
  {
    title: '这是一张轮播图',
    subtitle: '不要看了，这真的只是一张轮播图，只是我不知道放什么。或许你会对厦门高中生王者荣耀电竞联赛感兴趣吗？可以访问 xmkhsl.com 看看哦。',
    gradient: 'from-accent to-warning',
  },
]

// 当前 banner 计算属性（非空断言因为 index 永远在有效范围内）
const currentBanner = computed(() => {
  const banner = banners[currentBannerIndex.value]
  return banner!
})

// 轮播自动切换
onMounted(() => {
  setInterval(() => {
    currentBannerIndex.value = (currentBannerIndex.value + 1) % banners.length
  }, 10000)

  // 检查是否需要启动评分社区引导
  if (shouldStartTour() && getCurrentStep() === TourStep.HOME_COMMUNITY_ENTRY) {
    setTimeout(() => {
      startHomeTour()
    }, 500)
  }
})

onUnmounted(() => {
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

function goToBanner(index: number) {
  currentBannerIndex.value = index
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
          <div class="sidebar-nav-section" v-if="userStore.canManageTickets || userStore.canManageCampaigns || userStore.canManageRating || userStore.canManageMessages">
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
        <div class="drawer-nav-section" v-if="userStore.canManageTickets || userStore.canManageCampaigns || userStore.canManageRating || userStore.canManageMessages">
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
      <!-- Hero Banner Section - 轻量现代风格 -->
      <section class="hero-section">
        <div class="hero-container">
          <div class="hero-banner-modern">
            <div class="hero-bg"></div>
            <div class="hero-content">
              <Transition name="fade" mode="out-in">
                <div :key="currentBannerIndex" class="hero-text">
                  <h2 class="hero-title">{{ currentBanner.title }}</h2>
                  <p class="hero-subtitle">{{ currentBanner.subtitle }}</p>
                </div>
              </Transition>
              <!-- Banner Indicators 内嵌 -->
              <div class="hero-indicators-inline">
                <button
                  v-for="(_, index) in banners"
                  :key="index"
                  class="indicator-dot"
                  :class="{ active: currentBannerIndex === index }"
                  @click="goToBanner(index)"
                ></button>
              </div>
            </div>
            <!-- 浮动装饰图标 -->
            <div class="hero-decoration">
              <svg class="float-icon" style="--delay: 0s; --x: 75%; --y: 15%;" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
              <svg class="float-icon" style="--delay: 0.5s; --x: 88%; --y: 40%;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                <line x1="9" y1="9" x2="9.01" y2="9"></line>
                <line x1="15" y1="9" x2="15.01" y2="9"></line>
              </svg>
              <svg class="float-icon" style="--delay: 1s; --x: 80%; --y: 70%;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
              </svg>
            </div>
          </div>
        </div>
      </section>

      <!-- Quick Actions Section - 网格图标风格 -->
      <section class="quick-section">
        <div class="quick-container">
          <div class="content-card">
            <div class="card-header">
              <h3 class="card-header-title">快捷入口</h3>
            </div>
            <div class="quick-grid">
              <router-link to="/ticket" class="quick-item quick-item-1">
                <div class="quick-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                </div>
                <span class="quick-label">活动抢票</span>
              </router-link>

              <router-link to="/ringtone" class="quick-item quick-item-2">
                <div class="quick-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M9 18V5l12-2v13"></path>
                    <circle cx="6" cy="18" r="3"></circle>
                    <circle cx="18" cy="16" r="3"></circle>
                  </svg>
                </div>
                <span class="quick-label">宿舍铃声</span>
              </router-link>

              <router-link to="/grade" class="quick-item quick-item-3">
                <div class="quick-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                  </svg>
                </div>
                <span class="quick-label">分数查询</span>
              </router-link>

              <router-link to="/community" id="tour-community-entry" class="quick-item quick-item-4">
                <div class="quick-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                </div>
                <span class="quick-label">评分社区</span>
              </router-link>

              <router-link to="/wall" class="quick-item quick-item-5">
                <div class="quick-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="3" y1="9" x2="21" y2="9"></line>
                    <line x1="9" y1="21" x2="9" y2="9"></line>
                  </svg>
                </div>
                <span class="quick-label">厦一万能墙</span>
              </router-link>
            </div>
          </div>
        </div>
      </section>

      <!-- Update Log Section -->
      <section class="changelog-section">
        <div class="changelog-container">
          <div class="content-card">
            <div class="card-header">
              <h3 class="card-header-title">
                <svg class="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <line x1="10" y1="9" x2="8" y2="9"></line>
                </svg>
                更新日志
              </h3>
            </div>
            <ul class="changelog-list">
              <li class="changelog-item">
                <div class="changelog-dot"></div>
                <span>重新设计网站视觉效果，移动端体验更佳</span>
              </li>
              <li class="changelog-item">
                <div class="changelog-dot"></div>
                <span>重新设计宿舍铃声投稿/投票功能，修复投票时在部分设备上可能存在的歌曲重叠问题，并优化投稿时歌曲搜索相关逻辑</span>
              </li>
              <li class="changelog-item">
                <div class="changelog-dot"></div>
                <span>重新开放好分数账号绑定及成绩查询功能</span>
              </li>
              <li class="changelog-item">
                <div class="changelog-dot"></div>
                <span>重新开放评分社区，后续将启用用户自主上传功能</span>
              </li>
              <li class="changelog-item">
                <div class="changelog-dot"></div>
                <span>重新设计活动抢票视觉效果，优化操作逻辑</span>
              </li>
            </ul>
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
}

/* ===== Hero Section - 轻量现代风格 ===== */
.hero-section {
  padding: var(--spacing-md);
  padding-bottom: 0;
}

.hero-container {
  max-width: 800px;
  margin: 0 auto;
}

.hero-banner-modern {
  position: relative;
  border-radius: var(--radius-lg);
  overflow: hidden;
  padding: var(--spacing-lg);
}

.hero-banner-modern .hero-bg {
  position: absolute;
  inset: 0;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.hero-banner-modern .hero-content {
  position: relative;
  z-index: 1;
}

.hero-banner-modern .hero-text {
  margin-bottom: var(--spacing-sm);
}

.hero-banner-modern .hero-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-xs);
  letter-spacing: -0.02em;
  color: var(--color-text);
}

.hero-banner-modern .hero-subtitle {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 轮播指示点 - 内嵌样式 */
.hero-indicators-inline {
  display: flex;
  gap: var(--spacing-xs);
  margin-top: var(--spacing-md);
}

.hero-indicators-inline .indicator-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-border);
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.hero-indicators-inline .indicator-dot.active {
  background: var(--color-primary);
  width: 18px;
  border-radius: var(--radius-full);
}

/* 浮动装饰图标 */
.hero-banner-modern .hero-decoration {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.hero-banner-modern .float-icon {
  position: absolute;
  left: var(--x);
  top: var(--y);
  width: 18px;
  height: 18px;
  color: var(--color-primary);
  opacity: 0.35;
  animation: float 3s ease-in-out infinite;
  animation-delay: var(--delay);
}

@keyframes float {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  50% {
    transform: translateY(-6px) rotate(5deg);
  }
}

/* ===== Quick Actions Section - 网格图标风格 ===== */
.quick-section {
  padding: var(--spacing-md);
  padding-top: var(--spacing-sm);
}

.quick-container {
  max-width: 800px;
  margin: 0 auto;
}

/* 内容卡片 */
.content-card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
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
  color: var(--color-text);
}

/* 快捷入口网格 */
.quick-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--spacing-xs);
  padding: var(--spacing-sm);
}

.quick-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--spacing-sm);
  border-radius: var(--radius-md);
  text-decoration: none;
  cursor: pointer;
  transition: all var(--transition-normal);
}

.quick-item:hover {
  background: var(--color-bg-hover, rgba(0, 0, 0, 0.03));
}

.quick-item:active {
  transform: scale(0.96);
}

/* 快捷入口颜色主题 */
.quick-item-1 { --item-color: #FF6B6B; --item-bg: rgba(255, 107, 107, 0.1); }
.quick-item-2 { --item-color: #4ECDC4; --item-bg: rgba(78, 205, 196, 0.1); }
.quick-item-3 { --item-color: #A29BFE; --item-bg: rgba(162, 155, 254, 0.1); }
.quick-item-4 { --item-color: #FDCB6E; --item-bg: rgba(253, 203, 110, 0.1); }
.quick-item-5 { --item-color: #74B9FF; --item-bg: rgba(116, 185, 255, 0.1); }

.quick-icon {
  width: 40px;
  height: 40px;
  background: var(--item-bg);
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 6px;
  color: var(--item-color);
  transition: transform var(--transition-fast);
}

.quick-item:hover .quick-icon {
  transform: scale(1.08);
}

.quick-icon svg {
  width: 20px;
  height: 20px;
}

.quick-label {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-text);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

/* ===== Changelog Section ===== */
.changelog-section {
  padding: var(--spacing-md);
  padding-top: 0;
  padding-bottom: var(--spacing-lg);
}

.changelog-container {
  max-width: 800px;
  margin: 0 auto;
}

/* 标题图标样式 */
.card-header-title .title-icon {
  width: 16px;
  height: 16px;
  color: var(--color-primary);
}

.changelog-list {
  list-style: none;
  padding: var(--spacing-sm) var(--spacing-md);
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.changelog-item {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.changelog-dot {
  width: 6px;
  height: 6px;
  background: var(--color-primary);
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 7px;
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

  /* 轮播图 Tablet 适配 */
  .hero-banner-modern {
    padding: var(--spacing-xl);
  }

  .hero-banner-modern .hero-title {
    font-size: var(--text-xl);
  }

  .hero-banner-modern .hero-subtitle {
    -webkit-line-clamp: 4;
  }

  .hero-banner-modern .float-icon {
    width: 22px;
    height: 22px;
  }

  /* 快捷入口 Tablet 适配 */
  .quick-icon {
    width: 48px;
    height: 48px;
  }

  .quick-icon svg {
    width: 24px;
    height: 24px;
  }

  .quick-label {
    font-size: var(--text-sm);
  }

  .card-header {
    padding: var(--spacing-md);
  }

  .card-header-title {
    font-size: var(--text-base);
  }

  .quick-grid {
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
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

  /* 轮播图 Desktop 适配 */
  .hero-section {
    padding: var(--spacing-lg) var(--spacing-xl);
    padding-bottom: 0;
  }

  .hero-container {
    max-width: 900px;
  }

  .hero-banner-modern {
    padding: var(--spacing-2xl);
  }

  .hero-banner-modern .hero-title {
    font-size: var(--text-2xl);
  }

  .hero-banner-modern .hero-subtitle {
    font-size: var(--text-base);
    -webkit-line-clamp: none;
    display: block;
  }

  .hero-banner-modern .float-icon {
    width: 26px;
    height: 26px;
  }

  /* 快捷入口 Desktop 适配 */
  .quick-section,
  .changelog-section {
    padding: var(--spacing-xl);
  }

  .quick-container,
  .changelog-container {
    max-width: 900px;
  }

  .quick-icon {
    width: 52px;
    height: 52px;
  }

  .quick-icon svg {
    width: 26px;
    height: 26px;
  }

  .changelog-card {
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
  .hero-container,
  .quick-container,
  .changelog-container,
  .footer-container {
    padding-left: var(--spacing-2xl);
    padding-right: var(--spacing-2xl);
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
