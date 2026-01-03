<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/composables/useToast'
import { getVotingResults } from '@/api/campaign'
import type { VotingResultResponse, VotingResultItem } from '@/types/campaign'
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
const resultData = ref<VotingResultResponse | null>(null)

// ==================== 辅助函数 ====================

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}

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

// ==================== 数据加载 ====================

async function loadResults() {
  isLoading.value = true
  try {
    const res = await getVotingResults(campaignId.value)
    if (res.data.code === 200) {
      resultData.value = res.data.data
    } else {
      toast.error(res.data.message || '获取投票结果失败')
    }
  } catch (error) {
    toast.error('获取投票结果失败')
  } finally {
    isLoading.value = false
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
              <p class="page-subtitle" v-if="resultData">{{ resultData.campaign.name }}</p>
            </div>
          </div>
        </div>

        <!-- 加载状态 -->
        <div v-if="isLoading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>

        <template v-else-if="resultData">
          <!-- 统计卡片 -->
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">{{ resultData.stats.totalVotes }}</div>
              <div class="stat-label">总投票数</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ resultData.stats.totalVoters }}</div>
              <div class="stat-label">参与人数</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ resultData.stats.validSubmissions }}</div>
              <div class="stat-label">有效投稿</div>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-if="resultData.results.length === 0" class="empty-container">
            <div class="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
              </svg>
            </div>
            <h2>暂无投票数据</h2>
            <p>该活动还没有收到任何投票</p>
          </div>

          <!-- 排名列表 -->
          <div v-else class="results-list">
            <div
              v-for="item in resultData.results"
              :key="item.music.id"
              class="result-card"
              :class="getRankClass(item.rank)"
            >
              <!-- 排名 -->
              <div class="result-rank" :class="getRankClass(item.rank)">
                <span class="rank-icon" v-if="item.rank <= 3">{{ getRankIcon(item.rank) }}</span>
                <span class="rank-number" v-else>{{ item.rank }}</span>
              </div>

              <!-- 音乐信息 -->
              <div class="result-music">
                <div class="music-cover">
                  <img
                    v-if="item.music.coverImage"
                    :src="item.music.coverImage"
                    :alt="item.music.name"
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
                  <h3 class="music-name">{{ item.music.name }}</h3>
                  <p class="music-artist">{{ item.music.artist }}</p>
                  <div class="music-meta">
                    <span class="meta-item">{{ item.music.source }}</span>
                    <span class="meta-divider">|</span>
                    <span class="meta-item">{{ formatDuration(item.music.duration) }}</span>
                  </div>
                </div>
              </div>

              <!-- 统计数据 -->
              <div class="result-stats">
                <div class="stat-item">
                  <span class="stat-value-sm">{{ item.voteCount }}</span>
                  <span class="stat-label-sm">票</span>
                </div>
                <div class="stat-divider"></div>
                <div class="stat-item">
                  <span class="stat-value-sm">{{ item.submissionCount }}</span>
                  <span class="stat-label-sm">人投稿</span>
                </div>
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

/* ===== Results List ===== */
.results-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.result-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast);
}

.result-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.result-card.rank-gold {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-color: #f59e0b;
}

.result-card.rank-silver {
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  border-color: #94a3b8;
}

.result-card.rank-bronze {
  background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%);
  border-color: #f97316;
}

/* ===== Rank ===== */
.result-rank {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-border);
  border-radius: 50%;
  flex-shrink: 0;
}

.result-rank.rank-gold {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  color: white;
}

.result-rank.rank-silver {
  background: linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%);
  color: white;
}

.result-rank.rank-bronze {
  background: linear-gradient(135deg, #fb923c 0%, #f97316 100%);
  color: white;
}

.rank-icon {
  font-size: var(--text-lg);
}

.rank-number {
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  color: var(--color-text-secondary);
}

/* ===== Music Info ===== */
.result-music {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex: 1;
  min-width: 0;
}

.music-cover {
  width: 48px;
  height: 48px;
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
  width: 20px;
  height: 20px;
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

/* ===== Result Stats ===== */
.result-stats {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex-shrink: 0;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.stat-value-sm {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  color: var(--color-primary);
}

.stat-label-sm {
  font-size: 10px;
  color: var(--color-text-secondary);
}

.stat-divider {
  width: 1px;
  height: 24px;
  background: var(--color-border);
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

  .result-rank {
    width: 48px;
    height: 48px;
  }

  .rank-icon {
    font-size: var(--text-xl);
  }

  .music-cover {
    width: 56px;
    height: 56px;
  }

  .music-name {
    font-size: var(--text-base);
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

  .result-card {
    gap: var(--spacing-md);
    padding: var(--spacing-lg);
  }

  .result-stats {
    gap: var(--spacing-md);
  }
}
</style>
