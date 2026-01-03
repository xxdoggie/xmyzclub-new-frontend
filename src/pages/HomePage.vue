<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const userStore = useUserStore()
const toast = useToast()

const isDark = ref(false)

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
    // TODO: 实际功能实现
    toast.info(`功能 "${name}" 开发中...`)
  } else {
    userStore.openLoginModal()
  }
}
</script>

<template>
  <div class="home">
    <!-- Header -->
    <header class="header">
      <div class="header-container">
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
            <button class="btn btn-ghost btn-sm" @click="handleLogin">登录</button>
            <button class="btn btn-primary btn-sm" @click="goToAuth">注册</button>
          </template>
        </div>
      </div>
    </header>

    <!-- Main Layout -->
    <div class="main-layout">
      <!-- Left Sidebar (Desktop) -->
      <aside class="sidebar sidebar-left">
        <div class="sidebar-card user-card" v-if="userStore.isLoggedIn">
          <div class="user-card-avatar">
            {{ userStore.user?.nickname?.charAt(0) || 'U' }}
          </div>
          <div class="user-card-info">
            <div class="user-card-name">{{ userStore.user?.nickname }}</div>
            <div class="user-card-meta">欢迎回来</div>
          </div>
        </div>
        <div class="sidebar-card user-card" v-else>
          <div class="user-card-avatar guest">?</div>
          <div class="user-card-info">
            <div class="user-card-name">游客</div>
            <div class="user-card-meta">
              <button class="link-btn" @click="handleLogin">登录</button>
              加入社区
            </div>
          </div>
        </div>

        <div class="sidebar-card">
          <h3 class="sidebar-title">快捷功能</h3>
          <div class="sidebar-actions">
            <button class="sidebar-action" @click="handleProtectedAction('课程表')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span>课程表</span>
            </button>
            <button class="sidebar-action" @click="handleProtectedAction('公告')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <span>公告</span>
            </button>
            <button class="sidebar-action" @click="handleProtectedAction('社团')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              <span>社团</span>
            </button>
            <button class="sidebar-action" @click="handleProtectedAction('失物招领')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <span>失物招领</span>
            </button>
          </div>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="main-content">
        <!-- 公告横幅 -->
        <section class="banner">
          <div class="banner-content">
            <span class="banner-tag">公告</span>
            <p class="banner-text">欢迎来到厦门一中学生社区！更多功能正在开发中...</p>
          </div>
        </section>

        <!-- Mobile Quick Actions -->
        <section class="mobile-quick-actions">
          <div class="quick-actions-grid">
            <button class="quick-action-item" @click="handleProtectedAction('课程表')">
              <div class="action-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
              <span>课程表</span>
            </button>
            <button class="quick-action-item" @click="handleProtectedAction('公告')">
              <div class="action-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
              </div>
              <span>公告</span>
            </button>
            <button class="quick-action-item" @click="handleProtectedAction('社团')">
              <div class="action-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <span>社团</span>
            </button>
            <button class="quick-action-item" @click="handleProtectedAction('失物招领')">
              <div class="action-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </div>
              <span>失物招领</span>
            </button>
          </div>
        </section>

        <!-- 最新动态 -->
        <section class="feed-section">
          <div class="section-header">
            <h2 class="section-title">最新动态</h2>
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
        </section>
      </main>

      <!-- Right Sidebar (Desktop) -->
      <aside class="sidebar sidebar-right">
        <div class="sidebar-card">
          <h3 class="sidebar-title">开发资源</h3>
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
            </router-link>
          </div>
        </div>

        <div class="sidebar-card">
          <h3 class="sidebar-title">热门话题</h3>
          <div class="topic-list">
            <div class="topic-item placeholder">
              <span class="topic-rank">1</span>
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
          </div>
          <p class="placeholder-hint-sm">开发中...</p>
        </div>
      </aside>
    </div>

    <!-- Footer -->
    <footer class="footer">
      <div class="footer-container">
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
.home {
  min-height: 100vh;
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
  background: var(--color-primary);
  color: white;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
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
}

.nav-link:hover {
  color: var(--color-text);
  background: var(--color-border);
}

.nav-link.active {
  color: var(--color-primary);
  font-weight: var(--font-medium);
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-left: auto;
}

.theme-toggle-btn {
  width: 36px;
  height: 36px;
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

.user-menu {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.user-avatar {
  width: 32px;
  height: 32px;
  background: var(--color-primary);
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
}

.btn-sm {
  padding: var(--spacing-xs) var(--spacing-sm);
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  background: var(--color-primary-dark);
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

/* ===== Main Layout ===== */
.main-layout {
  flex: 1;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  padding: var(--spacing-md);
  display: flex;
  gap: var(--spacing-lg);
}

/* Sidebar */
.sidebar {
  display: none;
  flex-direction: column;
  gap: var(--spacing-md);
  flex-shrink: 0;
}

.sidebar-left {
  width: 280px;
}

.sidebar-right {
  width: 300px;
}

.sidebar-card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
}

.sidebar-title {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-md);
}

/* User Card */
.user-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.user-card-avatar {
  width: 48px;
  height: 48px;
  background: var(--color-primary);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  flex-shrink: 0;
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

/* Sidebar Actions */
.sidebar-actions {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.sidebar-action {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-sm);
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  color: var(--color-text);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: left;
}

.sidebar-action:hover {
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

.sidebar-action svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

/* Resource List */
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
  background: var(--color-border);
}

.resource-icon {
  width: 36px;
  height: 36px;
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
  width: 18px;
  height: 18px;
}

.resource-info {
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

/* Topic List */
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
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-border);
  color: var(--color-text-secondary);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
}

.topic-item.placeholder .topic-line {
  flex: 1;
  height: 14px;
  background: var(--color-border);
  border-radius: var(--radius-sm);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

.placeholder-hint-sm {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
  margin-top: var(--spacing-sm);
}

/* ===== Main Content ===== */
.main-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

/* Banner */
.banner {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  color: white;
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
}

.banner-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.banner-tag {
  background: rgba(255, 255, 255, 0.2);
  padding: 2px var(--spacing-sm);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  flex-shrink: 0;
}

.banner-text {
  font-size: var(--text-sm);
  line-height: var(--leading-normal);
}

/* Mobile Quick Actions */
.mobile-quick-actions {
  display: block;
}

.quick-actions-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-sm);
}

.quick-action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-md) var(--spacing-sm);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.quick-action-item:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-bg);
}

.quick-action-item:active {
  transform: scale(0.96);
}

.quick-action-item .action-icon {
  width: 40px;
  height: 40px;
  background: var(--color-primary-bg);
  color: var(--color-primary);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
}

.quick-action-item .action-icon svg {
  width: 20px;
  height: 20px;
}

.quick-action-item span {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

/* Feed Section */
.feed-section {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-md);
}

.section-title {
  font-size: var(--text-base);
  font-weight: var(--font-bold);
}

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

/* ===== Footer ===== */
.footer {
  border-top: 1px solid var(--color-border);
  padding: var(--spacing-lg) var(--spacing-md);
  margin-top: auto;
}

.footer-container {
  max-width: 1400px;
  margin: 0 auto;
  text-align: center;
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
  font-size: var(--text-sm);
}

/* ===== Responsive ===== */
@media (min-width: 640px) {
  .logo-text {
    display: block;
  }

  .user-name {
    display: block;
  }

  .quick-action-item .action-icon {
    width: 48px;
    height: 48px;
  }

  .quick-action-item .action-icon svg {
    width: 24px;
    height: 24px;
  }

  .quick-action-item span {
    font-size: var(--text-sm);
  }
}

@media (min-width: 1024px) {
  .nav-links {
    display: flex;
  }

  .sidebar {
    display: flex;
  }

  .mobile-quick-actions {
    display: none;
  }
}

@media (min-width: 1280px) {
  .header-container,
  .main-layout,
  .footer-container {
    padding-left: var(--spacing-xl);
    padding-right: var(--spacing-xl);
  }
}
</style>
