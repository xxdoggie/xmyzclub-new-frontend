<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/composables/useToast'
import {
  adminGetBanners,
  adminCreateBanner,
  adminUpdateBanner,
  adminDeleteBanner,
  adminToggleBannerStatus,
  type Banner,
  type CreateBannerRequest,
  type BannerRequest,
} from '@/api/banner'
import { uploadFile } from '@/api/file'
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb.vue'

const router = useRouter()
const userStore = useUserStore()
const toast = useToast()

// 状态
const isLoading = ref(true)
const banners = ref<Banner[]>([])

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
const deleteTarget = ref<Banner | null>(null)
const isDeleting = ref(false)

// 编辑/创建 Modal
const showEditModal = ref(false)
const isEditing = ref(false)
const isSaving = ref(false)
const editingBanner = ref<Banner | null>(null)

// 图片上传
const fileInputRef = ref<HTMLInputElement | null>(null)
const isUploading = ref(false)
const formData = ref<CreateBannerRequest>({
  title: '',
  description: '',
  imageUrl: '',
  linkUrl: '',
  linkType: 'none',
  position: 'home',
  sortOrder: 0,
  startTime: null,
  endTime: null,
})

// 筛选后的轮播图列表
const filteredBanners = computed(() => {
  if (statusFilter.value === 'all') {
    return banners.value
  }
  const status = statusFilter.value === 'enabled' ? 1 : 0
  return banners.value.filter((b) => b.status === status)
})

// 加载轮播图列表
async function loadBanners() {
  try {
    const data = await adminGetBanners()
    banners.value = data
  } catch (error) {
    toast.error('获取轮播图列表失败')
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

// 获取链接类型标签
function getLinkTypeLabel(linkType: string) {
  const map: Record<string, string> = {
    internal: '站内',
    external: '站外',
    none: '无',
  }
  return map[linkType] || linkType
}

// 触发文件选择
function triggerFileInput() {
  fileInputRef.value?.click()
}

// 处理文件选择和上传
async function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  // 验证文件类型
  if (!file.type.startsWith('image/')) {
    toast.error('请选择图片文件')
    return
  }

  // 验证文件大小（20MB）
  if (file.size > 20 * 1024 * 1024) {
    toast.error('图片大小不能超过 20MB')
    return
  }

  isUploading.value = true
  try {
    const response = await uploadFile(file, 'banner')
    formData.value.imageUrl = response.data.data.fileUrl
    toast.success('图片上传成功')
  } catch (error) {
    toast.error('图片上传失败')
  } finally {
    isUploading.value = false
    // 清空 input 以便重复选择同一文件
    input.value = ''
  }
}

// 移除已上传的图片
function removeImage() {
  formData.value.imageUrl = ''
}

// 切换启用/禁用状态
async function toggleStatus(banner: Banner, event: Event) {
  event.stopPropagation()
  try {
    const updated = await adminToggleBannerStatus(banner.id)
    const index = banners.value.findIndex((b) => b.id === banner.id)
    if (index !== -1) {
      banners.value[index] = updated
    }
    toast.success(updated.status === 1 ? '已启用' : '已禁用')
  } catch (error) {
    toast.error('操作失败')
  }
}

// 打开创建 Modal
function openCreateModal() {
  isEditing.value = false
  editingBanner.value = null
  formData.value = {
    title: '',
    description: '',
    imageUrl: '',
    linkUrl: '',
    linkType: 'none',
    position: 'home',
    sortOrder: 0,
    startTime: null,
    endTime: null,
  }
  showEditModal.value = true
}

// 打开编辑 Modal
function openEditModal(banner: Banner, event?: Event) {
  event?.stopPropagation()
  isEditing.value = true
  editingBanner.value = banner
  formData.value = {
    title: banner.title,
    description: banner.description || '',
    imageUrl: banner.imageUrl,
    linkUrl: banner.linkUrl || '',
    linkType: banner.linkType,
    position: banner.position,
    sortOrder: banner.sortOrder,
    startTime: banner.startTime,
    endTime: banner.endTime,
  }
  showEditModal.value = true
}

// 关闭编辑 Modal
function closeEditModal() {
  showEditModal.value = false
  editingBanner.value = null
}

// 保存轮播图
async function saveBanner() {
  if (!formData.value.title.trim()) {
    toast.error('请输入标题')
    return
  }
  if (!formData.value.imageUrl.trim()) {
    toast.error('请上传图片')
    return
  }

  isSaving.value = true
  try {
    if (isEditing.value && editingBanner.value) {
      // 更新
      const updateData: BannerRequest = {
        title: formData.value.title,
        description: formData.value.description || undefined,
        imageUrl: formData.value.imageUrl,
        linkUrl: formData.value.linkUrl || undefined,
        linkType: formData.value.linkType,
        position: formData.value.position,
        sortOrder: formData.value.sortOrder,
        startTime: formData.value.startTime,
        endTime: formData.value.endTime,
      }
      const updated = await adminUpdateBanner(editingBanner.value.id, updateData)
      const index = banners.value.findIndex((b) => b.id === editingBanner.value!.id)
      if (index !== -1) {
        banners.value[index] = updated
      }
      toast.success('更新成功')
    } else {
      // 创建
      const created = await adminCreateBanner(formData.value)
      banners.value.unshift(created)
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
function openDeleteConfirm(banner: Banner, event: Event) {
  event.stopPropagation()
  deleteTarget.value = banner
  showDeleteConfirm.value = true
}

// 确认删除
async function confirmDelete() {
  if (!deleteTarget.value) return

  isDeleting.value = true
  try {
    await adminDeleteBanner(deleteTarget.value.id)
    banners.value = banners.value.filter((b) => b.id !== deleteTarget.value!.id)
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

// 格式化日期
function formatDate(dateStr: string | null) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

onMounted(() => {
  if (!userStore.isLoggedIn || !userStore.canManageBanners) {
    toast.error('无权访问此页面')
    router.push('/')
    return
  }
  loadBanners()
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
              <h1 class="page-title">轮播图管理</h1>
              <p class="page-subtitle">管理首页轮播图展示</p>
            </div>
            <div class="header-actions">
              <button class="action-button primary" @click="openCreateModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                添加轮播图
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
            <div v-if="filteredBanners.length === 0" class="empty-container">
              <div class="empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                  <line x1="8" y1="21" x2="16" y2="21"></line>
                  <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
              </div>
              <h2>{{ statusFilter === 'all' ? '暂无轮播图' : '暂无相关轮播图' }}</h2>
              <p>{{ statusFilter === 'all' ? '还没有添加任何轮播图' : '没有找到该状态的轮播图' }}</p>
              <button v-if="statusFilter === 'all'" class="empty-action-btn" @click="openCreateModal">
                添加第一个轮播图
              </button>
            </div>

            <!-- 轮播图列表 -->
            <div v-else class="banners-list">
              <div
                v-for="banner in filteredBanners"
                :key="banner.id"
                class="banner-card"
                @click="openEditModal(banner)"
              >
                <!-- 轮播图封面 -->
                <div class="banner-cover">
                  <img
                    v-if="banner.imageUrl"
                    :src="banner.imageUrl"
                    :alt="banner.title"
                    class="cover-image"
                  />
                  <div v-else class="cover-placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                      <line x1="8" y1="21" x2="16" y2="21"></line>
                      <line x1="12" y1="17" x2="12" y2="21"></line>
                    </svg>
                  </div>
                </div>

                <!-- 轮播图信息 -->
                <div class="banner-info">
                  <div class="banner-header">
                    <h3 class="banner-name">{{ banner.title }}</h3>
                    <span class="status-badge" :class="getStatusInfo(banner.status).class">
                      {{ getStatusInfo(banner.status).label }}
                    </span>
                  </div>
                  <p v-if="banner.description" class="banner-desc">{{ banner.description }}</p>
                  <div class="banner-meta">
                    <span class="meta-item">排序: {{ banner.sortOrder }}</span>
                    <span class="meta-divider">·</span>
                    <span class="meta-item">链接: {{ getLinkTypeLabel(banner.linkType) }}</span>
                    <span class="meta-divider">·</span>
                    <span class="meta-item">{{ formatDate(banner.createdAt) }}</span>
                  </div>
                </div>

                <!-- 操作按钮 -->
                <div class="banner-actions">
                  <button
                    class="action-btn"
                    :class="banner.status === 1 ? 'disable' : 'enable'"
                    @click="toggleStatus(banner, $event)"
                  >
                    {{ banner.status === 1 ? '禁用' : '启用' }}
                  </button>
                  <button class="action-btn delete" @click="openDeleteConfirm(banner, $event)">
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
      <div class="modal-content modal-lg">
        <h3 class="modal-title">{{ isEditing ? '编辑轮播图' : '添加轮播图' }}</h3>

        <div class="form-group">
          <label class="form-label">
            标题 <span class="required">*</span>
          </label>
          <input
            v-model="formData.title"
            type="text"
            class="form-input"
            placeholder="请输入标题"
            maxlength="100"
          />
        </div>

        <div class="form-group">
          <label class="form-label">描述</label>
          <textarea
            v-model="formData.description"
            class="form-textarea"
            placeholder="请输入描述（可选）"
            maxlength="500"
            rows="2"
          ></textarea>
        </div>

        <div class="form-group">
          <label class="form-label">
            轮播图图片 <span class="required">*</span>
          </label>
          <input
            ref="fileInputRef"
            type="file"
            accept="image/*"
            class="file-input-hidden"
            @change="handleFileSelect"
          />
          <!-- 已上传图片预览 -->
          <div v-if="formData.imageUrl" class="uploaded-image-wrapper">
            <img :src="formData.imageUrl" alt="预览" class="uploaded-image" />
            <div class="image-actions">
              <button type="button" class="image-action-btn replace" @click="triggerFileInput" :disabled="isUploading">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                更换
              </button>
              <button type="button" class="image-action-btn remove" @click="removeImage" :disabled="isUploading">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                移除
              </button>
            </div>
          </div>
          <!-- 上传按钮 -->
          <div v-else class="upload-area" @click="triggerFileInput" :class="{ uploading: isUploading }">
            <div v-if="isUploading" class="upload-loading">
              <div class="upload-spinner"></div>
              <span>上传中...</span>
            </div>
            <template v-else>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <span class="upload-text">点击上传图片</span>
              <span class="upload-hint">支持 JPG、PNG、GIF，不超过 20MB</span>
            </template>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">链接类型</label>
            <select v-model="formData.linkType" class="form-select">
              <option value="none">不跳转</option>
              <option value="internal">站内链接</option>
              <option value="external">站外链接</option>
            </select>
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
        </div>

        <div v-if="formData.linkType !== 'none'" class="form-group">
          <label class="form-label">跳转链接</label>
          <input
            v-model="formData.linkUrl"
            type="url"
            class="form-input"
            :placeholder="formData.linkType === 'internal' ? '如: /ticket' : '如: https://example.com'"
          />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">生效开始时间</label>
            <input
              v-model="formData.startTime"
              type="datetime-local"
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label class="form-label">生效结束时间</label>
            <input
              v-model="formData.endTime"
              type="datetime-local"
              class="form-input"
            />
          </div>
        </div>

        <div class="modal-actions">
          <button class="modal-btn cancel" @click="closeEditModal" :disabled="isSaving">
            取消
          </button>
          <button class="modal-btn confirm" @click="saveBanner" :disabled="isSaving">
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
          确定要删除轮播图"{{ deleteTarget?.title }}"吗？此操作不可撤销。
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

/* ===== Banner List ===== */
.banners-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.banner-card {
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

.banner-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.banner-cover {
  width: 80px;
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

.banner-info {
  flex: 1;
  min-width: 0;
}

.banner-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: 4px;
  flex-wrap: wrap;
}

.banner-name {
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

.banner-desc {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.banner-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
}

.meta-divider {
  color: var(--color-border);
}

.banner-actions {
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
}

.modal-content.modal-lg {
  max-width: 500px;
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

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
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

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: var(--spacing-sm);
  font-size: var(--text-sm);
  color: var(--color-text);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-primary-bg);
}

.form-textarea {
  resize: vertical;
  min-height: 60px;
}

/* ===== Image Upload ===== */
.file-input-hidden {
  display: none;
}

.upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl) var(--spacing-md);
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-bg);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.upload-area:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-bg);
}

.upload-area.uploading {
  cursor: not-allowed;
  opacity: 0.8;
}

.upload-area svg {
  width: 32px;
  height: 32px;
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-sm);
}

.upload-text {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text);
  margin-bottom: var(--spacing-xs);
}

.upload-hint {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
}

.upload-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
  color: var(--color-primary);
}

.upload-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.uploaded-image-wrapper {
  position: relative;
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--color-border);
}

.uploaded-image {
  width: 100%;
  max-height: 200px;
  object-fit: cover;
  display: block;
}

.image-actions {
  display: flex;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  background: var(--color-bg);
  border-top: 1px solid var(--color-border);
}

.image-action-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.image-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.image-action-btn svg {
  width: 14px;
  height: 14px;
}

.image-action-btn.replace {
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

.image-action-btn.replace:hover:not(:disabled) {
  background: var(--color-primary);
  color: white;
}

.image-action-btn.remove {
  background: var(--color-error-bg);
  color: var(--color-error);
}

.image-action-btn.remove:hover:not(:disabled) {
  background: var(--color-error);
  color: white;
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

  .banner-cover {
    width: 100px;
    height: 75px;
  }

  .banner-name {
    font-size: var(--text-base);
  }

  .banner-desc {
    font-size: var(--text-sm);
  }

  .banner-meta {
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
