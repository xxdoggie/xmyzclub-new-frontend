<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/composables/useToast'
import { getCampaigns } from '@/api/campaign'
import type { Campaign } from '@/types/campaign'
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

// 5个阶段定义
const stages = [
  { key: 'pending', label: '未开始' },
  { key: 'submission', label: '投稿' },
  { key: 'review', label: '审核' },
  { key: 'voting', label: '投票' },
  { key: 'ended', label: '结束' },
]

// 获取当前阶段索引 (0-4)
function getCurrentStageIndex(campaign: Campaign): number {
  if (!campaign.currentStage) return 0 // 未开始

  const stageType = campaign.currentStage.stageType
  switch (stageType) {
    case 'submission': return 1
    case 'review': return 2
    case 'voting': return 3
    case 'result': return 4
    default: return 0
  }
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
      <!-- 移动端标题卡片 -->
      <div class="mobile-header mobile-only">
        <div class="header-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M9 18V5l12-2v13"></path>
            <circle cx="6" cy="18" r="3"></circle>
            <circle cx="18" cy="16" r="3"></circle>
          </svg>
        </div>
        <div class="header-text">
          <h1>宿舍铃声</h1>
          <p>参与铃声征集活动，让你的音乐响彻校园</p>
        </div>
      </div>

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
          <!-- 桌面端显示标题 -->
          <div class="section-header desktop-only">
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
              <!-- 进度条区域 -->
              <div class="campaign-steps">
                <div class="steps-track">
                  <div
                    v-for="(stage, index) in stages"
                    :key="stage.key"
                    class="step-item"
                    :class="{
                      active: index === getCurrentStageIndex(campaign),
                      completed: index < getCurrentStageIndex(campaign),
                    }"
                  >
                    <div class="step-dot">
                      <svg v-if="index < getCurrentStageIndex(campaign)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <span class="step-label">{{ stage.label }}</span>
                  </div>
                </div>
                <div class="steps-line">
                  <div
                    class="steps-line-fill"
                    :style="{ width: `${(getCurrentStageIndex(campaign) / (stages.length - 1)) * 100}%` }"
                  ></div>
                </div>
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

.mobile-only {
  display: flex;
}

/* ===== Mobile Header ===== */
.mobile-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-sm);
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark, #4f46e5) 100%);
  border-radius: var(--radius-xl);
  color: white;
  box-shadow: 0 4px 16px rgba(var(--color-primary-rgb, 99, 102, 241), 0.25);
}

.header-icon {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-lg);
  flex-shrink: 0;
}

.header-icon svg {
  width: 28px;
  height: 28px;
}

.header-text {
  flex: 1;
  min-width: 0;
}

.header-text h1 {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  margin-bottom: 2px;
}

.header-text p {
  font-size: var(--text-xs);
  opacity: 0.9;
  line-height: 1.4;
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
  background: var(--color-card);
  border-radius: var(--radius-xl);
  margin-top: var(--spacing-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.prompt-icon {
  width: 88px;
  height: 88px;
  margin: 0 auto var(--spacing-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-primary-bg) 0%, var(--color-primary-light, rgba(var(--color-primary-rgb, 99, 102, 241), 0.15)) 100%);
  color: var(--color-primary);
  border-radius: 50%;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

.prompt-icon svg {
  width: 44px;
  height: 44px;
}

.login-prompt h2 {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-sm);
  color: var(--color-text);
}

.login-prompt p {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xl);
  line-height: 1.6;
}

.login-btn {
  padding: var(--spacing-sm) var(--spacing-2xl);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: white;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark, #4f46e5) 100%);
  border: none;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(var(--color-primary-rgb, 99, 102, 241), 0.3);
}

.login-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(var(--color-primary-rgb, 99, 102, 241), 0.4);
}

.login-btn:active {
  transform: translateY(0);
}

/* ===== Loading ===== */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-2xl);
  color: var(--color-text-secondary);
  background: var(--color-card);
  border-radius: var(--radius-xl);
  margin-top: var(--spacing-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.loading-spinner {
  width: 36px;
  height: 36px;
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

.loading-container p {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

/* ===== Empty ===== */
.empty-container {
  text-align: center;
  padding: var(--spacing-2xl) var(--spacing-md);
  background: var(--color-card);
  border-radius: var(--radius-xl);
  margin-top: var(--spacing-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.empty-icon {
  width: 88px;
  height: 88px;
  margin: 0 auto var(--spacing-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg);
  color: var(--color-text-tertiary);
  border-radius: 50%;
}

.empty-icon svg {
  width: 44px;
  height: 44px;
  opacity: 0.6;
}

.empty-container h2 {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-sm);
  color: var(--color-text);
}

.empty-container p {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: 1.6;
}

/* ===== Campaign Card ===== */
.campaigns-section {
  padding-bottom: env(safe-area-inset-bottom, 0);
}

.campaigns-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.campaign-card {
  display: flex;
  flex-direction: column;
  background: var(--color-card);
  border-radius: var(--radius-xl);
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04);
  border: 1px solid var(--color-border-light, rgba(0, 0, 0, 0.04));
}

.campaign-card.clickable {
  cursor: pointer;
}

.campaign-card.clickable:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.06);
  transform: translateY(-4px);
  border-color: var(--color-primary-light, rgba(var(--color-primary-rgb, 99, 102, 241), 0.2));
}

.campaign-card.clickable:active {
  transform: translateY(-2px);
  transition: all 0.1s ease;
}

/* ===== Campaign Steps ===== */
.campaign-steps {
  position: relative;
  padding: var(--spacing-lg) var(--spacing-md);
  padding-bottom: var(--spacing-sm);
  background: linear-gradient(135deg, var(--color-primary-bg) 0%, transparent 60%);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
}

.steps-track {
  display: flex;
  justify-content: space-between;
  position: relative;
  z-index: 1;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.step-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--color-card);
  border: 2px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 6px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.step-dot::before {
  content: '';
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-border);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.step-dot svg {
  width: 12px;
  height: 12px;
  color: white;
  position: relative;
  z-index: 1;
}

.step-item.active .step-dot {
  background: var(--color-primary);
  border-color: var(--color-primary);
  box-shadow: 0 0 0 4px rgba(var(--color-primary-rgb, 99, 102, 241), 0.2);
  animation: pulse-ring 2s ease-out infinite;
}

.step-item.active .step-dot::before {
  display: none;
}

@keyframes pulse-ring {
  0% {
    box-shadow: 0 0 0 0 rgba(var(--color-primary-rgb, 99, 102, 241), 0.4);
  }
  70% {
    box-shadow: 0 0 0 8px rgba(var(--color-primary-rgb, 99, 102, 241), 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(var(--color-primary-rgb, 99, 102, 241), 0);
  }
}

.step-item.completed .step-dot {
  background: var(--color-success);
  border-color: var(--color-success);
}

.step-item.completed .step-dot::before {
  display: none;
}

.step-label {
  font-size: 11px;
  color: var(--color-text-placeholder);
  white-space: nowrap;
  transition: all var(--transition-fast);
  font-weight: var(--font-medium);
}

.step-item.active .step-label {
  color: var(--color-primary);
  font-weight: var(--font-semibold);
}

.step-item.completed .step-label {
  color: var(--color-success);
}

.steps-line {
  position: absolute;
  top: calc(var(--spacing-lg) + 11px);
  left: calc(10% + 12px);
  right: calc(10% + 12px);
  height: 3px;
  background: var(--color-border);
  border-radius: 2px;
}

.steps-line-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-success), var(--color-success-light, #34d399));
  border-radius: 2px;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

/* ===== Campaign Info ===== */
.campaign-info {
  flex: 1;
  padding: var(--spacing-md);
  padding-top: var(--spacing-sm);
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.campaign-title {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text);
}

.campaign-desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: 1.6;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  white-space: normal;
}

.campaign-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  font-size: var(--text-sm);
  margin-top: var(--spacing-sm);
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: var(--color-bg);
  border-radius: var(--radius-full);
  color: var(--color-text-secondary);
  font-weight: var(--font-medium);
}

.meta-divider {
  display: none;
}

.meta-item.countdown {
  color: var(--color-warning);
  background: rgba(var(--color-warning-rgb, 245, 158, 11), 0.1);
}

.campaign-arrow {
  display: none;
}

/* ===== Action Hint ===== */
.campaign-card.clickable .campaign-info::after {
  content: '点击进入';
  display: inline-flex;
  align-items: center;
  font-size: var(--text-xs);
  color: var(--color-primary);
  opacity: 0.7;
  margin-top: var(--spacing-xs);
  transition: opacity var(--transition-fast);
}

.campaign-card.clickable:hover .campaign-info::after,
.campaign-card.clickable:active .campaign-info::after {
  opacity: 1;
}

/* ===== Desktop ===== */
@media (min-width: 1024px) {
  .desktop-only {
    display: block;
  }

  .mobile-only {
    display: none !important;
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
    gap: var(--spacing-xl);
  }

  .campaign-card {
    flex-direction: row;
    align-items: stretch;
  }

  .campaign-steps {
    width: 320px;
    flex-shrink: 0;
    padding: var(--spacing-xl) var(--spacing-lg);
    padding-bottom: var(--spacing-lg);
    border-radius: var(--radius-xl) 0 0 var(--radius-xl);
  }

  .step-dot {
    width: 28px;
    height: 28px;
  }

  .step-dot::before {
    width: 10px;
    height: 10px;
  }

  .step-dot svg {
    width: 14px;
    height: 14px;
  }

  .step-label {
    font-size: var(--text-xs);
  }

  .steps-line {
    top: calc(var(--spacing-xl) + 13px);
    height: 4px;
  }

  .campaign-info {
    padding: var(--spacing-xl);
    justify-content: center;
  }

  .campaign-info::after {
    display: none !important;
  }

  .campaign-title {
    font-size: var(--text-xl);
  }

  .campaign-desc {
    font-size: var(--text-base);
    -webkit-line-clamp: 1;
  }

  .campaign-meta {
    font-size: var(--text-sm);
    margin-top: var(--spacing-md);
  }

  .meta-item {
    padding: 6px 14px;
  }

  .campaign-arrow {
    display: flex;
    align-items: center;
    padding: 0 var(--spacing-xl);
    color: var(--color-text-placeholder);
    transition: all var(--transition-fast);
  }

  .campaign-card.clickable:hover .campaign-arrow {
    color: var(--color-primary);
    transform: translateX(4px);
  }

  .campaign-arrow svg {
    width: 24px;
    height: 24px;
  }
}
</style>
