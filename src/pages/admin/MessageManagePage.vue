<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/composables/useToast'
import {
  getAdminMessages,
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  sendMessage,
  broadcastMessage,
  deleteAdminMessage,
  batchDeleteMessages,
  getMessageStats,
} from '@/api/adminMessage'
import type {
  MessageType,
  AdminMessage,
  MessageTemplate,
  MessageStats,
} from '@/types/message'
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb.vue'

const router = useRouter()
const userStore = useUserStore()
const toast = useToast()

// 当前标签页
const activeTab = ref<'messages' | 'templates' | 'send' | 'stats'>('messages')

// ==================== 消息列表 ====================
const messages = ref<AdminMessage[]>([])
const messagesLoading = ref(false)
const messagesPage = ref(1)
const messagesTotal = ref(0)
const messagesPageSize = ref(20)
const messageTypeFilter = ref<MessageType | ''>('')
const messageKeyword = ref('')
const selectedMessageIds = ref<number[]>([])
const isDeletingMessages = ref(false)

// 消息详情抽屉
const showMessageDetail = ref(false)
const selectedMessage = ref<AdminMessage | null>(null)

// ==================== 模板管理 ====================
const templates = ref<MessageTemplate[]>([])
const templatesLoading = ref(false)
const templateTypeFilter = ref<MessageType | ''>('')

// 模板编辑抽屉
const showTemplateDrawer = ref(false)
const isEditingTemplate = ref(false)
const editingTemplate = ref<MessageTemplate | null>(null)
const templateForm = ref({
  code: '',
  titleTemplate: '',
  contentTemplate: '',
  type: 'system' as MessageType,
  status: 1,
})
const isSubmittingTemplate = ref(false)

// 删除确认
const showDeleteConfirm = ref(false)
const deleteTarget = ref<{ type: 'template' | 'message'; id: number; name: string } | null>(null)
const isDeleting = ref(false)

// ==================== 发送消息 ====================
const sendForm = ref({
  userIds: '',
  type: 'system' as MessageType,
  title: '',
  content: '',
})
const isSending = ref(false)
const isBroadcasting = ref(false)

// ==================== 统计信息 ====================
const stats = ref<MessageStats | null>(null)
const statsLoading = ref(false)

// 消息类型选项
const messageTypes: { value: MessageType; label: string }[] = [
  { value: 'ticket', label: '抢票' },
  { value: 'rating', label: '社区' },
  { value: 'contribution', label: '反馈' },
  { value: 'system', label: '系统' },
]

// 计算是否全选
const isAllMessagesSelected = computed(() => {
  if (messages.value.length === 0) return false
  return messages.value.every((m) => selectedMessageIds.value.includes(m.id))
})

// 加载消息列表
async function loadMessages() {
  messagesLoading.value = true
  try {
    const res = await getAdminMessages({
      type: messageTypeFilter.value || undefined,
      keyword: messageKeyword.value || undefined,
      page: messagesPage.value,
      size: messagesPageSize.value,
    })
    if (res.data.code === 200) {
      messages.value = res.data.data.records
      messagesTotal.value = res.data.data.total
    } else {
      toast.error(res.data.message || '获取消息列表失败')
    }
  } catch (error) {
    toast.error('获取消息列表失败')
  } finally {
    messagesLoading.value = false
  }
}

// 查看消息详情
function viewMessage(message: AdminMessage) {
  selectedMessage.value = message
  showMessageDetail.value = true
}

// 切换消息选择
function toggleMessageSelect(id: number) {
  const index = selectedMessageIds.value.indexOf(id)
  if (index === -1) {
    selectedMessageIds.value.push(id)
  } else {
    selectedMessageIds.value.splice(index, 1)
  }
}

// 切换全选
function toggleSelectAll() {
  if (isAllMessagesSelected.value) {
    selectedMessageIds.value = []
  } else {
    selectedMessageIds.value = messages.value.map((m) => m.id)
  }
}

// 批量删除消息
async function handleBatchDeleteMessages() {
  if (selectedMessageIds.value.length === 0) return

  isDeletingMessages.value = true
  try {
    const res = await batchDeleteMessages(selectedMessageIds.value)
    if (res.data.code === 200) {
      toast.success('删除成功')
      selectedMessageIds.value = []
      loadMessages()
    } else {
      toast.error(res.data.message || '删除失败')
    }
  } catch (error) {
    toast.error('删除失败')
  } finally {
    isDeletingMessages.value = false
  }
}

// 删除单条消息
async function handleDeleteMessage(id: number) {
  deleteTarget.value = { type: 'message', id, name: '此消息' }
  showDeleteConfirm.value = true
}

// 加载模板列表
async function loadTemplates() {
  templatesLoading.value = true
  try {
    const res = await getTemplates(templateTypeFilter.value || undefined)
    if (res.data.code === 200) {
      templates.value = res.data.data
    } else {
      toast.error(res.data.message || '获取模板列表失败')
    }
  } catch (error) {
    toast.error('获取模板列表失败')
  } finally {
    templatesLoading.value = false
  }
}

// 打开创建模板抽屉
function openCreateTemplate() {
  isEditingTemplate.value = false
  editingTemplate.value = null
  templateForm.value = {
    code: '',
    titleTemplate: '',
    contentTemplate: '',
    type: 'system',
    status: 1,
  }
  showTemplateDrawer.value = true
}

// 打开编辑模板抽屉
function openEditTemplate(template: MessageTemplate) {
  isEditingTemplate.value = true
  editingTemplate.value = template
  templateForm.value = {
    code: template.code,
    titleTemplate: template.titleTemplate,
    contentTemplate: template.contentTemplate,
    type: template.type,
    status: template.status,
  }
  showTemplateDrawer.value = true
}

// 关闭模板抽屉
function closeTemplateDrawer() {
  showTemplateDrawer.value = false
  editingTemplate.value = null
}

// 提交模板
async function submitTemplate() {
  if (!templateForm.value.code.trim()) {
    toast.warning('请输入模板代码')
    return
  }
  if (!templateForm.value.titleTemplate.trim()) {
    toast.warning('请输入标题模板')
    return
  }
  if (!templateForm.value.contentTemplate.trim()) {
    toast.warning('请输入内容模板')
    return
  }

  isSubmittingTemplate.value = true
  try {
    if (isEditingTemplate.value && editingTemplate.value) {
      const res = await updateTemplate(editingTemplate.value.id, {
        titleTemplate: templateForm.value.titleTemplate,
        contentTemplate: templateForm.value.contentTemplate,
        type: templateForm.value.type,
        status: templateForm.value.status,
      })
      if (res.data.code === 200) {
        toast.success('更新成功')
        closeTemplateDrawer()
        loadTemplates()
      } else {
        toast.error(res.data.message || '更新失败')
      }
    } else {
      const res = await createTemplate({
        code: templateForm.value.code,
        titleTemplate: templateForm.value.titleTemplate,
        contentTemplate: templateForm.value.contentTemplate,
        type: templateForm.value.type,
        status: templateForm.value.status,
      })
      if (res.data.code === 200) {
        toast.success('创建成功')
        closeTemplateDrawer()
        loadTemplates()
      } else {
        toast.error(res.data.message || '创建失败')
      }
    }
  } catch (error) {
    toast.error(isEditingTemplate.value ? '更新失败' : '创建失败')
  } finally {
    isSubmittingTemplate.value = false
  }
}

// 删除模板
function handleDeleteTemplate(template: MessageTemplate) {
  deleteTarget.value = { type: 'template', id: template.id, name: template.code }
  showDeleteConfirm.value = true
}

// 确认删除
async function confirmDelete() {
  if (!deleteTarget.value) return

  isDeleting.value = true
  try {
    if (deleteTarget.value.type === 'template') {
      const res = await deleteTemplate(deleteTarget.value.id)
      if (res.data.code === 200) {
        toast.success('删除成功')
        loadTemplates()
      } else {
        toast.error(res.data.message || '删除失败')
      }
    } else {
      const res = await deleteAdminMessage(deleteTarget.value.id)
      if (res.data.code === 200) {
        toast.success('删除成功')
        loadMessages()
        if (showMessageDetail.value) {
          showMessageDetail.value = false
        }
      } else {
        toast.error(res.data.message || '删除失败')
      }
    }
    showDeleteConfirm.value = false
    deleteTarget.value = null
  } catch (error) {
    toast.error('删除失败')
  } finally {
    isDeleting.value = false
  }
}

// 发送消息
async function handleSendMessage() {
  if (!sendForm.value.userIds.trim()) {
    toast.warning('请输入用户ID')
    return
  }
  if (!sendForm.value.title.trim()) {
    toast.warning('请输入标题')
    return
  }
  if (!sendForm.value.content.trim()) {
    toast.warning('请输入内容')
    return
  }

  const userIds = sendForm.value.userIds
    .split(/[,，\s]+/)
    .map((id) => parseInt(id.trim()))
    .filter((id) => !isNaN(id))

  if (userIds.length === 0) {
    toast.warning('请输入有效的用户ID')
    return
  }

  isSending.value = true
  try {
    const res = await sendMessage({
      userIds,
      type: sendForm.value.type,
      title: sendForm.value.title,
      content: sendForm.value.content,
    })
    if (res.data.code === 200) {
      toast.success(res.data.data || '发送成功')
      sendForm.value = {
        userIds: '',
        type: 'system',
        title: '',
        content: '',
      }
    } else {
      toast.error(res.data.message || '发送失败')
    }
  } catch (error) {
    toast.error('发送失败')
  } finally {
    isSending.value = false
  }
}

// 广播消息
async function handleBroadcast() {
  if (!sendForm.value.title.trim()) {
    toast.warning('请输入标题')
    return
  }
  if (!sendForm.value.content.trim()) {
    toast.warning('请输入内容')
    return
  }

  isBroadcasting.value = true
  try {
    const res = await broadcastMessage({
      title: sendForm.value.title,
      content: sendForm.value.content,
    })
    if (res.data.code === 200) {
      toast.success(res.data.data || '广播任务已提交')
      sendForm.value = {
        userIds: '',
        type: 'system',
        title: '',
        content: '',
      }
    } else {
      toast.error(res.data.message || '广播失败')
    }
  } catch (error) {
    toast.error('广播失败')
  } finally {
    isBroadcasting.value = false
  }
}

// 加载统计信息
async function loadStats() {
  statsLoading.value = true
  try {
    const res = await getMessageStats()
    if (res.data.code === 200) {
      stats.value = res.data.data
    } else {
      toast.error(res.data.message || '获取统计信息失败')
    }
  } catch (error) {
    toast.error('获取统计信息失败')
  } finally {
    statsLoading.value = false
  }
}

// 格式化时间
function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('zh-CN')
}

// 获取消息类型标签
function getTypeLabel(type: MessageType) {
  const found = messageTypes.find((t) => t.value === type)
  return found?.label || type
}

// 监听标签页切换
watch(activeTab, (tab) => {
  if (tab === 'messages' && messages.value.length === 0) {
    loadMessages()
  } else if (tab === 'templates' && templates.value.length === 0) {
    loadTemplates()
  } else if (tab === 'stats') {
    loadStats()
  }
})

// 监听消息筛选
watch([messageTypeFilter, messageKeyword], () => {
  messagesPage.value = 1
  selectedMessageIds.value = []
  loadMessages()
})

// 监听模板筛选
watch(templateTypeFilter, () => {
  loadTemplates()
})

// 初始化
onMounted(() => {
  if (!userStore.isLoggedIn || !userStore.canManageMessages) {
    toast.error('无权访问此页面')
    router.push('/')
    return
  }
  loadMessages()
})
</script>

<template>
  <div class="message-manage-page">
    <PageHeader back-to="/" />

    <main class="page-content">
      <div class="content-container">
        <div class="breadcrumb-wrapper">
          <PageBreadcrumb />
        </div>


        <!-- 标签页切换 -->
        <div class="tabs-section">
          <div class="tabs-scroll">
            <button
              class="tab-btn"
              :class="{ active: activeTab === 'messages' }"
              @click="activeTab = 'messages'"
            >
              消息列表
            </button>
            <button
              class="tab-btn"
              :class="{ active: activeTab === 'templates' }"
              @click="activeTab = 'templates'"
            >
              模板管理
            </button>
            <button
              class="tab-btn"
              :class="{ active: activeTab === 'send' }"
              @click="activeTab = 'send'"
            >
              发送消息
            </button>
            <button
              class="tab-btn"
              :class="{ active: activeTab === 'stats' }"
              @click="activeTab = 'stats'"
            >
              统计
            </button>
          </div>
        </div>

        <!-- 消息列表 -->
        <div v-if="activeTab === 'messages'" class="tab-content">
          <!-- 筛选栏 -->
          <div class="filter-bar">
            <select v-model="messageTypeFilter" class="filter-select">
              <option value="">全部类型</option>
              <option v-for="t in messageTypes" :key="t.value" :value="t.value">
                {{ t.label }}
              </option>
            </select>
            <input
              v-model="messageKeyword"
              type="text"
              class="filter-input"
              placeholder="搜索标题或内容..."
            />
          </div>

          <!-- 批量操作 -->
          <div v-if="selectedMessageIds.length > 0" class="batch-bar">
            <span class="batch-count">已选择 {{ selectedMessageIds.length }} 条</span>
            <button
              class="batch-btn danger"
              :disabled="isDeletingMessages"
              @click="handleBatchDeleteMessages"
            >
              {{ isDeletingMessages ? '删除中...' : '批量删除' }}
            </button>
          </div>

          <!-- 加载状态 -->
          <div v-if="messagesLoading" class="loading-container">
            <div class="loading-spinner"></div>
            <p>加载中...</p>
          </div>

          <!-- 空状态 -->
          <div v-else-if="messages.length === 0" class="empty-container">
            <p>暂无消息</p>
          </div>

          <!-- 消息列表 -->
          <div v-else class="messages-list">
            <div class="list-header">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  :checked="isAllMessagesSelected"
                  @change="toggleSelectAll"
                />
              </label>
              <span class="col-user">用户</span>
              <span class="col-type">类型</span>
              <span class="col-title">标题</span>
              <span class="col-status">状态</span>
              <span class="col-time">时间</span>
              <span class="col-action">操作</span>
            </div>
            <div
              v-for="msg in messages"
              :key="msg.id"
              class="list-item"
              @click="viewMessage(msg)"
            >
              <label class="checkbox-label" @click.stop>
                <input
                  type="checkbox"
                  :checked="selectedMessageIds.includes(msg.id)"
                  @change="toggleMessageSelect(msg.id)"
                />
              </label>
              <span class="col-user">{{ msg.username }}</span>
              <span class="col-type">
                <span class="type-badge" :class="`type-${msg.type}`">
                  {{ getTypeLabel(msg.type) }}
                </span>
              </span>
              <span class="col-title">{{ msg.title }}</span>
              <span class="col-status">
                <span v-if="msg.isRead" class="status-read">已读</span>
                <span v-else class="status-unread">未读</span>
              </span>
              <span class="col-time">{{ formatTime(msg.createdAt) }}</span>
              <span class="col-action" @click.stop>
                <button class="action-btn" @click="handleDeleteMessage(msg.id)">删除</button>
              </span>
            </div>
          </div>

          <!-- 分页 -->
          <div v-if="messagesTotal > messagesPageSize" class="pagination">
            <button
              class="page-btn"
              :disabled="messagesPage === 1"
              @click="messagesPage--; loadMessages()"
            >
              上一页
            </button>
            <span class="page-info">{{ messagesPage }} / {{ Math.ceil(messagesTotal / messagesPageSize) }}</span>
            <button
              class="page-btn"
              :disabled="messagesPage >= Math.ceil(messagesTotal / messagesPageSize)"
              @click="messagesPage++; loadMessages()"
            >
              下一页
            </button>
          </div>
        </div>

        <!-- 模板管理 -->
        <div v-if="activeTab === 'templates'" class="tab-content">
          <!-- 筛选和操作栏 -->
          <div class="filter-bar">
            <select v-model="templateTypeFilter" class="filter-select">
              <option value="">全部类型</option>
              <option v-for="t in messageTypes" :key="t.value" :value="t.value">
                {{ t.label }}
              </option>
            </select>
            <button class="primary-btn" @click="openCreateTemplate">新建模板</button>
          </div>

          <!-- 加载状态 -->
          <div v-if="templatesLoading" class="loading-container">
            <div class="loading-spinner"></div>
            <p>加载中...</p>
          </div>

          <!-- 空状态 -->
          <div v-else-if="templates.length === 0" class="empty-container">
            <p>暂无模板</p>
          </div>

          <!-- 模板列表 -->
          <div v-else class="templates-list">
            <div
              v-for="template in templates"
              :key="template.id"
              class="template-card"
            >
              <div class="template-header">
                <span class="template-code">{{ template.code }}</span>
                <span class="type-badge" :class="`type-${template.type}`">
                  {{ getTypeLabel(template.type) }}
                </span>
                <span v-if="template.status === 1" class="status-badge enabled">启用</span>
                <span v-else class="status-badge disabled">禁用</span>
              </div>
              <div class="template-title">{{ template.titleTemplate }}</div>
              <div class="template-content">{{ template.contentTemplate }}</div>
              <div class="template-footer">
                <span class="template-time">{{ formatTime(template.updatedAt) }}</span>
                <div class="template-actions">
                  <button class="action-btn" @click="openEditTemplate(template)">编辑</button>
                  <button class="action-btn danger" @click="handleDeleteTemplate(template)">删除</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 发送消息 -->
        <div v-if="activeTab === 'send'" class="tab-content">
          <div class="send-form">
            <div class="form-group">
              <label class="form-label">消息类型</label>
              <select v-model="sendForm.type" class="form-select">
                <option v-for="t in messageTypes" :key="t.value" :value="t.value">
                  {{ t.label }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">接收用户ID（多个用逗号分隔）</label>
              <input
                v-model="sendForm.userIds"
                type="text"
                class="form-input"
                placeholder="例如: 1, 2, 3"
              />
            </div>

            <div class="form-group">
              <label class="form-label">标题</label>
              <input
                v-model="sendForm.title"
                type="text"
                class="form-input"
                placeholder="请输入消息标题"
              />
            </div>

            <div class="form-group">
              <label class="form-label">内容</label>
              <textarea
                v-model="sendForm.content"
                class="form-textarea"
                placeholder="请输入消息内容"
                rows="5"
              ></textarea>
            </div>

            <div class="form-actions">
              <button
                class="primary-btn"
                :disabled="isSending"
                @click="handleSendMessage"
              >
                {{ isSending ? '发送中...' : '发送给指定用户' }}
              </button>
              <button
                class="secondary-btn"
                :disabled="isBroadcasting"
                @click="handleBroadcast"
              >
                {{ isBroadcasting ? '广播中...' : '广播给所有用户' }}
              </button>
            </div>
          </div>
        </div>

        <!-- 统计信息 -->
        <div v-if="activeTab === 'stats'" class="tab-content">
          <div v-if="statsLoading" class="loading-container">
            <div class="loading-spinner"></div>
            <p>加载中...</p>
          </div>

          <div v-else-if="stats" class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">{{ stats.totalMessages }}</div>
              <div class="stat-label">总消息数</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ stats.unreadMessages }}</div>
              <div class="stat-label">未读消息</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ stats.readMessages }}</div>
              <div class="stat-label">已读消息</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ stats.todaySent }}</div>
              <div class="stat-label">今日发送</div>
            </div>

            <div class="stat-card wide">
              <div class="stat-label">按类型分布</div>
              <div class="type-stats">
                <div class="type-stat">
                  <span class="type-badge type-ticket">抢票</span>
                  <span class="type-count">{{ stats.typeStats.ticket }}</span>
                </div>
                <div class="type-stat">
                  <span class="type-badge type-rating">社区</span>
                  <span class="type-count">{{ stats.typeStats.rating }}</span>
                </div>
                <div class="type-stat">
                  <span class="type-badge type-contribution">反馈</span>
                  <span class="type-count">{{ stats.typeStats.contribution }}</span>
                </div>
                <div class="type-stat">
                  <span class="type-badge type-system">系统</span>
                  <span class="type-count">{{ stats.typeStats.system }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <PageFooter />

    <!-- 消息详情抽屉 -->
    <Transition name="drawer-fade">
      <div v-if="showMessageDetail" class="drawer-overlay" @click="showMessageDetail = false">
        <Transition name="drawer-slide">
          <div v-if="showMessageDetail && selectedMessage" class="drawer-content" @click.stop>
            <div class="drawer-header">
              <span class="type-badge" :class="`type-${selectedMessage.type}`">
                {{ getTypeLabel(selectedMessage.type) }}
              </span>
              <button class="drawer-close" @click="showMessageDetail = false">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <h3 class="drawer-title">{{ selectedMessage.title }}</h3>
            <div class="drawer-meta">
              <span>用户: {{ selectedMessage.username }} (ID: {{ selectedMessage.userId }})</span>
              <span>{{ formatTime(selectedMessage.createdAt) }}</span>
            </div>
            <div class="drawer-body">{{ selectedMessage.content }}</div>
            <div class="drawer-footer">
              <span v-if="selectedMessage.isRead" class="status-read">已读</span>
              <span v-else class="status-unread">未读</span>
              <button
                class="action-btn danger"
                @click="handleDeleteMessage(selectedMessage.id)"
              >
                删除
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>

    <!-- 模板编辑抽屉 -->
    <Transition name="drawer-fade">
      <div v-if="showTemplateDrawer" class="drawer-overlay" @click="closeTemplateDrawer">
        <Transition name="drawer-slide">
          <div v-if="showTemplateDrawer" class="drawer-content" @click.stop>
            <div class="drawer-header">
              <h3 class="drawer-title-text">{{ isEditingTemplate ? '编辑模板' : '新建模板' }}</h3>
              <button class="drawer-close" @click="closeTemplateDrawer">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div class="form-group">
              <label class="form-label">模板代码 *</label>
              <input
                v-model="templateForm.code"
                type="text"
                class="form-input"
                placeholder="例如: TICKET_GRAB_SUCCESS"
                :disabled="isEditingTemplate"
              />
            </div>

            <div class="form-group">
              <label class="form-label">消息类型</label>
              <select v-model="templateForm.type" class="form-select">
                <option v-for="t in messageTypes" :key="t.value" :value="t.value">
                  {{ t.label }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">标题模板 *</label>
              <input
                v-model="templateForm.titleTemplate"
                type="text"
                class="form-input"
                placeholder="支持 {变量名}"
              />
            </div>

            <div class="form-group">
              <label class="form-label">内容模板 *</label>
              <textarea
                v-model="templateForm.contentTemplate"
                class="form-textarea"
                placeholder="支持 {变量名}"
                rows="4"
              ></textarea>
            </div>

            <div class="form-group">
              <label class="form-label">状态</label>
              <select v-model="templateForm.status" class="form-select">
                <option :value="1">启用</option>
                <option :value="0">禁用</option>
              </select>
            </div>

            <div class="form-actions">
              <button class="secondary-btn" @click="closeTemplateDrawer">取消</button>
              <button
                class="primary-btn"
                :disabled="isSubmittingTemplate"
                @click="submitTemplate"
              >
                {{ isSubmittingTemplate ? '保存中...' : '保存' }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>

    <!-- 删除确认弹窗 -->
    <Transition name="modal-fade">
      <div v-if="showDeleteConfirm" class="modal-overlay" @click="showDeleteConfirm = false">
        <Transition name="modal-scale">
          <div v-if="showDeleteConfirm" class="modal-content" @click.stop>
            <h3 class="modal-title">确认删除</h3>
            <p class="modal-message">确定要删除 {{ deleteTarget?.name }} 吗？此操作不可恢复。</p>
            <div class="modal-actions">
              <button class="modal-btn cancel" @click="showDeleteConfirm = false">取消</button>
              <button class="modal-btn confirm" :disabled="isDeleting" @click="confirmDelete">
                {{ isDeleting ? '删除中...' : '确定' }}
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
.message-manage-page {
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
  max-width: 1000px;
  margin: 0 auto;
}

.breadcrumb-wrapper {
  display: none;
  margin-bottom: var(--spacing-lg);
}

/* ===== Tabs ===== */
.tabs-section {
  margin-bottom: var(--spacing-md);
}

.tabs-scroll {
  display: flex;
  gap: 2px;
  padding: 3px;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow-x: auto;
}

.tab-btn {
  flex: 1;
  min-width: 70px;
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.tab-btn:hover {
  color: var(--color-text);
}

.tab-btn.active {
  color: var(--color-primary);
  background: var(--color-primary-bg);
}

/* ===== Tab Content ===== */
.tab-content {
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* ===== Filter Bar ===== */
.filter-bar {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.filter-select,
.filter-input {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--text-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-card);
  color: var(--color-text);
}

.filter-input {
  flex: 1;
}

.filter-input:focus,
.filter-select:focus {
  outline: none;
  border-color: var(--color-primary);
}

/* ===== Batch Bar ===== */
.batch-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-primary-bg);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-md);
}

.batch-count {
  font-size: var(--text-sm);
  color: var(--color-primary);
}

.batch-btn {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.batch-btn.danger {
  background: var(--color-error);
  color: white;
}

.batch-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ===== Loading & Empty ===== */
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
  to { transform: rotate(360deg); }
}

/* ===== Messages List ===== */
.messages-list {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.list-header {
  display: none;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--color-text-secondary);
}

.list-item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.list-item:last-child {
  border-bottom: none;
}

.list-item:hover {
  background: var(--color-bg);
}

.checkbox-label {
  flex-shrink: 0;
}

.col-user {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  min-width: 80px;
}

.col-type {
  flex-shrink: 0;
}

.col-title {
  flex: 1;
  font-size: var(--text-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.col-status {
  flex-shrink: 0;
}

.col-time {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.col-action {
  flex-shrink: 0;
}

/* ===== Type Badge ===== */
.type-badge {
  display: inline-block;
  padding: 2px 8px;
  font-size: 10px;
  font-weight: var(--font-semibold);
  border-radius: var(--radius-full);
}

.type-badge.type-ticket {
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
}

.type-badge.type-rating {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.type-badge.type-contribution {
  background: rgba(6, 182, 212, 0.1);
  color: #06b6d4;
}

.type-badge.type-system {
  background: rgba(107, 114, 128, 0.1);
  color: #6b7280;
}

/* ===== Status ===== */
.status-read {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
}

.status-unread {
  font-size: var(--text-xs);
  color: var(--color-primary);
  font-weight: var(--font-medium);
}

.status-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}

.status-badge.enabled {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.status-badge.disabled {
  background: var(--color-error-bg);
  color: var(--color-error);
}

/* ===== Action Button ===== */
.action-btn {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.action-btn:hover {
  border-color: var(--color-text-secondary);
}

.action-btn.danger {
  color: var(--color-error);
}

.action-btn.danger:hover {
  background: var(--color-error-bg);
  border-color: var(--color-error);
}

/* ===== Primary & Secondary Button ===== */
.primary-btn {
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

.primary-btn:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.primary-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.secondary-btn {
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

.secondary-btn:hover:not(:disabled) {
  border-color: var(--color-text-secondary);
}

.secondary-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ===== Pagination ===== */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  margin-top: var(--spacing-md);
}

.page-btn {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--text-sm);
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

/* ===== Templates List ===== */
.templates-list {
  display: grid;
  gap: var(--spacing-md);
}

.template-card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
}

.template-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
}

.template-code {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  font-family: monospace;
}

.template-title {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  margin-bottom: var(--spacing-xs);
}

.template-content {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  line-height: 1.5;
  margin-bottom: var(--spacing-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.template-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.template-time {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
}

.template-actions {
  display: flex;
  gap: var(--spacing-xs);
}

/* ===== Send Form ===== */
.send-form {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
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
.form-select,
.form-textarea {
  width: 100%;
  padding: var(--spacing-sm);
  font-size: var(--text-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  color: var(--color-text);
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
}

.form-textarea {
  resize: vertical;
  line-height: 1.5;
}

.form-actions {
  display: flex;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-lg);
}

/* ===== Stats Grid ===== */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
}

.stat-card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
  text-align: center;
}

.stat-card.wide {
  grid-column: span 2;
}

.stat-value {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-primary);
}

.stat-label {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  margin-top: var(--spacing-xs);
}

.type-stats {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--spacing-md);
  margin-top: var(--spacing-md);
}

.type-stat {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.type-count {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
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
  margin-bottom: var(--spacing-md);
}

.drawer-title-text {
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

.drawer-title {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-xs);
}

.drawer-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-md);
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-md);
}

.drawer-body {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: 1.7;
  white-space: pre-wrap;
  margin-bottom: var(--spacing-lg);
}

.drawer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
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

/* ===== Modal ===== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
  padding: var(--spacing-md);
}

.modal-content {
  background: var(--color-card);
  border-radius: var(--radius-xl);
  padding: var(--spacing-xl);
  max-width: 320px;
  width: 100%;
  text-align: center;
  box-shadow: var(--shadow-xl);
}

.modal-title {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-sm);
}

.modal-message {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-lg);
}

.modal-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.modal-btn {
  flex: 1;
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.modal-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.modal-btn.cancel {
  background: var(--color-border);
  border: none;
  color: var(--color-text);
}

.modal-btn.cancel:hover:not(:disabled) {
  background: var(--color-text-placeholder);
}

.modal-btn.confirm {
  background: var(--color-error);
  border: none;
  color: white;
}

.modal-btn.confirm:hover:not(:disabled) {
  background: #dc2626;
}

/* Modal Animation */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity var(--transition-normal);
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-scale-enter-active,
.modal-scale-leave-active {
  transition: all var(--transition-normal);
}

.modal-scale-enter-from,
.modal-scale-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

/* ===== Desktop ===== */
@media (min-width: 1024px) {
  .breadcrumb-wrapper {
    display: block;
  }

  .page-content {
    padding: var(--spacing-xl);
  }

  .tab-btn {
    font-size: var(--text-sm);
    padding: var(--spacing-sm) var(--spacing-md);
  }

  .list-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .list-item {
    flex-wrap: nowrap;
  }

  .stats-grid {
    grid-template-columns: repeat(4, 1fr);
  }

  .stat-card.wide {
    grid-column: span 4;
  }

  .drawer-overlay {
    align-items: center;
  }

  .drawer-content {
    border-radius: var(--radius-xl);
  }
}
</style>
