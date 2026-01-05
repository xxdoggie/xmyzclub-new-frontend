<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
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

// 用户的投票选择：timePeriodId -> votingOptionId
const voteSelections = ref<Map<number, number>>(new Map())

// 提交状态
const isSubmitting = ref(false)

// 获取投票规则配置
const votingStageConfig = computed<VotingStageConfig | null>(() => {
  if (!campaign.value?.currentStage) return null
  return campaign.value.currentStage.config as VotingStageConfig
})

// 投票模式（优先从 currentStage.config 获取）
const votingMode = computed(() => {
  // 优先从阶段配置中获取
  const stageVotingMode = votingStageConfig.value?.voting_mode
  if (stageVotingMode) {
    return stageVotingMode
  }
  // 否则从投票配置接口获取
  return votingConfig.value?.votingMode || 'unified'
})

// 是否为分楼投票模式
const isByBuilding = computed(() => votingMode.value === 'per_building' || votingMode.value === 'by_building')

// 可选宿舍楼列表
const buildings = computed(() => votingConfig.value?.buildings || [])

// 规则说明
const rulesDescription = computed(() => {
  const config = votingStageConfig.value
  if (!config?.rules?.has_limit) return '每个时段选择一首歌曲'

  const { limit_scope, max_count, min_count } = config.rules
  if (limit_scope === 'period') {
    if (min_count && max_count && min_count === max_count) {
      return `每个时段必须选择 ${max_count} 首歌曲`
    } else if (min_count && max_count) {
      return `每个时段选择 ${min_count}-${max_count} 首歌曲`
    } else if (max_count) {
      return `每个时段最多选择 ${max_count} 首歌曲`
    }
  }
  return '每个时段选择一首歌曲'
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

    // 如果已经投过票，直接显示结果
    if (myVotes.value) {
      currentStep.value = 'result'
      // 加载投票选项以显示完整信息
      if (isByBuilding.value && myVotes.value.buildingChoice) {
        await loadVotingOptions(myVotes.value.buildingChoice)
      } else if (!isByBuilding.value) {
        await loadVotingOptions()
      }
    } else if (!isByBuilding.value) {
      // 统一投票模式，直接加载选项
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

// 选择投票选项
function selectOption(timePeriodId: number, optionId: number) {
  // 如果已选中，取消选择
  if (voteSelections.value.get(timePeriodId) === optionId) {
    voteSelections.value.delete(timePeriodId)
  } else {
    voteSelections.value.set(timePeriodId, optionId)
  }
  // 触发响应式更新
  voteSelections.value = new Map(voteSelections.value)
}

// 检查是否选中
function isOptionSelected(timePeriodId: number, optionId: number): boolean {
  return voteSelections.value.get(timePeriodId) === optionId
}

// 获取时段已选数量
function getSelectedCount(timePeriodId: number): number {
  return voteSelections.value.has(timePeriodId) ? 1 : 0
}

// 已选择的时段数量
const selectedPeriodsCount = computed(() => voteSelections.value.size)

// 总时段数量
const totalPeriodsCount = computed(() => votingOptions.value.length)

// 是否可以提交
const canSubmit = computed(() => {
  const config = votingStageConfig.value
  if (!config?.rules?.has_limit) {
    // 没有限制，但至少要选一个
    return selectedPeriodsCount.value > 0
  }

  const { limit_scope, min_count } = config.rules
  if (limit_scope === 'period' && min_count) {
    // 每个时段都需要选择
    return selectedPeriodsCount.value === totalPeriodsCount.value
  }

  return selectedPeriodsCount.value > 0
})

// 提交投票
async function handleSubmit() {
  if (!canSubmit.value) {
    toast.error('请完成所有时段的投票')
    return
  }

  isSubmitting.value = true
  try {
    const votes = Array.from(voteSelections.value.entries()).map(([timePeriodId, votingOptionId]) => ({
      timePeriodId,
      votingOptionId,
    }))

    const res = await submitVote({
      campaignId: campaignId.value,
      buildingChoice: isByBuilding.value ? selectedBuildingCode.value || undefined : undefined,
      votes,
    })

    if (res.data.code === 200) {
      toast.success('投票成功')
      // 重新加载我的投票
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

          <!-- 步骤1：选择宿舍楼（分楼投票模式） -->
          <section v-if="currentStep === 'building' && isByBuilding" class="step-section">
            <div class="section-header">
              <h2 class="section-title">选择您的宿舍楼</h2>
              <p class="section-desc">请选择您所在的宿舍楼进行投票</p>
            </div>

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
            <div class="section-header">
              <div class="header-left">
                <button v-if="isByBuilding" class="back-link" @click="backToBuilding">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                  更换宿舍楼
                </button>
                <h2 class="section-title">
                  选择您喜欢的铃声
                  <span v-if="isByBuilding && selectedBuildingCode" class="building-badge">
                    {{ getBuildingName(selectedBuildingCode) }}
                  </span>
                </h2>
              </div>
              <span class="progress-text">{{ selectedPeriodsCount }}/{{ totalPeriodsCount }}</span>
            </div>

            <!-- 按时段显示投票选项 -->
            <div class="voting-periods">
              <div
                v-for="periodData in votingOptions"
                :key="periodData.timePeriod.id"
                class="period-group"
              >
                <div class="period-header">
                  <span class="period-name">{{ periodData.timePeriod.name }}</span>
                  <span class="period-status" :class="{ completed: getSelectedCount(periodData.timePeriod.id) > 0 }">
                    {{ getSelectedCount(periodData.timePeriod.id) > 0 ? '已选择' : '未选择' }}
                  </span>
                </div>

                <div v-if="periodData.options.length === 0" class="period-empty">
                  <span>暂无投票选项</span>
                </div>

                <div v-else class="options-list">
                  <div
                    v-for="option in periodData.options"
                    :key="option.id"
                    class="option-item"
                    :class="{ selected: isOptionSelected(periodData.timePeriod.id, option.id) }"
                    @click="selectOption(periodData.timePeriod.id, option.id)"
                  >
                    <img
                      :src="option.music.coverUrl"
                      :alt="option.music.songName"
                      class="option-cover"
                    />
                    <div class="option-info">
                      <h4 class="option-name">{{ option.music.songName }}</h4>
                      <p class="option-artist">{{ option.music.artist }}</p>
                    </div>
                    <div class="option-votes">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                      </svg>
                      <span>{{ option.voteCount }}</span>
                    </div>
                    <div class="option-check">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 提交按钮 -->
            <div class="submit-area">
              <button
                class="submit-btn"
                :disabled="!canSubmit || isSubmitting"
                @click="handleSubmit"
              >
                {{ isSubmitting ? '提交中...' : `确认投票 (${selectedPeriodsCount}/${totalPeriodsCount})` }}
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
                      :src="getVotedOptionDetail(vote.timePeriod.id)?.music.coverUrl"
                      :alt="vote.music.songName"
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
                      <h4 class="vote-name">{{ vote.music.songName }}</h4>
                      <p class="vote-artist">{{ vote.music.artist }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="result-actions">
              <button class="back-btn" @click="router.push('/ringtone')">
                返回活动列表
              </button>
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

/* ===== Section ===== */
.step-section {
  margin-bottom: var(--spacing-lg);
}

.section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: var(--spacing-md);
  gap: var(--spacing-sm);
}

.header-left {
  flex: 1;
}

.section-title {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.section-desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-top: var(--spacing-xs);
}

.building-badge {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-primary);
  background: var(--color-primary-bg);
  padding: 2px var(--spacing-sm);
  border-radius: var(--radius-full);
}

.progress-text {
  font-size: var(--text-sm);
  color: var(--color-primary);
  font-weight: var(--font-medium);
  flex-shrink: 0;
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
  margin-bottom: var(--spacing-xs);
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

/* ===== Voting Periods ===== */
.voting-periods {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
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
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg);
}

.period-name {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
}

.period-status {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
  font-weight: var(--font-medium);
}

.period-status.completed {
  color: var(--color-success);
}

.period-empty {
  padding: var(--spacing-md);
  text-align: center;
  font-size: var(--text-sm);
  color: var(--color-text-placeholder);
}

.options-list {
  display: flex;
  flex-direction: column;
}

.option-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-top: 1px solid var(--color-border);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.option-item:hover {
  background: var(--color-bg);
}

.option-item:active {
  transform: scale(0.99);
}

.option-item.selected {
  background: var(--color-primary-bg);
}

.option-cover {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  object-fit: cover;
  flex-shrink: 0;
}

.option-info {
  flex: 1;
  min-width: 0;
}

.option-name {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.option-artist {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.option-votes {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.option-votes svg {
  width: 14px;
  height: 14px;
}

.option-check {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-full);
  color: transparent;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.option-item.selected .option-check {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.option-check svg {
  width: 12px;
  height: 12px;
}

/* ===== Submit Area ===== */
.submit-area {
  position: sticky;
  bottom: 0;
  padding: var(--spacing-md);
  background: linear-gradient(transparent, var(--color-bg) 20%);
  margin: 0 calc(-1 * var(--spacing-sm));
  margin-top: var(--spacing-md);
}

.submit-btn {
  width: 100%;
  padding: var(--spacing-md);
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: white;
  background: var(--color-primary);
  border: none;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.submit-btn:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.submit-btn:active:not(:disabled) {
  transform: translateY(0);
}

.submit-btn:disabled {
  opacity: 0.6;
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
}

@media (min-width: 1024px) {
  .breadcrumb-wrapper {
    display: block;
  }

  .page-content {
    padding: var(--spacing-xl);
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

  .submit-area {
    position: static;
    padding: var(--spacing-md) 0;
    background: transparent;
    margin: var(--spacing-md) 0 0 0;
  }

  .submit-btn {
    max-width: 300px;
    margin: 0 auto;
    display: block;
  }
}
</style>
