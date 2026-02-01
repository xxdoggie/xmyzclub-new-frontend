<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/composables/useToast'
import {
  adminGetEvent,
  adminGetBlocks,
  adminCreateBlock,
  adminUpdateBlock,
  adminDeleteBlock,
  adminSortBlocks,
} from '@/api/museum'
import { uploadFile } from '@/api/file'
import type {
  EventDetail,
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

// 活动ID
const eventId = computed(() => Number(route.params.id))

// 状态
const isLoading = ref(true)
const event = ref<EventDetail | null>(null)
const blocks = ref<Block[]>([])

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

// 图片上传
const galleryFileInputRef = ref<HTMLInputElement | null>(null)
const isUploadingGallery = ref(false)

// 删除模块确认
const showDeleteConfirm = ref(false)
const deleteTarget = ref<Block | null>(null)
const isDeleting = ref(false)

// 拖拽排序
const isDragging = ref(false)
const dragIndex = ref<number | null>(null)

// 模块类型选项
const blockTypes: { value: BlockType; label: string; icon: string }[] = [
  { value: 'text', label: '文字', icon: 'text' },
  { value: 'gallery', label: '图片画廊', icon: 'gallery' },
  { value: 'timeline', label: '时间线', icon: 'timeline' },
  { value: 'link', label: '链接', icon: 'link' },
]

// 加载活动详情
async function loadEvent() {
  try {
    event.value = await adminGetEvent(eventId.value)
  } catch (error) {
    toast.error('获取活动详情失败')
    router.push('/admin/museum/events')
  }
}

// 加载内容模块
async function loadBlocks() {
  try {
    blocks.value = await adminGetBlocks(eventId.value)
  } catch (error) {
    console.error('Failed to load blocks:', error)
  } finally {
    isLoading.value = false
  }
}

// 打开添加模块 Modal
function openAddBlockModal(type: BlockType) {
  isEditingBlock.value = false
  editingBlock.value = null
  blockFormData.value = {
    blockType: type,
    title: '',
    content: getDefaultContent(type),
    sortOrder: blocks.value.length,
  }
  showBlockModal.value = true
}

// 获取默认内容
function getDefaultContent(type: BlockType): Record<string, unknown> {
  switch (type) {
    case 'text':
      return { text: '' }
    case 'gallery':
      return { images: [] }
    case 'timeline':
      return { items: [] }
    case 'link':
      return { links: [] }
    default:
      return {}
  }
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

// 触发图片上传
function triggerGalleryUpload() {
  galleryFileInputRef.value?.click()
}

// 处理图片上传
async function handleGalleryUpload(e: Event) {
  const input = e.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) return

  isUploadingGallery.value = true
  const content = blockFormData.value.content as GalleryBlockContent
  if (!content.images) content.images = []

  try {
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} 不是图片文件`)
        continue
      }
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`${file.name} 超过 20MB`)
        continue
      }
      const response = await uploadFile(file, 'museum')
      content.images.push({
        url: response.data.data.fileUrl,
        caption: '',
      })
    }
    toast.success('图片上传成功')
  } catch (error) {
    toast.error('图片上传失败')
  } finally {
    isUploadingGallery.value = false
    input.value = ''
  }
}

// 移除画廊图片
function removeGalleryImage(index: number) {
  const content = blockFormData.value.content as GalleryBlockContent
  content.images.splice(index, 1)
}

// 保存模块
async function saveBlock() {
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

// 打开删除确认
function openDeleteConfirm(block: Block, e: MouseEvent) {
  e.stopPropagation()
  deleteTarget.value = block
  showDeleteConfirm.value = true
}

// 确认删除
async function confirmDelete() {
  if (!deleteTarget.value) return

  isDeleting.value = true
  try {
    await adminDeleteBlock(eventId.value, deleteTarget.value.id)
    toast.success('删除成功')
    showDeleteConfirm.value = false
    deleteTarget.value = null
    loadBlocks()
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

// 移动模块
async function moveBlock(index: number, direction: 'up' | 'down') {
  const newIndex = direction === 'up' ? index - 1 : index + 1
  if (newIndex < 0 || newIndex >= blocks.value.length) return

  const newBlocks = [...blocks.value]
  const [moved] = newBlocks.splice(index, 1)
  newBlocks.splice(newIndex, 0, moved)

  // 更新排序
  const sortedIds = newBlocks.map((b) => b.id)
  try {
    await adminSortBlocks(eventId.value, sortedIds)
    blocks.value = newBlocks
    toast.success('排序已更新')
  } catch (error) {
    toast.error('排序更新失败')
    loadBlocks()
  }
}

// 获取模块内容预览
function getBlockPreview(block: Block): string {
  switch (block.blockType) {
    case 'text': {
      const text = (block.content as TextBlockContent).text || ''
      return text.length > 100 ? text.substring(0, 100) + '...' : text
    }
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

// 格式化日期
function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// 跳转到编辑页面
function goToEdit() {
  router.push(`/admin/museum/events/${eventId.value}/edit`)
}

onMounted(() => {
  if (!userStore.isLoggedIn || !userStore.canManageMuseum) {
    toast.error('无权访问此页面')
    router.push('/')
    return
  }
  loadEvent()
  loadBlocks()
})
</script>

<template>
  <div class="page-container">
    <PageHeader back-to="/admin/museum/events" />

    <main class="page-content">
      <div class="content-container">
        <!-- 桌面端面包屑 -->
        <div class="breadcrumb-wrapper">
          <PageBreadcrumb />
        </div>

        <!-- 加载状态 -->
        <div v-if="isLoading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>

        <template v-else-if="event">
          <!-- 活动信息头部 -->
          <div class="event-header-card">
            <div class="event-cover" v-if="event.coverUrl">
              <img :src="event.coverUrl" :alt="event.title" />
            </div>
            <div class="event-info">
              <h1 class="event-title">{{ event.title }}</h1>
              <p v-if="event.subtitle" class="event-subtitle">{{ event.subtitle }}</p>
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
              </div>
              <button class="edit-info-btn" @click="goToEdit">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                编辑基本信息
              </button>
            </div>
          </div>

          <!-- 内容编辑区域 -->
          <div class="content-editor">
            <div class="editor-header">
              <h2 class="editor-title">内容模块</h2>
              <p class="editor-hint">拖拽模块卡片可调整顺序，点击可编辑内容</p>
            </div>

            <!-- 模块列表 -->
            <div class="blocks-container">
              <div
                v-for="(block, index) in blocks"
                :key="block.id"
                class="block-item"
                @click="openEditBlockModal(block)"
              >
                <div class="block-sort-controls">
                  <button
                    class="sort-btn"
                    :disabled="index === 0"
                    @click.stop="moveBlock(index, 'up')"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="18 15 12 9 6 15"></polyline>
                    </svg>
                  </button>
                  <span class="block-index">{{ index + 1 }}</span>
                  <button
                    class="sort-btn"
                    :disabled="index === blocks.length - 1"
                    @click.stop="moveBlock(index, 'down')"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>
                </div>

                <div class="block-content">
                  <div class="block-type-badge">
                    {{ getBlockTypeLabel(block.blockType) }}
                  </div>
                  <h4 v-if="block.title" class="block-title">{{ block.title }}</h4>
                  <p class="block-preview">{{ getBlockPreview(block) }}</p>

                  <!-- 画廊预览 -->
                  <div
                    v-if="block.blockType === 'gallery' && (block.content as GalleryBlockContent).images?.length"
                    class="gallery-preview"
                  >
                    <img
                      v-for="(img, i) in (block.content as GalleryBlockContent).images.slice(0, 4)"
                      :key="i"
                      :src="img.url"
                      :alt="img.caption || ''"
                      class="gallery-thumb"
                    />
                    <span
                      v-if="(block.content as GalleryBlockContent).images.length > 4"
                      class="gallery-more"
                    >
                      +{{ (block.content as GalleryBlockContent).images.length - 4 }}
                    </span>
                  </div>

                  <!-- 时间线预览 -->
                  <div
                    v-if="block.blockType === 'timeline' && (block.content as TimelineBlockContent).items?.length"
                    class="timeline-preview"
                  >
                    <div
                      v-for="(item, i) in (block.content as TimelineBlockContent).items.slice(0, 3)"
                      :key="i"
                      class="timeline-item-preview"
                    >
                      <span class="timeline-time">{{ item.time }}</span>
                      <span class="timeline-title">{{ item.title }}</span>
                    </div>
                  </div>

                  <!-- 链接预览 -->
                  <div
                    v-if="block.blockType === 'link' && (block.content as LinkBlockContent).links?.length"
                    class="links-preview"
                  >
                    <div
                      v-for="(link, i) in (block.content as LinkBlockContent).links.slice(0, 3)"
                      :key="i"
                      class="link-item-preview"
                    >
                      {{ link.title || link.url }}
                    </div>
                  </div>
                </div>

                <div class="block-actions">
                  <button class="block-action-btn edit" @click.stop="openEditBlockModal(block)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </button>
                  <button class="block-action-btn delete" @click.stop="openDeleteConfirm(block, $event)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              </div>

              <!-- 空状态 -->
              <div v-if="blocks.length === 0" class="empty-blocks">
                <div class="empty-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="3" y1="9" x2="21" y2="9"></line>
                    <line x1="9" y1="21" x2="9" y2="9"></line>
                  </svg>
                </div>
                <h3>暂无内容模块</h3>
                <p>点击下方按钮添加第一个内容模块</p>
              </div>
            </div>

            <!-- 添加模块按钮组 -->
            <div class="add-block-section">
              <p class="add-block-hint">添加内容模块</p>
              <div class="add-block-buttons">
                <button
                  v-for="type in blockTypes"
                  :key="type.value"
                  class="add-block-btn"
                  @click="openAddBlockModal(type.value)"
                >
                  <!-- 文字图标 -->
                  <svg v-if="type.icon === 'text'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                  <!-- 画廊图标 -->
                  <svg v-if="type.icon === 'gallery'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                  <!-- 时间线图标 -->
                  <svg v-if="type.icon === 'timeline'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  <!-- 链接图标 -->
                  <svg v-if="type.icon === 'link'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                  </svg>
                  <span>{{ type.label }}</span>
                </button>
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
        <h3 class="modal-title">
          {{ isEditingBlock ? '编辑' : '添加' }}{{ getBlockTypeLabel(blockFormData.blockType) }}模块
        </h3>

        <div class="form-group">
          <label class="form-label">模块标题（可选）</label>
          <input
            v-model="blockFormData.title"
            type="text"
            class="form-input"
            placeholder="请输入模块标题"
          />
        </div>

        <!-- 文字模块 -->
        <div v-if="blockFormData.blockType === 'text'" class="form-group">
          <label class="form-label">内容</label>
          <textarea
            v-model="(blockFormData.content as TextBlockContent).text"
            class="form-textarea large"
            placeholder="请输入文字内容，支持多段落"
            rows="8"
          ></textarea>
        </div>

        <!-- 画廊模块 -->
        <div v-if="blockFormData.blockType === 'gallery'" class="form-group">
          <label class="form-label">图片</label>
          <input
            ref="galleryFileInputRef"
            type="file"
            accept="image/*"
            multiple
            class="file-input-hidden"
            @change="handleGalleryUpload"
          />
          <div class="gallery-grid">
            <div
              v-for="(img, index) in (blockFormData.content as GalleryBlockContent).images"
              :key="index"
              class="gallery-item"
            >
              <img :src="img.url" :alt="img.caption || ''" />
              <button class="remove-image-btn" @click="removeGalleryImage(index)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
              <input
                v-model="img.caption"
                type="text"
                class="image-caption-input"
                placeholder="图片说明"
              />
            </div>
            <button
              class="add-image-btn"
              @click="triggerGalleryUpload"
              :disabled="isUploadingGallery"
            >
              <template v-if="isUploadingGallery">
                <div class="upload-spinner"></div>
                <span>上传中...</span>
              </template>
              <template v-else>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span>添加图片</span>
              </template>
            </button>
          </div>
        </div>

        <!-- 时间线模块 -->
        <div v-if="blockFormData.blockType === 'timeline'" class="form-group">
          <label class="form-label">时间线项目</label>
          <div class="timeline-items">
            <div
              v-for="(item, index) in (blockFormData.content as TimelineBlockContent).items"
              :key="index"
              class="timeline-item-form"
            >
              <div class="timeline-item-header">
                <span class="item-number">{{ index + 1 }}</span>
                <button class="remove-item-btn" @click="removeTimelineItem(index)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
              <input
                v-model="item.time"
                type="text"
                class="form-input"
                placeholder="时间（如：2024年1月）"
              />
              <input
                v-model="item.title"
                type="text"
                class="form-input"
                placeholder="标题"
              />
              <textarea
                v-model="item.description"
                class="form-textarea"
                placeholder="描述（可选）"
                rows="2"
              ></textarea>
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
              class="link-item-form"
            >
              <div class="link-item-header">
                <span class="item-number">{{ index + 1 }}</span>
                <button class="remove-item-btn" @click="removeLinkItem(index)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
              <input
                v-model="item.url"
                type="url"
                class="form-input"
                placeholder="链接地址（https://...）"
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
            </div>
          </div>
          <button class="add-item-btn" @click="addLinkItem">
            + 添加链接
          </button>
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

    <!-- 删除确认弹窗 -->
    <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="cancelDelete">
      <div class="modal-content">
        <h3 class="modal-title">确认删除</h3>
        <p class="modal-desc">
          确定要删除这个内容模块吗？此操作不可撤销。
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
  max-width: 800px;
  margin: 0 auto;
}

/* ===== Breadcrumb ===== */
.breadcrumb-wrapper {
  display: none;
  margin-bottom: var(--spacing-lg);
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

/* ===== Event Header Card ===== */
.event-header-card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  margin-bottom: var(--spacing-lg);
}

.event-cover {
  width: 100%;
  height: 160px;
  overflow: hidden;
}

.event-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.event-info {
  padding: var(--spacing-lg);
}

.event-title {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-xs);
}

.event-subtitle {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-sm);
}

.event-meta {
  display: flex;
  gap: var(--spacing-md);
  flex-wrap: wrap;
  margin-bottom: var(--spacing-md);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.meta-item svg {
  width: 14px;
  height: 14px;
}

.edit-info-btn {
  display: inline-flex;
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

.edit-info-btn:hover {
  background: var(--color-primary);
  color: white;
}

.edit-info-btn svg {
  width: 14px;
  height: 14px;
}

/* ===== Content Editor ===== */
.content-editor {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
}

.editor-header {
  margin-bottom: var(--spacing-lg);
}

.editor-title {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-xs);
}

.editor-hint {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

/* ===== Blocks Container ===== */
.blocks-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.block-item {
  display: flex;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.block-item:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.block-sort-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.sort-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--color-text-placeholder);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.sort-btn:hover:not(:disabled) {
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

.sort-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.sort-btn svg {
  width: 16px;
  height: 16px;
}

.block-index {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--color-text-placeholder);
  min-width: 20px;
  text-align: center;
}

.block-content {
  flex: 1;
  min-width: 0;
}

.block-type-badge {
  display: inline-block;
  font-size: 10px;
  font-weight: var(--font-semibold);
  color: var(--color-primary);
  background: var(--color-primary-bg);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  margin-bottom: var(--spacing-xs);
}

.block-title {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  margin-bottom: 4px;
}

.block-preview {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Gallery Preview */
.gallery-preview {
  display: flex;
  gap: var(--spacing-xs);
  margin-top: var(--spacing-sm);
}

.gallery-thumb {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: var(--radius-sm);
}

.gallery-more {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-border);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  border-radius: var(--radius-sm);
}

/* Timeline Preview */
.timeline-preview {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: var(--spacing-sm);
}

.timeline-item-preview {
  display: flex;
  gap: var(--spacing-sm);
  font-size: var(--text-xs);
}

.timeline-time {
  color: var(--color-primary);
  font-weight: var(--font-medium);
  min-width: 80px;
}

.timeline-title {
  color: var(--color-text-secondary);
}

/* Links Preview */
.links-preview {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: var(--spacing-sm);
}

.link-item-preview {
  font-size: var(--text-xs);
  color: var(--color-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Block Actions */
.block-actions {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  flex-shrink: 0;
}

.block-action-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
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

.block-action-btn.edit {
  color: var(--color-text-placeholder);
}

.block-action-btn.edit:hover {
  color: var(--color-primary);
  background: var(--color-primary-bg);
}

.block-action-btn.delete {
  color: var(--color-text-placeholder);
}

.block-action-btn.delete:hover {
  color: var(--color-error);
  background: var(--color-error-bg);
}

/* ===== Empty Blocks ===== */
.empty-blocks {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--color-text-secondary);
}

.empty-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto var(--spacing-md);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-border);
  border-radius: var(--radius-lg);
}

.empty-icon svg {
  width: 24px;
  height: 24px;
  color: var(--color-text-placeholder);
}

.empty-blocks h3 {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-text);
  margin-bottom: var(--spacing-xs);
}

.empty-blocks p {
  font-size: var(--text-sm);
}

/* ===== Add Block Section ===== */
.add-block-section {
  border-top: 1px solid var(--color-border);
  padding-top: var(--spacing-lg);
}

.add-block-hint {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-md);
  text-align: center;
}

.add-block-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-sm);
}

.add-block-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-md);
  background: var(--color-bg);
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.add-block-btn:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-bg);
}

.add-block-btn svg {
  width: 24px;
  height: 24px;
  color: var(--color-text-secondary);
}

.add-block-btn:hover svg {
  color: var(--color-primary);
}

.add-block-btn span {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
}

.add-block-btn:hover span {
  color: var(--color-primary);
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

.modal-content.modal-lg {
  max-width: 600px;
}

.modal-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-lg);
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

.form-input,
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
.form-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-primary-bg);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.form-textarea.large {
  min-height: 160px;
}

.file-input-hidden {
  display: none;
}

/* ===== Gallery Grid ===== */
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-sm);
}

.gallery-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--color-border);
}

.gallery-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-image-btn {
  position: absolute;
  top: 4px;
  right: 4px;
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
  transition: all var(--transition-fast);
}

.remove-image-btn:hover {
  background: var(--color-error);
}

.remove-image-btn svg {
  width: 14px;
  height: 14px;
}

.image-caption-input {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 4px 8px;
  font-size: 10px;
  color: white;
  background: rgba(0, 0, 0, 0.6);
  border: none;
  outline: none;
}

.add-image-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  aspect-ratio: 1;
  background: var(--color-bg);
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.add-image-btn:hover:not(:disabled) {
  border-color: var(--color-primary);
  background: var(--color-primary-bg);
}

.add-image-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.add-image-btn svg {
  width: 24px;
  height: 24px;
  color: var(--color-text-placeholder);
}

.add-image-btn span {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
}

.upload-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* ===== Timeline/Link Items ===== */
.timeline-items,
.link-items {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.timeline-item-form,
.link-item-form {
  padding: var(--spacing-md);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.timeline-item-header,
.link-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-number {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-primary);
  background: var(--color-primary-bg);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}

.remove-item-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
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

/* ===== Desktop ===== */
@media (min-width: 1024px) {
  .breadcrumb-wrapper {
    display: block;
  }

  .page-content {
    padding: var(--spacing-xl);
  }

  .event-cover {
    height: 200px;
  }

  .event-title {
    font-size: var(--text-xl);
  }

  .add-block-buttons {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 480px) {
  .gallery-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .add-block-buttons {
    grid-template-columns: 1fr;
  }
}
</style>
