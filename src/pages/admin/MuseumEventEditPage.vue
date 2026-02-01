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
  adminGetBlocks,
  adminCreateBlock,
  adminUpdateBlock,
  adminDeleteBlock,
  adminSortBlocks,
} from '@/api/museum'
import { uploadFile } from '@/api/file'
import type {
  Tag,
  EventDetail,
  CreateEventRequest,
  Block,
  BlockType,
  BlockRequest,
  TextBlockContent,
  GalleryBlockContent,
  TimelineBlockContent,
  LinkBlockContent,
} from '@/types/museum'
import { getBlockTypeLabel } from '@/types/museum'
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
const blocks = ref<Block[]>([])

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

// 内容模块编辑
const showBlockModal = ref(false)
const isEditingBlock = ref(false)
const editingBlock = ref<Block | null>(null)
const blockFormData = ref<BlockRequest>({
  blockType: 'text',
  title: '',
  content: { text: '' },
  sortOrder: 0,
})
const isSavingBlock = ref(false)

// 删除模块确认
const showDeleteBlockConfirm = ref(false)
const deleteBlockTarget = ref<Block | null>(null)
const isDeletingBlock = ref(false)

// 模块类型选项
const blockTypes: { value: BlockType; label: string }[] = [
  { value: 'text', label: '文字' },
  { value: 'gallery', label: '图片画廊' },
  { value: 'timeline', label: '时间线' },
  { value: 'link', label: '链接' },
]

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
    blocks.value = data.blocks || []
  } catch (error) {
    toast.error('获取活动详情失败')
    router.push('/admin/museum/events')
  } finally {
    isLoading.value = false
  }
}

// 加载内容模块
async function loadBlocks() {
  if (!eventId.value) return

  try {
    blocks.value = await adminGetBlocks(eventId.value)
  } catch (error) {
    console.error('Failed to load blocks:', error)
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
    } else {
      const created = await adminCreateEvent(formData.value)
      toast.success('创建成功')
      // 跳转到编辑页面以便添加内容模块
      router.replace(`/admin/museum/events/${created.id}`)
    }
  } catch (error) {
    toast.error(isEdit.value ? '更新失败' : '创建失败')
  } finally {
    isSaving.value = false
  }
}

// 打开添加模块 Modal
function openAddBlockModal() {
  isEditingBlock.value = false
  editingBlock.value = null
  blockFormData.value = {
    blockType: 'text',
    title: '',
    content: { text: '' },
    sortOrder: blocks.value.length,
  }
  showBlockModal.value = true
}

// 打开编辑模块 Modal
function openEditBlockModal(block: Block) {
  isEditingBlock.value = true
  editingBlock.value = block
  blockFormData.value = {
    blockType: block.blockType,
    title: block.title || '',
    content: JSON.parse(JSON.stringify(block.content)),
    sortOrder: block.sortOrder,
  }
  showBlockModal.value = true
}

// 关闭模块 Modal
function closeBlockModal() {
  showBlockModal.value = false
  editingBlock.value = null
}

// 切换模块类型时重置内容
function onBlockTypeChange() {
  const type = blockFormData.value.blockType
  switch (type) {
    case 'text':
      blockFormData.value.content = { text: '' }
      break
    case 'gallery':
      blockFormData.value.content = { images: [] }
      break
    case 'timeline':
      blockFormData.value.content = { items: [] }
      break
    case 'link':
      blockFormData.value.content = { links: [] }
      break
  }
}

// 添加时间线项
function addTimelineItem() {
  const content = blockFormData.value.content as TimelineBlockContent
  if (!content.items) content.items = []
  content.items.push({ time: '', title: '', description: '' })
}

// 移除时间线项
function removeTimelineItem(index: number) {
  const content = blockFormData.value.content as TimelineBlockContent
  content.items.splice(index, 1)
}

// 添加链接项
function addLinkItem() {
  const content = blockFormData.value.content as LinkBlockContent
  if (!content.links) content.links = []
  content.links.push({ url: '', title: '', description: '' })
}

// 移除链接项
function removeLinkItem(index: number) {
  const content = blockFormData.value.content as LinkBlockContent
  content.links.splice(index, 1)
}

// 保存模块
async function saveBlock() {
  if (!eventId.value) {
    toast.error('请先保存活动')
    return
  }

  isSavingBlock.value = true
  try {
    if (isEditingBlock.value && editingBlock.value) {
      await adminUpdateBlock(eventId.value, editingBlock.value.id, blockFormData.value)
      toast.success('更新成功')
    } else {
      await adminCreateBlock(eventId.value, blockFormData.value)
      toast.success('添加成功')
    }
    closeBlockModal()
    loadBlocks()
  } catch (error) {
    toast.error(isEditingBlock.value ? '更新失败' : '添加失败')
  } finally {
    isSavingBlock.value = false
  }
}

// 打开删除模块确认
function openDeleteBlockConfirm(block: Block) {
  deleteBlockTarget.value = block
  showDeleteBlockConfirm.value = true
}

// 确认删除模块
async function confirmDeleteBlock() {
  if (!eventId.value || !deleteBlockTarget.value) return

  isDeletingBlock.value = true
  try {
    await adminDeleteBlock(eventId.value, deleteBlockTarget.value.id)
    toast.success('删除成功')
    showDeleteBlockConfirm.value = false
    deleteBlockTarget.value = null
    loadBlocks()
  } catch (error) {
    toast.error('删除失败')
  } finally {
    isDeletingBlock.value = false
  }
}

// 取消删除模块
function cancelDeleteBlock() {
  showDeleteBlockConfirm.value = false
  deleteBlockTarget.value = null
}

// 获取模块内容预览
function getBlockPreview(block: Block): string {
  switch (block.blockType) {
    case 'text':
      return (block.content as TextBlockContent).text?.substring(0, 50) + '...' || ''
    case 'gallery':
      return `${(block.content as GalleryBlockContent).images?.length || 0} 张图片`
    case 'timeline':
      return `${(block.content as TimelineBlockContent).items?.length || 0} 个时间点`
    case 'link':
      return `${(block.content as LinkBlockContent).links?.length || 0} 个链接`
    default:
      return ''
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
              <p class="page-subtitle">{{ isEdit ? '修改活动信息和内容模块' : '填写活动基本信息' }}</p>
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
                {{ isSaving ? '保存中...' : '保存基本信息' }}
              </button>
            </div>
          </div>

          <!-- 内容模块（仅编辑模式） -->
          <div v-if="isEdit" class="form-section">
            <div class="section-header">
              <h2 class="section-title">内容模块</h2>
              <button class="add-block-btn" @click="openAddBlockModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                添加模块
              </button>
            </div>

            <div v-if="blocks.length === 0" class="empty-blocks">
              <p>暂无内容模块，点击上方按钮添加</p>
            </div>

            <div v-else class="blocks-list">
              <div
                v-for="block in blocks"
                :key="block.id"
                class="block-card"
                @click="openEditBlockModal(block)"
              >
                <div class="block-info">
                  <span class="block-type">{{ getBlockTypeLabel(block.blockType) }}</span>
                  <h4 v-if="block.title" class="block-title">{{ block.title }}</h4>
                  <p class="block-preview">{{ getBlockPreview(block) }}</p>
                </div>
                <div class="block-actions">
                  <button class="block-action-btn delete" @click.stop="openDeleteBlockConfirm(block)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
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

    <!-- 内容模块编辑 Modal -->
    <div v-if="showBlockModal" class="modal-overlay" @click.self="closeBlockModal">
      <div class="modal-content modal-lg">
        <h3 class="modal-title">{{ isEditingBlock ? '编辑模块' : '添加模块' }}</h3>

        <div class="form-group">
          <label class="form-label">模块类型</label>
          <select
            v-model="blockFormData.blockType"
            class="form-select"
            :disabled="isEditingBlock"
            @change="onBlockTypeChange"
          >
            <option v-for="type in blockTypes" :key="type.value" :value="type.value">
              {{ type.label }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">模块标题</label>
          <input
            v-model="blockFormData.title"
            type="text"
            class="form-input"
            placeholder="请输入模块标题（可选）"
          />
        </div>

        <!-- 文字模块 -->
        <div v-if="blockFormData.blockType === 'text'" class="form-group">
          <label class="form-label">内容</label>
          <textarea
            v-model="(blockFormData.content as TextBlockContent).text"
            class="form-textarea"
            placeholder="请输入文字内容"
            rows="5"
          ></textarea>
        </div>

        <!-- 时间线模块 -->
        <div v-if="blockFormData.blockType === 'timeline'" class="form-group">
          <label class="form-label">时间线项目</label>
          <div class="timeline-items">
            <div
              v-for="(item, index) in (blockFormData.content as TimelineBlockContent).items"
              :key="index"
              class="timeline-item"
            >
              <input
                v-model="item.time"
                type="text"
                class="form-input"
                placeholder="时间"
              />
              <input
                v-model="item.title"
                type="text"
                class="form-input"
                placeholder="标题"
              />
              <input
                v-model="item.description"
                type="text"
                class="form-input"
                placeholder="描述（可选）"
              />
              <button class="remove-item-btn" @click="removeTimelineItem(index)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
          <button class="add-item-btn" @click="addTimelineItem">
            + 添加时间点
          </button>
        </div>

        <!-- 链接模块 -->
        <div v-if="blockFormData.blockType === 'link'" class="form-group">
          <label class="form-label">链接列表</label>
          <div class="link-items">
            <div
              v-for="(item, index) in (blockFormData.content as LinkBlockContent).links"
              :key="index"
              class="link-item"
            >
              <input
                v-model="item.url"
                type="url"
                class="form-input"
                placeholder="链接地址"
              />
              <input
                v-model="item.title"
                type="text"
                class="form-input"
                placeholder="链接标题"
              />
              <input
                v-model="item.description"
                type="text"
                class="form-input"
                placeholder="描述（可选）"
              />
              <button class="remove-item-btn" @click="removeLinkItem(index)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
          <button class="add-item-btn" @click="addLinkItem">
            + 添加链接
          </button>
        </div>

        <!-- 图片画廊提示 -->
        <div v-if="blockFormData.blockType === 'gallery'" class="form-group">
          <p class="form-hint">图片画廊功能暂未完成，请使用其他模块类型。</p>
        </div>

        <div class="modal-actions">
          <button class="modal-btn cancel" @click="closeBlockModal" :disabled="isSavingBlock">
            取消
          </button>
          <button class="modal-btn confirm" @click="saveBlock" :disabled="isSavingBlock">
            {{ isSavingBlock ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 删除模块确认弹窗 -->
    <div v-if="showDeleteBlockConfirm" class="modal-overlay" @click.self="cancelDeleteBlock">
      <div class="modal-content">
        <h3 class="modal-title">确认删除</h3>
        <p class="modal-desc">
          确定要删除这个内容模块吗？此操作不可撤销。
        </p>
        <div class="modal-actions">
          <button class="modal-btn cancel" @click="cancelDeleteBlock" :disabled="isDeletingBlock">
            取消
          </button>
          <button class="modal-btn confirm danger" @click="confirmDeleteBlock" :disabled="isDeletingBlock">
            {{ isDeletingBlock ? '删除中...' : '确认删除' }}
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

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.section-title {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-md);
}

.section-header .section-title {
  margin-bottom: 0;
}

.add-block-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-primary);
  background: var(--color-primary-bg);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.add-block-btn:hover {
  background: var(--color-primary);
  color: white;
}

.add-block-btn svg {
  width: 14px;
  height: 14px;
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

/* ===== Blocks ===== */
.empty-blocks {
  text-align: center;
  padding: var(--spacing-lg);
  color: var(--color-text-secondary);
}

.blocks-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.block-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.block-card:hover {
  border-color: var(--color-primary);
}

.block-info {
  flex: 1;
  min-width: 0;
}

.block-type {
  display: inline-block;
  font-size: 10px;
  font-weight: var(--font-semibold);
  color: var(--color-primary);
  background: var(--color-primary-bg);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  margin-bottom: 4px;
}

.block-title {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  margin-bottom: 2px;
}

.block-preview {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.block-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.block-action-btn {
  padding: var(--spacing-xs);
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.block-action-btn svg {
  width: 16px;
  height: 16px;
}

.block-action-btn.delete {
  color: var(--color-text-placeholder);
}

.block-action-btn.delete:hover {
  color: var(--color-error);
  background: var(--color-error-bg);
}

.arrow-icon {
  color: var(--color-text-placeholder);
}

.arrow-icon svg {
  width: 16px;
  height: 16px;
}

/* ===== Timeline/Link Items ===== */
.timeline-items,
.link-items {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
}

.timeline-item,
.link-item {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr auto;
  gap: var(--spacing-xs);
  align-items: center;
}

.remove-item-btn {
  padding: var(--spacing-xs);
  background: var(--color-error-bg);
  color: var(--color-error);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.remove-item-btn:hover {
  background: var(--color-error);
  color: white;
}

.remove-item-btn svg {
  width: 14px;
  height: 14px;
}

.add-item-btn {
  padding: var(--spacing-sm);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-primary);
  background: var(--color-primary-bg);
  border: 1px dashed var(--color-primary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.add-item-btn:hover {
  background: var(--color-primary);
  color: white;
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
  max-width: 600px;
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

@media (max-width: 600px) {
  .timeline-item,
  .link-item {
    grid-template-columns: 1fr;
  }

  .remove-item-btn {
    justify-self: end;
  }
}
</style>
