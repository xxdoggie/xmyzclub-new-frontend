<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/composables/useToast'
import { getCampaigns } from '@/api/campaign'
import type { Campaign, StageType } from '@/types/campaign'
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'

const router = useRouter()
const userStore = useUserStore()
const toast = useToast()

// 状态
const isLoading = ref(true)
const campaigns = ref<Campaign[]>([])

// 过滤后的活动列表（只显示 active 状态的活动）
const displayCampaigns = computed(() => {
  return campaigns.value.filter((c) => c.status === 'active')
})

// 加载活动列表
async function loadCampaigns() {
  if (!userStore.isLoggedIn) {
    isLoading.value = false
    return
  }

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

// 判断活动是否可以进入（只有投稿和投票阶段可以进入）
function canEnterCampaign(campaign: Campaign): boolean {
  if (!campaign.currentStage) return false
  const stageType = campaign.currentStage.stageType
  return stageType === 'submission' || stageType === 'voting'
}

// 获取活动入口文案
function getEnterLabel(stageType: StageType): string {
  const labels: Record<StageType, string> = {
    submission: '去投稿',
    voting: '去投票',
    review: '审核中',
    result: '查看结果',
  }
  return labels[stageType] || ''
}

// 获取阶段状态标签
function getStageLabel(stageType: StageType): string {
  const labels: Record<StageType, string> = {
    submission: '投稿中',
    review: '审核中',
    voting: '投票中',
    result: '已结束',
  }
  return labels[stageType] || ''
}

// 获取阶段状态样式
function getStageClass(stageType: StageType): string {
  const classes: Record<StageType, string> = {
    submission: 'stage-submission',
    review: 'stage-review',
    voting: 'stage-voting',
    result: 'stage-result',
  }
  return classes[stageType] || ''
}

// 跳转到活动详情
function goToCampaign(campaign: Campaign) {
  if (!campaign.currentStage) return

  const stageType = campaign.currentStage.stageType
  if (stageType === 'submission') {
    router.push(`/ringtone/${campaign.id}/submit`)
  } else if (stageType === 'voting') {
    router.push(`/ringtone/${campaign.id}/vote`)
  }
}

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
    return `${diffDays}天${diffHours}小时后结束`
  } else if (diffHours > 0) {
    return `${diffHours}小时后结束`
  } else {
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    return `${diffMinutes}分钟后结束`
  }
}

onMounted(() => {
  loadCampaigns()
})
</script>

<template>
  <div class="page-container">
    <PageHeader back-to="/" />

    <main class="page-content">
      <div class="content-container">
        <!-- 桌面端标题 -->
        <h1 class="page-title desktop-only">宿舍铃声</h1>

        <!-- 未登录提示 -->
        <div v-if="!userStore.isLoggedIn" class="login-prompt">
          <div class="prompt-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M9 18V5l12-2v13"></path>
              <circle cx="6" cy="18" r="3"></circle>
              <circle cx="18" cy="16" r="3"></circle>
            </svg>
          </div>
          <h2>登录后查看活动</h2>
          <p>登录账号即可参与铃声征集活动</p>
          <button class="login-btn" @click="userStore.openLoginModal('请先登录以查看活动')">
            立即登录
          </button>
        </div>

        <!-- 加载状态 -->
        <div v-else-if="isLoading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>

        <!-- 空状态 -->
        <div v-else-if="displayCampaigns.length === 0" class="empty-container">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M9 18V5l12-2v13"></path>
              <circle cx="6" cy="18" r="3"></circle>
              <circle cx="18" cy="16" r="3"></circle>
            </svg>
          </div>
          <h2>暂无活动</h2>
          <p>目前没有进行中的铃声征集活动</p>
        </div>

        <!-- 活动列表 -->
        <div v-else class="campaigns-section">
          <div class="section-header">
            <span class="section-title">铃声征集活动</span>
          </div>

          <div class="campaigns-list">
            <div
              v-for="campaign in displayCampaigns"
              :key="campaign.id"
              class="campaign-card"
              :class="{ clickable: canEnterCampaign(campaign) }"
              @click="canEnterCampaign(campaign) && goToCampaign(campaign)"
            >
              <!-- 活动封面区域 -->
              <div class="campaign-cover">
                <div class="cover-content">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M9 18V5l12-2v13"></path>
                    <circle cx="6" cy="18" r="3"></circle>
                    <circle cx="18" cy="16" r="3"></circle>
                  </svg>
                </div>
                <!-- 状态标签 -->
                <span
                  v-if="campaign.currentStage"
                  class="stage-badge"
                  :class="getStageClass(campaign.currentStage.stageType)"
                >
                  {{ getStageLabel(campaign.currentStage.stageType) }}
                </span>
              </div>

              <!-- 活动信息 -->
              <div class="campaign-info">
                <h3 class="campaign-name">{{ campaign.title }}</h3>
                <p v-if="campaign.description" class="campaign-desc">{{ campaign.description }}</p>
                <div class="campaign-meta">
                  <span class="meta-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    {{ campaign.campus?.name || '未知校区' }}
                  </span>
                  <span v-if="campaign.currentStage?.endTime" class="meta-item countdown">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    {{ formatEndTime(campaign.currentStage.endTime) }}
                  </span>
                </div>
              </div>

              <!-- 操作区域 -->
              <div class="campaign-action">
                <button
                  v-if="canEnterCampaign(campaign)"
                  class="enter-btn"
                  :class="campaign.currentStage?.stageType"
                >
                  {{ getEnterLabel(campaign.currentStage!.stageType) }}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
                <span v-else class="status-text">
                  {{ campaign.currentStage ? getStageLabel(campaign.currentStage.stageType) : '未开始' }}
                </span>
              </div>
            </div>
          </div>
        </div>
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
  padding: var(--spacing-sm) var(--spacing-sm);
}

.content-container {
  max-width: 800px;
  margin: 0 auto;
}

/* ===== Desktop Only Title ===== */
.page-title {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-lg);
}

.desktop-only {
  display: none;
}

/* ===== Section Header ===== */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-sm);
}

.section-title {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
}

/* ===== Login Prompt ===== */
.login-prompt {
  text-align: center;
  padding: var(--spacing-2xl) var(--spacing-md);
}

.prompt-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto var(--spacing-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(6, 182, 212, 0.1);
  color: var(--color-secondary);
  border-radius: var(--radius-xl);
}

.prompt-icon svg {
  width: 40px;
  height: 40px;
}

.login-prompt h2 {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-sm);
}

.login-prompt p {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-lg);
}

.login-btn {
  padding: var(--spacing-sm) var(--spacing-xl);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: white;
  background: var(--color-secondary);
  border: none;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.login-btn:hover {
  opacity: 0.9;
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
  border-top-color: var(--color-secondary);
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
  width: 80px;
  height: 80px;
  margin: 0 auto var(--spacing-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-border);
  color: var(--color-text-secondary);
  border-radius: var(--radius-xl);
}

.empty-icon svg {
  width: 40px;
  height: 40px;
}

.empty-container h2 {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-sm);
}

.empty-container p {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

/* ===== Campaign Card ===== */
.campaigns-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.campaign-card {
  display: flex;
  flex-direction: column;
  background: var(--color-card);
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all var(--transition-fast);
}

.campaign-card.clickable {
  cursor: pointer;
}

.campaign-card.clickable:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.campaign-card.clickable:active {
  transform: translateY(0);
}

/* ===== Campaign Cover ===== */
.campaign-cover {
  position: relative;
  height: 100px;
  background: linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(6, 182, 212, 0.05) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-content {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(6, 182, 212, 0.2);
  color: var(--color-secondary);
  border-radius: var(--radius-lg);
}

.cover-content svg {
  width: 28px;
  height: 28px;
}

.stage-badge {
  position: absolute;
  top: var(--spacing-sm);
  left: var(--spacing-sm);
  padding: 4px 10px;
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  border-radius: var(--radius-full);
  color: white;
  backdrop-filter: blur(4px);
}

.stage-badge.stage-submission {
  background: rgba(6, 182, 212, 0.9);
}

.stage-badge.stage-review {
  background: rgba(245, 158, 11, 0.9);
}

.stage-badge.stage-voting {
  background: rgba(168, 85, 247, 0.9);
}

.stage-badge.stage-result {
  background: rgba(107, 114, 128, 0.9);
}

/* ===== Campaign Info ===== */
.campaign-info {
  flex: 1;
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.campaign-name {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.campaign-desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.campaign-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-md);
  margin-top: var(--spacing-xs);
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.meta-item svg {
  width: 12px;
  height: 12px;
}

.meta-item.countdown {
  color: var(--color-warning);
}

/* ===== Campaign Action ===== */
.campaign-action {
  padding: 0 var(--spacing-md) var(--spacing-md);
}

.enter-btn {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  border: none;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.enter-btn svg {
  width: 16px;
  height: 16px;
}

.enter-btn.submission {
  background: rgba(6, 182, 212, 0.15);
  color: var(--color-secondary);
}

.enter-btn.submission:hover {
  background: var(--color-secondary);
  color: white;
}

.enter-btn.voting {
  background: rgba(168, 85, 247, 0.15);
  color: #a855f7;
}

.enter-btn.voting:hover {
  background: #a855f7;
  color: white;
}

.status-text {
  display: block;
  text-align: center;
  font-size: var(--text-sm);
  color: var(--color-text-placeholder);
  padding: var(--spacing-sm);
}

/* ===== Desktop ===== */
@media (min-width: 1024px) {
  .desktop-only {
    display: block;
  }

  .page-content {
    padding: var(--spacing-xl);
  }

  .content-container {
    max-width: 900px;
  }

  .section-header {
    margin-bottom: var(--spacing-md);
  }

  .section-title {
    font-size: var(--text-base);
  }

  .campaigns-list {
    gap: var(--spacing-lg);
  }

  .campaign-card {
    flex-direction: row;
  }

  .campaign-cover {
    width: 180px;
    height: auto;
    min-height: 140px;
  }

  .campaign-info {
    padding: var(--spacing-lg);
    justify-content: center;
  }

  .campaign-name {
    font-size: var(--text-lg);
  }

  .campaign-desc {
    font-size: var(--text-base);
  }

  .campaign-meta {
    font-size: var(--text-sm);
  }

  .meta-item {
    font-size: var(--text-sm);
  }

  .meta-item svg {
    width: 14px;
    height: 14px;
  }

  .campaign-action {
    display: flex;
    align-items: center;
    padding: var(--spacing-lg);
    padding-left: 0;
  }

  .enter-btn {
    width: auto;
    padding: var(--spacing-sm) var(--spacing-lg);
  }
}
</style>
