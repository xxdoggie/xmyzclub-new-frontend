<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/composables/useToast'
import {
  adminGetEvents,
  adminDeleteEvent,
  adminPublishEvent,
  adminUnpublishEvent,
  adminFeatureEvent,
  adminUnfeatureEvent,
  adminBatchEventAction,
  adminGetTags,
} from '@/api/museum'
import type { Event, EventStatus, GetEventsParams, Tag } from '@/types/museum'
import { getEventStatusInfo } from '@/types/museum'
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb.vue'

const router = useRouter()
const userStore = useUserStore()
const toast = useToast()

// 状态
const isLoading = ref(true)
const events = ref<Event[]>([])
const tags = ref<Tag[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)

// 筛选状态
const statusFilter = ref<'all' | EventStatus>('all')
const tagFilter = ref<number | null>(null)
const keyword = ref('')

// Tab 切换动画
const tabOrder = ['all', 0, 1, 2] as const
const slideDirection = ref<'left' | 'right' | ''>('')
const isAnimating = ref(false)

// 监听 Tab 切换
watch(statusFilter, (newVal, oldVal) => {
  if (oldVal === undefined) return
  const oldIndex = tabOrder.indexOf(oldVal as (typeof tabOrder)[number])
  const newIndex = tabOrder.indexOf(newVal as (typeof tabOrder)[number])
  slideDirection.value = newIndex > oldIndex ? 'left' : 'right'
  isAnimating.value = true
  currentPage.value = 1
  loadEvents()

  nextTick(() => {
    setTimeout(() => {
      isAnimating.value = false
      slideDirection.value = ''
    }, 300)
  })
})

// 删除确认
const showDeleteConfirm = ref(false)
const deleteTarget = ref<Event | null>(null)
const isDeleting = ref(false)

// 批量选择
const selectedIds = ref<number[]>([])
const isAllSelected = computed(() => {
  if (events.value.length === 0) return false
  return events.value.every((e) => selectedIds.value.includes(e.id))
})

// 计算总页数
const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

// 加载标签列表
async function loadTags() {
  try {
    tags.value = await adminGetTags({ status: 1 })
  } catch (error) {
    console.error('Failed to load tags:', error)
  }
}

// 加载活动列表
async function loadEvents() {
  isLoading.value = true
  try {
    const params: GetEventsParams = {
      page: currentPage.value,
      size: pageSize.value,
    }
    if (statusFilter.value !== 'all') {
      params.status = statusFilter.value
    }
    if (tagFilter.value) {
      params.tagId = tagFilter.value
    }
    if (keyword.value.trim()) {
      params.keyword = keyword.value.trim()
    }
    const data = await adminGetEvents(params)
    events.value = data.list
    total.value = data.total
    selectedIds.value = []
  } catch (error) {
    toast.error('获取活动列表失败')
  } finally {
    isLoading.value = false
  }
}

// 搜索
function handleSearch() {
  currentPage.value = 1
  loadEvents()
}

// 筛选标签变化
function handleTagChange() {
  currentPage.value = 1
  loadEvents()
}

// 翻页
function goToPage(page: number) {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  loadEvents()
}

// 跳转到创建页面
function goToCreate() {
  router.push('/admin/museum/events/create')
}

// 跳转到内容管理页面
function goToContent(event: Event) {
  router.push(`/admin/museum/events/${event.id}/content`)
}

// 跳转到编辑页面
function goToEdit(event: Event, e: MouseEvent) {
  e.stopPropagation()
  router.push(`/admin/museum/events/${event.id}/edit`)
}

// 发布活动
async function publishEvent(event: Event, e: MouseEvent) {
  e.stopPropagation()
  try {
    await adminPublishEvent(event.id)
    toast.success('已发布')
    loadEvents()
  } catch (error) {
    toast.error('发布失败')
  }
}

// 下架活动
async function unpublishEvent(event: Event, e: MouseEvent) {
  e.stopPropagation()
  try {
    await adminUnpublishEvent(event.id)
    toast.success('已下架')
    loadEvents()
  } catch (error) {
    toast.error('下架失败')
  }
}

// 设为精选
async function featureEvent(event: Event, e: MouseEvent) {
  e.stopPropagation()
  try {
    if (event.isFeatured) {
      await adminUnfeatureEvent(event.id)
      toast.success('已取消精选')
    } else {
      await adminFeatureEvent(event.id)
      toast.success('已设为精选')
    }
    loadEvents()
  } catch (error) {
    toast.error('操作失败')
  }
}

// 打开删除确认
function openDeleteConfirm(event: Event, e: MouseEvent) {
  e.stopPropagation()
  deleteTarget.value = event
  showDeleteConfirm.value = true
}

// 确认删除
async function confirmDelete() {
  if (!deleteTarget.value) return

  isDeleting.value = true
  try {
    await adminDeleteEvent(deleteTarget.value.id)
    toast.success('删除成功')
    showDeleteConfirm.value = false
    deleteTarget.value = null
    loadEvents()
  } catch (error) {
    toast.error('删除失败')
  } finally {
    isDeleting.value = false
  }
}

// 取消删除
function cancelDelete() {
  showDeleteConfirm.value = false
  deleteTarget.value = null
}

// 切换选择
function toggleSelect(id: number) {
  const index = selectedIds.value.indexOf(id)
  if (index === -1) {
    selectedIds.value.push(id)
  } else {
    selectedIds.value.splice(index, 1)
  }
}

// 全选/取消全选
function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedIds.value = []
  } else {
    selectedIds.value = events.value.map((e) => e.id)
  }
}

// 批量操作
async function batchAction(action: 'publish' | 'unpublish' | 'feature' | 'unfeature' | 'delete') {
  if (selectedIds.value.length === 0) {
    toast.error('请先选择要操作的活动')
    return
  }

  const actionLabels = {
    publish: '发布',
    unpublish: '下架',
    feature: '设为精选',
    unfeature: '取消精选',
    delete: '删除',
  }

  try {
    await adminBatchEventAction({
      ids: selectedIds.value,
      action,
    })
    toast.success(`批量${actionLabels[action]}成功`)
    loadEvents()
  } catch (error) {
    toast.error(`批量${actionLabels[action]}失败`)
  }
}

// 格式化日期
function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

onMounted(() => {
  if (!userStore.isLoggedIn || !userStore.canManageMuseum) {
    toast.error('无权访问此页面')
    router.push('/')
    return
  }
  loadTags()
  loadEvents()
})
</script>

<template>
  <div class="page-container">
    <PageHeader back-to="/admin/museum" />

    <main class="page-content">
      <div class="content-container">
        <!-- 桌面端面包屑 -->
        <div class="breadcrumb-wrapper">
          <PageBreadcrumb />
        </div>

        <!-- 页面标题 -->
        <div class="page-header-section">
          <div class="header-main">
            <div class="header-text">
              <h1 class="page-title">活动管理</h1>
              <p class="page-subtitle">创建和管理时间线活动</p>
            </div>
            <div class="header-actions">
              <button class="action-button primary" @click="goToCreate">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                创建活动
              </button>
            </div>
          </div>
        </div>

        <!-- 搜索和筛选 -->
        <div class="filter-bar">
          <div class="search-input-wrapper">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="M21 21l-4.35-4.35"></path>
            </svg>
            <input
              v-model="keyword"
              type="text"
              class="search-input"
              placeholder="搜索活动..."
              @keyup.enter="handleSearch"
            />
          </div>
          <select v-model="tagFilter" class="filter-select" @change="handleTagChange">
            <option :value="null">全部标签</option>
            <option v-for="tag in tags" :key="tag.id" :value="tag.id">
              {{ tag.name }}
            </option>
          </select>
          <button class="search-btn" @click="handleSearch">搜索</button>
        </div>

        <!-- 状态筛选 -->
        <div class="status-tabs">
          <button
            class="status-tab"
            :class="{ active: statusFilter === 'all' }"
            @click="statusFilter = 'all'"
          >
            全部
          </button>
          <button
            class="status-tab"
            :class="{ active: statusFilter === 0 }"
            @click="statusFilter = 0"
          >
            草稿
          </button>
          <button
            class="status-tab"
            :class="{ active: statusFilter === 1 }"
            @click="statusFilter = 1"
          >
            已发布
          </button>
          <button
            class="status-tab"
            :class="{ active: statusFilter === 2 }"
            @click="statusFilter = 2"
          >
            已下架
          </button>
        </div>

        <!-- 批量操作栏 -->
        <div v-if="events.length > 0" class="batch-actions">
          <label class="select-all">
            <input
              type="checkbox"
              :checked="isAllSelected"
              @change="toggleSelectAll"
            />
            <span>全选</span>
          </label>
          <div class="batch-btns">
            <button
              class="batch-btn publish"
              :disabled="selectedIds.length === 0"
              @click="batchAction('publish')"
            >
              批量发布
            </button>
            <button
              class="batch-btn unpublish"
              :disabled="selectedIds.length === 0"
              @click="batchAction('unpublish')"
            >
              批量下架
            </button>
            <button
              class="batch-btn feature"
              :disabled="selectedIds.length === 0"
              @click="batchAction('feature')"
            >
              批量精选
            </button>
            <button
              class="batch-btn delete"
              :disabled="selectedIds.length === 0"
              @click="batchAction('delete')"
            >
              批量删除
            </button>
          </div>
        </div>

        <!-- 加载状态 -->
        <div v-if="isLoading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>

        <template v-else>
          <!-- 内容区域（带动画） -->
          <div
            class="content-slide-wrapper"
            :class="{
              'slide-left': isAnimating && slideDirection === 'left',
              'slide-right': isAnimating && slideDirection === 'right',
            }"
          >
            <!-- 空状态 -->
            <div v-if="events.length === 0" class="empty-container">
              <div class="empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
              <h2>{{ statusFilter === 'all' ? '暂无活动' : '暂无相关活动' }}</h2>
              <p>{{ statusFilter === 'all' ? '还没有创建任何活动' : '没有找到该状态的活动' }}</p>
              <button v-if="statusFilter === 'all'" class="empty-action-btn" @click="goToCreate">
                创建第一个活动
              </button>
            </div>

            <!-- 活动列表 -->
            <div v-else class="events-list">
              <div
                v-for="event in events"
                :key="event.id"
                class="event-card"
                @click="goToContent(event)"
              >
                <!-- 选择框 -->
                <div class="event-checkbox" @click.stop>
                  <input
                    type="checkbox"
                    :checked="selectedIds.includes(event.id)"
                    @change="toggleSelect(event.id)"
                  />
                </div>

                <!-- 活动封面 -->
                <div class="event-cover">
                  <img
                    v-if="event.coverUrl"
                    :src="event.coverUrl"
                    :alt="event.title"
                    class="cover-image"
                  />
                  <div v-else class="cover-placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                  </div>
                  <span v-if="event.isFeatured" class="featured-badge">精选</span>
                </div>

                <!-- 活动信息 -->
                <div class="event-info">
                  <div class="event-header">
                    <h3 class="event-title">{{ event.title }}</h3>
                    <span class="status-badge" :class="getEventStatusInfo(event.status).class">
                      {{ getEventStatusInfo(event.status).label }}
                    </span>
                  </div>
                  <p v-if="event.subtitle" class="event-subtitle">{{ event.subtitle }}</p>
                  <div class="event-tags" v-if="event.tags && event.tags.length > 0">
                    <span
                      v-for="tag in event.tags"
                      :key="tag.id"
                      class="event-tag"
                      :style="{ backgroundColor: tag.color + '20', color: tag.color }"
                    >
                      {{ tag.name }}
                    </span>
                  </div>
                  <div class="event-meta">
                    <span class="meta-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                      {{ formatDate(event.startDate) }}
                    </span>
                    <span v-if="event.location" class="meta-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                      </svg>
                      {{ event.location }}
                    </span>
                    <span class="meta-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                      {{ event.viewCount }}
                    </span>
                    <span class="meta-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                      {{ event.momentCount }}
                    </span>
                  </div>
                </div>

                <!-- 操作按钮 -->
                <div class="event-actions">
                  <button
                    class="action-btn edit"
                    @click="goToEdit(event, $event)"
                  >
                    编辑
                  </button>
                  <button
                    v-if="event.status === 0"
                    class="action-btn publish"
                    @click="publishEvent(event, $event)"
                  >
                    发布
                  </button>
                  <button
                    v-if="event.status === 1"
                    class="action-btn unpublish"
                    @click="unpublishEvent(event, $event)"
                  >
                    下架
                  </button>
                  <button
                    class="action-btn feature"
                    :class="{ active: event.isFeatured }"
                    @click="featureEvent(event, $event)"
                  >
                    {{ event.isFeatured ? '取消精选' : '精选' }}
                  </button>
                  <button
                    class="action-btn delete"
                    @click="openDeleteConfirm(event, $event)"
                  >
                    删除
                  </button>
                  <div class="arrow-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <!-- 分页 -->
            <div v-if="totalPages > 1" class="pagination">
              <button
                class="page-btn"
                :disabled="currentPage === 1"
                @click="goToPage(currentPage - 1)"
              >
                上一页
              </button>
              <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
              <button
                class="page-btn"
                :disabled="currentPage === totalPages"
                @click="goToPage(currentPage + 1)"
              >
                下一页
              </button>
            </div>
          </div>
        </template>
      </div>
    </main>

    <PageFooter />

    <!-- 删除确认弹窗 -->
    <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="cancelDelete">
      <div class="modal-content">
        <h3 class="modal-title">确认删除</h3>
        <p class="modal-desc">
          确定要删除活动"{{ deleteTarget?.title }}"吗？此操作不可撤销。
        </p>
        <div class="modal-actions">
          <button class="modal-btn cancel" @click="cancelDelete" :disabled="isDeleting">
            取消
          </button>
          <button class="modal-btn confirm danger" @click="confirmDelete" :disabled="isDeleting">
            {{ isDeleting ? '删除中...' : '确认删除' }}
          </button>
        </div>
      </div>
    </div>
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
}

.content-container {
  max-width: 900px;
  margin: 0 auto;
}

/* ===== Breadcrumb ===== */
.breadcrumb-wrapper {
  display: none;
  margin-bottom: var(--spacing-lg);
}

/* ===== Page Header ===== */
.page-header-section {
  margin-bottom: var(--spacing-md);
}

.header-main {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.header-text {
  display: none;
}

.page-title {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-xs);
}

.page-subtitle {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.header-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.action-button {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.action-button svg {
  width: 16px;
  height: 16px;
}

.action-button.primary {
  background: var(--color-primary);
  color: white;
}

.action-button.primary:hover {
  background: var(--color-primary-dark);
}

/* ===== Filter Bar ===== */
.filter-bar {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
  flex-wrap: wrap;
}

.search-input-wrapper {
  flex: 1;
  min-width: 200px;
  position: relative;
}

.search-icon {
  position: absolute;
  left: var(--spacing-sm);
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  color: var(--color-text-placeholder);
}

.search-input {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-sm) var(--spacing-sm) 40px;
  font-size: var(--text-sm);
  color: var(--color-text);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-primary-bg);
}

.filter-select {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  color: var(--color-text);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
}

.search-btn {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: white;
  background: var(--color-primary);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.search-btn:hover {
  background: var(--color-primary-dark);
}

/* ===== Status Tabs ===== */
.status-tabs {
  position: relative;
  display: flex;
  gap: 2px;
  margin-bottom: var(--spacing-md);
  padding: 3px;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.status-tabs::-webkit-scrollbar {
  display: none;
}

.status-tab {
  flex: 1;
  min-width: 60px;
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: color 0.2s ease, background-color 0.3s ease, transform 0.2s ease;
  text-align: center;
  white-space: nowrap;
}

.status-tab:hover {
  color: var(--color-text);
}

.status-tab:active {
  transform: scale(0.95);
}

.status-tab.active {
  color: var(--color-primary);
  background: var(--color-primary-bg);
}

/* ===== Batch Actions ===== */
.batch-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  margin-bottom: var(--spacing-md);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.select-all {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  cursor: pointer;
}

.select-all input {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.batch-btns {
  display: flex;
  gap: var(--spacing-xs);
  flex-wrap: wrap;
}

.batch-btn {
  padding: 4px 10px;
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.batch-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.batch-btn.publish {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.batch-btn.publish:hover:not(:disabled) {
  background: var(--color-success);
  color: white;
}

.batch-btn.unpublish {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.batch-btn.unpublish:hover:not(:disabled) {
  background: var(--color-warning);
  color: white;
}

.batch-btn.feature {
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

.batch-btn.feature:hover:not(:disabled) {
  background: var(--color-primary);
  color: white;
}

.batch-btn.delete {
  background: var(--color-error-bg);
  color: var(--color-error);
}

.batch-btn.delete:hover:not(:disabled) {
  background: var(--color-error);
  color: white;
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

/* ===== Content Slide Animation ===== */
.content-slide-wrapper {
  animation-fill-mode: both;
}

.content-slide-wrapper.slide-left {
  animation: slideInFromRight 0.3s ease;
}

.content-slide-wrapper.slide-right {
  animation: slideInFromLeft 0.3s ease;
}

@keyframes slideInFromRight {
  from {
    opacity: 0;
    transform: translateX(30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideInFromLeft {
  from {
    opacity: 0;
    transform: translateX(-30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* ===== Empty ===== */
.empty-container {
  text-align: center;
  padding: var(--spacing-2xl) var(--spacing-md);
}

.empty-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto var(--spacing-md);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-border);
  color: var(--color-text-secondary);
  border-radius: var(--radius-lg);
}

.empty-icon svg {
  width: 32px;
  height: 32px;
}

.empty-container h2 {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-xs);
}

.empty-container p {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-md);
}

.empty-action-btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: white;
  background: var(--color-primary);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.empty-action-btn:hover {
  background: var(--color-primary-dark);
}

/* ===== Event List ===== */
.events-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.event-card {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
  position: relative;
}

.event-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.event-checkbox {
  position: absolute;
  top: var(--spacing-md);
  right: var(--spacing-md);
  z-index: 1;
}

.event-checkbox input {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

/* ===== Event Cover ===== */
.event-cover {
  width: 100%;
  height: 120px;
  border-radius: var(--radius-md);
  overflow: hidden;
  position: relative;
}

.cover-image {
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
  background: var(--color-border);
  color: var(--color-text-placeholder);
}

.cover-placeholder svg {
  width: 32px;
  height: 32px;
}

.featured-badge {
  position: absolute;
  top: var(--spacing-xs);
  left: var(--spacing-xs);
  padding: 2px 8px;
  font-size: 10px;
  font-weight: var(--font-semibold);
  color: white;
  background: var(--color-primary);
  border-radius: var(--radius-sm);
}

/* ===== Event Info ===== */
.event-info {
  flex: 1;
  min-width: 0;
}

.event-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: 4px;
  flex-wrap: wrap;
}

.event-title {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-badge {
  font-size: 10px;
  font-weight: var(--font-semibold);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.status-badge.status-draft {
  background: var(--color-border);
  color: var(--color-text-secondary);
}

.status-badge.status-published {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.status-badge.status-unpublished {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.event-subtitle {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.event-tags {
  display: flex;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-xs);
  flex-wrap: wrap;
}

.event-tag {
  font-size: 10px;
  font-weight: var(--font-medium);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}

.event-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 2px;
}

.meta-item svg {
  width: 12px;
  height: 12px;
}

/* ===== Event Actions ===== */
.event-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding-top: var(--spacing-sm);
  border-top: 1px solid var(--color-border);
  flex-wrap: wrap;
}

.action-btn {
  padding: 4px 12px;
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.action-btn.edit {
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

.action-btn.edit:hover {
  background: var(--color-primary);
  color: white;
}

.action-btn.publish {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.action-btn.publish:hover {
  background: var(--color-success);
  color: white;
}

.action-btn.unpublish {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.action-btn.unpublish:hover {
  background: var(--color-warning);
  color: white;
}

.action-btn.feature {
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

.action-btn.feature:hover {
  background: var(--color-primary);
  color: white;
}

.action-btn.feature.active {
  background: var(--color-primary);
  color: white;
}

.action-btn.delete {
  background: var(--color-error-bg);
  color: var(--color-error);
}

.action-btn.delete:hover {
  background: var(--color-error);
  color: white;
}

.arrow-icon {
  margin-left: auto;
  color: var(--color-text-placeholder);
}

.arrow-icon svg {
  width: 16px;
  height: 16px;
}

/* ===== Pagination ===== */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  margin-top: var(--spacing-lg);
}

.page-btn {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.page-btn:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

/* ===== Modal ===== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--spacing-md);
}

.modal-content {
  background: var(--color-card);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  max-width: 400px;
  width: 100%;
}

.modal-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-md);
}

.modal-desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-lg);
}

.modal-actions {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: flex-end;
}

.modal-btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.modal-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.modal-btn.cancel {
  background: var(--color-border);
  color: var(--color-text);
}

.modal-btn.cancel:hover:not(:disabled) {
  background: var(--color-text-placeholder);
}

.modal-btn.confirm {
  background: var(--color-primary);
  color: white;
}

.modal-btn.confirm:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.modal-btn.confirm.danger {
  background: var(--color-error);
}

.modal-btn.confirm.danger:hover:not(:disabled) {
  opacity: 0.9;
}

/* ===== Desktop ===== */
@media (min-width: 1024px) {
  .breadcrumb-wrapper {
    display: block;
  }

  .page-content {
    padding: var(--spacing-xl);
  }

  .page-header-section {
    margin-bottom: var(--spacing-lg);
  }

  .header-main {
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-start;
  }

  .header-text {
    display: block;
  }

  .page-title {
    font-size: var(--text-2xl);
  }

  .page-subtitle {
    font-size: var(--text-base);
  }

  .status-tab {
    font-size: var(--text-sm);
    padding: var(--spacing-sm) var(--spacing-md);
  }

  .event-card {
    flex-direction: row;
    align-items: flex-start;
    gap: var(--spacing-md);
  }

  .event-checkbox {
    position: static;
    display: flex;
    align-items: center;
  }

  .event-cover {
    width: 160px;
    height: 100px;
    flex-shrink: 0;
  }

  .event-info {
    flex: 1;
  }

  .event-title {
    font-size: var(--text-base);
  }

  .event-actions {
    flex-shrink: 0;
    padding-top: 0;
    padding-left: var(--spacing-md);
    border-top: none;
    border-left: 1px solid var(--color-border);
    flex-direction: column;
    align-items: flex-end;
    flex-wrap: nowrap;
  }

  .arrow-icon {
    margin-left: 0;
    margin-top: auto;
  }

  .action-btn {
    padding: 6px 16px;
    font-size: var(--text-sm);
  }

  .batch-btn {
    padding: 6px 14px;
    font-size: var(--text-sm);
  }
}
</style>
