<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/composables/useToast'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const toast = useToast()

// 判断导航项是否激活（当前路径等于或位于该路径之下）
function isActive(path: string): boolean {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path === path || route.path.startsWith(path + '/')
}

function handleLogin() {
  userStore.openLoginModal()
}

function goToProfile() {
  if (userStore.isLoggedIn) {
    router.push('/profile')
  } else {
    userStore.openLoginModal()
  }
}

// 退出确认弹窗
const showLogoutConfirm = ref(false)

function openLogoutConfirm() {
  showLogoutConfirm.value = true
}

function confirmLogout() {
  userStore.logout()
  showLogoutConfirm.value = false
  toast.success('已退出登录')
}

function cancelLogout() {
  showLogoutConfirm.value = false
}
</script>

<template>
  <aside class="app-sidebar">
    <!-- 品牌区域 -->
    <router-link to="/" class="sidebar-brand-link">
      <h1 class="sidebar-brand-title">厦门一中学生社区</h1>
    </router-link>

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
      <!-- 导航区域 -->
      <div class="sidebar-nav-section">
        <div class="sidebar-section-header">
          <span class="sidebar-section-title">导航</span>
        </div>
        <nav class="sidebar-nav">
          <router-link to="/" class="sidebar-nav-item" :class="{ active: isActive('/') }">
            <div class="sidebar-nav-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
            </div>
            <span>首页</span>
          </router-link>
          <router-link to="/ticket" class="sidebar-nav-item" :class="{ active: isActive('/ticket') }">
            <div class="sidebar-nav-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </div>
            <span>活动抢票</span>
          </router-link>
          <router-link to="/ringtone" class="sidebar-nav-item" :class="{ active: isActive('/ringtone') }">
            <div class="sidebar-nav-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
            </div>
            <span>宿舍铃声</span>
          </router-link>
          <router-link to="/grade" class="sidebar-nav-item" :class="{ active: isActive('/grade') }">
            <div class="sidebar-nav-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
            </div>
            <span>分数查询</span>
          </router-link>
          <router-link to="/community" class="sidebar-nav-item" :class="{ active: isActive('/community') }">
            <div class="sidebar-nav-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
            </div>
            <span>评分社区</span>
          </router-link>
        </nav>
      </div>

      <!-- 管理区域 -->
      <div class="sidebar-nav-section" v-if="userStore.canManageTickets || userStore.canManageCampaigns || userStore.canManageRating || userStore.canManageMessages || userStore.canManageUsers || userStore.canManageBanners || userStore.canManageMuseum || userStore.canManageVoices">
        <div class="sidebar-section-header">
          <span class="sidebar-section-title">管理后台</span>
        </div>
        <nav class="sidebar-nav">
          <router-link v-if="userStore.canManageTickets" to="/admin/tickets" class="sidebar-nav-item" :class="{ active: isActive('/admin/tickets') }">
            <div class="sidebar-nav-icon admin">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
            </div>
            <span>票务管理</span>
          </router-link>
          <router-link v-if="userStore.canManageCampaigns" to="/admin/dorm" class="sidebar-nav-item" :class="{ active: isActive('/admin/dorm') }">
            <div class="sidebar-nav-icon admin">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 21h18M3 7v14M21 7v14M6 11h4M6 15h4M14 11h4M14 15h4M12 3l9 4H3l9-4z"></path>
              </svg>
            </div>
            <span>宿舍管理</span>
          </router-link>
          <router-link v-if="userStore.canManageCampaigns" to="/admin/campaigns" class="sidebar-nav-item" :class="{ active: isActive('/admin/campaigns') }">
            <div class="sidebar-nav-icon admin">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 18V5l12-2v13"></path>
                <circle cx="6" cy="18" r="3"></circle>
                <circle cx="18" cy="16" r="3"></circle>
              </svg>
            </div>
            <span>活动管理</span>
          </router-link>
          <router-link v-if="userStore.canManageCampaigns" to="/admin/music-download" class="sidebar-nav-item" :class="{ active: isActive('/admin/music-download') }">
            <div class="sidebar-nav-icon admin">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </div>
            <span>歌曲下载</span>
          </router-link>
          <router-link v-if="userStore.canManageRating" to="/admin/rating" class="sidebar-nav-item" :class="{ active: isActive('/admin/rating') }">
            <div class="sidebar-nav-icon admin">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
            </div>
            <span>评分社区</span>
          </router-link>
          <router-link v-if="userStore.canManageMessages" to="/admin/messages" class="sidebar-nav-item" :class="{ active: isActive('/admin/messages') }">
            <div class="sidebar-nav-icon admin">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <span>消息管理</span>
          </router-link>
          <router-link v-if="userStore.canManageCampaigns" to="/admin/qqmusic" class="sidebar-nav-item" :class="{ active: isActive('/admin/qqmusic') }">
            <div class="sidebar-nav-icon admin">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 18V5l12-2v13"></path>
                <circle cx="6" cy="18" r="3"></circle>
                <circle cx="18" cy="16" r="3"></circle>
              </svg>
            </div>
            <span>QQ音乐管理</span>
          </router-link>
          <router-link v-if="userStore.canManageUsers" to="/admin/campus" class="sidebar-nav-item" :class="{ active: isActive('/admin/campus') }">
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
          <router-link v-if="userStore.canManageBanners" to="/admin/banners" class="sidebar-nav-item" :class="{ active: isActive('/admin/banners') }">
            <div class="sidebar-nav-icon admin">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
              </svg>
            </div>
            <span>轮播图管理</span>
          </router-link>
          <router-link v-if="userStore.canManageMuseum" to="/admin/museum" class="sidebar-nav-item" :class="{ active: isActive('/admin/museum') }">
            <div class="sidebar-nav-icon admin">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
            <span>时间线管理</span>
          </router-link>
          <router-link v-if="userStore.canManageDebate" to="/admin/debate" class="sidebar-nav-item" :class="{ active: isActive('/admin/debate') }">
            <div class="sidebar-nav-icon admin">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <span>辩论赛管理</span>
          </router-link>
          <router-link v-if="userStore.canManageVoices" to="/admin/voices" class="sidebar-nav-item" :class="{ active: isActive('/admin/voices') }">
            <div class="sidebar-nav-icon admin">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 20 l1.2 -4.2 L16.6 4.4 a2 2 0 0 1 2.8 0 l0.2 0.2 a2 2 0 0 1 0 2.8 L8.2 18.8 Z"></path>
                <path d="M14.5 6.5 l3 3"></path>
              </svg>
            </div>
            <span>跨代留声管理</span>
          </router-link>
          <router-link v-if="userStore.canManageTally" to="/admin/tally" class="sidebar-nav-item" :class="{ active: isActive('/admin/tally') }">
            <div class="sidebar-nav-icon admin">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 3v18h18"></path>
                <path d="M7 14v4"></path>
                <path d="M12 10v8"></path>
                <path d="M17 6v12"></path>
              </svg>
            </div>
            <span>实时唱票</span>
          </router-link>
        </nav>
      </div>

      <!-- 账户区域 -->
      <div class="sidebar-nav-section" v-if="userStore.isLoggedIn">
        <div class="sidebar-section-header">
          <span class="sidebar-section-title">我的账户</span>
        </div>
        <nav class="sidebar-nav">
          <router-link to="/profile" class="sidebar-nav-item" :class="{ active: isActive('/profile') }">
            <div class="sidebar-nav-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <span>个人中心</span>
          </router-link>
          <router-link to="/messages" class="sidebar-nav-item" :class="{ active: isActive('/messages') }">
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
      <p class="sidebar-footer-brand">厦门一中学生社区</p>
      <p class="sidebar-credit">designed by 23届玄学狗狗</p>
    </div>

    <!-- 退出确认弹窗 -->
    <Teleport to="body">
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
    </Teleport>
  </aside>
</template>

<style scoped>
.app-sidebar {
  display: none;
}

@media (min-width: 1024px) {
  .app-sidebar {
    display: flex;
    flex-direction: column;
    width: 240px;
    flex-shrink: 0;
    background: var(--color-card);
    border-right: 1px solid var(--color-border);
    height: 100vh;
    position: sticky;
    top: 0;
    overflow: hidden;
  }
}

.sidebar-brand-link {
  display: block;
  padding: var(--spacing-md) var(--spacing-lg);
  text-decoration: none;
  border-bottom: 1px solid var(--color-border);
}

.sidebar-brand-title {
  font-size: var(--text-base);
  font-weight: var(--font-bold);
  color: var(--color-text);
  white-space: nowrap;
}

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

.sidebar-scroll-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  -webkit-overflow-scrolling: touch;
}

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

.sidebar-nav-item.active {
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

.sidebar-nav-item.active .sidebar-nav-icon {
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

.sidebar-footer {
  flex-shrink: 0;
  padding: var(--spacing-md);
  border-top: 1px solid var(--color-border);
  text-align: center;
  background: var(--color-card);
}

.sidebar-footer-brand {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--color-text-secondary);
  margin-bottom: 4px;
}

.sidebar-credit {
  font-size: 10px;
  color: var(--color-text-placeholder);
}

/* 退出确认弹窗 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--spacing-lg);
}

.modal-content {
  background: var(--color-card);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
  max-width: 320px;
  width: 100%;
  text-align: center;
}

.modal-title {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  color: var(--color-text);
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
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.modal-btn.cancel {
  background: var(--color-border);
  color: var(--color-text);
}

.modal-btn.cancel:hover {
  opacity: 0.8;
}

.modal-btn.confirm {
  background: var(--color-primary);
  color: white;
}

.modal-btn.confirm:hover {
  background: var(--color-primary-dark);
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity var(--transition-fast);
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-scale-enter-active,
.modal-scale-leave-active {
  transition: transform var(--transition-fast), opacity var(--transition-fast);
}

.modal-scale-enter-from,
.modal-scale-leave-to {
  transform: scale(0.95);
  opacity: 0;
}
</style>
