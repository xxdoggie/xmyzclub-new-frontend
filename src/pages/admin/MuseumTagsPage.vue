<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/composables/useToast'
import {
  adminGetTags,
  adminCreateTag,
  adminUpdateTag,
  adminDeleteTag,
  adminToggleTagStatus,
  adminSortTags,
} from '@/api/museum'
import type { Tag, TagRequest } from '@/types/museum'
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb.vue'

const router = useRouter()
const userStore = useUserStore()
const toast = useToast()

// 状态
const isLoading = ref(true)
const tags = ref<Tag[]>([])

// 筛选状态
const statusFilter = ref<'all' | 'enabled' | 'disabled'>('all')

// Tab 切换动画
const tabOrder = ['all', 'enabled', 'disabled'] as const
const slideDirection = ref<'left' | 'right' | ''>('')
const isAnimating = ref(false)

// 监听 Tab 切换
watch(statusFilter, (newVal, oldVal) => {
  if (!oldVal) return
  const oldIndex = tabOrder.indexOf(oldVal as (typeof tabOrder)[number])
  const newIndex = tabOrder.indexOf(newVal as (typeof tabOrder)[number])
  slideDirection.value = newIndex > oldIndex ? 'left' : 'right'
  isAnimating.value = true

  nextTick(() => {
    setTimeout(() => {
      isAnimating.value = false
      slideDirection.value = ''
    }, 300)
  })
})

// 删除确认
const showDeleteConfirm = ref(false)
const deleteTarget = ref<Tag | null>(null)
const isDeleting = ref(false)

// 编辑/创建 Modal
const showEditModal = ref(false)
const isEditing = ref(false)
const isSaving = ref(false)
const editingTag = ref<Tag | null>(null)
const formData = ref<TagRequest>({
  name: '',
  color: '#6366f1',
  icon: '',
  sortOrder: 0,
})

// 预设颜色
const presetColors = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
]

// 筛选后的标签列表
const filteredTags = computed(() => {
  if (statusFilter.value === 'all') {
    return tags.value
  }
  const status = statusFilter.value === 'enabled' ? 1 : 0
  return tags.value.filter((t) => t.status === status)
})

// 加载标签列表
async function loadTags() {
  try {
    const data = await adminGetTags()
    tags.value = data
  } catch (error) {
    toast.error('获取标签列表失败')
  } finally {
    isLoading.value = false
  }
}

// 获取状态信息
function getStatusInfo(status: number) {
  return status === 1
    ? { label: '启用', class: 'status-enabled' }
    : { label: '禁用', class: 'status-disabled' }
}

// 切换启用/禁用状态
async function toggleStatus(tag: Tag, event: Event) {
  event.stopPropagation()
  try {
    const updated = await adminToggleTagStatus(tag.id)
    const index = tags.value.findIndex((t) => t.id === tag.id)
    if (index !== -1) {
      tags.value[index] = updated
    }
    toast.success(updated.status === 1 ? '已启用' : '已禁用')
  } catch (error) {
    toast.error('操作失败')
  }
}

// 打开创建 Modal
function openCreateModal() {
  isEditing.value = false
  editingTag.value = null
  formData.value = {
    name: '',
    color: '#6366f1',
    icon: '',
    sortOrder: tags.value.length,
  }
  showEditModal.value = true
}

// 打开编辑 Modal
function openEditModal(tag: Tag, event?: Event) {
  event?.stopPropagation()
  isEditing.value = true
  editingTag.value = tag
  formData.value = {
    name: tag.name,
    color: tag.color,
    icon: tag.icon || '',
    sortOrder: tag.sortOrder,
  }
  showEditModal.value = true
}

// 关闭编辑 Modal
function closeEditModal() {
  showEditModal.value = false
  editingTag.value = null
}

// 保存标签
async function saveTag() {
  if (!formData.value.name.trim()) {
    toast.error('请输入标签名称')
    return
  }

  isSaving.value = true
  try {
    if (isEditing.value && editingTag.value) {
      // 更新
      const updated = await adminUpdateTag(editingTag.value.id, formData.value)
      const index = tags.value.findIndex((t) => t.id === editingTag.value!.id)
      if (index !== -1) {
        tags.value[index] = updated
      }
      toast.success('更新成功')
    } else {
      // 创建
      const created = await adminCreateTag(formData.value)
      tags.value.push(created)
      toast.success('创建成功')
    }
    closeEditModal()
  } catch (error) {
    toast.error(isEditing.value ? '更新失败' : '创建失败')
  } finally {
    isSaving.value = false
  }
}

// 打开删除确认
function openDeleteConfirm(tag: Tag, event: Event) {
  event.stopPropagation()
  deleteTarget.value = tag
  showDeleteConfirm.value = true
}

// 确认删除
async function confirmDelete() {
  if (!deleteTarget.value) return

  isDeleting.value = true
  try {
    await adminDeleteTag(deleteTarget.value.id)
    tags.value = tags.value.filter((t) => t.id !== deleteTarget.value!.id)
    toast.success('删除成功')
    showDeleteConfirm.value = false
    deleteTarget.value = null
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

onMounted(() => {
  if (!userStore.isLoggedIn || !userStore.canManageMuseum) {
    toast.error('无权访问此页面')
    router.push('/')
    return
  }
  loadTags()
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
              <h1 class="page-title">标签管理</h1>
              <p class="page-subtitle">管理活动分类标签</p>
            </div>
            <div class="header-actions">
              <button class="action-button primary" @click="openCreateModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                添加标签
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
              :class="{ active: statusFilter === 'enabled' }"
              @click="statusFilter = 'enabled'"
            >
              已启用
            </button>
            <button
              class="status-tab"
              :class="{ active: statusFilter === 'disabled' }"
              @click="statusFilter = 'disabled'"
            >
              已禁用
            </button>
          </div>

          <!-- 内容区域（带动画） -->
          <div
            class="content-slide-wrapper"
            :class="{
              'slide-left': isAnimating && slideDirection === 'left',
              'slide-right': isAnimating && slideDirection === 'right',
            }"
          >
            <!-- 空状态 -->
            <div v-if="filteredTags.length === 0" class="empty-container">
              <div class="empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                  <line x1="7" y1="7" x2="7.01" y2="7"></line>
                </svg>
              </div>
              <h2>{{ statusFilter === 'all' ? '暂无标签' : '暂无相关标签' }}</h2>
              <p>{{ statusFilter === 'all' ? '还没有添加任何标签' : '没有找到该状态的标签' }}</p>
              <button v-if="statusFilter === 'all'" class="empty-action-btn" @click="openCreateModal">
                添加第一个标签
              </button>
            </div>

            <!-- 标签列表 -->
            <div v-else class="tags-list">
              <div
                v-for="tag in filteredTags"
                :key="tag.id"
                class="tag-card"
                @click="openEditModal(tag)"
              >
                <!-- 标签颜色标识 -->
                <div class="tag-color" :style="{ backgroundColor: tag.color }"></div>

                <!-- 标签信息 -->
                <div class="tag-info">
                  <div class="tag-header">
                    <h3 class="tag-name">{{ tag.name }}</h3>
                    <span class="status-badge" :class="getStatusInfo(tag.status).class">
                      {{ getStatusInfo(tag.status).label }}
                    </span>
                  </div>
                  <div class="tag-meta">
                    <span v-if="tag.icon" class="meta-item">图标: {{ tag.icon }}</span>
                    <span class="meta-item">排序: {{ tag.sortOrder }}</span>
                    <span class="meta-item">活动数: {{ tag.eventCount }}</span>
                  </div>
                </div>

                <!-- 操作按钮 -->
                <div class="tag-actions">
                  <button
                    class="action-btn"
                    :class="tag.status === 1 ? 'disable' : 'enable'"
                    @click="toggleStatus(tag, $event)"
                  >
                    {{ tag.status === 1 ? '禁用' : '启用' }}
                  </button>
                  <button class="action-btn delete" @click="openDeleteConfirm(tag, $event)">
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

    <!-- 编辑/创建 Modal -->
    <div v-if="showEditModal" class="modal-overlay" @click.self="closeEditModal">
      <div class="modal-content">
        <h3 class="modal-title">{{ isEditing ? '编辑标签' : '添加标签' }}</h3>

        <div class="form-group">
          <label class="form-label">
            标签名称 <span class="required">*</span>
          </label>
          <input
            v-model="formData.name"
            type="text"
            class="form-input"
            placeholder="请输入标签名称"
            maxlength="20"
          />
        </div>

        <div class="form-group">
          <label class="form-label">标签颜色</label>
          <div class="color-picker">
            <div class="color-preview" :style="{ backgroundColor: formData.color }"></div>
            <input
              v-model="formData.color"
              type="text"
              class="form-input color-input"
              placeholder="#6366f1"
            />
          </div>
          <div class="preset-colors">
            <button
              v-for="color in presetColors"
              :key="color"
              class="preset-color"
              :class="{ active: formData.color === color }"
              :style="{ backgroundColor: color }"
              @click="formData.color = color"
            ></button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">图标名称</label>
          <input
            v-model="formData.icon"
            type="text"
            class="form-input"
            placeholder="如: music, trophy, star"
          />
        </div>

        <div class="form-group">
          <label class="form-label">排序</label>
          <input
            v-model.number="formData.sortOrder"
            type="number"
            class="form-input"
            placeholder="0"
            min="0"
          />
        </div>

        <div class="modal-actions">
          <button class="modal-btn cancel" @click="closeEditModal" :disabled="isSaving">
            取消
          </button>
          <button class="modal-btn confirm" @click="saveTag" :disabled="isSaving">
            {{ isSaving ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 删除确认弹窗 -->
    <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="cancelDelete">
      <div class="modal-content">
        <h3 class="modal-title">确认删除</h3>
        <p class="modal-desc">
          确定要删除标签"{{ deleteTarget?.name }}"吗？此操作不可撤销。
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

/* ===== Tag List ===== */
.tags-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.tag-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.tag-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.tag-color {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  flex-shrink: 0;
}

.tag-info {
  flex: 1;
  min-width: 0;
}

.tag-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: 4px;
  flex-wrap: wrap;
}

.tag-name {
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

.tag-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
}

.tag-actions {
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

.action-btn.enable {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.action-btn.enable:hover {
  background: var(--color-success);
  color: white;
}

.action-btn.disable {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.action-btn.disable:hover {
  background: var(--color-warning);
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
  max-height: 85vh;
  overflow-y: auto;
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

/* ===== Form ===== */
.form-group {
  margin-bottom: var(--spacing-md);
}

.form-label {
  display: block;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text);
  margin-bottom: var(--spacing-xs);
}

.form-label .required {
  color: var(--color-error);
}

.form-input {
  width: 100%;
  padding: var(--spacing-sm);
  font-size: var(--text-sm);
  color: var(--color-text);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-primary-bg);
}

/* ===== Color Picker ===== */
.color-picker {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
}

.color-preview {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  flex-shrink: 0;
}

.color-input {
  flex: 1;
}

.preset-colors {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.preset-color {
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm);
  border: 2px solid transparent;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.preset-color:hover {
  transform: scale(1.1);
}

.preset-color.active {
  border-color: var(--color-text);
}

.modal-actions {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: flex-end;
  margin-top: var(--spacing-lg);
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

  .tag-name {
    font-size: var(--text-base);
  }

  .tag-meta {
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
