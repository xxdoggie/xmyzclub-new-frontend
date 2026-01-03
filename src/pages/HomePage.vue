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

// Banner 轮播数据
const banners: Array<{
  title: string
  subtitle: string
  gradient: string
}> = [
  {
    title: '欢迎来到厦门一中学生社区',
    subtitle: '连接校园，分享青春',
    gradient: 'from-primary to-primary-dark',
  },
  {
    title: '社团招新季火热进行中',
    subtitle: '发现你的热爱，加入精彩社团',
    gradient: 'from-secondary to-info',
  },
  {
    title: '失物招领平台已上线',
    subtitle: '帮助同学找回遗失物品',
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
  }, 5000)
})

function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
}

function handleLogin() {
  userStore.openLoginModal()
}

function handleLogout() {
  userStore.logout()
  toast.success('已退出登录')
}

function goToAuth() {
  router.push('/auth')
}

// 需要登录的功能点击
function handleProtectedAction(name: string) {
  if (userStore.isLoggedIn) {
    toast.info(`功能 "${name}" 开发中...`)
  } else {
    userStore.openLoginModal()
  }
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
        <!-- Logo -->
        <div class="header-left">
          <div class="logo">
            <span class="logo-icon">X</span>
          </div>
          <div class="logo-text">
            <h1 class="logo-title">XMYZ Club</h1>
            <p class="logo-subtitle">厦门一中学生社区</p>
          </div>
        </div>

        <!-- Desktop Navigation -->
        <nav class="nav-links">
          <a href="#" class="nav-link active">首页</a>
          <a href="#" class="nav-link">动态</a>
          <a href="#" class="nav-link">社团</a>
          <a href="#" class="nav-link">失物招领</a>
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
            <div class="user-menu">
              <div class="user-avatar">
                {{ userStore.user?.nickname?.charAt(0) || 'U' }}
              </div>
              <span class="user-name">{{ userStore.user?.nickname }}</span>
              <button class="btn-text" @click="handleLogout">退出</button>
            </div>
          </template>
          <template v-else>
            <button class="btn btn-ghost btn-sm desktop-only" @click="handleLogin">登录</button>
            <button class="btn btn-primary btn-sm desktop-only" @click="goToAuth">注册</button>
          </template>

          <!-- Mobile Menu Button -->
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
        </div>
      </div>

      <!-- Mobile Menu -->
      <Transition name="slide-down">
        <div v-if="isMobileMenuOpen" class="mobile-menu">
          <nav class="mobile-nav">
            <a href="#" class="mobile-nav-link active">首页</a>
            <a href="#" class="mobile-nav-link">动态</a>
            <a href="#" class="mobile-nav-link">社团</a>
            <a href="#" class="mobile-nav-link">失物招领</a>
          </nav>
          <div class="mobile-menu-footer" v-if="!userStore.isLoggedIn">
            <button class="btn btn-ghost btn-block" @click="handleLogin">登录</button>
            <button class="btn btn-primary btn-block" @click="goToAuth">注册</button>
          </div>
          <div class="mobile-menu-footer" v-else>
            <div class="mobile-user-info">
              <div class="user-avatar">{{ userStore.user?.nickname?.charAt(0) || 'U' }}</div>
              <span>{{ userStore.user?.nickname }}</span>
            </div>
            <button class="btn btn-ghost btn-block" @click="handleLogout">退出登录</button>
          </div>
        </div>
      </Transition>
    </header>

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
              <div class="hero-actions" v-if="!userStore.isLoggedIn">
                <button class="btn btn-hero-primary" @click="goToAuth">立即加入</button>
                <button class="btn btn-hero-ghost" @click="handleLogin">已有账号</button>
              </div>
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

      <!-- Bento Grid Section -->
      <section class="bento-section">
        <div class="bento-container">
          <!-- Quick Actions - Mobile First -->
          <div class="bento-quick-actions">
            <h3 class="section-label">快捷入口</h3>
            <div class="quick-grid">
              <button class="quick-card" @click="handleProtectedAction('课程表')">
                <div class="quick-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                </div>
                <span class="quick-label">课程表</span>
              </button>
              <button class="quick-card" @click="handleProtectedAction('公告')">
                <div class="quick-icon secondary">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                  </svg>
                </div>
                <span class="quick-label">公告</span>
              </button>
              <button class="quick-card" @click="handleProtectedAction('社团')">
                <div class="quick-icon accent">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </div>
                <span class="quick-label">社团</span>
              </button>
              <button class="quick-card" @click="handleProtectedAction('失物招领')">
                <div class="quick-icon info">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </div>
                <span class="quick-label">失物招领</span>
              </button>
            </div>
          </div>

          <!-- Main Content Grid - Desktop -->
          <div class="bento-grid">
            <!-- User Card -->
            <div class="bento-card bento-user">
              <div class="user-card-content" v-if="userStore.isLoggedIn">
                <div class="user-card-avatar large">
                  {{ userStore.user?.nickname?.charAt(0) || 'U' }}
                </div>
                <div class="user-card-info">
                  <h4 class="user-card-name">{{ userStore.user?.nickname }}</h4>
                  <p class="user-card-meta">欢迎回来</p>
                </div>
              </div>
              <div class="user-card-content guest" v-else>
                <div class="user-card-avatar large guest">?</div>
                <div class="user-card-info">
                  <h4 class="user-card-name">游客</h4>
                  <p class="user-card-meta">
                    <button class="link-btn" @click="handleLogin">登录</button>
                    加入社区
                  </p>
                </div>
              </div>
            </div>

            <!-- Feed Card - Large -->
            <div class="bento-card bento-feed">
              <div class="card-header">
                <h3 class="card-title">最新动态</h3>
                <button class="btn-text">查看全部</button>
              </div>
              <div class="feed-list">
                <div class="feed-item feed-placeholder">
                  <div class="feed-avatar"></div>
                  <div class="feed-body">
                    <div class="feed-line feed-line-short"></div>
                    <div class="feed-line"></div>
                    <div class="feed-line feed-line-medium"></div>
                  </div>
                </div>
                <div class="feed-item feed-placeholder">
                  <div class="feed-avatar"></div>
                  <div class="feed-body">
                    <div class="feed-line feed-line-short"></div>
                    <div class="feed-line"></div>
                  </div>
                </div>
                <div class="feed-item feed-placeholder">
                  <div class="feed-avatar"></div>
                  <div class="feed-body">
                    <div class="feed-line feed-line-short"></div>
                    <div class="feed-line feed-line-medium"></div>
                  </div>
                </div>
              </div>
              <p class="placeholder-hint">动态功能开发中...</p>
            </div>

            <!-- Quick Functions - Desktop -->
            <div class="bento-card bento-functions desktop-only">
              <h3 class="card-title">快捷功能</h3>
              <div class="function-list">
                <button class="function-item" @click="handleProtectedAction('课程表')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <span>课程表</span>
                </button>
                <button class="function-item" @click="handleProtectedAction('公告')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                  </svg>
                  <span>公告</span>
                </button>
                <button class="function-item" @click="handleProtectedAction('社团')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                  <span>社团</span>
                </button>
                <button class="function-item" @click="handleProtectedAction('失物招领')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <span>失物招领</span>
                </button>
              </div>
            </div>

            <!-- Hot Topics -->
            <div class="bento-card bento-topics">
              <h3 class="card-title">热门话题</h3>
              <div class="topic-list">
                <div class="topic-item placeholder">
                  <span class="topic-rank hot">1</span>
                  <div class="topic-line"></div>
                </div>
                <div class="topic-item placeholder">
                  <span class="topic-rank">2</span>
                  <div class="topic-line"></div>
                </div>
                <div class="topic-item placeholder">
                  <span class="topic-rank">3</span>
                  <div class="topic-line"></div>
                </div>
                <div class="topic-item placeholder">
                  <span class="topic-rank">4</span>
                  <div class="topic-line"></div>
                </div>
                <div class="topic-item placeholder">
                  <span class="topic-rank">5</span>
                  <div class="topic-line"></div>
                </div>
              </div>
              <p class="placeholder-hint-sm">话题功能开发中...</p>
            </div>

            <!-- Dev Resources -->
            <div class="bento-card bento-resources desktop-only">
              <h3 class="card-title">开发资源</h3>
              <div class="resource-list">
                <router-link to="/design-system" class="resource-item">
                  <div class="resource-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="13.5" cy="6.5" r="2.5"></circle>
                      <path d="M22 17l-3.5-2-1.5 1-4-2"></path>
                      <path d="M2 17l3.5-2 1.5 1 4-2"></path>
                      <path d="M10 21l2-4 2 4"></path>
                    </svg>
                  </div>
                  <div class="resource-info">
                    <span class="resource-name">设计系统</span>
                    <span class="resource-desc">UI 组件库</span>
                  </div>
                  <svg class="resource-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </router-link>
                <router-link to="/auth" class="resource-item">
                  <div class="resource-icon secondary">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                      <polyline points="10 17 15 12 10 7"></polyline>
                      <line x1="15" y1="12" x2="3" y2="12"></line>
                    </svg>
                  </div>
                  <div class="resource-info">
                    <span class="resource-name">登录页面</span>
                    <span class="resource-desc">大屏设计</span>
                  </div>
                  <svg class="resource-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </router-link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- Footer -->
    <footer class="footer">
      <div class="footer-container">
        <div class="footer-brand">
          <div class="logo small">
            <span class="logo-icon">X</span>
          </div>
          <span class="footer-brand-text">XMYZ Club</span>
        </div>
        <div class="footer-links">
          <a href="#">关于我们</a>
          <a href="#">使用条款</a>
          <a href="#">隐私政策</a>
          <a href="#">帮助中心</a>
        </div>
        <p class="copyright">&copy; 2024 厦门一中学生社区</p>
      </div>
    </footer>
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
  padding: var(--spacing-sm) var(--spacing-md);
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.logo {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  color: white;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: var(--shadow-sm);
}

.logo.small {
  width: 32px;
  height: 32px;
}

.logo.small .logo-icon {
  font-size: var(--text-base);
}

.logo-icon {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
}

.logo-text {
  display: none;
}

.logo-title {
  font-size: var(--text-base);
  font-weight: var(--font-bold);
  line-height: 1.2;
}

.logo-subtitle {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
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

/* Mobile Menu */
.mobile-menu {
  background: var(--color-card);
  border-top: 1px solid var(--color-border);
  padding: var(--spacing-md);
}

.mobile-nav {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.mobile-nav-link {
  padding: var(--spacing-md);
  font-size: var(--text-base);
  color: var(--color-text);
  text-decoration: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.mobile-nav-link:hover,
.mobile-nav-link.active {
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

.mobile-menu-footer {
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.mobile-user-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  font-weight: var(--font-medium);
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
  padding: var(--spacing-md);
  padding-bottom: 0;
}

.hero-container {
  max-width: 1400px;
  margin: 0 auto;
}

.hero-banner {
  position: relative;
  border-radius: var(--radius-xl);
  padding: var(--spacing-xl) var(--spacing-lg);
  overflow: hidden;
  min-height: 180px;
  display: flex;
  align-items: center;
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

/* Bento Section */
.bento-section {
  padding: var(--spacing-lg) var(--spacing-md);
}

.bento-container {
  max-width: 1400px;
  margin: 0 auto;
}

.section-label {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-md);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Quick Actions - Mobile */
.bento-quick-actions {
  margin-bottom: var(--spacing-lg);
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-sm);
}

.quick-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-sm);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.quick-card:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-bg);
  transform: translateY(-2px);
}

.quick-card:active {
  transform: scale(0.96);
}

.quick-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary-bg);
  color: var(--color-primary);
  border-radius: var(--radius-lg);
}

.quick-icon.secondary {
  background: rgba(6, 182, 212, 0.1);
  color: var(--color-secondary);
}

.quick-icon.accent {
  background: rgba(245, 158, 11, 0.1);
  color: var(--color-accent);
}

.quick-icon.info {
  background: var(--color-info-bg);
  color: var(--color-info);
}

.quick-icon svg {
  width: 22px;
  height: 22px;
}

.quick-label {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  font-weight: var(--font-medium);
}

/* Bento Grid */
.bento-grid {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.bento-card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-md);
}

.card-title {
  font-size: var(--text-base);
  font-weight: var(--font-bold);
}

/* User Card */
.user-card-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.user-card-avatar {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  flex-shrink: 0;
}

.user-card-avatar.large {
  width: 56px;
  height: 56px;
  font-size: var(--text-xl);
}

.user-card-avatar.guest {
  background: var(--color-border);
  color: var(--color-text-secondary);
}

.user-card-name {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
}

.user-card-meta {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

/* Feed */
.feed-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.feed-item {
  display: flex;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--color-bg);
  border-radius: var(--radius-md);
}

.feed-placeholder .feed-avatar {
  width: 40px;
  height: 40px;
  background: var(--color-border);
  border-radius: 50%;
  flex-shrink: 0;
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

.feed-placeholder .feed-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.feed-placeholder .feed-line {
  height: 12px;
  background: var(--color-border);
  border-radius: var(--radius-sm);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

.feed-placeholder .feed-line-short {
  width: 30%;
}

.feed-placeholder .feed-line-medium {
  width: 60%;
}

@keyframes skeleton-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.placeholder-hint {
  text-align: center;
  color: var(--color-text-placeholder);
  font-size: var(--text-sm);
  margin-top: var(--spacing-md);
}

.placeholder-hint-sm {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
  margin-top: var(--spacing-sm);
}

/* Function List - Desktop */
.function-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.function-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  color: var(--color-text);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: left;
}

.function-item:hover {
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

.function-item svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

/* Topics */
.topic-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.topic-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.topic-rank {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-border);
  color: var(--color-text-secondary);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
}

.topic-rank.hot {
  background: var(--color-primary);
  color: white;
}

.topic-item.placeholder .topic-line {
  flex: 1;
  height: 14px;
  background: var(--color-border);
  border-radius: var(--radius-sm);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

/* Resources */
.resource-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.resource-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  border-radius: var(--radius-md);
  text-decoration: none;
  color: inherit;
  transition: all var(--transition-fast);
}

.resource-item:hover {
  background: var(--color-bg);
}

.resource-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary-bg);
  color: var(--color-primary);
  border-radius: var(--radius-md);
  flex-shrink: 0;
}

.resource-icon.secondary {
  background: var(--color-info-bg);
  color: var(--color-info);
}

.resource-icon svg {
  width: 20px;
  height: 20px;
}

.resource-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.resource-name {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.resource-desc {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.resource-arrow {
  width: 16px;
  height: 16px;
  color: var(--color-text-placeholder);
}

/* ===== Footer ===== */
.footer {
  border-top: 1px solid var(--color-border);
  padding: var(--spacing-lg) var(--spacing-md);
  padding-bottom: calc(var(--spacing-lg) + env(safe-area-inset-bottom, 0px));
  margin-top: auto;
  background: var(--color-card);
}

.footer-container {
  max-width: 1400px;
  margin: 0 auto;
  text-align: center;
}

.footer-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.footer-brand-text {
  font-size: var(--text-base);
  font-weight: var(--font-bold);
  color: var(--color-text);
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
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all var(--transition-normal);
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
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
  .logo-text {
    display: block;
  }

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
    min-height: 200px;
    padding: var(--spacing-2xl) var(--spacing-xl);
  }

  .quick-icon {
    width: 52px;
    height: 52px;
  }

  .quick-icon svg {
    width: 26px;
    height: 26px;
  }

  .quick-label {
    font-size: var(--text-sm);
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
  }

  .nav-links {
    display: flex;
  }

  .mobile-menu-btn {
    display: none;
  }

  .desktop-only {
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

  .bento-section {
    padding: var(--spacing-xl);
  }

  .bento-quick-actions {
    display: none;
  }

  /* Desktop Bento Grid Layout */
  .bento-grid {
    display: grid;
    grid-template-columns: 280px 1fr 300px;
    grid-template-rows: auto auto;
    gap: var(--spacing-lg);
  }

  .bento-user {
    grid-column: 1;
    grid-row: 1;
  }

  .bento-functions {
    grid-column: 1;
    grid-row: 2;
  }

  .bento-feed {
    grid-column: 2;
    grid-row: 1 / 3;
  }

  .bento-topics {
    grid-column: 3;
    grid-row: 1;
  }

  .bento-resources {
    grid-column: 3;
    grid-row: 2;
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

  .footer-brand {
    margin-bottom: 0;
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
  .bento-container,
  .footer-container {
    padding-left: var(--spacing-2xl);
    padding-right: var(--spacing-2xl);
  }

  .bento-grid {
    grid-template-columns: 300px 1fr 320px;
  }
}
</style>
