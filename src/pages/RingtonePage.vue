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
          <!-- 移动端隐藏标题 -->
          <div class="section-header desktop-only">
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
              <!-- 左侧状态指示条 -->
              <div
                class="status-indicator"
                :class="getStageClass(campaign.currentStage?.stageType || 'result')"
              ></div>

              <!-- 主要内容区域 -->
              <div class="card-content">
                <!-- 顶部：标题和状态标签 -->
                <div class="card-header">
                  <h3 class="campaign-title">{{ campaign.title }}</h3>
                  <span
                    v-if="campaign.currentStage"
                    class="stage-tag"
                    :class="getStageClass(campaign.currentStage.stageType)"
                  >
                    {{ getStageLabel(campaign.currentStage.stageType) }}
                  </span>
                </div>

                <!-- 描述 -->
                <p v-if="campaign.description" class="campaign-desc">{{ campaign.description }}</p>

                <!-- 元信息 -->
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

              <!-- 右侧操作区域 -->
              <div class="card-action">
                <button
                  v-if="canEnterCampaign(campaign)"
                  class="action-btn"
                  :class="getStageClass(campaign.currentStage!.stageType)"
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
  padding: var(--spacing-sm);
}

.content-container {
  max-width: 800px;
  margin: 0 auto;
}

/* ===== Desktop Only ===== */
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
  margin-bottom: var(--spacing-md);
}

.section-title {
  font-size: var(--text-base);
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
  background: var(--color-primary-bg);
  color: var(--color-primary);
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
  background: var(--color-primary);
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

/* ===== Campaign Card - Modern Compact Design ===== */
.campaigns-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.campaign-card {
  display: flex;
  align-items: stretch;
  background: var(--color-card);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: all var(--transition-fast);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.campaign-card.clickable {
  cursor: pointer;
}

.campaign-card.clickable:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.campaign-card.clickable:active {
  transform: translateY(0);
}

/* ===== Status Indicator ===== */
.status-indicator {
  width: 4px;
  flex-shrink: 0;
}

.status-indicator.stage-submission {
  background: var(--color-primary);
}

.status-indicator.stage-review {
  background: var(--color-warning);
}

.status-indicator.stage-voting {
  background: var(--color-info);
}

.status-indicator.stage-result {
  background: var(--color-text-secondary);
}

/* ===== Card Content ===== */
.card-content {
  flex: 1;
  padding: var(--spacing-md);
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-sm);
}

.campaign-title {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  line-height: 1.4;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stage-tag {
  flex-shrink: 0;
  padding: 2px 8px;
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  border-radius: var(--radius-sm);
}

.stage-tag.stage-submission {
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

.stage-tag.stage-review {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.stage-tag.stage-voting {
  background: var(--color-info-bg);
  color: var(--color-info);
}

.stage-tag.stage-result {
  background: var(--color-border);
  color: var(--color-text-secondary);
}

.campaign-desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.campaign-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
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
  flex-shrink: 0;
}

.meta-item.countdown {
  color: var(--color-warning);
}

/* ===== Card Action ===== */
.card-action {
  display: flex;
  align-items: center;
  padding-right: var(--spacing-md);
  flex-shrink: 0;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.action-btn svg {
  width: 14px;
  height: 14px;
}

.action-btn.stage-submission {
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

.action-btn.stage-submission:hover {
  background: var(--color-primary);
  color: white;
}

.action-btn.stage-voting {
  background: var(--color-info-bg);
  color: var(--color-info);
}

.action-btn.stage-voting:hover {
  background: var(--color-info);
  color: white;
}

.status-text {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
  padding: var(--spacing-xs);
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

  .campaigns-list {
    gap: var(--spacing-md);
  }

  .campaign-card {
    border-radius: var(--radius-xl);
  }

  .status-indicator {
    width: 5px;
  }

  .card-content {
    padding: var(--spacing-lg);
    gap: var(--spacing-sm);
  }

  .campaign-title {
    font-size: var(--text-lg);
  }

  .stage-tag {
    padding: 4px 10px;
    font-size: var(--text-sm);
  }

  .campaign-desc {
    font-size: var(--text-base);
    white-space: normal;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .meta-item {
    font-size: var(--text-sm);
  }

  .meta-item svg {
    width: 14px;
    height: 14px;
  }

  .card-action {
    padding: var(--spacing-lg);
    padding-left: 0;
  }

  .action-btn {
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: var(--text-sm);
  }

  .action-btn svg {
    width: 16px;
    height: 16px;
  }
}
</style>
