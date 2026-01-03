<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

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
}

function goToAuth() {
  router.push('/auth')
}

// 需要登录的功能点击
function handleProtectedAction(name: string) {
  if (userStore.isLoggedIn) {
    // TODO: 实际功能实现
    alert(`功能 "${name}" 开发中...`)
  } else {
    userStore.openLoginModal()
  }
}
</script>

<template>
  <div class="home">
    <!-- Header -->
    <header class="header">
      <div class="header-content">
        <div class="header-left">
          <div class="logo">
            <span class="logo-icon">X</span>
          </div>
          <div class="logo-text">
            <h1 class="logo-title">XMYZ Club</h1>
            <p class="logo-subtitle">厦门一中学生社区</p>
          </div>
        </div>
        <div class="header-right">
          <template v-if="userStore.isLoggedIn">
            <div class="user-info">
              <span class="user-name">{{ userStore.user?.nickname }}</span>
              <button class="btn-text" @click="handleLogout">退出</button>
            </div>
          </template>
          <template v-else>
            <button class="btn btn-ghost btn-sm" @click="handleLogin">
              登录
            </button>
            <button class="btn btn-primary btn-sm" @click="goToAuth">
              注册
            </button>
          </template>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="main">
      <!-- 公告横幅 -->
      <section class="banner-section">
        <div class="banner">
          <div class="banner-content">
            <span class="banner-tag">公告</span>
            <p class="banner-text">欢迎来到厦门一中学生社区！更多功能正在开发中...</p>
          </div>
        </div>
      </section>

      <!-- 快捷功能 -->
      <section class="section">
        <h2 class="section-title">快捷功能</h2>
        <div class="quick-actions">
          <button class="quick-action" @click="handleProtectedAction('课程表')">
            <div class="action-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </div>
            <span class="action-label">课程表</span>
          </button>
          <button class="quick-action" @click="handleProtectedAction('公告')">
            <div class="action-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
            </div>
            <span class="action-label">公告</span>
          </button>
          <button class="quick-action" @click="handleProtectedAction('社团')">
            <div class="action-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <span class="action-label">社团</span>
          </button>
          <button class="quick-action" @click="handleProtectedAction('失物招领')">
            <div class="action-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
            <span class="action-label">失物招领</span>
          </button>
        </div>
      </section>

      <!-- 最新动态 -->
      <section class="section">
        <h2 class="section-title">最新动态</h2>
        <div class="feed-list">
          <div class="feed-item feed-placeholder">
            <div class="feed-avatar"></div>
            <div class="feed-content">
              <div class="feed-line feed-line-short"></div>
              <div class="feed-line"></div>
              <div class="feed-line feed-line-medium"></div>
            </div>
          </div>
          <div class="feed-item feed-placeholder">
            <div class="feed-avatar"></div>
            <div class="feed-content">
              <div class="feed-line feed-line-short"></div>
              <div class="feed-line"></div>
            </div>
          </div>
          <div class="feed-item feed-placeholder">
            <div class="feed-avatar"></div>
            <div class="feed-content">
              <div class="feed-line feed-line-short"></div>
              <div class="feed-line feed-line-medium"></div>
            </div>
          </div>
        </div>
        <p class="placeholder-hint">动态功能开发中...</p>
      </section>

      <!-- 开发资源 (临时保留) -->
      <section class="section">
        <h2 class="section-title">开发资源</h2>
        <div class="resource-cards">
          <router-link to="/design-system" class="resource-card">
            <div class="resource-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="13.5" cy="6.5" r="2.5"></circle>
                <path d="M22 17l-3.5-2-1.5 1-4-2"></path>
                <path d="M2 17l3.5-2 1.5 1 4-2"></path>
                <path d="M10 21l2-4 2 4"></path>
              </svg>
            </div>
            <div class="resource-content">
              <h3>设计系统</h3>
              <p>查看完整的 UI 组件库和设计规范</p>
            </div>
            <div class="resource-arrow"></div>
          </router-link>
          <router-link to="/auth" class="resource-card">
            <div class="resource-icon resource-icon-secondary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                <polyline points="10 17 15 12 10 7"></polyline>
                <line x1="15" y1="12" x2="3" y2="12"></line>
              </svg>
            </div>
            <div class="resource-content">
              <h3>登录页面</h3>
              <p>查看大屏登录页面设计</p>
            </div>
            <div class="resource-arrow"></div>
          </router-link>
        </div>
      </section>
    </main>

    <!-- Footer -->
    <footer class="footer">
      <button class="theme-toggle" @click="toggleTheme">
        {{ isDark ? '亮色模式' : '暗色模式' }}
      </button>
      <p class="copyright">&copy; 2024 厦门一中学生社区</p>
    </footer>
  </div>
</template>

<style scoped>
.home {
  min-height: 100vh;
  background: var(--color-bg);
  color: var(--color-text);
}

/* ===== Header ===== */
.header {
  background: var(--color-card);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--spacing-sm) var(--spacing-md);
  display: flex;
  align-items: center;
  justify-content: space-between;
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
}

.logo-icon {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
}

.logo-text {
  display: none;
}

@media (min-width: 480px) {
  .logo-text {
    display: block;
  }
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

.header-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.user-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.user-name {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
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

/* ===== Main ===== */
.main {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--spacing-md);
}

/* Banner */
.banner-section {
  margin-bottom: var(--spacing-lg);
}

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

/* Section */
.section {
  margin-bottom: var(--spacing-xl);
}

.section-title {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-md);
}

/* Quick Actions */
.quick-actions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-sm);
}

@media (min-width: 480px) {
  .quick-actions {
    gap: var(--spacing-md);
  }
}

.quick-action {
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

.quick-action:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-bg);
}

.quick-action:active {
  transform: scale(0.96);
}

.action-icon {
  width: 40px;
  height: 40px;
  background: var(--color-primary-bg);
  color: var(--color-primary);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-icon svg {
  width: 20px;
  height: 20px;
}

.action-label {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

@media (min-width: 480px) {
  .action-icon {
    width: 48px;
    height: 48px;
  }

  .action-icon svg {
    width: 24px;
    height: 24px;
  }

  .action-label {
    font-size: var(--text-sm);
  }
}

/* Feed List (Placeholder) */
.feed-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.feed-item {
  display: flex;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--color-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
}

.feed-placeholder .feed-avatar {
  width: 40px;
  height: 40px;
  background: var(--color-border);
  border-radius: 50%;
  flex-shrink: 0;
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

.feed-placeholder .feed-content {
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

/* Resource Cards */
.resource-cards {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.resource-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--color-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-border);
  text-decoration: none;
  color: inherit;
  transition: all var(--transition-fast);
}

.resource-card:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-md);
}

.resource-card:active {
  transform: scale(0.98);
}

.resource-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary-bg);
  color: var(--color-primary);
  border-radius: var(--radius-md);
  flex-shrink: 0;
}

.resource-icon svg {
  width: 24px;
  height: 24px;
}

.resource-icon-secondary {
  background: var(--color-info-bg);
  color: var(--color-info);
}

.resource-content {
  flex: 1;
}

.resource-content h3 {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  margin-bottom: 2px;
}

.resource-content p {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.resource-arrow {
  width: 8px;
  height: 8px;
  border-right: 2px solid var(--color-text-placeholder);
  border-bottom: 2px solid var(--color-text-placeholder);
  transform: rotate(-45deg);
  flex-shrink: 0;
}

/* ===== Footer ===== */
.footer {
  text-align: center;
  padding: var(--spacing-xl) var(--spacing-md);
  border-top: 1px solid var(--color-border);
}

.theme-toggle {
  padding: var(--spacing-xs) var(--spacing-md);
  margin-bottom: var(--spacing-md);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.theme-toggle:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.theme-toggle:active {
  transform: scale(0.95);
}

.copyright {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}
</style>
