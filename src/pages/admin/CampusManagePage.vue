<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/composables/useToast'
import {
  searchUsersByCampusName,
  searchUsersByCampusAccount,
  searchUsersByUserInfo,
} from '@/api/adminUser'
import type { AdminUserCampusBindingItem } from '@/types/user'
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb.vue'

const router = useRouter()
const userStore = useUserStore()
const toast = useToast()

// 搜索类型
type SearchType = 'campus-name' | 'campus-account' | 'user-info'

const searchType = ref<SearchType>('campus-name')
const searchKeyword = ref('')
const userIdInput = ref('')
const usernameInput = ref('')
const nicknameInput = ref('')

// 搜索结果
const searchResults = ref<AdminUserCampusBindingItem[]>([])
const isSearching = ref(false)
const hasSearched = ref(false)

// 用户详情抽屉
const showUserDetail = ref(false)
const selectedUser = ref<AdminUserCampusBindingItem | null>(null)

// 搜索类型选项
const searchTypes: { value: SearchType; label: string; placeholder: string }[] = [
  { value: 'campus-name', label: '校园网姓名', placeholder: '输入校园网真实姓名...' },
  { value: 'campus-account', label: '校园网账号', placeholder: '输入校园网账号...' },
  { value: 'user-info', label: '用户信息', placeholder: '' },
]

// 获取当前搜索类型的占位符
function getPlaceholder(): string {
  const found = searchTypes.find((t) => t.value === searchType.value)
  return found?.placeholder || ''
}

// 切换搜索类型时清空输入
function onSearchTypeChange() {
  searchKeyword.value = ''
  userIdInput.value = ''
  usernameInput.value = ''
  nicknameInput.value = ''
  searchResults.value = []
  hasSearched.value = false
}

// 执行搜索
async function handleSearch() {
  // 验证输入
  if (searchType.value === 'campus-name' || searchType.value === 'campus-account') {
    if (!searchKeyword.value.trim()) {
      toast.warning('请输入搜索关键词')
      return
    }
  } else if (searchType.value === 'user-info') {
    if (!userIdInput.value.trim() && !usernameInput.value.trim() && !nicknameInput.value.trim()) {
      toast.warning('请至少输入一个搜索条件')
      return
    }
  }

  isSearching.value = true
  hasSearched.value = true

  try {
    let res

    if (searchType.value === 'campus-name') {
      res = await searchUsersByCampusName(searchKeyword.value.trim())
    } else if (searchType.value === 'campus-account') {
      res = await searchUsersByCampusAccount(searchKeyword.value.trim())
    } else {
      const params: { userId?: number; username?: string; nickname?: string } = {}
      if (userIdInput.value.trim()) {
        const userId = parseInt(userIdInput.value.trim())
        if (!isNaN(userId)) {
          params.userId = userId
        }
      }
      if (usernameInput.value.trim()) {
        params.username = usernameInput.value.trim()
      }
      if (nicknameInput.value.trim()) {
        params.nickname = nicknameInput.value.trim()
      }
      res = await searchUsersByUserInfo(params)
    }

    if (res.data.code === 200) {
      searchResults.value = res.data.data
      if (searchResults.value.length === 0) {
        toast.info('未找到匹配的用户')
      }
    } else {
      toast.error(res.data.message || '搜索失败')
      searchResults.value = []
    }
  } catch (error) {
    toast.error('搜索失败')
    searchResults.value = []
  } finally {
    isSearching.value = false
  }
}

// 查看用户详情
function viewUserDetail(user: AdminUserCampusBindingItem) {
  selectedUser.value = user
  showUserDetail.value = true
}

// 关闭用户详情
function closeUserDetail() {
  showUserDetail.value = false
  selectedUser.value = null
}

// 格式化时间
function formatTime(dateStr: string | null) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}

// 格式化日期
function formatDate(dateStr: string | null) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

// 获取性别标签
function getGenderLabel(gender: number) {
  switch (gender) {
    case 1:
      return '男'
    case 2:
      return '女'
    default:
      return '未设置'
  }
}

// 获取状态标签
function getStatusLabel(status: number) {
  return status === 1 ? '正常' : '禁用'
}

// 初始化
onMounted(() => {
  if (!userStore.isLoggedIn || !userStore.canManageUsers) {
    toast.error('无权访问此页面')
    router.push('/')
    return
  }
})
</script>

<template>
  <div class="campus-manage-page">
    <PageHeader back-to="/" />

    <main class="page-content">
      <div class="content-container">
        <div class="breadcrumb-wrapper">
          <PageBreadcrumb />
        </div>

        <!-- 搜索区域 -->
        <div class="search-section">
          <div class="search-card">
            <!-- 搜索类型切换 -->
            <div class="search-type-tabs">
              <button
                v-for="type in searchTypes"
                :key="type.value"
                class="search-type-tab"
                :class="{ active: searchType === type.value }"
                @click="searchType = type.value; onSearchTypeChange()"
              >
                {{ type.label }}
              </button>
            </div>

            <!-- 搜索输入 -->
            <div class="search-inputs">
              <!-- 校园网姓名/账号搜索 -->
              <template v-if="searchType === 'campus-name' || searchType === 'campus-account'">
                <div class="search-input-row">
                  <input
                    v-model="searchKeyword"
                    type="text"
                    class="search-input"
                    :placeholder="getPlaceholder()"
                    @keyup.enter="handleSearch"
                  />
                  <button
                    class="search-btn"
                    :disabled="isSearching"
                    @click="handleSearch"
                  >
                    <svg v-if="!isSearching" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <span v-else class="btn-spinner"></span>
                  </button>
                </div>
              </template>

              <!-- 用户信息搜索 -->
              <template v-else>
                <div class="search-fields">
                  <div class="search-field">
                    <label class="field-label">用户ID</label>
                    <input
                      v-model="userIdInput"
                      type="text"
                      class="field-input"
                      placeholder="精确匹配"
                      @keyup.enter="handleSearch"
                    />
                  </div>
                  <div class="search-field">
                    <label class="field-label">用户名</label>
                    <input
                      v-model="usernameInput"
                      type="text"
                      class="field-input"
                      placeholder="模糊搜索"
                      @keyup.enter="handleSearch"
                    />
                  </div>
                  <div class="search-field">
                    <label class="field-label">昵称</label>
                    <input
                      v-model="nicknameInput"
                      type="text"
                      class="field-input"
                      placeholder="模糊搜索"
                      @keyup.enter="handleSearch"
                    />
                  </div>
                </div>
                <button
                  class="search-btn-full"
                  :disabled="isSearching"
                  @click="handleSearch"
                >
                  {{ isSearching ? '搜索中...' : '搜索' }}
                </button>
              </template>
            </div>
          </div>
        </div>

        <!-- 搜索结果 -->
        <div class="results-section">
          <!-- 加载状态 -->
          <div v-if="isSearching" class="loading-container">
            <div class="loading-spinner"></div>
            <p>搜索中...</p>
          </div>

          <!-- 空状态 -->
          <div v-else-if="hasSearched && searchResults.length === 0" class="empty-container">
            <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <p>未找到匹配的用户</p>
          </div>

          <!-- 初始状态 -->
          <div v-else-if="!hasSearched" class="empty-container">
            <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <p>输入关键词搜索用户校园网绑定信息</p>
          </div>

          <!-- 结果列表 -->
          <div v-else class="results-list">
            <div class="results-header">
              <span class="results-count">找到 {{ searchResults.length }} 个用户</span>
            </div>

            <div
              v-for="user in searchResults"
              :key="user.userId"
              class="user-card"
              @click="viewUserDetail(user)"
            >
              <div class="user-main">
                <div class="user-avatar">
                  {{ user.nickname?.charAt(0) || user.username?.charAt(0) || '?' }}
                </div>
                <div class="user-info">
                  <div class="user-name">{{ user.nickname || user.username }}</div>
                  <div class="user-meta">
                    <span class="user-id">ID: {{ user.userId }}</span>
                    <span class="user-status" :class="{ disabled: user.status !== 1 }">
                      {{ getStatusLabel(user.status) }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="user-campus" v-if="user.hasCampusBinding">
                <div class="campus-badge bound">已绑定</div>
                <div class="campus-info">
                  <span class="campus-name">{{ user.name }}</span>
                  <span class="campus-class">{{ user.classAlias }}</span>
                </div>
              </div>
              <div class="user-campus" v-else>
                <div class="campus-badge unbound">未绑定</div>
              </div>

              <svg class="user-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </main>

    <PageFooter />

    <!-- 用户详情抽屉 -->
    <Transition name="drawer-fade">
      <div v-if="showUserDetail" class="drawer-overlay" @click="closeUserDetail">
        <Transition name="drawer-slide">
          <div v-if="showUserDetail && selectedUser" class="drawer-content" @click.stop>
            <div class="drawer-header">
              <h3 class="drawer-title">用户详情</h3>
              <button class="drawer-close" @click="closeUserDetail">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <!-- 用户账号信息 -->
            <div class="detail-section">
              <h4 class="section-title">账号信息</h4>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="detail-label">用户ID</span>
                  <span class="detail-value">{{ selectedUser.userId }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">用户名</span>
                  <span class="detail-value">{{ selectedUser.username }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">昵称</span>
                  <span class="detail-value">{{ selectedUser.nickname }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">性别</span>
                  <span class="detail-value">{{ getGenderLabel(selectedUser.gender) }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">状态</span>
                  <span class="detail-value" :class="{ 'status-disabled': selectedUser.status !== 1 }">
                    {{ getStatusLabel(selectedUser.status) }}
                  </span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">注册时间</span>
                  <span class="detail-value">{{ formatTime(selectedUser.userCreatedAt) }}</span>
                </div>
                <div class="detail-item full" v-if="selectedUser.signature">
                  <span class="detail-label">个性签名</span>
                  <span class="detail-value">{{ selectedUser.signature }}</span>
                </div>
              </div>
            </div>

            <!-- 校园网绑定信息 -->
            <div class="detail-section">
              <h4 class="section-title">
                校园网绑定
                <span class="binding-status" :class="{ bound: selectedUser.hasCampusBinding }">
                  {{ selectedUser.hasCampusBinding ? '已绑定' : '未绑定' }}
                </span>
              </h4>

              <template v-if="selectedUser.hasCampusBinding">
                <div class="detail-grid">
                  <div class="detail-item">
                    <span class="detail-label">绑定ID</span>
                    <span class="detail-value">{{ selectedUser.campusBindingId }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">校园网账号</span>
                    <span class="detail-value">{{ selectedUser.campusAccount }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">真实姓名</span>
                    <span class="detail-value highlight">{{ selectedUser.name }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">学号</span>
                    <span class="detail-value">{{ selectedUser.studentId || '-' }}</span>
                  </div>
                  <div class="detail-item full">
                    <span class="detail-label">班级</span>
                    <span class="detail-value">{{ selectedUser.classAlias || '-' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">手机号</span>
                    <span class="detail-value">{{ selectedUser.mobilePhone || '-' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">校区</span>
                    <span class="detail-value">{{ selectedUser.address || '-' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">绑定时间</span>
                    <span class="detail-value">{{ formatTime(selectedUser.campusBindingCreatedAt) }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">更新时间</span>
                    <span class="detail-value">{{ formatTime(selectedUser.campusBindingUpdatedAt) }}</span>
                  </div>
                </div>
              </template>

              <template v-else>
                <div class="unbound-notice">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <span>该用户尚未绑定校园网账号</span>
                </div>
              </template>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* ===== Base ===== */
.campus-manage-page {
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
}

.content-container {
  max-width: 800px;
  margin: 0 auto;
}

.breadcrumb-wrapper {
  display: none;
  margin-bottom: var(--spacing-lg);
}

/* ===== Search Section ===== */
.search-section {
  margin-bottom: var(--spacing-md);
}

.search-card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.search-type-tabs {
  display: flex;
  border-bottom: 1px solid var(--color-border);
}

.search-type-tab {
  flex: 1;
  padding: var(--spacing-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.search-type-tab:hover {
  color: var(--color-text);
  background: var(--color-bg);
}

.search-type-tab.active {
  color: var(--color-primary);
  background: var(--color-primary-bg);
}

.search-inputs {
  padding: var(--spacing-md);
}

.search-input-row {
  display: flex;
  gap: var(--spacing-sm);
}

.search-input {
  flex: 1;
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  color: var(--color-text);
  transition: border-color var(--transition-fast);
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.search-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary);
  border: none;
  border-radius: var(--radius-md);
  color: white;
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.search-btn:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.search-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.search-btn svg {
  width: 20px;
  height: 20px;
}

.btn-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* 用户信息搜索字段 */
.search-fields {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.search-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.field-label {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
}

.field-input {
  padding: var(--spacing-sm);
  font-size: var(--text-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  color: var(--color-text);
  transition: border-color var(--transition-fast);
}

.field-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.search-btn-full {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  background: var(--color-primary);
  border: none;
  border-radius: var(--radius-md);
  color: white;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.search-btn-full:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.search-btn-full:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ===== Results Section ===== */
.results-section {
  min-height: 200px;
}

/* Loading & Empty */
.loading-container,
.empty-container {
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

.empty-icon {
  width: 48px;
  height: 48px;
  color: var(--color-text-placeholder);
  margin-bottom: var(--spacing-md);
}

/* Results List */
.results-list {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.results-header {
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg);
}

.results-count {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
}

/* User Card */
.user-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.user-card:last-child {
  border-bottom: none;
}

.user-card:hover {
  background: var(--color-bg);
}

.user-main {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex: 1;
  min-width: 0;
}

.user-avatar {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  color: white;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  flex-shrink: 0;
}

.user-info {
  min-width: 0;
  flex: 1;
}

.user-name {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-top: 2px;
}

.user-id {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
}

.user-status {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  background: var(--color-success-bg);
  color: var(--color-success);
}

.user-status.disabled {
  background: var(--color-error-bg);
  color: var(--color-error);
}

.user-campus {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex-shrink: 0;
}

.campus-badge {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-weight: var(--font-medium);
}

.campus-badge.bound {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.campus-badge.unbound {
  background: var(--color-text-placeholder);
  color: white;
  opacity: 0.6;
}

.campus-info {
  display: none;
  flex-direction: column;
  align-items: flex-end;
}

.campus-name {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
}

.campus-class {
  font-size: 10px;
  color: var(--color-text-secondary);
}

.user-arrow {
  width: 16px;
  height: 16px;
  color: var(--color-text-placeholder);
  flex-shrink: 0;
}

/* ===== Drawer ===== */
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
}

.drawer-content {
  background: var(--color-card);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  padding: var(--spacing-lg);
  padding-bottom: calc(var(--spacing-lg) + env(safe-area-inset-bottom, 0px));
  width: 100%;
  max-width: 500px;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: var(--shadow-xl);
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-lg);
}

.drawer-title {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
}

.drawer-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.drawer-close:hover {
  background: var(--color-bg);
  color: var(--color-text);
}

.drawer-close svg {
  width: 20px;
  height: 20px;
}

/* Detail Section */
.detail-section {
  margin-bottom: var(--spacing-lg);
}

.detail-section:last-child {
  margin-bottom: 0;
}

.section-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text);
  margin-bottom: var(--spacing-md);
  padding-bottom: var(--spacing-sm);
  border-bottom: 1px solid var(--color-border);
}

.binding-status {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background: var(--color-text-placeholder);
  color: white;
}

.binding-status.bound {
  background: var(--color-success);
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-sm);
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--spacing-sm);
  background: var(--color-bg);
  border-radius: var(--radius-md);
}

.detail-item.full {
  grid-column: span 2;
}

.detail-label {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.detail-value {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  word-break: break-all;
}

.detail-value.highlight {
  color: var(--color-primary);
}

.detail-value.status-disabled {
  color: var(--color-error);
}

.unbound-notice {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background: var(--color-bg);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.unbound-notice svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: var(--color-warning);
}

/* Drawer Animation */
.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity var(--transition-normal);
}

.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}

.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: all var(--transition-normal);
}

.drawer-slide-enter-from,
.drawer-slide-leave-to {
  opacity: 0;
  transform: translateY(100%);
}

/* ===== Responsive - Tablet ===== */
@media (min-width: 640px) {
  .search-type-tab {
    font-size: var(--text-sm);
    padding: var(--spacing-sm) var(--spacing-md);
  }

  .campus-info {
    display: flex;
  }
}

/* ===== Responsive - Desktop ===== */
@media (min-width: 1024px) {
  .page-content {
    padding: var(--spacing-xl);
  }

  .breadcrumb-wrapper {
    display: block;
  }

  .drawer-overlay {
    align-items: center;
  }

  .drawer-content {
    border-radius: var(--radius-xl);
  }
}
</style>
