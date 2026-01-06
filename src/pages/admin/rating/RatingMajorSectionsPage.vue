<script setup lang="ts">
import { ref, onMounted, watch, nextTick, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/composables/useToast'
import {
  getAdminSchoolDetail,
  getAdminMajorSections,
  createMajorSection,
  updateMajorSection,
  deleteMajorSection,
  updateMajorSectionStatus,
  uploadMajorSectionImage,
  deleteMajorSectionImage,
} from '@/api/rating'
import type {
  AdminSchool,
  AdminMajorSection,
  CreateMajorSectionRequest,
  UpdateMajorSectionRequest,
  RatingStatus,
} from '@/types/rating'
import { getRatingStatusInfo } from '@/types/rating'
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb.vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const toast = useToast()

// 学校ID
const schoolId = computed(() => Number(route.params.schoolId))

// 加载状态
const isLoading = ref(true)

// 学校信息
const school = ref<AdminSchool | null>(null)

// 大分区列表
const majorSections = ref<AdminMajorSection[]>([])
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
  loadMajorSections()

  nextTick(() => {
    setTimeout(() => {
      isAnimating.value = false
      slideDirection.value = ''
    }, 300)
  })
})

// 创建/编辑模态框
const showModal = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const editingItem = ref<AdminMajorSection | null>(null)
const form = ref<CreateMajorSectionRequest & { description: string }>({
  schoolId: 0,
  name: '',
  description: '',
})
const isSaving = ref(false)

// 图片上传
const imageFile = ref<File | null>(null)
const imagePreview = ref<string | null>(null)

// 删除确认
const showDeleteConfirm = ref(false)
const deleteTarget = ref<AdminMajorSection | null>(null)
const isDeleting = ref(false)

// 加载学校信息
async function loadSchool() {
  try {
    const res = await getAdminSchoolDetail(schoolId.value)
    if (res.data.code === 200) {
      school.value = res.data.data
    } else {
      toast.error('获取学校信息失败')
      router.push('/admin/rating')
    }
  } catch (error) {
    toast.error('获取学校信息失败')
    router.push('/admin/rating')
  }
}

// 加载大分区列表
async function loadMajorSections() {
  try {
    const params: { page?: number; size?: number; schoolId?: number; status?: number } = {
      page: page.value,
      size: pageSize.value,
      schoolId: schoolId.value,
    }
    if (statusFilter.value !== 'all') {
      params.status = statusFilter.value
    }
    const res = await getAdminMajorSections(params)
    if (res.data.code === 200) {
      majorSections.value = res.data.data.items
      total.value = res.data.data.total
    } else {
      toast.error(res.data.message || '获取大分区列表失败')
    }
  } catch (error) {
    toast.error('获取大分区列表失败')
  }
}

// 加载所有数据
async function loadAllData() {
  isLoading.value = true
  try {
    await Promise.all([loadSchool(), loadMajorSections()])
  } finally {
    isLoading.value = false
  }
}

// 打开创建模态框
function openCreateModal() {
  modalMode.value = 'create'
  editingItem.value = null
  form.value = { schoolId: schoolId.value, name: '', description: '' }
  imageFile.value = null
  imagePreview.value = null
  showModal.value = true
}

// 打开编辑模态框
function openEditModal(item: AdminMajorSection, event: Event) {
  event.stopPropagation()
  modalMode.value = 'edit'
  editingItem.value = item
  form.value = {
    schoolId: item.schoolId,
    name: item.name,
    description: item.description || '',
  }
  imageFile.value = null
  imagePreview.value = item.imageUrl
  showModal.value = true
}

// 关闭模态框
function closeModal() {
  showModal.value = false
  editingItem.value = null
  form.value = { schoolId: schoolId.value, name: '', description: '' }
  imageFile.value = null
  imagePreview.value = null
}

// 处理图片选择
function handleImageSelect(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files && input.files[0]) {
    const file = input.files[0]
    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('只支持 JPEG/PNG/GIF/WebP/BMP 格式')
      return
    }
    // 验证文件大小（10MB）
    if (file.size > 10 * 1024 * 1024) {
      toast.error('图片大小不能超过 10MB')
      return
    }
    imageFile.value = file
    // 创建预览
    const reader = new FileReader()
    reader.onload = (e) => {
      imagePreview.value = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }
}

// 移除图片
function removeImage() {
  imageFile.value = null
  imagePreview.value = null
}

// 保存
async function save() {
  if (!form.value.name.trim()) {
    toast.error('请填写名称')
    return
  }

  isSaving.value = true
  try {
    if (modalMode.value === 'create') {
      const res = await createMajorSection(form.value)
      if (res.data.code === 200) {
        // 如果有图片，上传图片
        if (imageFile.value) {
          await uploadMajorSectionImage(res.data.data.id, imageFile.value)
        }
        toast.success('创建成功')
        closeModal()
        await loadMajorSections()
      } else {
        toast.error(res.data.message || '创建失败')
      }
    } else if (editingItem.value) {
      const updateData: UpdateMajorSectionRequest = {
        name: form.value.name,
        description: form.value.description,
      }
      const res = await updateMajorSection(editingItem.value.id, updateData)
      if (res.data.code === 200) {
        // 处理图片
        if (imageFile.value) {
          // 上传新图片
          await uploadMajorSectionImage(editingItem.value.id, imageFile.value)
        } else if (!imagePreview.value && editingItem.value.imageUrl) {
          // 删除原图片
          await deleteMajorSectionImage(editingItem.value.id)
        }
        toast.success('更新成功')
        closeModal()
        await loadMajorSections()
      } else {
        toast.error(res.data.message || '更新失败')
      }
    }
  } catch (error) {
    toast.error(modalMode.value === 'create' ? '创建失败' : '更新失败')
  } finally {
    isSaving.value = false
  }
}

// 切换状态
async function toggleStatus(item: AdminMajorSection, event: Event) {
  event.stopPropagation()
  const newStatus = item.status === 1 ? 0 : 1
  try {
    const res = await updateMajorSectionStatus(item.id, { status: newStatus as RatingStatus })
    if (res.data.code === 200) {
      toast.success(newStatus === 1 ? '已启用' : '已禁用')
      await loadMajorSections()
    } else {
      toast.error(res.data.message || '操作失败')
    }
  } catch (error) {
    toast.error('操作失败')
  }
}

// 打开删除确认
function openDeleteConfirm(item: AdminMajorSection, event: Event) {
  event.stopPropagation()
  deleteTarget.value = item
  showDeleteConfirm.value = true
}

// 确认删除
async function confirmDelete() {
  if (!deleteTarget.value) return

  isDeleting.value = true
  try {
    const res = await deleteMajorSection(deleteTarget.value.id)
    if (res.data.code === 200) {
      toast.success('已删除')
      showDeleteConfirm.value = false
      deleteTarget.value = null
      await loadMajorSections()
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

// 进入小分区列表
function goToMinorSections(item: AdminMajorSection) {
  router.push(`/admin/rating/major-sections/${item.id}`)
}

// 返回
function goBack() {
  router.push('/admin/rating')
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
    <PageHeader :back-to="`/admin/rating`" />

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
              <h1 class="page-title">{{ school?.name || '加载中...' }}</h1>
              <p class="page-subtitle">管理大分区</p>
            </div>
            <div class="header-actions">
              <button class="action-button secondary" @click="goBack">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
                返回
              </button>
              <button class="action-button primary" @click="openCreateModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                添加大分区
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

          <!-- 内容区域 -->
          <div
            class="content-slide-wrapper"
            :class="{
              'slide-left': isAnimating && slideDirection === 'left',
              'slide-right': isAnimating && slideDirection === 'right'
            }"
          >
            <!-- 空状态 -->
            <div v-if="majorSections.length === 0" class="empty-container">
              <div class="empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                </svg>
              </div>
              <h2>{{ statusFilter === 'all' ? '暂无大分区' : '暂无相关大分区' }}</h2>
              <p>{{ statusFilter === 'all' ? '还没有添加任何大分区' : '没有找到该状态的大分区' }}</p>
              <button v-if="statusFilter === 'all'" class="empty-action-btn" @click="openCreateModal">
                添加第一个大分区
              </button>
            </div>

            <!-- 列表 -->
            <div v-else class="items-list">
              <div
                v-for="item in majorSections"
                :key="item.id"
                class="item-card"
                @click="goToMinorSections(item)"
              >
                <!-- 封面图 -->
                <div class="item-cover">
                  <img
                    v-if="item.imageUrl"
                    :src="item.imageUrl"
                    :alt="item.name"
                    class="cover-image"
                  />
                  <div v-else class="cover-placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <circle cx="8.5" cy="8.5" r="1.5"></circle>
                      <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                  </div>
                </div>

                <!-- 信息 -->
                <div class="item-info">
                  <div class="item-header">
                    <h3 class="item-name">{{ item.name }}</h3>
                    <span class="status-badge" :class="getRatingStatusInfo(item.status).class">
                      {{ getRatingStatusInfo(item.status).label }}
                    </span>
                  </div>
                  <p v-if="item.description" class="item-desc">{{ item.description }}</p>
                  <div class="item-meta">
                    <span class="meta-item">{{ item.minorSectionCount }} 个小分区</span>
                    <span class="meta-divider">·</span>
                    <span class="meta-item">{{ formatDate(item.createdAt) }}</span>
                  </div>
                </div>

                <!-- 操作按钮 -->
                <div class="item-actions">
                  <button
                    class="action-btn toggle"
                    :class="{ 'is-enabled': item.status === 1 }"
                    @click="toggleStatus(item, $event)"
                  >
                    {{ item.status === 1 ? '禁用' : '启用' }}
                  </button>
                  <button class="action-btn edit" @click="openEditModal(item, $event)">
                    编辑
                  </button>
                  <button class="action-btn delete" @click="openDeleteConfirm(item, $event)">
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

    <!-- 创建/编辑模态框 -->
    <Transition name="modal-fade">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <Transition name="modal-scale" appear>
          <div v-if="showModal" class="modal-content modal-large" @click.stop>
            <h3 class="modal-title">
              {{ modalMode === 'create' ? '添加大分区' : '编辑大分区' }}
            </h3>
            <div class="form-group">
              <label class="form-label">名称 *</label>
              <input
                v-model="form.name"
                type="text"
                class="form-input"
                placeholder="例如：食堂"
                maxlength="50"
              />
            </div>
            <div class="form-group">
              <label class="form-label">描述</label>
              <textarea
                v-model="form.description"
                class="form-textarea"
                placeholder="简单描述一下这个分区..."
                rows="3"
                maxlength="200"
              ></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">封面图片</label>
              <div class="image-upload-area">
                <div v-if="imagePreview" class="image-preview">
                  <img :src="imagePreview" alt="预览" />
                  <button class="remove-image-btn" @click="removeImage" type="button">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
                <label v-else class="upload-placeholder">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,image/bmp"
                    @change="handleImageSelect"
                    class="hidden-input"
                  />
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                  <span>点击上传图片</span>
                  <span class="upload-hint">支持 JPEG/PNG/GIF/WebP/BMP，最大 10MB</span>
                </label>
              </div>
            </div>
            <div class="modal-actions">
              <button class="modal-btn cancel" @click="closeModal" :disabled="isSaving">
                取消
              </button>
              <button class="modal-btn confirm primary" @click="save" :disabled="isSaving">
                {{ isSaving ? '保存中...' : '保存' }}
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
              确定要删除大分区"{{ deleteTarget?.name }}"吗？此操作不可撤销。
            </p>
            <p class="modal-warning">注意：如果该分区下有小分区，将无法删除。</p>
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

.item-cover {
  width: 60px;
  height: 60px;
  flex-shrink: 0;
  border-radius: var(--radius-md);
  overflow: hidden;
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
  width: 24px;
  height: 24px;
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

.item-desc {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content.modal-large {
  max-width: 500px;
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

.form-input,
.form-textarea {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  color: var(--color-text);
  transition: border-color var(--transition-fast);
  font-family: inherit;
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
}

.form-input::placeholder,
.form-textarea::placeholder {
  color: var(--color-text-placeholder);
}

/* ===== Image Upload ===== */
.image-upload-area {
  width: 100%;
}

.image-preview {
  position: relative;
  width: 100%;
  max-width: 200px;
  aspect-ratio: 16/9;
  border-radius: var(--radius-md);
  overflow: hidden;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-image-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.remove-image-btn:hover {
  background: var(--color-error);
}

.remove-image-btn svg {
  width: 14px;
  height: 14px;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  width: 100%;
  max-width: 200px;
  aspect-ratio: 16/9;
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: center;
  padding: var(--spacing-sm);
}

.upload-placeholder:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.upload-placeholder svg {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
}

.upload-placeholder span {
  font-size: var(--text-sm);
  white-space: nowrap;
}

.upload-hint {
  font-size: var(--text-xs) !important;
  color: var(--color-text-placeholder) !important;
  white-space: normal !important;
  line-height: 1.3;
}

.hidden-input {
  display: none;
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

  .status-tab {
    font-size: var(--text-sm);
    padding: var(--spacing-sm) var(--spacing-md);
  }

  .item-cover {
    width: 80px;
    height: 80px;
  }

  .item-name {
    font-size: var(--text-base);
  }

  .item-desc {
    font-size: var(--text-sm);
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
