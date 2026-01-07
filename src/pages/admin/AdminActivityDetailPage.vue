<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/composables/useToast'
import {
  getAdminActivityDetail,
  createActivity,
  updateActivity,
  deleteActivity,
  getActivityStats,
  createSession,
  updateSession,
  deleteSession,
  exportActivityTickets,
} from '@/api/ticket'
import { uploadFile } from '@/api/file'
import type {
  TicketActivityDetail,
  ActivityConfig,
  ActivitySession,
  ActivityStats,
  ExtraInfoField,
} from '@/types/ticket'
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb.vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const toast = useToast()

// 判断是创建还是编辑模式
const isCreateMode = computed(() => !route.params.id || route.params.id === 'new' || route.name === 'admin-tickets-new')
const activityId = computed(() => (isCreateMode.value ? null : Number(route.params.id)))

// 加载状态
const isLoading = ref(true)
const isSaving = ref(false)

// 活动数据
const activity = ref<TicketActivityDetail | null>(null)
const stats = ref<ActivityStats | null>(null)

// 表单数据
const form = ref({
  name: '',
  description: '',
  imageUrl: '',
  config: {
    require_campus_binding: false,
    require_extra_info: false,
    extra_info_fields: [] as ExtraInfoField[],
    require_approval: false,
    max_tickets_per_user: 1,
    auto_confirm_tickets: true,
  } as ActivityConfig,
})

// 档期编辑
const showSessionModal = ref(false)
const isEditingSession = ref(false)
const editingSessionId = ref<number | null>(null)
const sessionForm = ref({
  name: '',
  description: '',
  startTime: '',
  endTime: '',
  totalTickets: 100,
})

// 删除确认
const showDeleteConfirm = ref(false)
const deleteType = ref<'activity' | 'session'>('activity')
const deleteTargetId = ref<number | null>(null)
const deleteTargetName = ref('')
const isDeleting = ref(false)

// 图片上传
const isUploadingImage = ref(false)
const imageInputRef = ref<HTMLInputElement | null>(null)

// 导出状态
const isExporting = ref(false)

// 额外信息字段类型选项
const fieldTypes = [
  { value: 'text', label: '文本' },
  { value: 'number', label: '数字' },
  { value: 'email', label: '邮箱' },
  { value: 'phone', label: '手机号' },
  { value: 'textarea', label: '多行文本' },
]

// 加载活动数据
async function loadActivity() {
  if (isCreateMode.value) {
    isLoading.value = false
    return
  }

  try {
    const [activityRes, statsRes] = await Promise.all([
      getAdminActivityDetail(activityId.value!),
      getActivityStats(activityId.value!),
    ])

    if (activityRes.data.code === 200) {
      activity.value = activityRes.data.data
      // 填充表单
      form.value.name = activity.value.name
      form.value.description = activity.value.description || ''
      form.value.imageUrl = activity.value.imageUrl || ''
      form.value.config = { ...activity.value.config }
    } else {
      toast.error(activityRes.data.message || '获取活动详情失败')
      router.push('/admin/tickets')
      return
    }

    if (statsRes.data.code === 200) {
      stats.value = statsRes.data.data
    }
  } catch (error) {
    toast.error('获取活动详情失败')
    router.push('/admin/tickets')
  } finally {
    isLoading.value = false
  }
}

// 保存活动
async function saveActivity() {
  if (!form.value.name.trim()) {
    toast.error('请输入活动名称')
    return
  }

  isSaving.value = true
  try {
    if (isCreateMode.value) {
      const res = await createActivity({
        name: form.value.name,
        description: form.value.description || undefined,
        imageUrl: form.value.imageUrl || undefined,
        config: form.value.config,
      })
      if (res.data.code === 200) {
        toast.success('活动创建成功')
        router.replace(`/admin/tickets/${res.data.data.id}`)
      } else {
        toast.error(res.data.message || '创建失败')
      }
    } else {
      const res = await updateActivity(activityId.value!, {
        name: form.value.name,
        description: form.value.description || undefined,
        imageUrl: form.value.imageUrl || undefined,
        config: form.value.config,
      })
      if (res.data.code === 200) {
        toast.success('保存成功')
        activity.value = res.data.data
      } else {
        toast.error(res.data.message || '保存失败')
      }
    }
  } catch (error) {
    toast.error('保存失败')
  } finally {
    isSaving.value = false
  }
}

// 更新活动状态
async function changeStatus(status: string) {
  if (!activityId.value) return

  try {
    const res = await updateActivity(activityId.value, { status: status as any })
    if (res.data.code === 200) {
      toast.success('状态更新成功')
      activity.value = res.data.data
    } else {
      toast.error(res.data.message || '更新失败')
    }
  } catch (error) {
    toast.error('更新失败')
  }
}

// 打开创建档期弹窗
function openCreateSession() {
  isEditingSession.value = false
  editingSessionId.value = null
  sessionForm.value = {
    name: '',
    description: '',
    startTime: '',
    endTime: '',
    totalTickets: 100,
  }
  showSessionModal.value = true
}

// 打开编辑档期弹窗
function openEditSession(session: ActivitySession) {
  isEditingSession.value = true
  editingSessionId.value = session.id
  sessionForm.value = {
    name: session.name,
    description: session.description || '',
    startTime: formatDateTimeLocal(session.startTime),
    endTime: formatDateTimeLocal(session.endTime),
    totalTickets: session.totalTickets,
  }
  showSessionModal.value = true
}

// 格式化为 datetime-local 输入格式
function formatDateTimeLocal(dateStr: string) {
  const date = new Date(dateStr)
  return date.toISOString().slice(0, 16)
}

// 保存档期
async function saveSession() {
  if (!sessionForm.value.name.trim()) {
    toast.error('请输入档期名称')
    return
  }
  if (!sessionForm.value.startTime || !sessionForm.value.endTime) {
    toast.error('请选择开始和结束时间')
    return
  }
  if (sessionForm.value.totalTickets < 1) {
    toast.error('票数至少为 1')
    return
  }

  isSaving.value = true
  try {
    if (isEditingSession.value && editingSessionId.value) {
      const res = await updateSession(editingSessionId.value, {
        name: sessionForm.value.name,
        description: sessionForm.value.description || undefined,
        startTime: sessionForm.value.startTime,
        endTime: sessionForm.value.endTime,
        totalTickets: sessionForm.value.totalTickets,
      })
      if (res.data.code === 200) {
        toast.success('档期更新成功')
        showSessionModal.value = false
        loadActivity()
      } else {
        toast.error(res.data.message || '更新失败')
      }
    } else {
      const res = await createSession(activityId.value!, {
        name: sessionForm.value.name,
        description: sessionForm.value.description || undefined,
        startTime: sessionForm.value.startTime,
        endTime: sessionForm.value.endTime,
        totalTickets: sessionForm.value.totalTickets,
      })
      if (res.data.code === 200) {
        toast.success('档期创建成功')
        showSessionModal.value = false
        loadActivity()
      } else {
        toast.error(res.data.message || '创建失败')
      }
    }
  } catch (error) {
    toast.error('保存失败')
  } finally {
    isSaving.value = false
  }
}

// 打开删除确认
function openDeleteConfirm(type: 'activity' | 'session', id: number, name: string) {
  deleteType.value = type
  deleteTargetId.value = id
  deleteTargetName.value = name
  showDeleteConfirm.value = true
}

// 确认删除
async function confirmDelete() {
  if (!deleteTargetId.value) return

  isDeleting.value = true
  try {
    if (deleteType.value === 'activity') {
      const res = await deleteActivity(deleteTargetId.value)
      if (res.data.code === 200) {
        toast.success('活动已删除')
        router.push('/admin/tickets')
      } else {
        toast.error(res.data.message || '删除失败')
      }
    } else {
      const res = await deleteSession(deleteTargetId.value)
      if (res.data.code === 200) {
        toast.success('档期已删除')
        showDeleteConfirm.value = false
        loadActivity()
      } else {
        toast.error(res.data.message || '删除失败')
      }
    }
  } catch (error) {
    toast.error('删除失败')
  } finally {
    isDeleting.value = false
  }
}

// 添加额外信息字段
function addExtraField() {
  // 确保 extra_info_fields 数组已初始化
  if (!form.value.config.extra_info_fields) {
    form.value.config.extra_info_fields = []
  }
  form.value.config.extra_info_fields.push({
    name: `field_${Date.now()}`,
    label: '',
    type: 'text',
    required: false,
  })
}

// 删除额外信息字段
function removeExtraField(index: number) {
  form.value.config.extra_info_fields.splice(index, 1)
}

// 跳转到审票页面
function goToReview() {
  if (activityId.value) {
    router.push(`/admin/tickets/${activityId.value}/review`)
  }
}

// 导出票据
async function handleExport() {
  if (isExporting.value || !activityId.value) return

  isExporting.value = true
  try {
    const result = await exportActivityTickets(activityId.value)
    if (result.success) {
      toast.success('导出成功')
    } else {
      toast.error(result.error || '导出失败，请稍后重试')
    }
  } catch (error) {
    toast.error('导出失败，请稍后重试')
  } finally {
    isExporting.value = false
  }
}

// 触发图片选择
function triggerImageUpload() {
  imageInputRef.value?.click()
}

// 处理图片上传
async function handleImageUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  // 检查文件类型
  if (!file.type.startsWith('image/')) {
    toast.error('请选择图片文件')
    return
  }

  // 检查文件大小 (10MB)
  if (file.size > 10 * 1024 * 1024) {
    toast.error('图片大小不能超过 10MB')
    return
  }

  isUploadingImage.value = true
  try {
    const res = await uploadFile(file, 'activity_image')
    if (res.data.code === 200) {
      form.value.imageUrl = res.data.data.fileUrl
      toast.success('图片上传成功')
    } else {
      toast.error(res.data.message || '上传失败')
    }
  } catch (error) {
    toast.error('上传失败，请重试')
  } finally {
    isUploadingImage.value = false
    // 清空 input 以便重复选择同一文件
    input.value = ''
  }
}

// 删除图片
function removeImage() {
  form.value.imageUrl = ''
}

// 获取状态信息
function getStatusInfo(status: string) {
  const statusMap: Record<string, { label: string; class: string }> = {
    draft: { label: '草稿', class: 'status-draft' },
    published: { label: '已发布', class: 'status-published' },
    active: { label: '进行中', class: 'status-active' },
    ended: { label: '已结束', class: 'status-ended' },
    cancelled: { label: '已取消', class: 'status-cancelled' },
    waiting: { label: '等待中', class: 'status-waiting' },
  }
  return statusMap[status] || { label: status, class: '' }
}

// 格式化日期时间
function formatDateTime(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

onMounted(() => {
  if (!userStore.isLoggedIn || !userStore.canManageTickets) {
    toast.error('无权访问此页面')
    router.push('/')
    return
  }
  loadActivity()
})

// 监听路由变化（从创建切换到编辑）
watch(() => route.params.id, () => {
  if (route.path.includes('/admin/tickets/')) {
    loadActivity()
  }
})

// 监听审核和自动确认互斥
watch(() => form.value.config.require_approval, (newVal) => {
  if (newVal) {
    form.value.config.auto_confirm_tickets = false
  }
})

watch(() => form.value.config.auto_confirm_tickets, (newVal) => {
  if (newVal) {
    form.value.config.require_approval = false
  }
})
</script>

<template>
  <div class="page-container">
    <PageHeader back-to="/admin/tickets" />

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

        <template v-else>
          <!-- 页面标题 -->
          <div class="page-header-section">
            <div class="header-main">
              <div>
                <h1 class="page-title">{{ isCreateMode ? '创建活动' : '编辑活动' }}</h1>
                <p class="page-subtitle">{{ isCreateMode ? '填写活动信息' : activity?.name }}</p>
              </div>
              <div v-if="!isCreateMode && activity" class="header-status">
                <span class="status-badge" :class="getStatusInfo(activity.status).class">
                  {{ getStatusInfo(activity.status).label }}
                </span>
              </div>
            </div>
          </div>

          <!-- 统计卡片 -->
          <div v-if="!isCreateMode && stats" class="stats-section">
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-value">{{ stats.totalTickets }}</div>
                <div class="stat-label">总票数</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{{ stats.grabbedTickets }}</div>
                <div class="stat-label">已抢票</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{{ stats.pendingTickets }}</div>
                <div class="stat-label">待审核</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{{ stats.usedTickets }}</div>
                <div class="stat-label">已使用</div>
              </div>
            </div>
            <div class="stats-actions">
              <button v-if="stats.pendingTickets > 0" class="review-btn" @click="goToReview">
                查看待审核票据
              </button>
              <button class="export-btn" @click="handleExport" :disabled="isExporting">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                {{ isExporting ? '导出中...' : '导出票据' }}
              </button>
            </div>
          </div>

          <!-- 基本信息 -->
          <div class="form-section">
            <h2 class="section-title">基本信息</h2>
            <div class="form-group">
              <label class="form-label">活动名称 *</label>
              <input
                v-model="form.name"
                type="text"
                class="form-input"
                placeholder="请输入活动名称"
              />
            </div>
            <div class="form-group">
              <label class="form-label">活动描述</label>
              <textarea
                v-model="form.description"
                class="form-textarea"
                placeholder="请输入活动描述"
                rows="3"
              ></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">封面图片</label>
              <input
                ref="imageInputRef"
                type="file"
                accept="image/*"
                class="hidden-input"
                @change="handleImageUpload"
              />
              <div v-if="form.imageUrl" class="image-preview-wrapper">
                <img :src="form.imageUrl" alt="封面预览" class="preview-image" />
                <div class="image-actions">
                  <button type="button" class="image-action-btn change" @click="triggerImageUpload" :disabled="isUploadingImage">
                    {{ isUploadingImage ? '上传中...' : '更换图片' }}
                  </button>
                  <button type="button" class="image-action-btn remove" @click="removeImage">
                    删除
                  </button>
                </div>
              </div>
              <div v-else class="image-upload-area" @click="triggerImageUpload">
                <div v-if="isUploadingImage" class="upload-loading">
                  <div class="loading-spinner small"></div>
                  <span>上传中...</span>
                </div>
                <template v-else>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                  <span>点击上传封面图片</span>
                  <span class="upload-hint">支持 JPG、PNG、GIF，最大 10MB</span>
                </template>
              </div>
            </div>
          </div>

          <!-- 活动配置 -->
          <div class="form-section">
            <h2 class="section-title">活动配置</h2>
            <div class="config-grid">
              <label class="config-item">
                <input
                  type="checkbox"
                  v-model="form.config.require_campus_binding"
                />
                <span class="config-text">
                  <span class="config-label">需要绑定校园网</span>
                  <span class="config-desc">用户必须先绑定校园网账号才能抢票</span>
                </span>
              </label>
              <label class="config-item">
                <input
                  type="checkbox"
                  v-model="form.config.require_approval"
                />
                <span class="config-text">
                  <span class="config-label">需要管理员审核</span>
                  <span class="config-desc">抢票后需要管理员审核通过才能使用</span>
                </span>
              </label>
              <label class="config-item">
                <input
                  type="checkbox"
                  v-model="form.config.auto_confirm_tickets"
                />
                <span class="config-text">
                  <span class="config-label">自动确认票据</span>
                  <span class="config-desc">抢票成功后自动确认（无需审核时有效）</span>
                </span>
              </label>
            </div>
            <div class="form-group">
              <label class="form-label">每用户最大抢票数</label>
              <input
                v-model.number="form.config.max_tickets_per_user"
                type="number"
                class="form-input small"
                min="1"
              />
            </div>
          </div>

          <!-- 额外信息配置 -->
          <div class="form-section">
            <div class="section-header">
              <h2 class="section-title">额外信息收集</h2>
              <label class="config-toggle">
                <input
                  type="checkbox"
                  v-model="form.config.require_extra_info"
                />
                <span>启用</span>
              </label>
            </div>
            <template v-if="form.config.require_extra_info">
              <TransitionGroup name="field-list" tag="div" class="extra-fields-container">
                <div
                  v-for="(field, index) in form.config.extra_info_fields"
                  :key="field.name"
                  class="extra-field-item"
                >
                  <input
                    v-model="field.label"
                    type="text"
                    class="form-input"
                    placeholder="字段名称"
                  />
                  <select v-model="field.type" class="form-select">
                    <option v-for="t in fieldTypes" :key="t.value" :value="t.value">
                      {{ t.label }}
                    </option>
                  </select>
                  <label class="field-required">
                    <input type="checkbox" v-model="field.required" />
                    <span>必填</span>
                  </label>
                  <button class="remove-field-btn" @click="removeExtraField(index)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              </TransitionGroup>
              <button class="add-field-btn" @click="addExtraField">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                添加字段
              </button>
            </template>
          </div>

          <!-- 档期管理（仅编辑模式） -->
          <div v-if="!isCreateMode && activity" class="form-section">
            <div class="section-header">
              <h2 class="section-title">档期管理</h2>
              <button class="add-session-btn" @click="openCreateSession">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                添加档期
              </button>
            </div>
            <div v-if="activity.sessions.length === 0" class="empty-sessions">
              <p>暂无档期，请添加档期</p>
            </div>
            <div v-else class="sessions-list">
              <div
                v-for="session in activity.sessions"
                :key="session.id"
                class="session-card"
              >
                <div class="session-info">
                  <div class="session-header">
                    <h3 class="session-name">{{ session.name }}</h3>
                    <span class="status-badge small" :class="getStatusInfo(session.status).class">
                      {{ getStatusInfo(session.status).label }}
                    </span>
                  </div>
                  <p class="session-time">
                    {{ formatDateTime(session.startTime) }} - {{ formatDateTime(session.endTime) }}
                  </p>
                  <p class="session-tickets">
                    已售 {{ session.totalTickets - session.availableTickets }} / {{ session.totalTickets }} 票
                  </p>
                </div>
                <div class="session-actions">
                  <button class="session-btn edit" @click="openEditSession(session)">
                    编辑
                  </button>
                  <button
                    class="session-btn delete"
                    @click="openDeleteConfirm('session', session.id, session.name)"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="action-section">
            <div class="action-left">
              <button
                v-if="!isCreateMode && activity && (activity.status === 'draft' || activity.status === 'ended')"
                class="delete-btn"
                @click="openDeleteConfirm('activity', activity.id, activity.name)"
              >
                删除活动
              </button>
            </div>
            <div class="action-right">
              <button class="cancel-btn" @click="router.push('/admin/tickets')">
                取消
              </button>
              <button
                v-if="!isCreateMode && activity?.status === 'draft'"
                class="publish-btn"
                @click="changeStatus('published')"
              >
                发布活动
              </button>
              <button class="save-btn" @click="saveActivity" :disabled="isSaving">
                {{ isSaving ? '保存中...' : '保存' }}
              </button>
            </div>
          </div>
        </template>
      </div>
    </main>

    <PageFooter />

    <!-- 档期编辑弹窗 -->
    <div v-if="showSessionModal" class="modal-overlay" @click.self="showSessionModal = false">
      <div class="modal-content">
        <h3 class="modal-title">{{ isEditingSession ? '编辑档期' : '添加档期' }}</h3>
        <div class="modal-form">
          <div class="form-group">
            <label class="form-label">档期名称 *</label>
            <input
              v-model="sessionForm.name"
              type="text"
              class="form-input"
              placeholder="如：第一场"
            />
          </div>
          <div class="form-group">
            <label class="form-label">档期描述</label>
            <textarea
              v-model="sessionForm.description"
              class="form-textarea"
              placeholder="档期描述（可选）"
              rows="2"
            ></textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">开始时间 *</label>
              <input
                v-model="sessionForm.startTime"
                type="datetime-local"
                class="form-input"
              />
            </div>
            <div class="form-group">
              <label class="form-label">结束时间 *</label>
              <input
                v-model="sessionForm.endTime"
                type="datetime-local"
                class="form-input"
              />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">总票数 *</label>
            <input
              v-model.number="sessionForm.totalTickets"
              type="number"
              class="form-input small"
              min="1"
            />
          </div>
        </div>
        <div class="modal-actions">
          <button class="modal-btn cancel" @click="showSessionModal = false">
            取消
          </button>
          <button class="modal-btn confirm" @click="saveSession" :disabled="isSaving">
            {{ isSaving ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 删除确认弹窗 -->
    <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = false">
      <div class="modal-content">
        <h3 class="modal-title">确认删除</h3>
        <p class="modal-desc">
          确定要删除{{ deleteType === 'activity' ? '活动' : '档期' }}"{{ deleteTargetName }}"吗？此操作不可撤销。
        </p>
        <div class="modal-actions">
          <button class="modal-btn cancel" @click="showDeleteConfirm = false" :disabled="isDeleting">
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
  max-width: 700px;
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

/* ===== Page Header ===== */
.page-header-section {
  display: none;
  margin-bottom: var(--spacing-lg);
}

.header-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--spacing-md);
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

/* ===== Stats ===== */
.stats-section {
  margin-bottom: var(--spacing-lg);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.stat-card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  text-align: center;
}

.stat-value {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  color: var(--color-primary);
}

.stat-label {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  margin-top: 4px;
}

.stats-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.review-btn {
  flex: 1;
  padding: var(--spacing-sm);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-warning);
  background: var(--color-warning-bg);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.review-btn:hover {
  background: var(--color-warning);
  color: white;
}

.export-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  flex: 1;
  padding: var(--spacing-sm);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-primary);
  background: var(--color-primary-bg);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.export-btn svg {
  width: 16px;
  height: 16px;
}

.export-btn:hover:not(:disabled) {
  background: var(--color-primary);
  color: white;
}

.export-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ===== Form Section ===== */
.form-section {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-md);
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

.form-group {
  margin-bottom: var(--spacing-md);
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  margin-bottom: var(--spacing-xs);
}

.form-input,
.form-textarea,
.form-select {
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
.form-textarea:focus,
.form-select:focus {
  outline: none;
  border-color: var(--color-primary);
}

.form-input.small {
  width: 120px;
}

.form-textarea {
  min-height: 100px;
  resize: vertical;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.hidden-input {
  display: none;
}

/* ===== Image Upload ===== */
.image-upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xl);
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
  color: var(--color-text-secondary);
}

.image-upload-area:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-bg);
}

.image-upload-area svg {
  width: 48px;
  height: 48px;
  color: var(--color-text-placeholder);
}

.image-upload-area span {
  font-size: var(--text-sm);
}

.upload-hint {
  font-size: var(--text-xs) !important;
  color: var(--color-text-placeholder);
}

.upload-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
}

.loading-spinner.small {
  width: 24px;
  height: 24px;
  border-width: 2px;
}

.image-preview-wrapper {
  position: relative;
  max-width: 300px;
}

.preview-image {
  width: 100%;
  border-radius: var(--radius-lg);
  display: block;
}

.image-actions {
  display: flex;
  gap: var(--spacing-xs);
  margin-top: var(--spacing-sm);
}

.image-action-btn {
  flex: 1;
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.image-action-btn.change {
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

.image-action-btn.change:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.image-action-btn.remove {
  background: var(--color-error-bg);
  color: var(--color-error);
}

/* ===== Config ===== */
.config-grid {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.config-item {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  cursor: pointer;
}

.config-item input[type="checkbox"] {
  margin-top: 2px;
  width: 16px;
  height: 16px;
}

.config-text {
  display: flex;
  flex-direction: column;
}

.config-label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.config-desc {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.config-toggle {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--text-sm);
  cursor: pointer;
}

/* ===== Extra Fields ===== */
.extra-fields-container {
  position: relative;
}

.extra-field-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
}

/* Field list transition */
.field-list-enter-active {
  animation: fieldSlideIn 0.3s ease;
}

.field-list-leave-active {
  animation: fieldSlideOut 0.25s ease;
  position: absolute;
  width: 100%;
}

.field-list-move {
  transition: transform 0.3s ease;
}

@keyframes fieldSlideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fieldSlideOut {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateX(20px);
  }
}

.extra-field-item .form-input {
  flex: 1;
}

.extra-field-item .form-select {
  width: 100px;
}

.field-required {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-xs);
  white-space: nowrap;
}

.remove-field-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-error-bg);
  color: var(--color-error);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
}

.remove-field-btn svg {
  width: 16px;
  height: 16px;
}

.add-field-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  width: 100%;
  padding: var(--spacing-sm);
  font-size: var(--text-sm);
  color: var(--color-primary);
  background: transparent;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
}

.add-field-btn svg {
  width: 16px;
  height: 16px;
}

/* ===== Sessions ===== */
.add-session-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-primary);
  background: var(--color-primary-bg);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
}

.add-session-btn svg {
  width: 14px;
  height: 14px;
}

.empty-sessions {
  text-align: center;
  padding: var(--spacing-lg);
  color: var(--color-text-secondary);
}

.sessions-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.session-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.session-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: 4px;
}

.session-name {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
}

.session-time,
.session-tickets {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.session-actions {
  display: flex;
  gap: var(--spacing-xs);
}

.session-btn {
  padding: 4px 10px;
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.session-btn.edit {
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

.session-btn.delete {
  background: var(--color-error-bg);
  color: var(--color-error);
}

/* ===== Status Badge ===== */
.status-badge {
  font-size: 10px;
  font-weight: var(--font-semibold);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}

.status-badge.small {
  font-size: 9px;
  padding: 1px 4px;
}

.status-badge.status-draft {
  background: var(--color-border);
  color: var(--color-text-secondary);
}

.status-badge.status-published {
  background: var(--color-info-bg);
  color: var(--color-info);
}

.status-badge.status-active {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.status-badge.status-ended {
  background: var(--color-border);
  color: var(--color-text-tertiary);
}

.status-badge.status-cancelled {
  background: var(--color-error-bg);
  color: var(--color-error);
}

.status-badge.status-waiting {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

/* ===== Action Section ===== */
.action-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md) 0;
  gap: var(--spacing-md);
}

.action-right {
  display: flex;
  gap: var(--spacing-sm);
}

.delete-btn {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-error);
  background: transparent;
  border: 1px solid var(--color-error);
  border-radius: var(--radius-md);
  cursor: pointer;
}

.cancel-btn {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text);
  background: var(--color-border);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
}

.publish-btn {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-info);
  background: var(--color-info-bg);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
}

.save-btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: white;
  background: var(--color-primary);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-content {
  background: var(--color-card);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideUp 0.25s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
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

.modal-form {
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

.modal-btn.confirm {
  background: var(--color-primary);
  color: white;
}

.modal-btn.confirm.danger {
  background: var(--color-error);
}

/* ===== Desktop ===== */
@media (min-width: 1024px) {
  .breadcrumb-wrapper {
    display: block;
  }

  .page-header-section {
    display: block;
  }

  .page-content {
    padding: var(--spacing-xl);
  }

  .page-title {
    font-size: var(--text-2xl);
  }

  .form-row {
    flex-direction: row;
  }

  .form-row .form-group {
    flex: 1;
  }
}
</style>
