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

// 获取阶段状态标签和样式
function getStageInfo(stageType: StageType): { label: string; class: string } {
  const info: Record<StageType, { label: string; class: string }> = {
    submission: { label: '投稿中', class: 'stage-submission' },
    review: { label: '审核中', class: 'stage-review' },
    voting: { label: '投票中', class: 'stage-voting' },
    result: { label: '已结束', class: 'stage-result' },
  }
  return info[stageType] || { label: '', class: '' }
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
            <span class="section-title">全部活动</span>
          </div>

          <div class="campaigns-list">
            <div
              v-for="campaign in displayCampaigns"
              :key="campaign.id"
              class="campaign-card"
              :class="{ clickable: canEnterCampaign(campaign) }"
              @click="canEnterCampaign(campaign) && goToCampaign(campaign)"
            >
              <!-- 卡片封面区域 -->
              <div class="campaign-cover">
                <div class="cover-gradient">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M9 18V5l12-2v13"></path>
                    <circle cx="6" cy="18" r="3"></circle>
                    <circle cx="18" cy="16" r="3"></circle>
                  </svg>
                </div>
                <!-- 状态标签 -->
                <span
                  v-if="campaign.currentStage"
                  class="status-badge"
                  :class="getStageInfo(campaign.currentStage.stageType).class"
                >
                  {{ getStageInfo(campaign.currentStage.stageType).label }}
                </span>
              </div>

              <!-- 活动信息 -->
              <div class="campaign-info">
                <h3 class="campaign-title">{{ campaign.title }}</h3>
                <p v-if="campaign.description" class="campaign-desc">{{ campaign.description }}</p>
                <div class="campaign-meta">
                  <span class="meta-item">{{ campaign.campus?.name || '未知校区' }}</span>
                  <span v-if="campaign.currentStage?.endTime" class="meta-divider">·</span>
                  <span v-if="campaign.currentStage?.endTime" class="meta-item countdown">
                    {{ formatEndTime(campaign.currentStage.endTime) }}
                  </span>
                </div>
              </div>

              <!-- 箭头（桌面端显示） -->
              <div class="campaign-arrow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
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
  transition: all var(--transition-fast);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
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
  width: 100%;
  height: 100px;
  flex-shrink: 0;
}

.cover-gradient {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-primary-bg) 0%, var(--color-info-bg) 100%);
  color: var(--color-primary);
}

.cover-gradient svg {
  width: 36px;
  height: 36px;
  opacity: 0.6;
}

.status-badge {
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

.status-badge.stage-submission {
  background: rgba(231, 76, 60, 0.9);
}

.status-badge.stage-review {
  background: rgba(245, 158, 11, 0.9);
}

.status-badge.stage-voting {
  background: rgba(59, 130, 246, 0.9);
}

.status-badge.stage-result {
  background: rgba(107, 114, 128, 0.9);
}

/* ===== Campaign Info ===== */
.campaign-info {
  flex: 1;
  padding: var(--spacing-md);
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.campaign-title {
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
  white-space: nowrap;
}

.campaign-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  margin-top: var(--spacing-xs);
}

.meta-divider {
  color: var(--color-border);
}

.meta-item.countdown {
  color: var(--color-warning);
}

.campaign-arrow {
  display: none;
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
    width: 160px;
    height: 100px;
  }

  .campaign-info {
    padding: var(--spacing-lg);
    justify-content: center;
  }

  .campaign-title {
    font-size: var(--text-lg);
  }

  .campaign-desc {
    font-size: var(--text-base);
  }

  .campaign-meta {
    font-size: var(--text-sm);
  }

  .campaign-arrow {
    display: flex;
    align-items: center;
    padding: 0 var(--spacing-lg);
    color: var(--color-text-placeholder);
  }

  .campaign-arrow svg {
    width: 20px;
    height: 20px;
  }
}
</style>
