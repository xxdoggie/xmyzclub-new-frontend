<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/composables/useToast'
import {
  getCampaigns,
  getCampaignDetail,
  createCampaign,
  updateCampaign,
  activateCampaign,
  closeCampaign,
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
  StageRules,
  SubmissionStageConfig,
  VotingStageConfig,
} from '@/types/campaign'
import { getCampuses, getTimePeriods, getCampusBuildings } from '@/api/dorm'
import type { Campus, TimePeriod, Building } from '@/types/dorm'
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
const allTimePeriods = ref<TimePeriod[]>([])
const availableBuildings = ref<Building[]>([])
const isLoadingBuildings = ref(false)

// 创建/编辑 Modal
const showCampaignModal = ref(false)
const campaignModalMode = ref<'create' | 'edit'>('create')
const editingCampaign = ref<Campaign | null>(null)
const isSaving = ref(false)
const isLoadingCampaign = ref(false)

// 表单规则类型
interface FormRules {
  has_limit: boolean
  limit_scope: 'period' | 'activity'
  min_count: number | null
  max_count: number | null
}

// 表单阶段类型
interface FormStage {
  stageType: StageType
  stageName: string
  startTime: string
  endTime: string
  description: string
  // 投稿阶段配置
  submissionRules?: FormRules
  require_user_info?: boolean
  user_info_fields?: string[]
  // 投票阶段配置
  votingRules?: FormRules
  voting_mode?: 'unified' | 'per_building'
}

// 可用的用户信息字段选项
const userInfoFieldOptions = [
  { value: 'dormitory', label: '宿舍楼' },
  { value: 'bed', label: '床位号' },
  { value: 'student_id', label: '学号' },
]

// 创建默认规则
function getDefaultRules(): FormRules {
  return {
    has_limit: true,
    limit_scope: 'period',
    min_count: 1,
    max_count: 3,
  }
}

// 表单状态
const campaignForm = ref<{
  title: string
  description: string
  campusId: number | null
  timePeriodIds: number[]
  buildingIds: number[]
  globalConfig: GlobalConfig
  stages: FormStage[]
}>({
  title: '',
  description: '',
  campusId: null,
  timePeriodIds: [],
  buildingIds: [],
  globalConfig: {
    auto_stage_transition: true,
  },
  stages: [
    {
      stageType: 'submission',
      stageName: '投稿阶段',
      startTime: '',
      endTime: '',
      description: '用户提交铃声歌曲',
      submissionRules: getDefaultRules(),
      require_user_info: false,
      user_info_fields: [],
    },
    { stageType: 'review', stageName: '审核阶段', startTime: '', endTime: '', description: '管理员审核投稿' },
    {
      stageType: 'voting',
      stageName: '投票阶段',
      startTime: '',
      endTime: '',
      description: '用户投票选择铃声',
      votingRules: { has_limit: true, limit_scope: 'period', min_count: 1, max_count: 1 },
      voting_mode: 'unified',
    },
    { stageType: 'result', stageName: '结果公示', startTime: '', endTime: '', description: '公示投票结果' },
  ],
})

// 监听校区变化，加载对应的宿舍楼
watch(() => campaignForm.value.campusId, async (newCampusId) => {
  if (newCampusId) {
    isLoadingBuildings.value = true
    try {
      const res = await getCampusBuildings(newCampusId)
      if (res.data.code === 200) {
        availableBuildings.value = res.data.data
        // 如果是创建模式，清空已选宿舍楼
        if (campaignModalMode.value === 'create') {
          campaignForm.value.buildingIds = []
        }
      }
    } catch (error) {
      console.error('获取宿舍楼列表失败', error)
    } finally {
      isLoadingBuildings.value = false
    }
  } else {
    availableBuildings.value = []
    campaignForm.value.buildingIds = []
  }
})

// 操作确认弹窗
const showOperationConfirm = ref(false)
const operationTarget = ref<{
  campaign: Campaign
  type: 'activate' | 'close' | 'next' | 'previous'
  title: string
  message: string
} | null>(null)
const isOperating = ref(false)

// ==================== 辅助函数 ====================

// 活动状态标签
const campaignStatusLabels: Record<CampaignStatus, string> = {
  pending: '待开始',
  active: '进行中',
  completed: '已完成',
  draft: '草稿',
  cancelled: '已取消',
  closed: '已关闭',
  archived: '已归档',
}

// 活动状态样式
const campaignStatusClasses: Record<CampaignStatus, string> = {
  pending: 'status-pending',
  active: 'status-active',
  completed: 'status-completed',
  draft: 'status-draft',
  cancelled: 'status-cancelled',
  closed: 'status-closed',
  archived: 'status-archived',
}

// 阶段状态样式
const stageStatusClasses: Record<string, string> = {
  pending: 'stage-pending',
  active: 'stage-active',
  completed: 'stage-completed',
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

// 将 datetime-local 值转换为 ISO 格式（保持本地时间，添加时区偏移）
function toISOString(localDateTime: string): string {
  if (!localDateTime) return ''
  const date = new Date(localDateTime)
  // 获取本地时区偏移（分钟）
  const offset = date.getTimezoneOffset()
  const offsetHours = Math.abs(Math.floor(offset / 60))
  const offsetMinutes = Math.abs(offset % 60)
  const offsetSign = offset <= 0 ? '+' : '-'
  const offsetStr = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`

  // 格式化为 ISO 8601 带时区: YYYY-MM-DDTHH:mm:ss+HH:mm
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetStr}`
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

async function loadTimePeriods() {
  try {
    const res = await getTimePeriods()
    if (res.data.code === 200) {
      allTimePeriods.value = res.data.data
    }
  } catch (error) {
    console.error('获取时段列表失败', error)
  }
}

async function loadCampaigns() {
  isLoading.value = true
  try {
    const res = await getCampaigns()
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

// 从服务器返回的阶段配置中解析规则
function parseStageConfig(stage: CampaignStage): Partial<FormStage> {
  const config = stage.config as Record<string, unknown> | null

  if (stage.stageType === 'submission') {
    const rules = config?.rules as StageRules | undefined
    return {
      submissionRules: rules ? {
        has_limit: rules.has_limit,
        limit_scope: rules.limit_scope || 'period',
        min_count: rules.min_count ?? null,
        max_count: rules.max_count ?? null,
      } : getDefaultRules(),
      require_user_info: (config?.require_user_info as boolean) || false,
      user_info_fields: (config?.user_info_fields as string[]) || [],
    }
  }

  if (stage.stageType === 'voting') {
    const rules = config?.rules as StageRules | undefined
    return {
      votingRules: rules ? {
        has_limit: rules.has_limit,
        limit_scope: rules.limit_scope || 'period',
        min_count: rules.min_count ?? null,
        max_count: rules.max_count ?? null,
      } : { has_limit: true, limit_scope: 'period', min_count: 1, max_count: 1 },
      voting_mode: (config?.voting_mode as 'unified' | 'per_building') || 'unified',
    }
  }

  return {}
}

async function openEditModal(campaign: Campaign) {
  campaignModalMode.value = 'edit'
  editingCampaign.value = campaign
  isLoadingCampaign.value = true
  showCampaignModal.value = true

  try {
    // 获取完整的活动详情
    const detailRes = await getCampaignDetail(campaign.id)
    if (detailRes.data.code !== 200) {
      toast.error(detailRes.data.message || '获取活动详情失败')
      showCampaignModal.value = false
      return
    }

    const fullCampaign = detailRes.data.data

    // 如果有校区，加载该校区的宿舍楼列表
    if (fullCampaign.campus?.id) {
      try {
        const buildingsRes = await getCampusBuildings(fullCampaign.campus.id)
        if (buildingsRes.data.code === 200) {
          availableBuildings.value = buildingsRes.data.data
        }
      } catch (error) {
        console.error('获取宿舍楼列表失败', error)
      }
    }

    // 填充表单
    campaignForm.value = {
      title: fullCampaign.title,
      description: fullCampaign.description,
      campusId: fullCampaign.campus?.id || null,
      timePeriodIds: fullCampaign.timePeriods?.map(tp => tp.id) || [],
      buildingIds: fullCampaign.buildings?.map(b => b.id) || [],
      globalConfig: {
        auto_stage_transition: fullCampaign.globalConfig?.auto_stage_transition ?? true,
      },
      stages: fullCampaign.stages?.map(s => ({
        stageType: s.stageType,
        stageName: s.stageName,
        startTime: toLocalDateTime(s.startTime),
        endTime: s.endTime ? toLocalDateTime(s.endTime) : '',
        description: s.description || '',
        ...parseStageConfig(s),
      })) || getDefaultStages(),
    }
  } catch (error) {
    toast.error('获取活动详情失败')
    showCampaignModal.value = false
  } finally {
    isLoadingCampaign.value = false
  }
}

function getDefaultStages(): FormStage[] {
  return [
    {
      stageType: 'submission',
      stageName: '投稿阶段',
      startTime: '',
      endTime: '',
      description: '用户提交铃声歌曲',
      submissionRules: getDefaultRules(),
      require_user_info: false,
      user_info_fields: [],
    },
    { stageType: 'review', stageName: '审核阶段', startTime: '', endTime: '', description: '管理员审核投稿' },
    {
      stageType: 'voting',
      stageName: '投票阶段',
      startTime: '',
      endTime: '',
      description: '用户投票选择铃声',
      votingRules: { has_limit: true, limit_scope: 'period', min_count: 1, max_count: 1 },
      voting_mode: 'unified',
    },
    { stageType: 'result', stageName: '结果公示', startTime: '', endTime: '', description: '公示投票结果' },
  ]
}

function resetForm() {
  campaignForm.value = {
    title: '',
    description: '',
    campusId: null,
    timePeriodIds: [],
    buildingIds: [],
    globalConfig: {
      auto_stage_transition: false,
    },
    stages: getDefaultStages(),
  }
  availableBuildings.value = []
}

function closeModal() {
  showCampaignModal.value = false
  editingCampaign.value = null
}

// 构建阶段配置
function buildStageConfig(stage: FormStage): SubmissionStageConfig | VotingStageConfig | Record<string, unknown> {
  if (stage.stageType === 'submission') {
    const config: SubmissionStageConfig = {}

    // 规则配置
    if (stage.submissionRules) {
      const rules: StageRules = {
        has_limit: stage.submissionRules.has_limit,
      }
      if (stage.submissionRules.has_limit) {
        rules.limit_scope = stage.submissionRules.limit_scope
        if (stage.submissionRules.min_count !== null) {
          rules.min_count = stage.submissionRules.min_count
        }
        if (stage.submissionRules.max_count !== null) {
          rules.max_count = stage.submissionRules.max_count
        }
      }
      config.rules = rules
    }

    // 用户信息字段
    if (stage.require_user_info) {
      config.require_user_info = true
      config.user_info_fields = stage.user_info_fields || []
    }

    return config
  }

  if (stage.stageType === 'voting') {
    const config: VotingStageConfig = {}

    // 规则配置
    if (stage.votingRules) {
      const rules: StageRules = {
        has_limit: stage.votingRules.has_limit,
      }
      if (stage.votingRules.has_limit) {
        rules.limit_scope = stage.votingRules.limit_scope
        if (stage.votingRules.min_count !== null) {
          rules.min_count = stage.votingRules.min_count
        }
        if (stage.votingRules.max_count !== null) {
          rules.max_count = stage.votingRules.max_count
        }
      }
      config.rules = rules
    }

    // 投票模式
    if (stage.voting_mode) {
      config.voting_mode = stage.voting_mode
    }

    return config
  }

  return {}
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
  if (campaignForm.value.timePeriodIds.length === 0) {
    toast.error('请选择至少一个铃声时段')
    return
  }
  if (campaignForm.value.buildingIds.length === 0) {
    toast.error('请选择至少一栋宿舍楼')
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
    // 转换时间格式和构建阶段配置
    const stages: CreateCampaignStageRequest[] = campaignForm.value.stages.map(s => ({
      stageType: s.stageType,
      stageName: s.stageName,
      startTime: toISOString(s.startTime),
      endTime: toISOString(s.endTime),
      description: s.description,
      config: buildStageConfig(s),
    }))

    if (campaignModalMode.value === 'create') {
      const data: CreateCampaignRequest = {
        title: campaignForm.value.title,
        description: campaignForm.value.description,
        campusId: campaignForm.value.campusId,
        timePeriodIds: campaignForm.value.timePeriodIds,
        buildingIds: campaignForm.value.buildingIds,
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
        timePeriodIds: campaignForm.value.timePeriodIds,
        buildingIds: campaignForm.value.buildingIds,
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

// 打开操作确认弹窗
function openOperationConfirm(
  campaign: Campaign,
  type: 'activate' | 'close' | 'next' | 'previous'
) {
  const messages: Record<'activate' | 'close' | 'next' | 'previous', { title: string; message: string }> = {
    activate: {
      title: '开始活动',
      message: `确定要开始活动"${campaign.title}"吗？活动将进入投稿阶段。`,
    },
    close: {
      title: '关闭活动',
      message: `确定要关闭活动"${campaign.title}"吗？关闭后活动将无法继续。`,
    },
    next: {
      title: '进入下一阶段',
      message: `确定要将活动"${campaign.title}"推进到下一阶段吗？`,
    },
    previous: {
      title: '返回上一阶段',
      message: `确定要将活动"${campaign.title}"返回到上一阶段吗？`,
    },
  }
  const msg = messages[type]
  operationTarget.value = {
    campaign,
    type,
    title: msg.title,
    message: msg.message,
  }
  showOperationConfirm.value = true
}

// 确认执行操作
async function confirmOperation() {
  if (!operationTarget.value) return

  isOperating.value = true
  const { campaign, type } = operationTarget.value

  try {
    let res
    if (type === 'activate') {
      res = await activateCampaign(campaign.id)
    } else if (type === 'close') {
      res = await closeCampaign(campaign.id)
    } else {
      res = await stageOperation(campaign.id, { operation: type })
    }

    if (res.data.code === 200) {
      const successMessages: Record<'activate' | 'close' | 'next' | 'previous', string> = {
        activate: '活动已开始',
        close: '活动已关闭',
        next: '已进入下一阶段',
        previous: '已返回上一阶段',
      }
      toast.success(successMessages[type])
      showOperationConfirm.value = false
      operationTarget.value = null
      await loadCampaigns()
    } else {
      toast.error(res.data.message || '操作失败')
    }
  } catch (error) {
    toast.error('操作失败')
  } finally {
    isOperating.value = false
  }
}

// 取消操作
function cancelOperation() {
  showOperationConfirm.value = false
  operationTarget.value = null
}

// ==================== 阶段操作 ====================

// 根据活动状态显示可用操作
function getAvailableOperations(campaign: Campaign): Array<{
  label: string
  operationType: 'activate' | 'close' | 'next' | 'previous'
  btnType: string
}> {
  const ops: Array<{
    label: string
    operationType: 'activate' | 'close' | 'next' | 'previous'
    btnType: string
  }> = []

  // 如果活动已关闭/归档，不显示操作
  if (campaign.status === 'closed' || campaign.status === 'completed' || campaign.status === 'cancelled' || campaign.status === 'archived') {
    return ops
  }

  // 活动还未开始（待开始状态）
  if (campaign.status === 'pending' || campaign.status === 'draft') {
    ops.push({ label: '开始活动', operationType: 'activate', btnType: 'primary' })
    return ops
  }

  // 活动进行中
  if (campaign.status === 'active' && campaign.currentStage) {
    const stageType = campaign.currentStage.stageType

    // 非第一个阶段可以返回上一阶段
    if (stageType !== 'submission') {
      ops.push({ label: '上一阶段', operationType: 'previous', btnType: 'secondary' })
    }

    // 非最后一个阶段可以进入下一阶段
    if (stageType !== 'result') {
      ops.push({ label: '下一阶段', operationType: 'next', btnType: 'info' })
    }

    // 始终可以关闭活动
    ops.push({ label: '关闭活动', operationType: 'close', btnType: 'danger' })
  }

  return ops
}

// 判断是否可以编辑活动（只有未开始的活动可以编辑）
function canEditCampaign(campaign: Campaign): boolean {
  return campaign.status === 'pending' || campaign.status === 'draft'
}

// 判断是否显示投稿/审核按钮（投稿阶段和审核阶段）
function canShowSubmissionsButton(campaign: Campaign): boolean {
  const stageType = campaign.currentStage?.stageType
  return stageType === 'submission' || stageType === 'review'
}

// 获取投稿/审核按钮的文案
function getSubmissionsButtonLabel(campaign: Campaign): string {
  return campaign.currentStage?.stageType === 'submission' ? '投稿' : '审核'
}

// 判断是否显示结果按钮（投票阶段和结果阶段）
function canShowResultsButton(campaign: Campaign): boolean {
  const stageType = campaign.currentStage?.stageType
  return stageType === 'voting' || stageType === 'result'
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
  await Promise.all([loadCampaigns(), loadCampuses(), loadTimePeriods()])
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
            <button class="action-button primary desktop-only" @click="openCreateModal">
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
                    <span
                      v-if="campaign.currentStage"
                      class="stage-badge"
                      :class="getCurrentStageDisplay(campaign).class"
                    >
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
                    {{ formatDate(campaign.createdAt) }}
                  </span>
                </div>
              </div>

              <div class="campaign-actions">
                <!-- 阶段操作 -->
                <div class="stage-operations">
                  <template v-for="op in getAvailableOperations(campaign)" :key="op.operationType">
                    <button
                      class="action-btn"
                      :class="op.btnType"
                      :disabled="isOperating"
                      @click="openOperationConfirm(campaign, op.operationType)"
                    >
                      {{ op.label }}
                    </button>
                  </template>
                </div>

                <!-- 管理操作 -->
                <div class="manage-actions">
                  <button
                    v-if="canShowSubmissionsButton(campaign)"
                    class="action-btn review"
                    :disabled="isOperating"
                    @click="goToReview(campaign)"
                  >
                    {{ getSubmissionsButtonLabel(campaign) }}
                  </button>
                  <button
                    v-if="canShowResultsButton(campaign)"
                    class="action-btn results"
                    :disabled="isOperating"
                    @click="goToResults(campaign)"
                  >
                    结果
                  </button>
                  <button
                    v-if="canEditCampaign(campaign)"
                    class="action-btn edit"
                    :disabled="isOperating"
                    @click="openEditModal(campaign)"
                  >
                    编辑
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </main>

    <PageFooter />

    <!-- 移动端悬浮创建按钮 -->
    <button class="floating-create-btn mobile-only" @click="openCreateModal">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      <span>创建活动</span>
    </button>

    <!-- ==================== 创建/编辑 Modal ==================== -->
    <Transition name="modal-fade">
      <div v-if="showCampaignModal" class="modal-overlay" @click.self="closeModal">
        <Transition name="modal-scale" appear>
          <div v-if="showCampaignModal" class="modal-content modal-lg" @click.stop>
            <h3 class="modal-title">{{ campaignModalMode === 'create' ? '创建活动' : '编辑活动' }}</h3>

            <!-- 加载状态 -->
            <div v-if="isLoadingCampaign" class="modal-loading">
              <div class="loading-spinner"></div>
              <p>加载活动详情...</p>
            </div>

            <!-- 表单内容 -->
            <template v-else>
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

            <!-- 铃声时段和宿舍楼选择 -->
            <div class="form-section">
              <h4 class="form-section-title">活动范围</h4>

              <!-- 铃声时段选择 -->
              <div class="form-group">
                <label class="form-label">铃声时段 *</label>
                <p class="form-hint">选择本次活动包含的铃声时段</p>
                <div class="selection-list">
                  <label
                    v-for="tp in allTimePeriods"
                    :key="tp.id"
                    class="selection-item"
                    :class="{ selected: campaignForm.timePeriodIds.includes(tp.id) }"
                  >
                    <input
                      type="checkbox"
                      :value="tp.id"
                      v-model="campaignForm.timePeriodIds"
                      class="selection-checkbox"
                    />
                    <span class="selection-name">{{ tp.name }}</span>
                    <span class="selection-code">{{ tp.code }}</span>
                  </label>
                  <div v-if="allTimePeriods.length === 0" class="selection-empty">
                    暂无铃声时段，请先在宿舍管理中创建
                  </div>
                </div>
              </div>

              <!-- 宿舍楼选择 -->
              <div class="form-group">
                <label class="form-label">宿舍楼 *</label>
                <p class="form-hint">选择本次活动覆盖的宿舍楼（请先选择校区）</p>
                <div v-if="isLoadingBuildings" class="selection-loading">
                  <div class="loading-spinner-sm"></div>
                  <span>加载中...</span>
                </div>
                <div v-else class="selection-list">
                  <label
                    v-for="building in availableBuildings"
                    :key="building.id"
                    class="selection-item"
                    :class="{ selected: campaignForm.buildingIds.includes(building.id) }"
                  >
                    <input
                      type="checkbox"
                      :value="building.id"
                      v-model="campaignForm.buildingIds"
                      class="selection-checkbox"
                    />
                    <span class="selection-name">{{ building.name }}</span>
                    <span class="selection-code">{{ building.code }}</span>
                  </label>
                  <div v-if="!campaignForm.campusId" class="selection-empty">
                    请先选择校区
                  </div>
                  <div v-else-if="availableBuildings.length === 0" class="selection-empty">
                    该校区暂无宿舍楼
                  </div>
                </div>
                <!-- 全选/取消全选按钮 -->
                <div v-if="availableBuildings.length > 0" class="selection-actions">
                  <button
                    type="button"
                    class="selection-action-btn"
                    @click="campaignForm.buildingIds = availableBuildings.map(b => b.id)"
                  >
                    全选
                  </button>
                  <button
                    type="button"
                    class="selection-action-btn"
                    @click="campaignForm.buildingIds = []"
                  >
                    取消全选
                  </button>
                </div>
              </div>
            </div>

            <!-- 阶段配置 -->
            <div class="form-section">
              <h4 class="form-section-title">阶段配置</h4>
              <div class="form-group">
                <label class="form-label checkbox-label disabled-checkbox">
                  <input
                    v-model="campaignForm.globalConfig.auto_stage_transition"
                    type="checkbox"
                    class="form-checkbox"
                    disabled
                    checked
                  />
                  启用阶段自动转换
                </label>
                <p class="form-hint">阶段将在到达设定时间时自动转换到下一阶段（默认开启）</p>
              </div>
              <div
                v-for="(stage, index) in campaignForm.stages"
                :key="stage.stageType"
                class="stage-config"
              >
                <div class="stage-header">
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

                <!-- 投稿阶段配置 -->
                <div v-if="stage.stageType === 'submission' && stage.submissionRules" class="stage-extra-config">
                  <div class="config-row">
                    <label class="form-label checkbox-label">
                      <input
                        v-model="stage.submissionRules.has_limit"
                        type="checkbox"
                        class="form-checkbox"
                      />
                      启用投稿数量限制
                    </label>
                  </div>
                  <div class="config-details" :class="{ expanded: stage.submissionRules.has_limit }">
                    <div class="config-details-inner">
                      <div class="form-row">
                        <div class="form-group half">
                          <label class="form-label-sm">限制范围</label>
                          <select v-model="stage.submissionRules.limit_scope" class="form-select">
                            <option value="period">每个时段分别限制</option>
                            <option value="activity">整个活动总限制</option>
                          </select>
                        </div>
                      </div>
                      <div class="form-row">
                        <div class="form-group half">
                          <label class="form-label-sm">最少投稿数</label>
                          <input
                            v-model.number="stage.submissionRules.min_count"
                            type="number"
                            class="form-input"
                            min="0"
                            placeholder="不限"
                          />
                        </div>
                        <div class="form-group half">
                          <label class="form-label-sm">最多投稿数</label>
                          <input
                            v-model.number="stage.submissionRules.max_count"
                            type="number"
                            class="form-input"
                            min="1"
                            placeholder="不限"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="config-row">
                    <label class="form-label checkbox-label">
                      <input
                        v-model="stage.require_user_info"
                        type="checkbox"
                        class="form-checkbox"
                      />
                      需要填写用户信息
                    </label>
                  </div>
                  <div class="config-details" :class="{ expanded: stage.require_user_info }">
                    <div class="config-details-inner">
                      <label class="form-label-sm">选择需要的信息字段</label>
                      <div class="checkbox-group">
                        <label
                          v-for="field in userInfoFieldOptions"
                          :key="field.value"
                          class="checkbox-item"
                        >
                          <input
                            type="checkbox"
                            :value="field.value"
                            v-model="stage.user_info_fields"
                            class="form-checkbox"
                          />
                          {{ field.label }}
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 投票阶段配置 -->
                <div v-if="stage.stageType === 'voting' && stage.votingRules" class="stage-extra-config">
                  <div class="form-row">
                    <div class="form-group half">
                      <label class="form-label-sm">投票模式</label>
                      <select v-model="stage.voting_mode" class="form-select">
                        <option value="unified">统一投票（海沧校区）</option>
                        <option value="per_building">分宿舍投票（思明校区）</option>
                      </select>
                    </div>
                  </div>
                  <div class="config-row">
                    <label class="form-label checkbox-label">
                      <input
                        v-model="stage.votingRules.has_limit"
                        type="checkbox"
                        class="form-checkbox"
                      />
                      启用投票数量限制
                    </label>
                  </div>
                  <div class="config-details" :class="{ expanded: stage.votingRules.has_limit }">
                    <div class="config-details-inner">
                      <div class="form-row">
                        <div class="form-group half">
                          <label class="form-label-sm">限制范围</label>
                          <select v-model="stage.votingRules.limit_scope" class="form-select">
                            <option value="period">每个时段分别限制</option>
                            <option value="activity">整个活动总限制</option>
                          </select>
                        </div>
                      </div>
                      <div class="form-row">
                        <div class="form-group half">
                          <label class="form-label-sm">最少投票数</label>
                          <input
                            v-model.number="stage.votingRules.min_count"
                            type="number"
                            class="form-input"
                            min="0"
                            placeholder="不限"
                          />
                        </div>
                        <div class="form-group half">
                          <label class="form-label-sm">最多投票数</label>
                          <input
                            v-model.number="stage.votingRules.max_count"
                            type="number"
                            class="form-input"
                            min="1"
                            placeholder="不限"
                          />
                        </div>
                      </div>
                    </div>
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
            </template>
          </div>
        </Transition>
      </div>
    </Transition>

    <!-- ==================== 操作确认 Modal ==================== -->
    <Transition name="modal-fade">
      <div v-if="showOperationConfirm" class="modal-overlay" @click.self="cancelOperation">
        <Transition name="modal-scale" appear>
          <div v-if="showOperationConfirm" class="modal-content" @click.stop>
            <h3 class="modal-title">{{ operationTarget?.title }}</h3>
            <p class="modal-desc">
              {{ operationTarget?.message }}
            </p>
            <div class="modal-actions">
              <button class="modal-btn cancel" @click="cancelOperation" :disabled="isOperating">取消</button>
              <button
                class="modal-btn confirm"
                :class="{ danger: operationTarget?.type === 'close' }"
                @click="confirmOperation"
                :disabled="isOperating"
              >
                {{ isOperating ? '处理中...' : '确认' }}
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

.status-badge.status-pending {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.status-badge.status-draft {
  background: var(--color-border);
  color: var(--color-text-tertiary);
}

.status-badge.status-cancelled {
  background: var(--color-error-bg);
  color: var(--color-error);
}

.status-badge.status-closed {
  background: var(--color-text-placeholder);
  color: white;
}

.status-badge.status-archived {
  background: var(--color-border);
  color: var(--color-text-tertiary);
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

.action-btn.secondary {
  background: var(--color-border);
  color: var(--color-text-secondary);
}

.action-btn.secondary:hover:not(:disabled) {
  background: var(--color-text-secondary);
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

.modal-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-2xl);
  color: var(--color-text-secondary);
}

.modal-loading p {
  margin-top: var(--spacing-md);
  font-size: var(--text-sm);
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

.checkbox-label.disabled-checkbox {
  cursor: default;
}

.checkbox-label.disabled-checkbox .form-checkbox {
  cursor: default;
  opacity: 1;
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.checkbox-label.disabled-checkbox .form-checkbox:checked {
  background: var(--color-primary);
  accent-color: var(--color-primary);
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

.form-hint {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-sm);
}

/* ===== Selection List ===== */
.selection-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
  max-height: 200px;
  overflow-y: auto;
  padding: var(--spacing-sm);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.selection-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: var(--text-sm);
}

.selection-item:hover {
  border-color: var(--color-primary);
}

.selection-item.selected {
  background: var(--color-primary-bg);
  border-color: var(--color-primary);
}

.selection-checkbox {
  display: none;
}

.selection-name {
  font-weight: var(--font-medium);
}

.selection-code {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.selection-empty {
  width: 100%;
  text-align: center;
  padding: var(--spacing-md);
  color: var(--color-text-placeholder);
  font-size: var(--text-sm);
}

.selection-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.loading-spinner-sm {
  width: 16px;
  height: 16px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.selection-actions {
  display: flex;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
}

.selection-action-btn {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--text-xs);
  color: var(--color-primary);
  background: var(--color-primary-bg);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.selection-action-btn:hover {
  background: var(--color-primary);
  color: white;
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

.stage-header {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
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
  flex-direction: column;
  gap: var(--spacing-sm);
}

.stage-times .form-group {
  flex: 1;
  margin-bottom: 0;
}

.stage-times .form-input {
  width: 100%;
  min-width: 0;
}

/* Stage Extra Config */
.stage-extra-config {
  margin-top: var(--spacing-sm);
  padding-top: var(--spacing-sm);
  border-top: 1px dashed var(--color-border);
}

.config-row {
  margin-bottom: var(--spacing-sm);
}

.config-row:last-child {
  margin-bottom: 0;
}

/* 可折叠内容区域 */
.config-details {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease, opacity 0.3s ease, margin 0.3s ease;
  opacity: 0;
  margin-left: var(--spacing-lg);
  margin-bottom: 0;
}

.config-details.expanded {
  max-height: 300px;
  opacity: 1;
  margin-bottom: var(--spacing-sm);
}

.config-details-inner {
  padding: var(--spacing-sm);
  background: var(--color-card);
  border-radius: var(--radius-sm);
}

.checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-md);
  margin-top: var(--spacing-xs);
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--text-sm);
  cursor: pointer;
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

  .stage-header {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .stage-times {
    flex: 1;
    flex-direction: row;
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

/* ===== Desktop/Mobile Only ===== */
.desktop-only {
  display: none;
}

.mobile-only {
  display: flex;
}

/* ===== Floating Create Button (Mobile) ===== */
.floating-create-btn {
  position: fixed;
  right: var(--spacing-md);
  bottom: calc(var(--spacing-md) + 60px); /* 60px 为底部导航栏高度 */
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-primary);
  color: white;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  border: none;
  border-radius: var(--radius-full);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  z-index: 100;
  transition: all var(--transition-fast);
}

.floating-create-btn:hover {
  background: var(--color-primary-dark);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  transform: translateY(-2px);
}

.floating-create-btn:active {
  transform: translateY(0);
}

.floating-create-btn svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.floating-create-btn span {
  white-space: nowrap;
}

@media (min-width: 1024px) {
  .desktop-only {
    display: flex;
  }

  .mobile-only {
    display: none;
  }
}
</style>
