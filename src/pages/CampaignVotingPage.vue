<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/composables/useToast'
import {
  getCampaignDetail,
  getVotingProgress,
  getVotingOptions,
  createVote,
  cancelVote,
} from '@/api/campaign'
import type {
  Campaign,
  ProgressResponse,
  TimePeriodVotingOptions,
  UserVotingOption,
  TimePeriodProgressItem,
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
const progress = ref<ProgressResponse | null>(null)
const votingOptions = ref<TimePeriodVotingOptions[]>([])

// 当前选中的时段
const selectedPeriodId = ref<number | null>(null)

// 投票操作相关
const isVoting = ref(false)
const votingOptionId = ref<number | null>(null)

// 当前时段的进度信息
const currentPeriodProgress = computed<TimePeriodProgressItem | null>(() => {
  if (!progress.value || !selectedPeriodId.value) return null
  return progress.value.timePeriodProgress.find(
    (p) => p.timePeriod.id === selectedPeriodId.value
  ) || null
})

// 当前时段是否可以继续投票
const canVoteMore = computed(() => {
  if (!currentPeriodProgress.value) return false
  return !currentPeriodProgress.value.reachedMax
})

// 当前时段的投票选项
const currentPeriodOptions = computed<UserVotingOption[]>(() => {
  if (!selectedPeriodId.value) return []
  const periodData = votingOptions.value.find(
    (v) => v.timePeriod.id === selectedPeriodId.value
  )
  return periodData?.options || []
})

// 当前用户已投票的选项
const votedOptions = computed(() => {
  return currentPeriodOptions.value.filter((o) => o.hasVoted)
})

// 加载活动详情
async function loadCampaign() {
  try {
    const res = await getCampaignDetail(campaignId.value)
    if (res.data.code === 200) {
      campaign.value = res.data.data
      // 默认选中第一个时段
      if (campaign.value.timePeriods && campaign.value.timePeriods.length > 0) {
        selectedPeriodId.value = campaign.value.timePeriods[0].id
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

// 加载投票进度
async function loadProgress() {
  try {
    const res = await getVotingProgress(campaignId.value)
    if (res.data.code === 200) {
      progress.value = res.data.data
    }
  } catch (error) {
    console.error('获取投票进度失败', error)
  }
}

// 加载投票选项
async function loadVotingOptions() {
  try {
    const res = await getVotingOptions(campaignId.value)
    if (res.data.code === 200) {
      votingOptions.value = res.data.data
    }
  } catch (error) {
    console.error('获取投票选项失败', error)
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
    await Promise.all([loadProgress(), loadVotingOptions()])
  } finally {
    isLoading.value = false
  }
}

// 投票
async function handleVote(option: UserVotingOption) {
  if (option.hasVoted) {
    // 取消投票
    await doCancelVote(option)
  } else {
    // 投票
    await doVote(option)
  }
}

// 执行投票
async function doVote(option: UserVotingOption) {
  if (!canVoteMore.value) {
    toast.warning('已达到投票上限')
    return
  }

  isVoting.value = true
  votingOptionId.value = option.id
  try {
    const res = await createVote({
      campaignId: campaignId.value,
      optionIds: [option.id],
    })

    if (res.data.code === 200) {
      toast.success('投票成功')
      // 刷新数据
      await Promise.all([loadProgress(), loadVotingOptions()])
    } else {
      toast.error(res.data.message || '投票失败')
    }
  } catch (error) {
    toast.error('投票失败')
  } finally {
    isVoting.value = false
    votingOptionId.value = null
  }
}

// 取消投票
async function doCancelVote(option: UserVotingOption) {
  isVoting.value = true
  votingOptionId.value = option.id
  try {
    const res = await cancelVote({
      campaignId: campaignId.value,
      optionId: option.id,
    })

    if (res.data.code === 200) {
      toast.success('已取消投票')
      // 刷新数据
      await Promise.all([loadProgress(), loadVotingOptions()])
    } else {
      toast.error(res.data.message || '取消失败')
    }
  } catch (error) {
    toast.error('取消失败')
  } finally {
    isVoting.value = false
    votingOptionId.value = null
  }
}

// 格式化日期
function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 监听登录状态变化
watch(() => userStore.isLoggedIn, (isLoggedIn) => {
  if (isLoggedIn) {
    initData()
  }
})

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
          <!-- 活动信息 -->
          <div class="campaign-header">
            <h1 class="campaign-title">{{ campaign.title }}</h1>
            <p class="campaign-desc">{{ campaign.description }}</p>
            <div class="campaign-meta">
              <span class="meta-item">{{ campaign.campus?.name }}</span>
              <span v-if="campaign.currentStage?.endTime" class="meta-divider">·</span>
              <span v-if="campaign.currentStage?.endTime" class="meta-item">
                截止时间：{{ formatDate(campaign.currentStage.endTime) }}
              </span>
            </div>
          </div>

          <!-- 时段选择 -->
          <div class="period-section">
            <h2 class="section-title">选择铃声时段</h2>
            <div class="period-tabs">
              <button
                v-for="period in campaign.timePeriods"
                :key="period.id"
                class="period-tab"
                :class="{ active: selectedPeriodId === period.id }"
                @click="selectedPeriodId = period.id"
              >
                {{ period.name }}
              </button>
            </div>
          </div>

          <!-- 投票进度 -->
          <div v-if="currentPeriodProgress" class="progress-section">
            <div class="progress-info">
              <span class="progress-label">投票进度</span>
              <span class="progress-count">
                {{ currentPeriodProgress.currentCount }}
                <span v-if="currentPeriodProgress.maxCount > 0">
                  / {{ currentPeriodProgress.maxCount }}
                </span>
              </span>
            </div>
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{
                  width: currentPeriodProgress.maxCount > 0
                    ? `${(currentPeriodProgress.currentCount / currentPeriodProgress.maxCount) * 100}%`
                    : '0%'
                }"
              ></div>
            </div>
            <p v-if="currentPeriodProgress.reachedMax" class="progress-hint warning">
              已达到投票上限
            </p>
          </div>

          <!-- 投票选项列表 -->
          <div class="voting-section">
            <h2 class="section-title">为喜欢的歌曲投票</h2>

            <div v-if="currentPeriodOptions.length === 0" class="empty-options">
              <p>暂无可投票的歌曲</p>
            </div>

            <div v-else class="options-list">
              <div
                v-for="option in currentPeriodOptions"
                :key="option.id"
                class="option-card"
                :class="{ voted: option.hasVoted }"
              >
                <div class="option-rank">
                  <span class="vote-count">{{ option.voteCount }}</span>
                  <span class="vote-label">票</span>
                </div>

                <img
                  :src="option.music.cover"
                  :alt="option.music.song"
                  class="music-cover"
                />

                <div class="music-info">
                  <h3 class="music-name">{{ option.music.song }}</h3>
                  <p class="music-singer">{{ option.music.singer }}</p>
                </div>

                <button
                  class="vote-btn"
                  :class="{ voted: option.hasVoted, loading: votingOptionId === option.id }"
                  :disabled="isVoting || (!option.hasVoted && !canVoteMore)"
                  @click="handleVote(option)"
                >
                  <template v-if="votingOptionId === option.id">
                    <div class="btn-spinner"></div>
                  </template>
                  <template v-else-if="option.hasVoted">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    已投票
                  </template>
                  <template v-else>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                    </svg>
                    投票
                  </template>
                </button>
              </div>
            </div>
          </div>

          <!-- 我的投票 -->
          <div v-if="votedOptions.length > 0" class="voted-section">
            <h2 class="section-title">我的投票</h2>
            <div class="voted-list">
              <div
                v-for="option in votedOptions"
                :key="option.id"
                class="voted-item"
              >
                <img
                  :src="option.music.cover"
                  :alt="option.music.song"
                  class="voted-cover"
                />
                <span class="voted-name">{{ option.music.song }}</span>
              </div>
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
  border-top-color: #a855f7;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: var(--spacing-md);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ===== Campaign Header ===== */
.campaign-header {
  margin-bottom: var(--spacing-lg);
}

.campaign-title {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-xs);
}

.campaign-desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-sm);
}

.campaign-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.meta-divider {
  color: var(--color-border);
}

/* ===== Section ===== */
.section-title {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-sm);
}

/* ===== Period Tabs ===== */
.period-section {
  margin-bottom: var(--spacing-md);
}

.period-tabs {
  display: flex;
  gap: var(--spacing-xs);
  overflow-x: auto;
  padding-bottom: var(--spacing-xs);
  -webkit-overflow-scrolling: touch;
}

.period-tab {
  flex-shrink: 0;
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.period-tab:hover {
  border-color: #a855f7;
  color: #a855f7;
}

.period-tab.active {
  background: #a855f7;
  border-color: #a855f7;
  color: white;
}

/* ===== Progress ===== */
.progress-section {
  background: var(--color-card);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
}

.progress-label {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.progress-count {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: #a855f7;
}

.progress-bar {
  height: 6px;
  background: var(--color-border);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #a855f7;
  border-radius: var(--radius-full);
  transition: width var(--transition-normal);
}

.progress-hint {
  font-size: var(--text-xs);
  margin-top: var(--spacing-sm);
}

.progress-hint.warning {
  color: var(--color-warning);
}

/* ===== Voting Section ===== */
.voting-section {
  margin-bottom: var(--spacing-lg);
}

.empty-options {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--color-text-placeholder);
  font-size: var(--text-sm);
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.option-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--color-card);
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast);
}

.option-card.voted {
  background: rgba(168, 85, 247, 0.08);
  border: 1px solid rgba(168, 85, 247, 0.2);
}

.option-rank {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 40px;
  flex-shrink: 0;
}

.vote-count {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  color: #a855f7;
}

.vote-label {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
}

.music-cover {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-md);
  object-fit: cover;
  flex-shrink: 0;
}

.music-info {
  flex: 1;
  min-width: 0;
}

.music-name {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.music-singer {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vote-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: #a855f7;
  background: rgba(168, 85, 247, 0.15);
  border: none;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
  min-width: 80px;
  justify-content: center;
}

.vote-btn:hover:not(:disabled) {
  background: #a855f7;
  color: white;
}

.vote-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.vote-btn.voted {
  background: #a855f7;
  color: white;
}

.vote-btn.voted:hover:not(:disabled) {
  background: rgba(168, 85, 247, 0.8);
}

.vote-btn svg {
  width: 14px;
  height: 14px;
}

.btn-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(168, 85, 247, 0.3);
  border-top-color: #a855f7;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.vote-btn.voted .btn-spinner {
  border-color: rgba(255, 255, 255, 0.3);
  border-top-color: white;
}

/* ===== Voted Section ===== */
.voted-section {
  margin-bottom: var(--spacing-lg);
}

.voted-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.voted-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: rgba(168, 85, 247, 0.1);
  border-radius: var(--radius-full);
}

.voted-cover {
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm);
  object-fit: cover;
}

.voted-name {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: #a855f7;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ===== Desktop ===== */
@media (min-width: 1024px) {
  .breadcrumb-wrapper {
    display: block;
  }

  .page-content {
    padding: var(--spacing-xl);
  }

  .campaign-title {
    font-size: var(--text-2xl);
  }

  .campaign-desc {
    font-size: var(--text-base);
  }

  .options-list {
    gap: var(--spacing-md);
  }

  .option-card {
    padding: var(--spacing-lg);
  }

  .music-cover {
    width: 64px;
    height: 64px;
  }

  .music-name {
    font-size: var(--text-base);
  }

  .music-singer {
    font-size: var(--text-sm);
  }

  .vote-btn {
    padding: var(--spacing-sm) var(--spacing-lg);
    font-size: var(--text-sm);
  }
}
</style>
