<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const userStore = useUserStore()
const toast = useToast()

const isDark = ref(false)
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
})

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
        <div class="drawer-nav-section" v-if="userStore.canManageTickets || userStore.canManageCampaigns">
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
      <!-- Hero Banner Section -->
      <section class="hero-section">
        <div class="hero-container">
          <div class="hero-banner" :class="currentBanner.gradient">
            <div class="hero-content">
              <Transition name="fade" mode="out-in">
                <div :key="currentBannerIndex" class="hero-text">
                  <h2 class="hero-title">{{ currentBanner.title }}</h2>
                  <p class="hero-subtitle">{{ currentBanner.subtitle }}</p>
                </div>
              </Transition>
            </div>
            <div class="hero-decoration">
              <div class="decoration-circle decoration-circle-1"></div>
              <div class="decoration-circle decoration-circle-2"></div>
              <div class="decoration-circle decoration-circle-3"></div>
            </div>
          </div>
          <!-- Banner Indicators -->
          <div class="hero-indicators">
            <button
              v-for="(_, index) in banners"
              :key="index"
              class="indicator-dot"
              :class="{ active: currentBannerIndex === index }"
              @click="goToBanner(index)"
            ></button>
          </div>
        </div>
      </section>

      <!-- Quick Actions Section -->
      <section class="quick-section">
        <div class="quick-container">
          <h3 class="section-label">快捷入口</h3>
          <div class="quick-actions-grid">
            <router-link to="/ticket" class="action-card">
              <div class="action-icon-wrapper primary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
              <div class="action-content">
                <span class="action-title">活动抢票</span>
                <span class="action-desc">校园活动门票预约</span>
              </div>
              <svg class="action-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </router-link>

            <router-link to="/ringtone" class="action-card">
              <div class="action-icon-wrapper secondary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 18V5l12-2v13"></path>
                  <circle cx="6" cy="18" r="3"></circle>
                  <circle cx="18" cy="16" r="3"></circle>
                </svg>
              </div>
              <div class="action-content">
                <span class="action-title">宿舍铃声</span>
                <span class="action-desc">投稿投票你喜欢的歌</span>
              </div>
              <svg class="action-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </router-link>

            <router-link to="/grade" class="action-card">
              <div class="action-icon-wrapper info">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
              </div>
              <div class="action-content">
                <span class="action-title">分数查询</span>
                <span class="action-desc">查看好分数考试成绩</span>
              </div>
              <svg class="action-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </router-link>

            <router-link to="/community" class="action-card">
              <div class="action-icon-wrapper accent">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              </div>
              <div class="action-content">
                <span class="action-title">评分社区</span>
                <span class="action-desc">万物皆可评分</span>
              </div>
              <svg class="action-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </router-link>
          </div>
        </div>
      </section>

      <!-- Update Log Section -->
      <section class="changelog-section">
        <div class="changelog-container">
          <h3 class="section-label">更新日志</h3>
          <div class="changelog-card">
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

/* Hero Section */
.hero-section {
  padding: 10px;
  padding-bottom: 0;
}

.hero-container {
  max-width: 1400px;
  margin: 0 auto;
}

.hero-banner {
  position: relative;
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg) var(--spacing-md);
  overflow: hidden;
  min-height: 220px;
  display: flex;
  align-items: flex-start;
}

.hero-banner.from-primary {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
}

.hero-banner.from-secondary {
  background: linear-gradient(135deg, var(--color-secondary) 0%, var(--color-info) 100%);
}

.hero-banner.from-accent {
  background: linear-gradient(135deg, var(--color-accent) 0%, #D97706 100%);
}

.hero-content {
  position: relative;
  z-index: 2;
  color: white;
}

.hero-text {
  margin-bottom: var(--spacing-md);
}

.hero-title {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-xs);
  line-height: var(--leading-tight);
}

.hero-subtitle {
  font-size: var(--text-sm);
  opacity: 0.9;
}

.hero-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.btn-hero-primary {
  background: white;
  color: var(--color-primary);
  padding: var(--spacing-sm) var(--spacing-lg);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-hero-primary:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.btn-hero-ghost {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  padding: var(--spacing-sm) var(--spacing-lg);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-hero-ghost:hover {
  background: rgba(255, 255, 255, 0.3);
}

.hero-decoration {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.decoration-circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
}

.decoration-circle-1 {
  width: 200px;
  height: 200px;
  top: -50px;
  right: -50px;
}

.decoration-circle-2 {
  width: 150px;
  height: 150px;
  bottom: -40px;
  right: 80px;
}

.decoration-circle-3 {
  width: 80px;
  height: 80px;
  top: 50%;
  right: 200px;
}

.hero-indicators {
  display: flex;
  justify-content: center;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-md);
}

.indicator-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-border);
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.indicator-dot.active {
  background: var(--color-primary);
  width: 24px;
  border-radius: var(--radius-full);
}

/* ===== Quick Actions Section ===== */
.quick-section {
  padding: var(--spacing-md) 10px;
}

.quick-container {
  max-width: 800px;
  margin: 0 auto;
}

.section-label {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-md);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.quick-actions-grid {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.action-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  text-decoration: none;
  color: inherit;
  transition: all var(--transition-fast);
}

.action-card:hover {
  border-color: var(--color-primary);
  transform: translateX(4px);
  box-shadow: var(--shadow-sm);
}

.action-card:active {
  transform: scale(0.98);
}

.action-icon-wrapper {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-lg);
  flex-shrink: 0;
}

.action-icon-wrapper.primary {
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

.action-icon-wrapper.secondary {
  background: rgba(6, 182, 212, 0.1);
  color: var(--color-secondary);
}

.action-icon-wrapper.info {
  background: var(--color-info-bg);
  color: var(--color-info);
}

.action-icon-wrapper.accent {
  background: rgba(245, 158, 11, 0.1);
  color: var(--color-accent);
}

.action-icon-wrapper svg {
  width: 24px;
  height: 24px;
}

.action-content {
  flex: 1;
  min-width: 0;
}

.action-title {
  display: block;
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-text);
  margin-bottom: 2px;
}

.action-desc {
  display: block;
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.action-arrow {
  width: 20px;
  height: 20px;
  color: var(--color-text-placeholder);
  flex-shrink: 0;
  transition: transform var(--transition-fast);
}

.action-card:hover .action-arrow {
  transform: translateX(4px);
  color: var(--color-primary);
}

/* ===== Changelog Section ===== */
.changelog-section {
  padding: var(--spacing-md) 10px;
  padding-bottom: var(--spacing-lg);
}

.changelog-container {
  max-width: 800px;
  margin: 0 auto;
}

.changelog-card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--spacing-md);
}

.changelog-list {
  list-style: none;
  padding: 0;
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

  .hero-title {
    font-size: var(--text-2xl);
  }

  .hero-subtitle {
    font-size: var(--text-base);
  }

  .hero-banner {
    min-height: 240px;
    padding: var(--spacing-2xl) var(--spacing-xl);
  }

  .action-icon-wrapper {
    width: 52px;
    height: 52px;
  }

  .action-icon-wrapper svg {
    width: 26px;
    height: 26px;
  }

  .decoration-circle-1 {
    width: 300px;
    height: 300px;
  }

  .decoration-circle-2 {
    width: 200px;
    height: 200px;
  }

  .decoration-circle-3 {
    width: 120px;
    height: 120px;
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

  .hero-section {
    padding: var(--spacing-lg) var(--spacing-xl);
    padding-bottom: 0;
  }

  .hero-banner {
    min-height: 280px;
    padding: var(--spacing-2xl);
  }

  .hero-title {
    font-size: var(--text-3xl);
  }

  .hero-subtitle {
    font-size: var(--text-lg);
  }

  .quick-section,
  .changelog-section {
    padding: var(--spacing-xl);
  }

  .quick-container,
  .changelog-container {
    max-width: 900px;
  }

  .quick-actions-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-md);
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
