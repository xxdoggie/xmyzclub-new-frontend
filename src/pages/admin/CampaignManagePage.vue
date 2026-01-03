<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/composables/useToast'
import {
  getAdminCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  stageOperation,
} from '@/api/campaign'
import type {
  Campaign,
  CampaignStage,
  GlobalConfig,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  CreateCampaignStageRequest,
  StageType,
  CampaignStatus,
} from '@/types/campaign'
import { getCampuses } from '@/api/dorm'
import type { Campus } from '@/types/dorm'
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb.vue'

const router = useRouter()
const userStore = useUserStore()
const toast = useToast()

// ==================== 状态 ====================
const isLoading = ref(true)
const campaigns = ref<Campaign[]>([])
const campuses = ref<Campus[]>([])

// 创建/编辑 Modal
const showCampaignModal = ref(false)
const campaignModalMode = ref<'create' | 'edit'>('create')
const editingCampaign = ref<Campaign | null>(null)
const isSaving = ref(false)

// 表单阶段类型
interface FormStage {
  stageType: StageType
  stageName: string
  stageOrder: number
  startTime: string
  endTime: string
  description: string
}

// 表单状态
const campaignForm = ref<{
  title: string
  description: string
  campusId: number | null
  globalConfig: GlobalConfig
  stages: FormStage[]
}>({
  title: '',
  description: '',
  campusId: null,
  globalConfig: {
    allowMultipleSubmissions: true,
    maxSubmissionsPerPeriod: 3,
    votingMode: 'unified',
  },
  stages: [
    { stageType: 'submission', stageName: '投稿阶段', stageOrder: 1, startTime: '', endTime: '', description: '用户提交铃声歌曲' },
    { stageType: 'review', stageName: '审核阶段', stageOrder: 2, startTime: '', endTime: '', description: '管理员审核投稿' },
    { stageType: 'voting', stageName: '投票阶段', stageOrder: 3, startTime: '', endTime: '', description: '用户投票选择铃声' },
    { stageType: 'result', stageName: '结果公示', stageOrder: 4, startTime: '', endTime: '', description: '公示投票结果' },
  ],
})

// 删除确认
const showDeleteConfirm = ref(false)
const deleteCampaignTarget = ref<Campaign | null>(null)
const isDeleting = ref(false)

// 阶段操作
const isOperatingStage = ref(false)
const operatingCampaignId = ref<number | null>(null)

// ==================== 辅助函数 ====================

// 阶段类型标签（用于阶段配置表单）
const stageTypeLabels: Record<StageType, string> = {
  submission: '投稿',
  review: '审核',
  voting: '投票',
  result: '公示',
}

// 活动状态标签
const campaignStatusLabels: Record<CampaignStatus, string> = {
  active: '进行中',
  completed: '已完成',
  draft: '草稿',
  cancelled: '已取消',
}

// 活动状态样式
const campaignStatusClasses: Record<CampaignStatus, string> = {
  active: 'status-active',
  completed: 'status-completed',
  draft: 'status-draft',
  cancelled: 'status-cancelled',
}

// 阶段状态样式
const stageStatusClasses: Record<string, string> = {
  pending: 'stage-pending',
  active: 'stage-active',
  completed: 'stage-completed',
}

function getStageTypeLabel(stageType: StageType): string {
  return stageTypeLabels[stageType] || stageType
}

function getCampaignStatusLabel(status: CampaignStatus): string {
  return campaignStatusLabels[status] || status
}

function getCampaignStatusClass(status: CampaignStatus): string {
  return campaignStatusClasses[status] || ''
}

// 获取当前阶段显示信息
function getCurrentStageDisplay(campaign: Campaign): { label: string; class: string } {
  if (!campaign.currentStage) {
    return { label: '未开始', class: 'stage-pending' }
  }
  return {
    label: campaign.currentStage.stageName,
    class: stageStatusClasses[campaign.currentStage.status] || 'stage-pending',
  }
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function formatDateTime(dateStr: string) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 将 datetime-local 值转换为 ISO 格式
function toISOString(localDateTime: string): string {
  if (!localDateTime) return ''
  return new Date(localDateTime).toISOString()
}

// 将 ISO 格式转换为 datetime-local 值
function toLocalDateTime(isoString: string): string {
  if (!isoString) return ''
  const date = new Date(isoString)
  // 格式: YYYY-MM-DDTHH:mm
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

// ==================== 数据加载 ====================

async function loadCampuses() {
  try {
    const res = await getCampuses()
    if (res.data.code === 200) {
      campuses.value = res.data.data
    }
  } catch (error) {
    console.error('获取校区列表失败', error)
  }
}

async function loadCampaigns() {
  isLoading.value = true
  try {
    const res = await getAdminCampaigns()
    if (res.data.code === 200) {
      campaigns.value = res.data.data
    } else {
      toast.error(res.data.message || '获取活动列表失败')
    }
  } catch (error) {
    toast.error('获取活动列表失败')
  } finally {
    isLoading.value = false
  }
}

// ==================== CRUD 操作 ====================

function openCreateModal() {
  campaignModalMode.value = 'create'
  editingCampaign.value = null
  resetForm()
  showCampaignModal.value = true
}

function openEditModal(campaign: Campaign) {
  campaignModalMode.value = 'edit'
  editingCampaign.value = campaign

  // 填充表单
  campaignForm.value = {
    title: campaign.title,
    description: campaign.description,
    campusId: campaign.campus?.id || null,
    globalConfig: campaign.globalConfig ? { ...campaign.globalConfig } : {
      allowMultipleSubmissions: true,
      maxSubmissionsPerPeriod: 3,
      votingMode: 'unified',
    },
    stages: campaign.stages?.map(s => ({
      stageType: s.stageType,
      stageName: s.stageName,
      stageOrder: s.stageOrder,
      startTime: toLocalDateTime(s.startTime),
      endTime: s.endTime ? toLocalDateTime(s.endTime) : '',
      description: s.description || '',
    })) || getDefaultStages(),
  }

  showCampaignModal.value = true
}

function getDefaultStages(): FormStage[] {
  return [
    { stageType: 'submission', stageName: '投稿阶段', stageOrder: 1, startTime: '', endTime: '', description: '用户提交铃声歌曲' },
    { stageType: 'review', stageName: '审核阶段', stageOrder: 2, startTime: '', endTime: '', description: '管理员审核投稿' },
    { stageType: 'voting', stageName: '投票阶段', stageOrder: 3, startTime: '', endTime: '', description: '用户投票选择铃声' },
    { stageType: 'result', stageName: '结果公示', stageOrder: 4, startTime: '', endTime: '', description: '公示投票结果' },
  ]
}

function resetForm() {
  campaignForm.value = {
    title: '',
    description: '',
    campusId: null,
    globalConfig: {
      allowMultipleSubmissions: true,
      maxSubmissionsPerPeriod: 3,
      votingMode: 'unified',
    },
    stages: getDefaultStages(),
  }
}

function closeModal() {
  showCampaignModal.value = false
  editingCampaign.value = null
}

async function saveCampaign() {
  if (!campaignForm.value.title.trim()) {
    toast.error('请填写活动标题')
    return
  }
  if (!campaignForm.value.description.trim()) {
    toast.error('请填写活动描述')
    return
  }
  if (!campaignForm.value.campusId) {
    toast.error('请选择校区')
    return
  }

  // 验证阶段时间
  for (const stage of campaignForm.value.stages) {
    if (!stage.startTime || !stage.endTime) {
      toast.error(`请填写${stage.stageName}的时间`)
      return
    }
    if (new Date(stage.startTime) >= new Date(stage.endTime)) {
      toast.error(`${stage.stageName}的开始时间必须早于结束时间`)
      return
    }
  }

  isSaving.value = true
  try {
    // 转换时间格式
    const stages: CreateCampaignStageRequest[] = campaignForm.value.stages.map(s => ({
      stageType: s.stageType,
      stageName: s.stageName,
      stageOrder: s.stageOrder,
      startTime: toISOString(s.startTime),
      endTime: toISOString(s.endTime),
      description: s.description,
    }))

    if (campaignModalMode.value === 'create') {
      const data: CreateCampaignRequest = {
        title: campaignForm.value.title,
        description: campaignForm.value.description,
        campusId: campaignForm.value.campusId,
        globalConfig: campaignForm.value.globalConfig,
        stages,
      }
      const res = await createCampaign(data)
      if (res.data.code === 200) {
        toast.success('活动创建成功')
        closeModal()
        await loadCampaigns()
      } else {
        toast.error(res.data.message || '创建失败')
      }
    } else if (editingCampaign.value) {
      const data: UpdateCampaignRequest = {
        title: campaignForm.value.title,
        description: campaignForm.value.description,
        campusId: campaignForm.value.campusId,
        globalConfig: campaignForm.value.globalConfig,
        stages,
      }
      const res = await updateCampaign(editingCampaign.value.id, data)
      if (res.data.code === 200) {
        toast.success('活动更新成功')
        closeModal()
        await loadCampaigns()
      } else {
        toast.error(res.data.message || '更新失败')
      }
    }
  } catch (error) {
    toast.error(campaignModalMode.value === 'create' ? '创建失败' : '更新失败')
  } finally {
    isSaving.value = false
  }
}

async function toggleStatus(campaign: Campaign) {
  try {
    const newStatus: CampaignStatus = campaign.status === 'active' ? 'cancelled' : 'active'
    const res = await updateCampaign(campaign.id, { status: newStatus })
    if (res.data.code === 200) {
      toast.success(campaign.status === 'active' ? '已取消' : '已激活')
      await loadCampaigns()
    } else {
      toast.error(res.data.message || '操作失败')
    }
  } catch (error) {
    toast.error('操作失败')
  }
}

function openDeleteConfirmModal(campaign: Campaign) {
  deleteCampaignTarget.value = campaign
  showDeleteConfirm.value = true
}

async function confirmDelete() {
  if (!deleteCampaignTarget.value) return

  isDeleting.value = true
  try {
    const res = await deleteCampaign(deleteCampaignTarget.value.id)
    if (res.data.code === 200) {
      toast.success('活动已删除')
      showDeleteConfirm.value = false
      deleteCampaignTarget.value = null
      await loadCampaigns()
    } else {
      toast.error(res.data.message || '删除失败')
    }
  } catch (error) {
    toast.error('删除失败')
  } finally {
    isDeleting.value = false
  }
}

function cancelDelete() {
  showDeleteConfirm.value = false
  deleteCampaignTarget.value = null
}

// ==================== 阶段操作 ====================

async function handleStageOperation(campaign: Campaign, operation: 'start' | 'end' | 'next') {
  isOperatingStage.value = true
  operatingCampaignId.value = campaign.id

  try {
    const res = await stageOperation(campaign.id, { operation })
    if (res.data.code === 200) {
      const messages: Record<string, string> = {
        start: '活动已开始',
        end: '活动已结束',
        next: '已进入下一阶段',
      }
      toast.success(messages[operation] || '操作成功')
      await loadCampaigns()
    } else {
      toast.error(res.data.message || '操作失败')
    }
  } catch (error) {
    toast.error('操作失败')
  } finally {
    isOperatingStage.value = false
    operatingCampaignId.value = null
  }
}

// 根据当前阶段显示可用操作
function getAvailableOperations(campaign: Campaign): Array<{ label: string; operation: 'start' | 'end' | 'next'; type: string }> {
  const ops: Array<{ label: string; operation: 'start' | 'end' | 'next'; type: string }> = []

  // 如果活动已完成或取消，不显示操作
  if (campaign.status === 'completed' || campaign.status === 'cancelled') {
    return ops
  }

  const stageType = campaign.currentStage?.stageType
  const stageStatus = campaign.currentStage?.status

  if (!campaign.currentStage || stageStatus === 'pending') {
    // 没有当前阶段或阶段未开始
    ops.push({ label: '开始活动', operation: 'start', type: 'primary' })
  } else if (stageStatus === 'active') {
    // 阶段进行中
    switch (stageType) {
      case 'submission':
      case 'review':
      case 'voting':
        ops.push({ label: '下一阶段', operation: 'next', type: 'info' })
        ops.push({ label: '结束活动', operation: 'end', type: 'danger' })
        break
      case 'result':
        ops.push({ label: '结束活动', operation: 'end', type: 'danger' })
        break
    }
  }

  return ops
}

// ==================== 页面跳转 ====================

function goToReview(campaign: Campaign) {
  router.push(`/admin/campaigns/${campaign.id}/review`)
}

function goToResults(campaign: Campaign) {
  router.push(`/admin/campaigns/${campaign.id}/results`)
}

// ==================== 生命周期 ====================

onMounted(async () => {
  if (!userStore.isLoggedIn || !userStore.canManageCampaigns) {
    toast.error('无权访问此页面')
    router.push('/')
    return
  }
  await Promise.all([loadCampaigns(), loadCampuses()])
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
              <h1 class="page-title">活动管理</h1>
              <p class="page-subtitle">管理铃声征集投票活动</p>
            </div>
            <button class="action-button primary" @click="openCreateModal">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              创建活动
            </button>
          </div>
        </div>

        <!-- 加载状态 -->
        <div v-if="isLoading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>

        <template v-else>
          <!-- 空状态 -->
          <div v-if="campaigns.length === 0" class="empty-container">
            <div class="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M9 18V5l12-2v13"></path>
                <circle cx="6" cy="18" r="3"></circle>
                <circle cx="18" cy="16" r="3"></circle>
              </svg>
            </div>
            <h2>暂无活动</h2>
            <p>还没有创建任何活动</p>
            <button class="empty-action-btn" @click="openCreateModal">创建第一个活动</button>
          </div>

          <!-- 活动列表 -->
          <div v-else class="campaigns-list">
            <div v-for="campaign in campaigns" :key="campaign.id" class="campaign-card">
              <div class="campaign-info">
                <div class="campaign-header">
                  <h3 class="campaign-name">{{ campaign.title }}</h3>
                  <div class="badges">
                    <span class="stage-badge" :class="getCurrentStageDisplay(campaign).class">
                      {{ getCurrentStageDisplay(campaign).label }}
                    </span>
                    <span class="status-badge" :class="getCampaignStatusClass(campaign.status)">
                      {{ getCampaignStatusLabel(campaign.status) }}
                    </span>
                  </div>
                </div>
                <p class="campaign-desc">{{ campaign.description }}</p>
                <div class="campaign-meta">
                  <span class="meta-item">
                    校区: {{ campaign.campus?.name || '未设置' }}
                  </span>
                  <span class="meta-divider">|</span>
                  <span class="meta-item">
                    投稿限制: {{ campaign.globalConfig?.maxSubmissionsPerPeriod || '-' }} 首/时段
                  </span>
                  <span class="meta-divider">|</span>
                  <span class="meta-item">
                    {{ formatDate(campaign.createdAt) }}
                  </span>
                </div>
              </div>

              <div class="campaign-actions">
                <!-- 阶段操作 -->
                <div class="stage-operations">
                  <template v-for="op in getAvailableOperations(campaign)" :key="op.operation">
                    <button
                      class="action-btn"
                      :class="op.type"
                      :disabled="isOperatingStage && operatingCampaignId === campaign.id"
                      @click="handleStageOperation(campaign, op.operation)"
                    >
                      {{ isOperatingStage && operatingCampaignId === campaign.id ? '...' : op.label }}
                    </button>
                  </template>
                </div>

                <!-- 管理操作 -->
                <div class="manage-actions">
                  <button
                    v-if="campaign.currentStage && ['review', 'voting', 'result'].includes(campaign.currentStage.stageType)"
                    class="action-btn review"
                    @click="goToReview(campaign)"
                  >
                    审核
                  </button>
                  <button
                    v-if="campaign.currentStage && ['voting', 'result'].includes(campaign.currentStage.stageType)"
                    class="action-btn results"
                    @click="goToResults(campaign)"
                  >
                    结果
                  </button>
                  <button
                    class="action-btn toggle"
                    :class="{ 'is-enabled': campaign.status === 'active' }"
                    @click="toggleStatus(campaign)"
                  >
                    {{ campaign.status === 'active' ? '取消' : '激活' }}
                  </button>
                  <button class="action-btn edit" @click="openEditModal(campaign)">编辑</button>
                  <button class="action-btn delete" @click="openDeleteConfirmModal(campaign)">删除</button>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </main>

    <PageFooter />

    <!-- ==================== 创建/编辑 Modal ==================== -->
    <Transition name="modal-fade">
      <div v-if="showCampaignModal" class="modal-overlay" @click.self="closeModal">
        <Transition name="modal-scale" appear>
          <div v-if="showCampaignModal" class="modal-content modal-lg" @click.stop>
            <h3 class="modal-title">{{ campaignModalMode === 'create' ? '创建活动' : '编辑活动' }}</h3>

            <!-- 基本信息 -->
            <div class="form-section">
              <h4 class="form-section-title">基本信息</h4>
              <div class="form-group">
                <label class="form-label">活动标题 *</label>
                <input
                  v-model="campaignForm.title"
                  type="text"
                  class="form-input"
                  placeholder="例如：2024秋季宿舍铃声征集"
                  maxlength="100"
                />
              </div>
              <div class="form-group">
                <label class="form-label">活动描述 *</label>
                <textarea
                  v-model="campaignForm.description"
                  class="form-textarea"
                  placeholder="描述活动内容和规则"
                  maxlength="500"
                  rows="3"
                ></textarea>
              </div>
              <div class="form-group">
                <label class="form-label">所属校区 *</label>
                <select
                  v-model="campaignForm.campusId"
                  class="form-select"
                >
                  <option :value="null" disabled>请选择校区</option>
                  <option v-for="campus in campuses" :key="campus.id" :value="campus.id">
                    {{ campus.name }}
                  </option>
                </select>
              </div>
            </div>

            <!-- 全局配置 -->
            <div class="form-section">
              <h4 class="form-section-title">全局配置</h4>
              <div class="form-row">
                <div class="form-group half">
                  <label class="form-label">每时段最多投稿数</label>
                  <input
                    v-model.number="campaignForm.globalConfig.maxSubmissionsPerPeriod"
                    type="number"
                    class="form-input"
                    min="1"
                    max="20"
                  />
                </div>
                <div class="form-group half">
                  <label class="form-label">投票模式</label>
                  <select
                    v-model="campaignForm.globalConfig.votingMode"
                    class="form-select"
                  >
                    <option value="unified">统一投票</option>
                    <option value="per_period">按时段投票</option>
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label checkbox-label">
                  <input
                    v-model="campaignForm.globalConfig.allowMultipleSubmissions"
                    type="checkbox"
                    class="form-checkbox"
                  />
                  允许多次投稿
                </label>
              </div>
            </div>

            <!-- 阶段配置 -->
            <div class="form-section">
              <h4 class="form-section-title">阶段配置</h4>
              <div
                v-for="(stage, index) in campaignForm.stages"
                :key="stage.stageType"
                class="stage-config"
              >
                <div class="stage-label">
                  <span class="stage-number">{{ index + 1 }}</span>
                  <span class="stage-type">{{ stage.stageName }}</span>
                </div>
                <div class="stage-times">
                  <div class="form-group">
                    <label class="form-label-sm">开始时间</label>
                    <input
                      v-model="stage.startTime"
                      type="datetime-local"
                      class="form-input"
                    />
                  </div>
                  <div class="form-group">
                    <label class="form-label-sm">结束时间</label>
                    <input
                      v-model="stage.endTime"
                      type="datetime-local"
                      class="form-input"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div class="modal-actions">
              <button class="modal-btn cancel" @click="closeModal" :disabled="isSaving">取消</button>
              <button class="modal-btn confirm" @click="saveCampaign" :disabled="isSaving">
                {{ isSaving ? '保存中...' : '保存' }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>

    <!-- ==================== 删除确认 Modal ==================== -->
    <Transition name="modal-fade">
      <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="cancelDelete">
        <Transition name="modal-scale" appear>
          <div v-if="showDeleteConfirm" class="modal-content" @click.stop>
            <h3 class="modal-title">确认删除</h3>
            <p class="modal-desc">
              确定要删除活动"{{ deleteCampaignTarget?.title }}"吗？此操作不可撤销。
            </p>
            <div class="modal-actions">
              <button class="modal-btn cancel" @click="cancelDelete" :disabled="isDeleting">取消</button>
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

/* ===== Campaigns List ===== */
.campaigns-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.campaign-card {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast);
}

.campaign-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.campaign-info {
  flex: 1;
  min-width: 0;
}

.campaign-header {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-xs);
  flex-wrap: wrap;
}

.campaign-name {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
}

.badges {
  display: flex;
  gap: var(--spacing-xs);
}

.stage-badge {
  font-size: 10px;
  font-weight: var(--font-semibold);
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

/* 阶段状态样式 */
.stage-badge.stage-pending {
  background: var(--color-border);
  color: var(--color-text-tertiary);
}

.stage-badge.stage-active {
  background: #dcfce7;
  color: #16a34a;
}

.stage-badge.stage-completed {
  background: #f3e8ff;
  color: #9333ea;
}

.status-badge {
  font-size: 10px;
  font-weight: var(--font-semibold);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}

/* 活动状态样式 */
.status-badge.status-active {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.status-badge.status-completed {
  background: #f3e8ff;
  color: #9333ea;
}

.status-badge.status-draft {
  background: var(--color-border);
  color: var(--color-text-tertiary);
}

.status-badge.status-cancelled {
  background: var(--color-error-bg);
  color: var(--color-error);
}

.campaign-desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.campaign-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
  flex-wrap: wrap;
}

.meta-divider {
  color: var(--color-border);
}

.campaign-actions {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.stage-operations,
.manage-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.action-btn {
  padding: 6px 12px;
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.action-btn.primary {
  background: var(--color-primary);
  color: white;
}

.action-btn.primary:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.action-btn.info {
  background: var(--color-info-bg);
  color: var(--color-info);
}

.action-btn.info:hover:not(:disabled) {
  background: var(--color-info);
  color: white;
}

.action-btn.danger {
  background: var(--color-error-bg);
  color: var(--color-error);
}

.action-btn.danger:hover:not(:disabled) {
  background: var(--color-error);
  color: white;
}

.action-btn.review {
  background: #fef3c7;
  color: #d97706;
}

.action-btn.review:hover {
  background: #d97706;
  color: white;
}

.action-btn.results {
  background: #f3e8ff;
  color: #9333ea;
}

.action-btn.results:hover {
  background: #9333ea;
  color: white;
}

.action-btn.toggle {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.action-btn.toggle:hover {
  background: var(--color-warning);
  color: white;
}

.action-btn.toggle.is-enabled {
  background: var(--color-border);
  color: var(--color-text-secondary);
}

.action-btn.toggle.is-enabled:hover {
  background: var(--color-text-secondary);
  color: white;
}

.action-btn.edit {
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

.action-btn.edit:hover {
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

.modal-content.modal-lg {
  max-width: 600px;
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

/* ===== Form ===== */
.form-section {
  margin-bottom: var(--spacing-lg);
  padding-bottom: var(--spacing-lg);
  border-bottom: 1px solid var(--color-border);
}

.form-section:last-of-type {
  border-bottom: none;
  padding-bottom: 0;
}

.form-section-title {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text);
  margin-bottom: var(--spacing-md);
}

.form-group {
  margin-bottom: var(--spacing-md);
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-row {
  display: flex;
  gap: var(--spacing-md);
}

.form-group.half {
  flex: 1;
}

.form-label {
  display: block;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  margin-bottom: var(--spacing-xs);
  color: var(--color-text);
}

.form-label-sm {
  display: block;
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  margin-bottom: 4px;
  color: var(--color-text-secondary);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  cursor: pointer;
  margin-bottom: 0;
}

.form-checkbox {
  width: 18px;
  height: 18px;
  accent-color: var(--color-primary);
  cursor: pointer;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
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
  box-shadow: 0 0 0 3px var(--color-primary-bg);
}

.form-input::placeholder,
.form-textarea::placeholder {
  color: var(--color-text-placeholder);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

/* ===== Stage Config ===== */
.stage-config {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-sm);
}

.stage-config:last-child {
  margin-bottom: 0;
}

.stage-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.stage-number {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary);
  color: white;
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  border-radius: 50%;
}

.stage-type {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.stage-times {
  display: flex;
  gap: var(--spacing-sm);
}

.stage-times .form-group {
  flex: 1;
  margin-bottom: 0;
}

/* ===== Desktop ===== */
@media (min-width: 768px) {
  .campaign-card {
    flex-direction: row;
    align-items: flex-start;
  }

  .campaign-actions {
    flex-direction: column;
    align-items: flex-end;
    flex-shrink: 0;
  }

  .stage-config {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .stage-times {
    flex: 1;
    max-width: 400px;
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
    align-items: center;
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

  .campaign-name {
    font-size: var(--text-lg);
  }

  .action-btn {
    padding: 8px 16px;
    font-size: var(--text-sm);
  }
}

/* ===== Modal Animations ===== */
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
</style>
