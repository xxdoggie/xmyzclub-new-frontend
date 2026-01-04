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
    submission: '投稿进行中',
    review: '审核阶段',
    voting: '投票进行中',
    result: '结果公示',
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

// 格式化日期
function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
  })
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

        <!-- 加载状态 -->
        <div v-if="isLoading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>

        <!-- 空状态 -->
        <div v-else-if="displayCampaigns.length === 0" class="empty-container">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </div>
          <h2>暂无活动</h2>
          <p>目前没有进行中的铃声征集活动</p>
          <p class="empty-hint">请稍后再来查看</p>
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
              <!-- 活动图标 -->
              <div class="campaign-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M9 18V5l12-2v13"></path>
                  <circle cx="6" cy="18" r="3"></circle>
                  <circle cx="18" cy="16" r="3"></circle>
                </svg>
              </div>

              <!-- 活动信息 -->
              <div class="campaign-info">
                <div class="campaign-header">
                  <h3 class="campaign-name">{{ campaign.title }}</h3>
                  <span
                    v-if="campaign.currentStage"
                    class="stage-badge"
                    :class="getStageClass(campaign.currentStage.stageType)"
                  >
                    {{ getStageLabel(campaign.currentStage.stageType) }}
                  </span>
                </div>
                <p class="campaign-desc">{{ campaign.description }}</p>
                <div class="campaign-meta">
                  <span class="meta-item">{{ campaign.campus?.name || '未知校区' }}</span>
                  <span class="meta-divider">·</span>
                  <span class="meta-item">{{ formatDate(campaign.createdAt) }}</span>
                  <template v-if="campaign.currentStage?.endTime">
                    <span class="meta-divider">·</span>
                    <span class="meta-item countdown">{{ formatEndTime(campaign.currentStage.endTime) }}</span>
                  </template>
                </div>
              </div>

              <!-- 操作按钮 -->
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
  padding: var(--spacing-sm);
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
  background: rgba(6, 182, 212, 0.1);
  color: var(--color-secondary);
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
  margin-bottom: var(--spacing-xs);
}

.empty-hint {
  font-size: var(--text-sm);
  color: var(--color-text-placeholder);
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
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--color-card);
  border-radius: var(--radius-xl);
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

.campaign-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(6, 182, 212, 0.1);
  color: var(--color-secondary);
  border-radius: var(--radius-lg);
  flex-shrink: 0;
}

.campaign-icon svg {
  width: 24px;
  height: 24px;
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
  line-height: 1.4;
}

.stage-badge {
  font-size: 10px;
  font-weight: var(--font-semibold);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  white-space: nowrap;
}

.stage-badge.stage-submission {
  background: rgba(6, 182, 212, 0.15);
  color: var(--color-secondary);
}

.stage-badge.stage-review {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.stage-badge.stage-voting {
  background: rgba(168, 85, 247, 0.15);
  color: #a855f7;
}

.stage-badge.stage-result {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.campaign-desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: 1.5;
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
  color: var(--color-text-tertiary);
  flex-wrap: wrap;
}

.meta-divider {
  color: var(--color-border);
}

.meta-item.countdown {
  color: var(--color-warning);
}

.campaign-action {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.enter-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  border: none;
  border-radius: var(--radius-full);
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
  font-size: var(--text-sm);
  color: var(--color-text-placeholder);
}

/* ===== Desktop ===== */
@media (min-width: 768px) {
  .campaign-card {
    flex-direction: row;
    align-items: center;
  }

  .campaign-action {
    flex-shrink: 0;
  }
}

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
    padding: var(--spacing-lg);
  }

  .campaign-icon {
    width: 56px;
    height: 56px;
  }

  .campaign-icon svg {
    width: 28px;
    height: 28px;
  }

  .campaign-name {
    font-size: var(--text-lg);
  }

  .campaign-desc {
    font-size: var(--text-base);
  }

  .enter-btn {
    padding: var(--spacing-sm) var(--spacing-lg);
  }
}
</style>
