<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/composables/useToast'
import {
  adminGetEvent,
  adminCreateEvent,
  adminUpdateEvent,
  adminGetTags,
} from '@/api/museum'
import { uploadFile } from '@/api/file'
import type { Tag, CreateEventRequest } from '@/types/museum'
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb.vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const toast = useToast()

// 是否为编辑模式
const isEdit = computed(() => route.params.id && route.params.id !== 'create')
const eventId = computed(() => isEdit.value ? Number(route.params.id) : null)

// 状态
const isLoading = ref(true)
const isSaving = ref(false)
const tags = ref<Tag[]>([])

// 表单数据
const formData = ref<CreateEventRequest>({
  title: '',
  subtitle: '',
  description: '',
  coverUrl: '',
  startDate: '',
  endDate: '',
  location: '',
  tagIds: [],
})

// 图片上传
const fileInputRef = ref<HTMLInputElement | null>(null)
const isUploading = ref(false)

// 加载标签列表
async function loadTags() {
  try {
    tags.value = await adminGetTags({ status: 1 })
  } catch (error) {
    console.error('Failed to load tags:', error)
  }
}

// 加载活动详情
async function loadEvent() {
  if (!eventId.value) {
    isLoading.value = false
    return
  }

  try {
    const data = await adminGetEvent(eventId.value)
    formData.value = {
      title: data.title,
      subtitle: data.subtitle || '',
      description: data.description || '',
      coverUrl: data.coverUrl || '',
      startDate: data.startDate,
      endDate: data.endDate || '',
      location: data.location || '',
      tagIds: data.tags?.map((t) => t.id) || [],
    }
  } catch (error) {
    toast.error('获取活动详情失败')
    router.push('/admin/museum/events')
  } finally {
    isLoading.value = false
  }
}

// 触发文件选择
function triggerFileInput() {
  fileInputRef.value?.click()
}

// 处理封面上传
async function handleCoverUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    toast.error('请选择图片文件')
    return
  }

  if (file.size > 20 * 1024 * 1024) {
    toast.error('图片大小不能超过 20MB')
    return
  }

  isUploading.value = true
  try {
    const response = await uploadFile(file, 'museum')
    formData.value.coverUrl = response.data.data.fileUrl
    toast.success('图片上传成功')
  } catch (error) {
    toast.error('图片上传失败')
  } finally {
    isUploading.value = false
    input.value = ''
  }
}

// 移除封面
function removeCover() {
  formData.value.coverUrl = ''
}

// 切换标签选择
function toggleTag(tagId: number) {
  const index = formData.value.tagIds?.indexOf(tagId) ?? -1
  if (index === -1) {
    formData.value.tagIds = [...(formData.value.tagIds || []), tagId]
  } else {
    formData.value.tagIds = formData.value.tagIds?.filter((id) => id !== tagId) || []
  }
}

// 保存活动
async function saveEvent() {
  if (!formData.value.title.trim()) {
    toast.error('请输入活动标题')
    return
  }
  if (!formData.value.startDate) {
    toast.error('请选择活动开始日期')
    return
  }

  isSaving.value = true
  try {
    if (isEdit.value && eventId.value) {
      await adminUpdateEvent(eventId.value, formData.value)
      toast.success('更新成功')
      router.push('/admin/museum/events')
    } else {
      const created = await adminCreateEvent(formData.value)
      toast.success('创建成功')
      // 跳转到内容管理页面以便添加内容模块
      router.replace(`/admin/museum/events/${created.id}/content`)
    }
  } catch (error) {
    toast.error(isEdit.value ? '更新失败' : '创建失败')
  } finally {
    isSaving.value = false
  }
}

onMounted(() => {
  if (!userStore.isLoggedIn || !userStore.canManageMuseum) {
    toast.error('无权访问此页面')
    router.push('/')
    return
  }
  loadTags()
  loadEvent()
})
</script>

<template>
  <div class="page-container">
    <PageHeader :back-to="isEdit ? '/admin/museum/events' : '/admin/museum/events'" />

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
              <h1 class="page-title">{{ isEdit ? '编辑活动' : '创建活动' }}</h1>
              <p class="page-subtitle">{{ isEdit ? '修改活动基本信息' : '填写活动基本信息' }}</p>
            </div>
          </div>
        </div>

        <!-- 加载状态 -->
        <div v-if="isLoading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>

        <template v-else>
          <!-- 基本信息表单 -->
          <div class="form-section">
            <h2 class="section-title">基本信息</h2>

            <div class="form-group">
              <label class="form-label">
                活动标题 <span class="required">*</span>
              </label>
              <input
                v-model="formData.title"
                type="text"
                class="form-input"
                placeholder="请输入活动标题"
                maxlength="100"
              />
            </div>

            <div class="form-group">
              <label class="form-label">副标题</label>
              <input
                v-model="formData.subtitle"
                type="text"
                class="form-input"
                placeholder="请输入副标题（可选）"
                maxlength="200"
              />
            </div>

            <div class="form-group">
              <label class="form-label">活动描述</label>
              <textarea
                v-model="formData.description"
                class="form-textarea"
                placeholder="请输入活动描述（可选）"
                rows="3"
              ></textarea>
            </div>

            <div class="form-group">
              <label class="form-label">封面图片</label>
              <input
                ref="fileInputRef"
                type="file"
                accept="image/*"
                class="file-input-hidden"
                @change="handleCoverUpload"
              />
              <div v-if="formData.coverUrl" class="uploaded-image-wrapper">
                <img :src="formData.coverUrl" alt="封面预览" class="uploaded-image" />
                <div class="image-actions">
                  <button type="button" class="image-action-btn replace" @click="triggerFileInput" :disabled="isUploading">
                    更换
                  </button>
                  <button type="button" class="image-action-btn remove" @click="removeCover" :disabled="isUploading">
                    移除
                  </button>
                </div>
              </div>
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
                  <span class="upload-text">点击上传封面图片</span>
                  <span class="upload-hint">建议尺寸 16:9，不超过 20MB</span>
                </template>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">
                  开始日期 <span class="required">*</span>
                </label>
                <input
                  v-model="formData.startDate"
                  type="date"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label class="form-label">结束日期</label>
                <input
                  v-model="formData.endDate"
                  type="date"
                  class="form-input"
                />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">活动地点</label>
              <input
                v-model="formData.location"
                type="text"
                class="form-input"
                placeholder="请输入活动地点（可选）"
              />
            </div>

            <div class="form-group">
              <label class="form-label">标签</label>
              <div class="tags-select">
                <button
                  v-for="tag in tags"
                  :key="tag.id"
                  class="tag-option"
                  :class="{ active: formData.tagIds?.includes(tag.id) }"
                  :style="{
                    '--tag-color': tag.color,
                    backgroundColor: formData.tagIds?.includes(tag.id) ? tag.color + '20' : undefined,
                    borderColor: formData.tagIds?.includes(tag.id) ? tag.color : undefined,
                    color: formData.tagIds?.includes(tag.id) ? tag.color : undefined,
                  }"
                  @click="toggleTag(tag.id)"
                >
                  {{ tag.name }}
                </button>
              </div>
            </div>

            <div class="form-actions">
              <button class="save-btn" @click="saveEvent" :disabled="isSaving">
                {{ isSaving ? '保存中...' : (isEdit ? '保存修改' : '创建活动') }}
              </button>
            </div>
          </div>
        </template>
      </div>
    </main>

    <PageFooter />
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
  max-width: 700px;
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

/* ===== Form Section ===== */
.form-section {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
}

.section-title {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-md);
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
  min-height: 80px;
}

.form-hint {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  padding: var(--spacing-md);
  background: var(--color-bg);
  border-radius: var(--radius-md);
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

/* ===== Tags Select ===== */
.tags-select {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.tag-option {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.tag-option:hover {
  border-color: var(--tag-color, var(--color-primary));
}

.tag-option.active {
  border-width: 2px;
}

/* ===== Form Actions ===== */
.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--spacing-lg);
}

.save-btn {
  padding: var(--spacing-sm) var(--spacing-xl);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: white;
  background: var(--color-primary);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.save-btn:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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

  .header-text {
    display: block;
  }

  .page-title {
    font-size: var(--text-2xl);
  }

  .page-subtitle {
    font-size: var(--text-base);
  }
}
</style>
