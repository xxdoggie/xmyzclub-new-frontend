<script setup lang="ts">
import { ref, computed, onMounted, watch, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/composables/useToast'
import {
  getCampaignDetail,
  getVotingConfig,
  getVotingOptions,
  submitVote,
  getMyVotes,
} from '@/api/campaign'
import type {
  Campaign,
  VotingConfigResponse,
  TimePeriodVotingOptions,
  VotingOptionItem,
  MyVotesResponse,
  VotingStageConfig,
} from '@/types/campaign'
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const toast = useToast()

// 活动ID
const campaignId = computed(() => Number(route.params.id))

// 状态
const isLoading = ref(true)
const campaign = ref<Campaign | null>(null)
const votingConfig = ref<VotingConfigResponse | null>(null)
const votingOptions = ref<TimePeriodVotingOptions[]>([])
const myVotes = ref<MyVotesResponse | null>(null)

// 当前步骤: 'building' | 'voting' | 'result'
const currentStep = ref<'building' | 'voting' | 'result'>('building')

// 选择的宿舍楼
const selectedBuildingCode = ref<string | null>(null)

// 用户的投票选择：timePeriodId -> Set<votingOptionId>（支持多选）
const voteSelections = ref<Map<number, Set<number>>>(new Map())

// 提交状态
const isSubmitting = ref(false)

// 时段折叠状态：timePeriodId -> boolean（true = 展开）
const periodExpanded = reactive<Record<number, boolean>>({})

// 每个时段显示的选项数量（用于懒加载）
const INITIAL_SHOW_COUNT = 12
const LOAD_MORE_COUNT = 12
const periodVisibleCount = reactive<Record<number, number>>({})

// 每个时段的搜索关键词
const periodSearchKeyword = reactive<Record<number, string>>({})

// 用户信息表单
const userInfoForm = reactive<Record<string, string>>({
  dormitory: '',
  bed: '',
  student_id: '',
})

// 获取投票规则配置
const votingStageConfig = computed<VotingStageConfig | null>(() => {
  if (!campaign.value?.currentStage) return null
  return campaign.value.currentStage.config as VotingStageConfig
})

// 投票模式（优先从 currentStage.config 获取）
const votingMode = computed(() => {
  const stageVotingMode = votingStageConfig.value?.voting_mode
  if (stageVotingMode) {
    return stageVotingMode
  }
  return votingConfig.value?.votingMode || 'unified'
})

// 是否为分楼投票模式
const isByBuilding = computed(() => votingMode.value === 'per_building' || votingMode.value === 'by_building')

// 可选宿舍楼列表
const buildings = computed(() => votingConfig.value?.buildings || [])

// 投票规则
const votingRules = computed(() => {
  const config = votingStageConfig.value
  if (!config?.rules?.has_limit) {
    return { hasLimit: false, limitScope: 'period' as const, minCount: 1, maxCount: 1 }
  }
  return {
    hasLimit: true,
    limitScope: config.rules.limit_scope || 'period',
    minCount: config.rules.min_count || 1,
    maxCount: config.rules.max_count || 1,
  }
})

// 是否需要填写用户信息
const requireUserInfo = computed(() => {
  return votingStageConfig.value?.rules?.require_user_info || false
})

// 需要填写的用户信息字段
const userInfoFields = computed(() => {
  return votingStageConfig.value?.rules?.user_info_fields || []
})

// 用户信息字段标签
const userInfoFieldLabels: Record<string, string> = {
  dormitory: '宿舍号',
  bed: '床位号',
  student_id: '学号',
}

// 检查用户信息是否填写完整
const isUserInfoComplete = computed(() => {
  if (!requireUserInfo.value) return true
  return userInfoFields.value.every(field => userInfoForm[field]?.trim())
})

// 规则说明
const rulesDescription = computed(() => {
  const { hasLimit, limitScope, minCount, maxCount } = votingRules.value
  if (!hasLimit) return '每个时段选择一首歌曲'

  if (limitScope === 'period') {
    if (minCount === maxCount) {
      return `每个时段选择 ${maxCount} 首`
    }
    return `每个时段选择 ${minCount}-${maxCount} 首`
  } else {
    if (minCount === maxCount) {
      return `总共选择 ${maxCount} 首`
    }
    return `总共选择 ${minCount}-${maxCount} 首`
  }
})

// 格式化阶段结束时间
function formatEndTime(endTime: string | undefined): string {
  if (!endTime) return ''
  const date = new Date(endTime)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()

  if (diffMs < 0) return '已结束'

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (diffDays > 0) {
    return `剩余 ${diffDays}天${diffHours}小时`
  } else if (diffHours > 0) {
    return `剩余 ${diffHours}小时`
  } else {
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    return `剩余 ${diffMinutes}分钟`
  }
}

// 加载活动详情
async function loadCampaign() {
  try {
    const res = await getCampaignDetail(campaignId.value)
    if (res.data.code === 200) {
      campaign.value = res.data.data
      if (campaign.value.currentStage?.stageType !== 'voting') {
        toast.warning('当前不在投票阶段')
        router.push('/ringtone')
      }
    } else {
      toast.error(res.data.message || '获取活动详情失败')
      router.push('/ringtone')
    }
  } catch (error) {
    toast.error('获取活动详情失败')
    router.push('/ringtone')
  }
}

// 加载投票配置
async function loadVotingConfig() {
  try {
    const res = await getVotingConfig(campaignId.value)
    if (res.data.code === 200) {
      votingConfig.value = res.data.data
    } else {
      toast.error(res.data.message || '获取投票配置失败')
    }
  } catch (error) {
    toast.error('获取投票配置失败')
  }
}

// 加载我的投票
async function loadMyVotes() {
  try {
    const res = await getMyVotes(campaignId.value)
    if (res.data.code === 200) {
      myVotes.value = res.data.data
    }
  } catch (error) {
    console.error('获取我的投票失败', error)
  }
}

// 加载投票选项
async function loadVotingOptions(buildingCode?: string) {
  try {
    const res = await getVotingOptions(campaignId.value, buildingCode)
    if (res.data.code === 200) {
      votingOptions.value = res.data.data
      // 初始化每个时段的展开状态和可见数量
      votingOptions.value.forEach((period, index) => {
        // 默认第一个时段展开
        periodExpanded[period.timePeriod.id] = index === 0
        periodVisibleCount[period.timePeriod.id] = INITIAL_SHOW_COUNT
      })
    } else {
      toast.error(res.data.message || '获取投票选项失败')
    }
  } catch (error) {
    toast.error('获取投票选项失败')
  }
}

// 初始化数据
async function initData() {
  if (!userStore.isLoggedIn) {
    userStore.openLoginModal('请先登录以参与投票')
    router.push('/ringtone')
    return
  }

  isLoading.value = true
  try {
    await loadCampaign()
    await loadVotingConfig()
    await loadMyVotes()

    if (myVotes.value) {
      currentStep.value = 'result'
      if (isByBuilding.value && myVotes.value.buildingChoice) {
        await loadVotingOptions(myVotes.value.buildingChoice)
      } else if (!isByBuilding.value) {
        await loadVotingOptions()
      }
    } else if (!isByBuilding.value) {
      await loadVotingOptions()
      currentStep.value = 'voting'
    }
  } finally {
    isLoading.value = false
  }
}

// 选择宿舍楼
async function selectBuilding(buildingCode: string) {
  selectedBuildingCode.value = buildingCode
  isLoading.value = true
  try {
    await loadVotingOptions(buildingCode)
    currentStep.value = 'voting'
  } finally {
    isLoading.value = false
  }
}

// 返回选择宿舍楼
function backToBuilding() {
  currentStep.value = 'building'
  selectedBuildingCode.value = null
  voteSelections.value.clear()
  votingOptions.value = []
}

// 切换时段折叠状态
function togglePeriod(periodId: number) {
  periodExpanded[periodId] = !periodExpanded[periodId]
}

// 加载更多选项
function loadMoreOptions(periodId: number) {
  periodVisibleCount[periodId] = (periodVisibleCount[periodId] || INITIAL_SHOW_COUNT) + LOAD_MORE_COUNT
}

// 过滤搜索结果
function getFilteredOptions(periodData: TimePeriodVotingOptions): VotingOptionItem[] {
  const keyword = periodSearchKeyword[periodData.timePeriod.id]?.trim().toLowerCase()
  if (!keyword) return periodData.options

  return periodData.options.filter(option => {
    const song = option.music.song?.toLowerCase() || ''
    const singer = option.music.singer?.toLowerCase() || ''
    const album = option.music.album?.toLowerCase() || ''
    return song.includes(keyword) || singer.includes(keyword) || album.includes(keyword)
  })
}

// 获取时段可见的选项（考虑搜索过滤）
function getVisibleOptions(periodData: TimePeriodVotingOptions): VotingOptionItem[] {
  const filtered = getFilteredOptions(periodData)
  const count = periodVisibleCount[periodData.timePeriod.id] || INITIAL_SHOW_COUNT
  return filtered.slice(0, count)
}

// 是否还有更多选项可加载
function hasMoreOptions(periodData: TimePeriodVotingOptions): boolean {
  const filtered = getFilteredOptions(periodData)
  const count = periodVisibleCount[periodData.timePeriod.id] || INITIAL_SHOW_COUNT
  return filtered.length > count
}

// 获取剩余选项数量
function getRemainingCount(periodData: TimePeriodVotingOptions): number {
  const filtered = getFilteredOptions(periodData)
  const count = periodVisibleCount[periodData.timePeriod.id] || INITIAL_SHOW_COUNT
  return filtered.length - count
}

// 获取过滤后的选项总数
function getFilteredCount(periodData: TimePeriodVotingOptions): number {
  return getFilteredOptions(periodData).length
}

// 获取时段已选数量
function getSelectedCount(timePeriodId: number): number {
  return voteSelections.value.get(timePeriodId)?.size || 0
}

// 获取总选择数量
const totalSelectedCount = computed(() => {
  let count = 0
  voteSelections.value.forEach((set) => {
    count += set.size
  })
  return count
})

// 检查时段是否可以继续选择
function canSelectMore(timePeriodId: number): boolean {
  const { hasLimit, limitScope, maxCount } = votingRules.value
  if (!hasLimit) return getSelectedCount(timePeriodId) < 1

  if (limitScope === 'period') {
    return getSelectedCount(timePeriodId) < maxCount
  } else {
    return totalSelectedCount.value < maxCount
  }
}

// 检查时段是否满足最小选择要求
function periodMeetsMinimum(timePeriodId: number): boolean {
  const { hasLimit, limitScope, minCount } = votingRules.value
  if (!hasLimit) return getSelectedCount(timePeriodId) >= 1

  if (limitScope === 'period') {
    return getSelectedCount(timePeriodId) >= minCount
  }
  return true
}

// 选择投票选项
function selectOption(timePeriodId: number, optionId: number) {
  let periodSet = voteSelections.value.get(timePeriodId)
  if (!periodSet) {
    periodSet = new Set()
    voteSelections.value.set(timePeriodId, periodSet)
  }

  if (periodSet.has(optionId)) {
    // 取消选择
    periodSet.delete(optionId)
    if (periodSet.size === 0) {
      voteSelections.value.delete(timePeriodId)
    }
  } else {
    // 检查是否可以继续选择
    if (!canSelectMore(timePeriodId)) {
      // 如果 limit_scope 是 period 且 maxCount 是 1，替换选择
      if (votingRules.value.limitScope === 'period' && votingRules.value.maxCount === 1) {
        periodSet.clear()
        periodSet.add(optionId)
      } else {
        toast.warning(votingRules.value.limitScope === 'period'
          ? `该时段最多选择 ${votingRules.value.maxCount} 首`
          : `总共最多选择 ${votingRules.value.maxCount} 首`)
        return
      }
    } else {
      periodSet.add(optionId)
    }
  }
  // 触发响应式更新
  voteSelections.value = new Map(voteSelections.value)
}

// 检查是否选中
function isOptionSelected(timePeriodId: number, optionId: number): boolean {
  return voteSelections.value.get(timePeriodId)?.has(optionId) || false
}

// 已选择的时段数量（满足最小要求的时段数）
const completedPeriodsCount = computed(() => {
  let count = 0
  votingOptions.value.forEach((period) => {
    if (periodMeetsMinimum(period.timePeriod.id)) {
      count++
    }
  })
  return count
})

// 总时段数量
const totalPeriodsCount = computed(() => votingOptions.value.length)

// 是否可以提交
const canSubmit = computed(() => {
  // 检查用户信息是否完整
  if (!isUserInfoComplete.value) return false

  const { limitScope, minCount } = votingRules.value

  if (limitScope === 'activity') {
    // 活动级别限制：检查总选择数量
    return totalSelectedCount.value >= minCount
  } else {
    // 时段级别限制：每个时段都要满足最小要求
    return completedPeriodsCount.value === totalPeriodsCount.value
  }
})

// 提交投票
async function handleSubmit() {
  if (!isUserInfoComplete.value) {
    toast.error('请填写完整的用户信息')
    return
  }

  if (!canSubmit.value) {
    const { limitScope, minCount } = votingRules.value
    if (limitScope === 'activity') {
      toast.error(`请至少选择 ${minCount} 首歌曲`)
    } else {
      toast.error('请完成所有时段的投票')
    }
    return
  }

  isSubmitting.value = true
  try {
    const votes: { timePeriodId: number; votingOptionId: number }[] = []
    voteSelections.value.forEach((optionIds, timePeriodId) => {
      optionIds.forEach((optionId) => {
        votes.push({ timePeriodId, votingOptionId: optionId })
      })
    })

    // 构建用户信息
    const userInfo = requireUserInfo.value ? { ...userInfoForm } : undefined

    const res = await submitVote({
      campaignId: campaignId.value,
      buildingChoice: isByBuilding.value ? selectedBuildingCode.value || undefined : undefined,
      votes,
      userInfo,
    })

    if (res.data.code === 200) {
      toast.success('投票成功')
      await loadMyVotes()
      currentStep.value = 'result'
    } else {
      toast.error(res.data.message || '投票失败')
    }
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } } }
    toast.error(err.response?.data?.message || '投票失败')
  } finally {
    isSubmitting.value = false
  }
}

// 格式化投票时间
function formatVotedTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 获取宿舍楼名称
function getBuildingName(code: string): string {
  const building = buildings.value.find(b => b.code === code)
  return building?.name || code
}

// 根据投票记录获取对应的选项详情
function getVotedOptionDetail(timePeriodId: number): VotingOptionItem | null {
  if (!myVotes.value) return null

  const voteRecord = myVotes.value.votes.find(v => v.timePeriod.id === timePeriodId)
  if (!voteRecord) return null

  const periodOptions = votingOptions.value.find(p => p.timePeriod.id === timePeriodId)
  if (!periodOptions) return null

  return periodOptions.options.find(o => o.music.id === voteRecord.music.id) || null
}

// 监听登录状态变化
watch(
  () => userStore.isLoggedIn,
  (isLoggedIn) => {
    if (isLoggedIn) {
      initData()
    }
  }
)

onMounted(() => {
  initData()
})
</script>

<template>
  <div class="page-container">
    <PageHeader :back-to="`/ringtone`" />

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

        <template v-else-if="campaign">
          <!-- 活动信息卡片 -->
          <div class="campaign-card">
            <div class="campaign-info">
              <h1 class="campaign-title">{{ campaign.title }}</h1>
              <p v-if="campaign.description" class="campaign-desc">{{ campaign.description }}</p>
              <div class="campaign-meta">
                <span class="meta-item">{{ campaign.campus?.name }}</span>
                <span class="meta-divider">·</span>
                <span class="meta-item">{{ rulesDescription }}</span>
                <template v-if="campaign.currentStage?.endTime">
                  <span class="meta-divider">·</span>
                  <span class="meta-item countdown">{{ formatEndTime(campaign.currentStage.endTime) }}</span>
                </template>
              </div>
            </div>
          </div>

          <div class="vote-reminder" role="note" aria-label="投票账号绑定提醒">
            <div class="vote-reminder-icon" aria-hidden="true">!</div>
            <div class="vote-reminder-content">
              <p class="vote-reminder-title">投票前请先确认账号绑定状态</p>
              <p class="vote-reminder-text">根据最新规定，为防止刷票，投票账号必须至少绑定校园网或QQ账号其中之一才可进行投票</p>
            </div>
          </div>

          <!-- 步骤1：选择宿舍楼（分楼投票模式） -->
          <section v-if="currentStep === 'building' && isByBuilding" class="step-section">
            <div class="buildings-grid">
              <button
                v-for="building in buildings"
                :key="building.id"
                class="building-item"
                @click="selectBuilding(building.code)"
              >
                <div class="building-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M3 21h18M5 21V7l8-4v18M13 21V3l6 3v15M9 9v.01M9 12v.01M9 15v.01M9 18v.01M17 9v.01M17 12v.01M17 15v.01M17 18v.01"></path>
                  </svg>
                </div>
                <span class="building-name">{{ building.name }}</span>
                <svg class="building-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            </div>
          </section>

          <!-- 步骤2：投票选择 -->
          <section v-if="currentStep === 'voting'" class="step-section">
            <!-- 返回宿舍楼选择 -->
            <button v-if="isByBuilding" class="back-link" @click="backToBuilding">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
              更换宿舍楼
            </button>

            <!-- 用户信息表单 -->
            <div v-if="requireUserInfo" class="user-info-form">
              <h3 class="form-title">填写信息</h3>
              <div class="form-fields">
                <div
                  v-for="field in userInfoFields"
                  :key="field"
                  class="form-field"
                >
                  <label :for="`user-${field}`" class="field-label">
                    {{ userInfoFieldLabels[field] || field }}
                  </label>
                  <input
                    :id="`user-${field}`"
                    v-model="userInfoForm[field]"
                    type="text"
                    class="field-input"
                    :placeholder="`请输入${userInfoFieldLabels[field] || field}`"
                  />
                </div>
              </div>
            </div>

            <!-- 按时段显示投票选项 -->
            <div class="voting-periods">
              <div
                v-for="periodData in votingOptions"
                :key="periodData.timePeriod.id"
                class="period-group"
                :class="{ collapsed: !periodExpanded[periodData.timePeriod.id] }"
              >
                <button class="period-header" @click="togglePeriod(periodData.timePeriod.id)">
                  <div class="period-left">
                    <span class="period-name">{{ periodData.timePeriod.name }}</span>
                    <span class="period-count">{{ periodData.options.length }}首可选</span>
                  </div>
                  <div class="period-right">
                    <span
                      class="period-status"
                      :class="{
                        completed: periodMeetsMinimum(periodData.timePeriod.id),
                        partial: getSelectedCount(periodData.timePeriod.id) > 0 && !periodMeetsMinimum(periodData.timePeriod.id)
                      }"
                    >
                      {{ getSelectedCount(periodData.timePeriod.id) }}/{{ votingRules.maxCount }}
                    </span>
                    <svg class="period-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </div>
                </button>

                <Transition name="period-slide">
                  <div v-show="periodExpanded[periodData.timePeriod.id]" class="period-content">
                    <!-- 搜索框 -->
                    <div class="period-search">
                      <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                      </svg>
                      <input
                        v-model="periodSearchKeyword[periodData.timePeriod.id]"
                        type="text"
                        class="search-input"
                        placeholder="搜索歌曲、歌手..."
                      />
                      <button
                        v-if="periodSearchKeyword[periodData.timePeriod.id]"
                        class="search-clear"
                        @click="periodSearchKeyword[periodData.timePeriod.id] = ''"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>

                    <div v-if="getFilteredCount(periodData) === 0" class="period-empty">
                      <span v-if="periodSearchKeyword[periodData.timePeriod.id]">没有找到匹配的歌曲</span>
                      <span v-else>暂无投票选项</span>
                    </div>

                    <div v-else class="options-grid">
                    <div
                      v-for="option in getVisibleOptions(periodData)"
                      :key="option.id"
                      class="music-card"
                      :class="{ selected: isOptionSelected(periodData.timePeriod.id, option.id) }"
                      @click="selectOption(periodData.timePeriod.id, option.id)"
                    >
                      <div class="card-cover-wrapper">
                        <img
                          :src="option.music.cover"
                          :alt="option.music.song"
                          class="card-cover"
                          loading="lazy"
                        />
                        <div class="card-check">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        </div>
                        <div v-if="option.voteCount" class="card-votes">
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                          </svg>
                          <span>{{ option.voteCount }}</span>
                        </div>
                      </div>
                      <div class="card-info">
                        <h4 class="card-title">{{ option.music.song }}</h4>
                        <p class="card-artist">{{ option.music.singer }}</p>
                      </div>
                    </div>
                  </div>

                    <!-- 加载更多按钮 -->
                    <button
                      v-if="hasMoreOptions(periodData)"
                      class="load-more-btn"
                      @click.stop="loadMoreOptions(periodData.timePeriod.id)"
                    >
                      加载更多 ({{ getRemainingCount(periodData) }}首)
                    </button>
                  </div>
                </Transition>
              </div>
            </div>

            <!-- 底部提交栏 -->
            <div class="submit-bar">
              <div class="submit-info">
                <span class="submit-progress">
                  {{ votingRules.limitScope === 'activity'
                    ? `已选 ${totalSelectedCount} 首`
                    : `${completedPeriodsCount}/${totalPeriodsCount} 时段`
                  }}
                </span>
              </div>
              <button
                class="submit-btn"
                :class="{ ready: canSubmit }"
                :disabled="!canSubmit || isSubmitting"
                @click="handleSubmit"
              >
                {{ isSubmitting ? '提交中...' : '确认投票' }}
              </button>
            </div>
          </section>

          <!-- 步骤3：投票结果 -->
          <section v-if="currentStep === 'result'" class="step-section">
            <div class="result-header">
              <div class="result-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <h2 class="result-title">投票成功</h2>
              <p v-if="myVotes" class="result-time">投票时间：{{ formatVotedTime(myVotes.votedAt) }}</p>
              <p v-if="isByBuilding && myVotes?.buildingChoice" class="result-building">
                投票宿舍楼：{{ getBuildingName(myVotes.buildingChoice) }}
              </p>
            </div>

            <div class="result-votes">
              <h3 class="votes-title">您的投票记录</h3>
              <div class="votes-list">
                <div
                  v-for="vote in myVotes?.votes"
                  :key="vote.timePeriod.id"
                  class="vote-item"
                >
                  <div class="vote-period">{{ vote.timePeriod.name }}</div>
                  <div class="vote-music">
                    <img
                      v-if="getVotedOptionDetail(vote.timePeriod.id)"
                      :src="getVotedOptionDetail(vote.timePeriod.id)?.music.cover"
                      :alt="vote.music.song"
                      class="vote-cover"
                    />
                    <div v-else class="vote-cover-placeholder">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M9 18V5l12-2v13"></path>
                        <circle cx="6" cy="18" r="3"></circle>
                        <circle cx="18" cy="16" r="3"></circle>
                      </svg>
                    </div>
                    <div class="vote-info">
                      <h4 class="vote-name">{{ vote.music.song }}</h4>
                      <p class="vote-artist">{{ vote.music.singer }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </section>
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
  padding-bottom: 80px; /* 为底部提交栏留空间 */
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

/* ===== Campaign Card ===== */
.campaign-card {
  background: var(--color-card);
  border-radius: var(--radius-xl);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.campaign-info {
  flex: 1;
}

.campaign-title {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-xs);
  line-height: 1.3;
}

.campaign-desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: 1.5;
  margin-bottom: var(--spacing-sm);
}

.campaign-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

.meta-divider {
  color: var(--color-border);
}

.meta-item.countdown {
  color: var(--color-warning);
}

/* ===== Vote Reminder ===== */
.vote-reminder {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  margin-bottom: var(--spacing-md);
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(249, 115, 22, 0.12));
  border: 1px solid rgba(239, 68, 68, 0.24);
  border-radius: var(--radius-lg);
}

.vote-reminder-icon {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #ef4444;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  margin-top: 2px;
}

.vote-reminder-content {
  min-width: 0;
}

.vote-reminder-title {
  margin: 0 0 4px;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: #b91c1c;
}

.vote-reminder-text {
  margin: 0;
  font-size: var(--text-sm);
  line-height: 1.5;
  color: #7f1d1d;
}

/* ===== Section ===== */
.step-section {
  margin-bottom: var(--spacing-lg);
}

.section-header {
  margin-bottom: var(--spacing-md);
}

.section-title {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
}

.section-desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-top: var(--spacing-xs);
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: var(--spacing-xs) 0;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  background: none;
  border: none;
  cursor: pointer;
  margin-bottom: var(--spacing-sm);
  transition: color var(--transition-fast);
}

.back-link:hover {
  color: var(--color-text);
}

.back-link svg {
  width: 16px;
  height: 16px;
}

/* ===== Buildings Grid ===== */
.buildings-grid {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.building-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: left;
}

.building-item:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-bg);
}

.building-item:active {
  transform: scale(0.98);
}

.building-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary-bg);
  color: var(--color-primary);
  border-radius: var(--radius-md);
  flex-shrink: 0;
}

.building-icon svg {
  width: 24px;
  height: 24px;
}

.building-name {
  flex: 1;
  font-size: var(--text-base);
  font-weight: var(--font-medium);
}

.building-arrow {
  width: 20px;
  height: 20px;
  color: var(--color-text-placeholder);
  flex-shrink: 0;
}

/* ===== User Info Form ===== */
.user-info-form {
  background: var(--color-card);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.form-title {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-sm);
}

.form-fields {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-label {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.field-input {
  padding: var(--spacing-sm);
  font-size: var(--text-sm);
  color: var(--color-text);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  outline: none;
  transition: border-color var(--transition-fast);
}

.field-input:focus {
  border-color: var(--color-primary);
}

.field-input::placeholder {
  color: var(--color-text-placeholder);
}

/* ===== Voting Periods ===== */
.voting-periods {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.period-group {
  background: var(--color-card);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.period-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  background: none;
  border: none;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.period-header:hover {
  background: var(--color-bg);
}

.period-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.period-name {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text);
}

.period-count {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
}

.period-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.period-status {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-text-placeholder);
  padding: 2px 8px;
  background: var(--color-bg);
  border-radius: var(--radius-full);
}

.period-status.partial {
  color: var(--color-warning);
  background: var(--color-warning-bg);
}

.period-status.completed {
  color: var(--color-success);
  background: var(--color-success-bg);
}

.period-arrow {
  width: 18px;
  height: 18px;
  color: var(--color-text-placeholder);
  transition: transform var(--transition-fast);
}

.period-group.collapsed .period-arrow {
  transform: rotate(-90deg);
}

.period-content {
  border-top: 1px solid var(--color-border);
  overflow: hidden;
}

/* Period Slide Transition */
.period-slide-enter-active,
.period-slide-leave-active {
  transition: all 0.25s ease-out;
  max-height: 2000px;
  opacity: 1;
}

.period-slide-enter-from,
.period-slide-leave-to {
  max-height: 0;
  opacity: 0;
}

/* ===== Period Search ===== */
.period-search {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm);
  border-bottom: 1px solid var(--color-border);
}

.search-icon {
  width: 18px;
  height: 18px;
  color: var(--color-text-placeholder);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  padding: var(--spacing-xs) 0;
  font-size: var(--text-sm);
  color: var(--color-text);
  background: transparent;
  border: none;
  outline: none;
}

.search-input::placeholder {
  color: var(--color-text-placeholder);
}

.search-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  background: var(--color-bg);
  border: none;
  border-radius: var(--radius-full);
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
}

.search-clear:hover {
  background: var(--color-border);
  color: var(--color-text);
}

.search-clear svg {
  width: 14px;
  height: 14px;
}

.period-empty {
  padding: var(--spacing-md);
  text-align: center;
  font-size: var(--text-sm);
  color: var(--color-text-placeholder);
}

/* ===== Music Card Grid ===== */
.options-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
}

.music-card {
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: all var(--transition-fast);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.music-card:active {
  transform: scale(0.96);
}

.card-cover-wrapper {
  position: relative;
  width: 100%;
  padding-top: 100%;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--color-border);
}

.card-cover {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: all var(--transition-fast);
}

.music-card:hover .card-cover {
  transform: scale(1.05);
}

.music-card.selected .card-cover-wrapper {
  box-shadow: 0 0 0 3px var(--color-primary);
}

.card-check {
  position: absolute;
  top: var(--spacing-xs);
  right: var(--spacing-xs);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  border: 2px solid rgba(255, 255, 255, 0.6);
  border-radius: var(--radius-full);
  color: transparent;
  transition: all var(--transition-fast);
}

.music-card.selected .card-check {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.card-check svg {
  width: 14px;
  height: 14px;
}

.card-votes {
  position: absolute;
  bottom: var(--spacing-xs);
  left: var(--spacing-xs);
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px 6px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: var(--radius-sm);
  color: white;
  font-size: 10px;
  font-weight: var(--font-medium);
}

.card-votes svg {
  width: 10px;
  height: 10px;
}

.card-info {
  padding: var(--spacing-xs) 2px;
}

.card-title {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.card-artist {
  font-size: 10px;
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 2px;
}

/* ===== Load More Button ===== */
.load-more-btn {
  display: block;
  width: calc(100% - var(--spacing-md) * 2);
  margin: var(--spacing-sm) var(--spacing-md) var(--spacing-md);
  padding: var(--spacing-sm);
  font-size: var(--text-sm);
  color: var(--color-primary);
  background: var(--color-primary-bg);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.load-more-btn:hover {
  background: var(--color-primary);
  color: white;
}

/* ===== Submit Bar (Fixed Bottom) ===== */
.submit-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-card);
  border-top: 1px solid var(--color-border);
  z-index: 100;
}

.submit-info {
  flex: 1;
}

.submit-progress {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.submit-btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: white;
  background: var(--color-text-placeholder);
  border: none;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.submit-btn.ready {
  background: var(--color-primary);
}

.submit-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.submit-btn:disabled {
  cursor: not-allowed;
}

/* ===== Result ===== */
.result-header {
  text-align: center;
  padding: var(--spacing-xl) var(--spacing-md);
  background: var(--color-card);
  border-radius: var(--radius-xl);
  margin-bottom: var(--spacing-md);
}

.result-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto var(--spacing-md);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-success-bg);
  color: var(--color-success);
  border-radius: var(--radius-full);
}

.result-icon svg {
  width: 32px;
  height: 32px;
}

.result-title {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-sm);
}

.result-time,
.result-building {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.result-building {
  margin-top: var(--spacing-xs);
}

.result-votes {
  background: var(--color-card);
  border-radius: var(--radius-xl);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.votes-title {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-md);
}

.votes-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.vote-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  background: var(--color-bg);
  border-radius: var(--radius-md);
}

.vote-period {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-primary);
}

.vote-music {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.vote-cover {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  object-fit: cover;
  flex-shrink: 0;
}

.vote-cover-placeholder {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  background: var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-placeholder);
  flex-shrink: 0;
}

.vote-cover-placeholder svg {
  width: 20px;
  height: 20px;
}

.vote-info {
  flex: 1;
  min-width: 0;
}

.vote-name {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vote-artist {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-actions {
  text-align: center;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-lg);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: white;
  background: var(--color-primary);
  border: none;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.back-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* ===== Desktop ===== */
@media (min-width: 768px) {
  .buildings-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
  }

  .options-grid {
    grid-template-columns: repeat(4, 1fr);
  }

  .submit-bar {
    left: 50%;
    transform: translateX(-50%);
    max-width: 800px;
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
    border-left: 1px solid var(--color-border);
    border-right: 1px solid var(--color-border);
  }
}

@media (min-width: 1024px) {
  .breadcrumb-wrapper {
    display: block;
  }

  .page-content {
    padding: var(--spacing-xl);
    padding-bottom: 100px;
  }

  .content-container {
    max-width: 900px;
  }

  .campaign-card {
    padding: var(--spacing-lg);
  }

  .campaign-title {
    font-size: var(--text-xl);
  }

  .campaign-desc {
    font-size: var(--text-base);
    margin-bottom: var(--spacing-xs);
  }

  .buildings-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .options-grid {
    grid-template-columns: repeat(5, 1fr);
  }

  .submit-bar {
    max-width: 900px;
    padding: var(--spacing-md) var(--spacing-lg);
  }
}
</style>
