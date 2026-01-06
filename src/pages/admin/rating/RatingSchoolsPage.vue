<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/composables/useToast'
import {
  getStatistics,
  getAdminSchools,
  createSchool,
  updateSchool,
  deleteSchool,
  updateSchoolStatus,
} from '@/api/rating'
import type {
  RatingStatistics,
  AdminSchool,
  CreateSchoolRequest,
  RatingStatus,
} from '@/types/rating'
import { getRatingStatusInfo } from '@/types/rating'
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb.vue'

const router = useRouter()
const userStore = useUserStore()
const toast = useToast()

// 加载状态
const isLoading = ref(true)

// 统计数据
const statistics = ref<RatingStatistics | null>(null)

// 学校列表
const schools = ref<AdminSchool[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

// 筛选状态
const statusFilter = ref<RatingStatus | 'all'>('all')
const tabOrder = ['all', 1, 0] as const
const slideDirection = ref<'left' | 'right' | ''>('')
const isAnimating = ref(false)

// 监听 Tab 切换
watch(statusFilter, (newVal, oldVal) => {
  if (oldVal === undefined) return
  const oldIndex = tabOrder.indexOf(oldVal as typeof tabOrder[number])
  const newIndex = tabOrder.indexOf(newVal as typeof tabOrder[number])
  slideDirection.value = newIndex > oldIndex ? 'left' : 'right'
  isAnimating.value = true
  loadSchools()

  nextTick(() => {
    setTimeout(() => {
      isAnimating.value = false
      slideDirection.value = ''
    }, 300)
  })
})

// 创建/编辑模态框
const showSchoolModal = ref(false)
const schoolModalMode = ref<'create' | 'edit'>('create')
const editingSchool = ref<AdminSchool | null>(null)
const schoolForm = ref<CreateSchoolRequest>({ name: '' })
const isSavingSchool = ref(false)

// 删除确认
const showDeleteConfirm = ref(false)
const deleteTarget = ref<AdminSchool | null>(null)
const isDeleting = ref(false)

// 加载统计数据
async function loadStatistics() {
  try {
    const res = await getStatistics()
    if (res.data.code === 200) {
      statistics.value = res.data.data
    }
  } catch (error) {
    console.error('获取统计数据失败', error)
  }
}

// 加载学校列表
async function loadSchools() {
  try {
    const params: { page?: number; size?: number; status?: number } = {
      page: page.value,
      size: pageSize.value,
    }
    if (statusFilter.value !== 'all') {
      params.status = statusFilter.value
    }
    const res = await getAdminSchools(params)
    if (res.data.code === 200) {
      schools.value = res.data.data.items
      total.value = res.data.data.total
    } else {
      toast.error(res.data.message || '获取学校列表失败')
    }
  } catch (error) {
    toast.error('获取学校列表失败')
  }
}

// 加载所有数据
async function loadAllData() {
  isLoading.value = true
  try {
    await Promise.all([loadStatistics(), loadSchools()])
  } finally {
    isLoading.value = false
  }
}

// 打开创建模态框
function openCreateModal() {
  schoolModalMode.value = 'create'
  editingSchool.value = null
  schoolForm.value = { name: '' }
  showSchoolModal.value = true
}

// 打开编辑模态框
function openEditModal(school: AdminSchool, event: Event) {
  event.stopPropagation()
  schoolModalMode.value = 'edit'
  editingSchool.value = school
  schoolForm.value = { name: school.name }
  showSchoolModal.value = true
}

// 关闭模态框
function closeSchoolModal() {
  showSchoolModal.value = false
  editingSchool.value = null
  schoolForm.value = { name: '' }
}

// 保存学校
async function saveSchool() {
  if (!schoolForm.value.name.trim()) {
    toast.error('请填写学校名称')
    return
  }

  isSavingSchool.value = true
  try {
    if (schoolModalMode.value === 'create') {
      const res = await createSchool(schoolForm.value)
      if (res.data.code === 200) {
        toast.success('学校创建成功')
        closeSchoolModal()
        await loadAllData()
      } else {
        toast.error(res.data.message || '创建失败')
      }
    } else if (editingSchool.value) {
      const res = await updateSchool(editingSchool.value.id, schoolForm.value)
      if (res.data.code === 200) {
        toast.success('学校更新成功')
        closeSchoolModal()
        await loadSchools()
      } else {
        toast.error(res.data.message || '更新失败')
      }
    }
  } catch (error) {
    toast.error(schoolModalMode.value === 'create' ? '创建失败' : '更新失败')
  } finally {
    isSavingSchool.value = false
  }
}

// 切换状态
async function toggleStatus(school: AdminSchool, event: Event) {
  event.stopPropagation()
  const newStatus = school.status === 1 ? 0 : 1
  try {
    const res = await updateSchoolStatus(school.id, { status: newStatus as RatingStatus })
    if (res.data.code === 200) {
      toast.success(newStatus === 1 ? '已启用' : '已禁用')
      await loadSchools()
    } else {
      toast.error(res.data.message || '操作失败')
    }
  } catch (error) {
    toast.error('操作失败')
  }
}

// 打开删除确认
function openDeleteConfirm(school: AdminSchool, event: Event) {
  event.stopPropagation()
  deleteTarget.value = school
  showDeleteConfirm.value = true
}

// 确认删除
async function confirmDelete() {
  if (!deleteTarget.value) return

  isDeleting.value = true
  try {
    const res = await deleteSchool(deleteTarget.value.id)
    if (res.data.code === 200) {
      toast.success('学校已删除')
      showDeleteConfirm.value = false
      deleteTarget.value = null
      await loadAllData()
    } else {
      toast.error(res.data.message || '删除失败')
    }
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

// 进入大分区列表
function goToMajorSections(school: AdminSchool) {
  router.push(`/admin/rating/schools/${school.id}`)
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
  if (!userStore.isLoggedIn || !userStore.canManageRating) {
    toast.error('无权访问此页面')
    router.push('/')
    return
  }
  loadAllData()
})
</script>

<template>
  <div class="page-container">
    <PageHeader back-to="/" />

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
              <h1 class="page-title">评分社区管理</h1>
              <p class="page-subtitle">管理学校、分区和评分项目</p>
            </div>
            <div class="header-actions">
              <button class="action-button secondary" @click="router.push('/admin/rating/collections')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                </svg>
                合集管理
              </button>
              <button class="action-button primary" @click="openCreateModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                添加学校
              </button>
            </div>
          </div>
        </div>

        <!-- 加载状态 -->
        <div v-if="isLoading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>

        <template v-else>
          <!-- 统计概览 -->
          <div v-if="statistics" class="statistics-grid">
            <div class="stat-card">
              <div class="stat-value">{{ statistics.schoolCount }}</div>
              <div class="stat-label">学校总数</div>
              <div class="stat-sub">{{ statistics.enabledSchoolCount }} 个启用</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ statistics.majorSectionCount }}</div>
              <div class="stat-label">大分区</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ statistics.minorSectionCount }}</div>
              <div class="stat-label">小分区</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ statistics.ratingItemCount }}</div>
              <div class="stat-label">评分项目</div>
              <div class="stat-sub">{{ statistics.enabledRatingItemCount }} 个启用</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ statistics.userRatingCount }}</div>
              <div class="stat-label">用户评分</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ statistics.commentCount }}</div>
              <div class="stat-label">评论数</div>
            </div>
          </div>

          <!-- 状态筛选 -->
          <div class="section-header">
            <h2 class="section-title">学校列表</h2>
          </div>
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
              :class="{ active: statusFilter === 1 }"
              @click="statusFilter = 1"
            >
              启用
            </button>
            <button
              class="status-tab"
              :class="{ active: statusFilter === 0 }"
              @click="statusFilter = 0"
            >
              禁用
            </button>
          </div>

          <!-- 内容区域（带动画） -->
          <div
            class="content-slide-wrapper"
            :class="{
              'slide-left': isAnimating && slideDirection === 'left',
              'slide-right': isAnimating && slideDirection === 'right'
            }"
          >
            <!-- 空状态 -->
            <div v-if="schools.length === 0" class="empty-container">
              <div class="empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4z"></path>
                </svg>
              </div>
              <h2>{{ statusFilter === 'all' ? '暂无学校' : '暂无相关学校' }}</h2>
              <p>{{ statusFilter === 'all' ? '还没有添加任何学校' : '没有找到该状态的学校' }}</p>
              <button v-if="statusFilter === 'all'" class="empty-action-btn" @click="openCreateModal">
                添加第一个学校
              </button>
            </div>

            <!-- 学校列表 -->
            <div v-else class="items-list">
              <div
                v-for="school in schools"
                :key="school.id"
                class="item-card"
                @click="goToMajorSections(school)"
              >
                <!-- 学校信息 -->
                <div class="item-info">
                  <div class="item-header">
                    <h3 class="item-name">{{ school.name }}</h3>
                    <span class="status-badge" :class="getRatingStatusInfo(school.status).class">
                      {{ getRatingStatusInfo(school.status).label }}
                    </span>
                  </div>
                  <div class="item-meta">
                    <span class="meta-item">{{ school.majorSectionCount }} 个大分区</span>
                    <span class="meta-divider">·</span>
                    <span class="meta-item">{{ formatDate(school.createdAt) }}</span>
                  </div>
                </div>

                <!-- 操作按钮 -->
                <div class="item-actions">
                  <button
                    class="action-btn toggle"
                    :class="{ 'is-enabled': school.status === 1 }"
                    @click="toggleStatus(school, $event)"
                  >
                    {{ school.status === 1 ? '禁用' : '启用' }}
                  </button>
                  <button class="action-btn edit" @click="openEditModal(school, $event)">
                    编辑
                  </button>
                  <button class="action-btn delete" @click="openDeleteConfirm(school, $event)">
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
          </div>
        </template>
      </div>
    </main>

    <PageFooter />

    <!-- 创建/编辑学校模态框 -->
    <Transition name="modal-fade">
      <div v-if="showSchoolModal" class="modal-overlay" @click.self="closeSchoolModal">
        <Transition name="modal-scale" appear>
          <div v-if="showSchoolModal" class="modal-content" @click.stop>
            <h3 class="modal-title">
              {{ schoolModalMode === 'create' ? '添加学校' : '编辑学校' }}
            </h3>
            <div class="form-group">
              <label class="form-label">学校名称</label>
              <input
                v-model="schoolForm.name"
                type="text"
                class="form-input"
                placeholder="例如：西门一中"
                maxlength="50"
              />
            </div>
            <div class="modal-actions">
              <button class="modal-btn cancel" @click="closeSchoolModal" :disabled="isSavingSchool">
                取消
              </button>
              <button class="modal-btn confirm primary" @click="saveSchool" :disabled="isSavingSchool">
                {{ isSavingSchool ? '保存中...' : '保存' }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>

    <!-- 删除确认弹窗 -->
    <Transition name="modal-fade">
      <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="cancelDelete">
        <Transition name="modal-scale" appear>
          <div v-if="showDeleteConfirm" class="modal-content" @click.stop>
            <h3 class="modal-title">确认删除</h3>
            <p class="modal-desc">
              确定要删除学校"{{ deleteTarget?.name }}"吗？此操作不可撤销。
            </p>
            <p class="modal-warning">注意：如果该学校下有大分区，将无法删除。</p>
            <div class="modal-actions">
              <button class="modal-btn cancel" @click="cancelDelete" :disabled="isDeleting">
                取消
              </button>
              <button class="modal-btn confirm danger" @click="confirmDelete" :disabled="isDeleting">
                {{ isDeleting ? '删除中...' : '确认删除' }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
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

.action-button.secondary {
  background: var(--color-card);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.action-button.secondary:hover {
  background: var(--color-border);
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

/* ===== Statistics ===== */
.statistics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-lg);
}

.stat-card {
  padding: var(--spacing-md);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  text-align: center;
}

.stat-value {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  color: var(--color-primary);
  margin-bottom: 2px;
}

.stat-label {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.stat-sub {
  font-size: 10px;
  color: var(--color-text-placeholder);
  margin-top: 2px;
}

/* ===== Section Header ===== */
.section-header {
  margin-bottom: var(--spacing-sm);
}

.section-title {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
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

/* ===== Items List ===== */
.items-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.item-card {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.item-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: 4px;
  flex-wrap: wrap;
}

.item-name {
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

.status-badge.status-enabled {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.status-badge.status-disabled {
  background: var(--color-border);
  color: var(--color-text-secondary);
}

.status-badge.status-pending {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.status-badge.status-rejected {
  background: var(--color-error-bg);
  color: var(--color-error);
}

.item-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
}

.meta-divider {
  color: var(--color-border);
}

.item-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex-shrink: 0;
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

.action-btn.toggle {
  background: var(--color-info-bg);
  color: var(--color-info);
}

.action-btn.toggle:hover {
  background: var(--color-info);
  color: white;
}

.action-btn.toggle.is-enabled {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.action-btn.toggle.is-enabled:hover {
  background: var(--color-warning);
  color: white;
}

.action-btn.edit {
  background: var(--color-border);
  color: var(--color-text-secondary);
}

.action-btn.edit:hover {
  background: var(--color-text-placeholder);
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
  color: var(--color-text-placeholder);
  margin-left: auto;
}

.arrow-icon svg {
  width: 16px;
  height: 16px;
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
  margin-bottom: var(--spacing-sm);
}

.modal-warning {
  font-size: var(--text-xs);
  color: var(--color-warning);
  margin-bottom: var(--spacing-lg);
}

.form-group {
  margin-bottom: var(--spacing-md);
}

.form-label {
  display: block;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  margin-bottom: var(--spacing-xs);
}

.form-input {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  color: var(--color-text);
  transition: border-color var(--transition-fast);
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.form-input::placeholder {
  color: var(--color-text-placeholder);
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

.modal-btn.confirm.primary {
  background: var(--color-primary);
  color: white;
}

.modal-btn.confirm.primary:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.modal-btn.confirm.danger {
  background: var(--color-error);
  color: white;
}

.modal-btn.confirm.danger:hover:not(:disabled) {
  opacity: 0.9;
}

/* ===== Modal Transitions ===== */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-scale-enter-active,
.modal-scale-leave-active {
  transition: all 0.2s ease;
}

.modal-scale-enter-from,
.modal-scale-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

/* ===== Desktop ===== */
@media (min-width: 768px) {
  .item-card {
    flex-direction: row;
    align-items: center;
  }
}

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

  .statistics-grid {
    grid-template-columns: repeat(6, 1fr);
    gap: var(--spacing-md);
  }

  .stat-value {
    font-size: var(--text-2xl);
  }

  .stat-label {
    font-size: var(--text-sm);
  }

  .section-title {
    font-size: var(--text-lg);
  }

  .status-tab {
    font-size: var(--text-sm);
    padding: var(--spacing-sm) var(--spacing-md);
  }

  .item-name {
    font-size: var(--text-base);
  }

  .item-meta {
    font-size: var(--text-sm);
  }

  .status-badge {
    font-size: var(--text-xs);
    padding: 3px 8px;
  }

  .action-btn {
    padding: 6px 16px;
    font-size: var(--text-sm);
  }
}
</style>
