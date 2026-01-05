<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/composables/useToast'
import { getCampaignDetail, getVotingResults } from '@/api/campaign'
import type { Campaign, TimePeriodVotingResult, BuildingVotingResult, VotingOption } from '@/types/campaign'
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb.vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const toast = useToast()

// ==================== 状态 ====================
const campaignId = computed(() => Number(route.params.id))
const isLoading = ref(true)
const isExporting = ref(false)
const campaign = ref<Campaign | null>(null)
const timePeriodResults = ref<TimePeriodVotingResult[]>([])

// 展开的时段
const expandedPeriodIds = ref<Set<number>>(new Set())

// 展开的宿舍楼
const expandedBuildings = ref<Set<string>>(new Set())

// ==================== 辅助函数 ====================

function getRankClass(rank: number): string {
  if (rank === 1) return 'rank-gold'
  if (rank === 2) return 'rank-silver'
  if (rank === 3) return 'rank-bronze'
  return ''
}

function getRankIcon(rank: number): string {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return String(rank)
}

// 计算总投票数
const totalVotes = computed(() => {
  let count = 0
  timePeriodResults.value.forEach(period => {
    period.buildingResults.forEach(building => {
      count += building.totalVotes
    })
  })
  return count
})

// 计算参与宿舍楼数
const totalBuildings = computed(() => {
  const buildings = new Set<string>()
  timePeriodResults.value.forEach(period => {
    period.buildingResults.forEach(building => {
      buildings.add(building.buildingCode)
    })
  })
  return buildings.size
})

// 计算音乐选项数
const totalOptions = computed(() => {
  let count = 0
  timePeriodResults.value.forEach(period => {
    period.buildingResults.forEach(building => {
      count += building.options.length
    })
  })
  return count
})

// ==================== 展开/收起 ====================

function togglePeriodExpand(periodId: number) {
  if (expandedPeriodIds.value.has(periodId)) {
    expandedPeriodIds.value.delete(periodId)
  } else {
    expandedPeriodIds.value.add(periodId)
  }
}

function isPeriodExpanded(periodId: number): boolean {
  return expandedPeriodIds.value.has(periodId)
}

function getBuildingKey(periodId: number, buildingCode: string): string {
  return `${periodId}-${buildingCode}`
}

function toggleBuildingExpand(periodId: number, buildingCode: string) {
  const key = getBuildingKey(periodId, buildingCode)
  if (expandedBuildings.value.has(key)) {
    expandedBuildings.value.delete(key)
  } else {
    expandedBuildings.value.add(key)
  }
}

function isBuildingExpanded(periodId: number, buildingCode: string): boolean {
  return expandedBuildings.value.has(getBuildingKey(periodId, buildingCode))
}

// ==================== 数据加载 ====================

async function loadResults() {
  isLoading.value = true
  try {
    const [campaignRes, resultsRes] = await Promise.all([
      getCampaignDetail(campaignId.value),
      getVotingResults(campaignId.value),
    ])

    if (campaignRes.data.code === 200) {
      campaign.value = campaignRes.data.data
    } else {
      toast.error(campaignRes.data.message || '获取活动详情失败')
      return
    }

    if (resultsRes.data.code === 200) {
      timePeriodResults.value = resultsRes.data.data
      // 默认展开第一个时段和其第一个宿舍楼
      if (timePeriodResults.value.length > 0) {
        const firstPeriod = timePeriodResults.value[0]
        expandedPeriodIds.value.add(firstPeriod.timePeriod.id)
        if (firstPeriod.buildingResults.length > 0) {
          expandedBuildings.value.add(
            getBuildingKey(firstPeriod.timePeriod.id, firstPeriod.buildingResults[0].buildingCode)
          )
        }
      }
    } else {
      toast.error(resultsRes.data.message || '获取投票结果失败')
    }
  } catch (error) {
    toast.error('获取投票结果失败')
  } finally {
    isLoading.value = false
  }
}

// 导出投票结果
async function exportResults() {
  if (isExporting.value) return

  isExporting.value = true
  try {
    const response = await fetch(`/api/v2/admin/voting/campaigns/${campaignId.value}/export`, {
      method: 'GET',
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error('导出失败')
    }

    // 从响应头获取文件名
    const contentDisposition = response.headers.get('Content-Disposition')
    let filename = `voting-results-${campaignId.value}.xlsx`
    if (contentDisposition) {
      const match = contentDisposition.match(/filename\*?=['"]?(?:UTF-8'')?([^;\r\n"']*)['"]?/i)
      if (match && match[1]) {
        filename = decodeURIComponent(match[1])
      }
    }

    // 下载文件
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    toast.success('导出成功')
  } catch (error) {
    toast.error('导出失败，请稍后重试')
  } finally {
    isExporting.value = false
  }
}

// ==================== 生命周期 ====================

onMounted(() => {
  if (!userStore.isLoggedIn || !userStore.canManageCampaigns) {
    toast.error('无权访问此页面')
    router.push('/')
    return
  }
  loadResults()
})
</script>

<template>
  <div class="page-container">
    <PageHeader :back-to="`/admin/campaigns`" />

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
              <h1 class="page-title">投票结果</h1>
              <p class="page-subtitle" v-if="campaign">{{ campaign.title }}</p>
            </div>
            <button
              class="export-btn"
              :disabled="isExporting || isLoading"
              @click="exportResults"
            >
              <svg v-if="!isExporting" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              <span v-if="isExporting" class="export-spinner"></span>
              {{ isExporting ? '导出中...' : '导出表格' }}
            </button>
          </div>
        </div>

        <!-- 加载状态 -->
        <div v-if="isLoading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>

        <template v-else>
          <!-- 统计卡片 -->
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">{{ totalVotes }}</div>
              <div class="stat-label">总投票数</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ totalBuildings }}</div>
              <div class="stat-label">宿舍楼数</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ totalOptions }}</div>
              <div class="stat-label">候选音乐</div>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-if="timePeriodResults.length === 0" class="empty-container">
            <div class="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
              </svg>
            </div>
            <h2>暂无投票数据</h2>
            <p>该活动还没有收到任何投票</p>
          </div>

          <!-- 按时段分组的结果列表 -->
          <div v-else class="period-groups">
            <div
              v-for="periodData in timePeriodResults"
              :key="periodData.timePeriod.id"
              class="period-group"
            >
              <!-- 时段头部 -->
              <div class="period-header" @click="togglePeriodExpand(periodData.timePeriod.id)">
                <div class="period-info">
                  <h3 class="period-name">{{ periodData.timePeriod.name }}</h3>
                  <span class="period-count">{{ periodData.buildingResults.length }} 栋宿舍楼</span>
                </div>
                <div class="expand-icon" :class="{ expanded: isPeriodExpanded(periodData.timePeriod.id) }">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
              </div>

              <!-- 宿舍楼列表 -->
              <Transition name="expand">
                <div v-if="isPeriodExpanded(periodData.timePeriod.id)" class="buildings-list">
                  <div
                    v-for="building in periodData.buildingResults"
                    :key="building.buildingCode"
                    class="building-group"
                  >
                    <!-- 宿舍楼头部 -->
                    <div
                      class="building-header"
                      @click="toggleBuildingExpand(periodData.timePeriod.id, building.buildingCode)"
                    >
                      <div class="building-info">
                        <span class="building-name">{{ building.buildingName }}</span>
                        <span class="building-votes">{{ building.totalVotes }} 票</span>
                      </div>
                      <div class="building-expand-icon" :class="{ expanded: isBuildingExpanded(periodData.timePeriod.id, building.buildingCode) }">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </div>
                    </div>

                    <!-- 投票选项列表 -->
                    <Transition name="expand">
                      <div
                        v-if="isBuildingExpanded(periodData.timePeriod.id, building.buildingCode)"
                        class="options-list"
                      >
                        <div v-if="building.options.length === 0" class="no-options">
                          暂无投票数据
                        </div>
                        <div
                          v-else
                          v-for="(option, index) in building.options"
                          :key="option.id"
                          class="option-card"
                          :class="getRankClass(index + 1)"
                        >
                          <!-- 排名 -->
                          <div class="option-rank" :class="getRankClass(index + 1)">
                            <span class="rank-icon" v-if="index < 3">{{ getRankIcon(index + 1) }}</span>
                            <span class="rank-number" v-else>{{ index + 1 }}</span>
                          </div>

                          <!-- 音乐信息 -->
                          <div class="option-music">
                            <div class="music-cover">
                              <img
                                v-if="option.music.cover"
                                :src="option.music.cover"
                                :alt="option.music.song"
                              />
                              <div v-else class="cover-placeholder">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <path d="M9 18V5l12-2v13"></path>
                                  <circle cx="6" cy="18" r="3"></circle>
                                  <circle cx="18" cy="16" r="3"></circle>
                                </svg>
                              </div>
                            </div>
                            <div class="music-info">
                              <h4 class="music-name">{{ option.music.song }}</h4>
                              <p class="music-artist">{{ option.music.singer }}</p>
                              <div class="music-meta">
                                <span class="meta-item">{{ option.music.album }}</span>
                                <span class="meta-divider">|</span>
                                <span class="meta-item">{{ option.music.interval }}</span>
                              </div>
                            </div>
                          </div>

                          <!-- 票数 -->
                          <div class="option-votes">
                            <span class="vote-value">{{ option.voteCount }}</span>
                            <span class="vote-label">票</span>
                          </div>
                        </div>
                      </div>
                    </Transition>
                  </div>
                </div>
              </Transition>
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
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-md);
}

.header-text {
  display: none;
}

/* ===== Export Button ===== */
.export-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: white;
  background: var(--color-primary);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.export-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.export-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.export-btn svg {
  width: 16px;
  height: 16px;
}

.export-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
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
}

/* ===== Stats Grid ===== */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-lg);
}

.stat-card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
  text-align: center;
}

.stat-value {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-primary);
  margin-bottom: var(--spacing-xs);
}

.stat-label {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

/* ===== Period Group ===== */
.period-groups {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.period-group {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.period-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.period-header:hover {
  background: var(--color-bg);
}

.period-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.period-name {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
}

.period-count {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  background: var(--color-border);
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

.expand-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  transition: transform 0.2s ease;
}

.expand-icon.expanded {
  transform: rotate(180deg);
}

.expand-icon svg {
  width: 16px;
  height: 16px;
}

/* ===== Buildings List ===== */
.buildings-list {
  border-top: 1px solid var(--color-border);
  background: var(--color-bg);
}

.building-group {
  border-bottom: 1px solid var(--color-border);
}

.building-group:last-child {
  border-bottom: none;
}

.building-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.building-header:hover {
  background: var(--color-card);
}

.building-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.building-name {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.building-votes {
  font-size: var(--text-xs);
  color: var(--color-primary);
  background: var(--color-primary-bg);
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

.building-expand-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  transition: transform 0.2s ease;
}

.building-expand-icon.expanded {
  transform: rotate(180deg);
}

.building-expand-icon svg {
  width: 14px;
  height: 14px;
}

/* ===== Options List ===== */
.options-list {
  padding: var(--spacing-sm);
  background: var(--color-card);
  border-top: 1px solid var(--color-border);
}

.no-options {
  text-align: center;
  padding: var(--spacing-md);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.option-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-xs);
  transition: all var(--transition-fast);
}

.option-card:last-child {
  margin-bottom: 0;
}

.option-card:hover {
  border-color: var(--color-primary);
}

.option-card.rank-gold {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-color: #f59e0b;
}

.option-card.rank-silver {
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  border-color: #94a3b8;
}

.option-card.rank-bronze {
  background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%);
  border-color: #f97316;
}

/* ===== Rank ===== */
.option-rank {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-border);
  border-radius: 50%;
  flex-shrink: 0;
}

.option-rank.rank-gold {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  color: white;
}

.option-rank.rank-silver {
  background: linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%);
  color: white;
}

.option-rank.rank-bronze {
  background: linear-gradient(135deg, #fb923c 0%, #f97316 100%);
  color: white;
}

.rank-icon {
  font-size: var(--text-sm);
}

.rank-number {
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  color: var(--color-text-secondary);
}

/* ===== Music Info ===== */
.option-music {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex: 1;
  min-width: 0;
}

.music-cover {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  overflow: hidden;
  flex-shrink: 0;
}

.music-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-border);
  color: var(--color-text-secondary);
}

.cover-placeholder svg {
  width: 18px;
  height: 18px;
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

.music-artist {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  margin-bottom: 2px;
}

.music-meta {
  display: none;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
}

.meta-divider {
  color: var(--color-border);
}

/* ===== Vote Stats ===== */
.option-votes {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
  padding: 0 var(--spacing-sm);
}

.vote-value {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  color: var(--color-primary);
}

.vote-label {
  font-size: 10px;
  color: var(--color-text-secondary);
}

/* ===== Expand Animation ===== */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}

/* ===== Desktop ===== */
@media (min-width: 640px) {
  .stats-grid {
    gap: var(--spacing-md);
  }

  .stat-card {
    padding: var(--spacing-lg);
  }

  .stat-value {
    font-size: var(--text-3xl);
  }

  .stat-label {
    font-size: var(--text-sm);
  }

  .music-cover {
    width: 48px;
    height: 48px;
  }

  .music-meta {
    display: flex;
  }
}

@media (min-width: 1024px) {
  .breadcrumb-wrapper {
    display: block;
  }

  .page-content {
    padding: var(--spacing-xl);
  }

  .header-text {
    display: block;
  }

  .page-title {
    font-size: var(--text-2xl);
  }

  .option-card {
    gap: var(--spacing-md);
    padding: var(--spacing-md);
  }

  .option-rank {
    width: 40px;
    height: 40px;
  }

  .rank-icon {
    font-size: var(--text-base);
  }
}
</style>
