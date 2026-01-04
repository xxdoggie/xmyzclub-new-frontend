<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/composables/useToast'
import {
  getCampaignDetail,
  getUserSubmissions,
  searchMusic,
  getMusicDetail,
  createSubmission,
} from '@/api/campaign'
import type {
  Campaign,
  TimePeriodUserSubmissions,
  MusicSearchItem,
  MusicDetail,
  SubmissionStageConfig,
} from '@/types/campaign'
import type { TimePeriod } from '@/types/dorm'
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb.vue'
import MusicPlayer from '@/components/MusicPlayer.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const toast = useToast()

// 活动ID
const campaignId = computed(() => Number(route.params.id))

// 状态
const isLoading = ref(true)
const campaign = ref<Campaign | null>(null)
const userSubmissions = ref<TimePeriodUserSubmissions[]>([])

// 搜索相关
const showSearchModal = ref(false)
const searchKeyword = ref('')
const isSearching = ref(false)
const searchResults = ref<MusicSearchItem[]>([])
const searchPage = ref(1)
const hasMoreResults = ref(false)
const searchDebounceTimer = ref<ReturnType<typeof setTimeout> | null>(null)

// 选择的音乐
const selectedMusic = ref<MusicSearchItem | null>(null)
const selectedMusicDetail = ref<MusicDetail | null>(null)
const isLoadingDetail = ref(false)

// 选择的时段
const selectedPeriodIds = ref<number[]>([])

// 提交相关
const isSubmitting = ref(false)

// 播放器
const playingMusic = ref<MusicDetail | null>(null)

// 获取投稿规则配置
const submissionConfig = computed<SubmissionStageConfig | null>(() => {
  if (!campaign.value?.currentStage) return null
  return campaign.value.currentStage.config as SubmissionStageConfig
})

// 获取规则说明
const rulesDescription = computed(() => {
  const config = submissionConfig.value
  if (!config?.rules?.has_limit) return '不限投稿数量'

  const { limit_scope, max_count } = config.rules
  if (limit_scope === 'period') {
    return `每个时段最多投稿 ${max_count} 首`
  } else {
    return `整个活动最多投稿 ${max_count} 首`
  }
})

// 获取每个时段的已投稿数量
function getSubmissionCount(periodId: number): number {
  const periodData = userSubmissions.value.find((p) => p.timePeriod.id === periodId)
  return periodData?.submissions?.length || 0
}

// 判断时段是否可以继续投稿
function canSubmitToPeriod(periodId: number): boolean {
  const config = submissionConfig.value
  if (!config?.rules?.has_limit) return true

  const { limit_scope, max_count } = config.rules
  if (!max_count) return true

  if (limit_scope === 'period') {
    return getSubmissionCount(periodId) < max_count
  } else {
    // 活动总限制：计算所有时段的投稿总数
    const totalCount = userSubmissions.value.reduce(
      (sum, p) => sum + (p.submissions?.length || 0),
      0
    )
    return totalCount < max_count
  }
}

// 可选的时段列表（过滤掉已达上限的）
const selectablePeriods = computed(() => {
  if (!campaign.value?.timePeriods) return []
  return campaign.value.timePeriods.filter((p) => canSubmitToPeriod(p.id))
})

// 加载活动详情
async function loadCampaign() {
  try {
    const res = await getCampaignDetail(campaignId.value)
    if (res.data.code === 200) {
      campaign.value = res.data.data
      // 检查是否是投稿阶段
      if (campaign.value.currentStage?.stageType !== 'submission') {
        toast.error('当前不在投稿阶段')
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

// 加载用户投稿
async function loadUserSubmissions() {
  try {
    const res = await getUserSubmissions(campaignId.value)
    if (res.data.code === 200) {
      userSubmissions.value = res.data.data
    }
  } catch (error) {
    console.error('获取用户投稿失败', error)
  }
}

// 初始化数据
async function initData() {
  if (!userStore.isLoggedIn) {
    userStore.openLoginModal('请先登录以参与投稿')
    router.push('/ringtone')
    return
  }

  isLoading.value = true
  try {
    await loadCampaign()
    await loadUserSubmissions()
  } finally {
    isLoading.value = false
  }
}

// 打开搜索弹窗
function openSearchModal() {
  showSearchModal.value = true
  searchKeyword.value = ''
  searchResults.value = []
  searchPage.value = 1
  hasMoreResults.value = false
  selectedMusic.value = null
  selectedMusicDetail.value = null
  selectedPeriodIds.value = []
}

// 关闭搜索弹窗
function closeSearchModal() {
  showSearchModal.value = false
  searchKeyword.value = ''
  searchResults.value = []
  selectedMusic.value = null
  selectedMusicDetail.value = null
  selectedPeriodIds.value = []
}

// 搜索音乐（带防抖）
function handleSearchInput() {
  if (searchDebounceTimer.value) {
    clearTimeout(searchDebounceTimer.value)
  }

  if (!searchKeyword.value.trim()) {
    searchResults.value = []
    return
  }

  searchDebounceTimer.value = setTimeout(() => {
    searchPage.value = 1
    doSearch()
  }, 500)
}

// 执行搜索
async function doSearch(loadMore = false) {
  if (!searchKeyword.value.trim()) return

  isSearching.value = true
  try {
    const res = await searchMusic(
      searchKeyword.value.trim(),
      loadMore ? searchPage.value : 1,
      20
    )
    if (res.data.code === 200) {
      const { data, meta } = res.data.data
      if (loadMore) {
        searchResults.value.push(...data)
      } else {
        searchResults.value = data
      }
      hasMoreResults.value = meta.nextPage !== null
      searchPage.value = meta.page
    } else {
      toast.error(res.data.message || '搜索失败')
    }
  } catch (error) {
    toast.error('搜索失败')
  } finally {
    isSearching.value = false
  }
}

// 加载更多搜索结果
function loadMoreResults() {
  if (hasMoreResults.value && !isSearching.value) {
    searchPage.value++
    doSearch(true)
  }
}

// 选择音乐
async function selectMusic(music: MusicSearchItem) {
  selectedMusic.value = music
  isLoadingDetail.value = true

  try {
    const res = await getMusicDetail(music.mid || music.id)
    if (res.data.code === 200) {
      selectedMusicDetail.value = res.data.data
    } else {
      toast.error('获取歌曲详情失败')
      selectedMusic.value = null
    }
  } catch (error) {
    toast.error('获取歌曲详情失败')
    selectedMusic.value = null
  } finally {
    isLoadingDetail.value = false
  }
}

// 取消选择
function cancelSelection() {
  selectedMusic.value = null
  selectedMusicDetail.value = null
  selectedPeriodIds.value = []
}

// 切换时段选择
function togglePeriod(periodId: number) {
  const index = selectedPeriodIds.value.indexOf(periodId)
  if (index === -1) {
    selectedPeriodIds.value.push(periodId)
  } else {
    selectedPeriodIds.value.splice(index, 1)
  }
}

// 全选/取消全选可选时段
function toggleAllPeriods() {
  if (selectedPeriodIds.value.length === selectablePeriods.value.length) {
    selectedPeriodIds.value = []
  } else {
    selectedPeriodIds.value = selectablePeriods.value.map((p) => p.id)
  }
}

// 试听音乐
function playMusic() {
  if (selectedMusicDetail.value) {
    playingMusic.value = selectedMusicDetail.value
  }
}

// 关闭播放器
function closePlayer() {
  playingMusic.value = null
}

// 提交投稿
async function submitSubmission() {
  if (!selectedMusic.value || selectedPeriodIds.value.length === 0) {
    toast.error('请选择歌曲和时段')
    return
  }

  isSubmitting.value = true
  try {
    const musicId = selectedMusic.value.mid || selectedMusic.value.id
    const res = await createSubmission({
      campaignId: campaignId.value,
      musicServiceId: `qq_${musicId}`,
      timePeriodIds: selectedPeriodIds.value,
    })

    if (res.data.code === 200) {
      toast.success('投稿成功')
      closeSearchModal()
      // 刷新用户投稿列表
      await loadUserSubmissions()
    } else {
      toast.error(res.data.message || '投稿失败')
    }
  } catch (error) {
    toast.error('投稿失败')
  } finally {
    isSubmitting.value = false
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

// 格式化阶段结束时间
function formatEndTime(endTime: string | undefined): string {
  if (!endTime) return ''
  const date = new Date(endTime)
  return date.toLocaleDateString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
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

    <main class="page-content" :class="{ 'has-player': playingMusic }">
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
                截止：{{ formatEndTime(campaign.currentStage.endTime) }}
              </span>
            </div>
            <div class="rules-hint">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              {{ rulesDescription }}
            </div>
          </div>

          <!-- 投稿按钮 -->
          <div class="action-section">
            <button class="submit-btn" @click="openSearchModal">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              投稿歌曲
            </button>
          </div>

          <!-- 我的投稿 -->
          <div class="submissions-section">
            <h2 class="section-title">我的投稿</h2>

            <div
              v-if="userSubmissions.every((p) => !p.submissions?.length)"
              class="empty-submissions"
            >
              <p>暂无投稿，快去搜索喜欢的歌曲投稿吧</p>
            </div>

            <div v-else class="submissions-by-period">
              <div
                v-for="periodData in userSubmissions"
                :key="periodData.timePeriod.id"
                class="period-group"
              >
                <div class="period-header">
                  <span class="period-name">{{ periodData.timePeriod.name }}</span>
                  <span class="period-count">
                    {{ periodData.submissions?.length || 0 }} 首
                  </span>
                </div>

                <div
                  v-if="periodData.submissions?.length"
                  class="submissions-list"
                >
                  <div
                    v-for="submission in periodData.submissions"
                    :key="submission.id"
                    class="submission-card"
                  >
                    <img
                      :src="submission.music.cover"
                      :alt="submission.music.song"
                      class="music-cover"
                    />
                    <div class="music-info">
                      <h3 class="music-name">{{ submission.music.song }}</h3>
                      <p class="music-singer">{{ submission.music.singer }}</p>
                    </div>
                    <span class="submit-time">{{ formatDate(submission.createdAt) }}</span>
                  </div>
                </div>

                <div v-else class="period-empty">暂无投稿</div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </main>

    <PageFooter />

    <!-- 音乐播放器 -->
    <MusicPlayer :music="playingMusic" @close="closePlayer" />

    <!-- 搜索投稿弹窗 -->
    <Transition name="modal-fade">
      <div v-if="showSearchModal" class="modal-overlay" @click.self="closeSearchModal">
        <Transition name="modal-scale" appear>
          <div v-if="showSearchModal" class="modal-content modal-lg" @click.stop>
            <div class="modal-header">
              <h3 class="modal-title">投稿歌曲</h3>
              <button class="modal-close" @click="closeSearchModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <!-- 未选择歌曲：显示搜索 -->
            <template v-if="!selectedMusic">
              <!-- 搜索框 -->
              <div class="search-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                  v-model="searchKeyword"
                  type="text"
                  placeholder="搜索歌曲名或歌手"
                  @input="handleSearchInput"
                />
              </div>

              <!-- 搜索结果 -->
              <div class="search-results">
                <div v-if="isSearching && searchResults.length === 0" class="search-loading">
                  <div class="loading-spinner-sm"></div>
                  <span>搜索中...</span>
                </div>

                <div
                  v-else-if="searchResults.length === 0 && searchKeyword"
                  class="search-empty"
                >
                  <p>未找到相关歌曲</p>
                </div>

                <div v-else class="results-list">
                  <div
                    v-for="music in searchResults"
                    :key="music.mid || music.id"
                    class="music-item"
                    @click="selectMusic(music)"
                  >
                    <div class="music-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M9 18V5l12-2v13"></path>
                        <circle cx="6" cy="18" r="3"></circle>
                        <circle cx="18" cy="16" r="3"></circle>
                      </svg>
                    </div>
                    <div class="music-details">
                      <h4 class="music-title">
                        {{ music.title }}
                        <span v-if="music.subtitle" class="music-subtitle">
                          {{ music.subtitle }}
                        </span>
                      </h4>
                      <p class="music-artist">{{ music.singer }} · {{ music.album }}</p>
                    </div>
                    <svg
                      class="select-arrow"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </div>

                  <!-- 加载更多 -->
                  <div v-if="hasMoreResults" class="load-more">
                    <button
                      class="load-more-btn"
                      :disabled="isSearching"
                      @click="loadMoreResults"
                    >
                      {{ isSearching ? '加载中...' : '加载更多' }}
                    </button>
                  </div>
                </div>
              </div>
            </template>

            <!-- 已选择歌曲：显示详情和时段选择 -->
            <template v-else>
              <!-- 返回搜索 -->
              <button class="back-btn" @click="cancelSelection">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
                返回搜索
              </button>

              <!-- 歌曲详情 -->
              <div v-if="isLoadingDetail" class="detail-loading">
                <div class="loading-spinner-sm"></div>
                <span>加载中...</span>
              </div>

              <div v-else-if="selectedMusicDetail" class="music-detail">
                <img
                  :src="selectedMusicDetail.cover"
                  :alt="selectedMusicDetail.title"
                  class="detail-cover"
                />
                <div class="detail-info">
                  <h3 class="detail-title">{{ selectedMusicDetail.title }}</h3>
                  <p class="detail-singer">{{ selectedMusicDetail.singer }}</p>
                  <p class="detail-album">{{ selectedMusicDetail.album }}</p>
                  <p class="detail-duration">时长：{{ selectedMusicDetail.interval }}</p>
                </div>
                <button class="play-btn" @click="playMusic">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                  试听
                </button>
              </div>

              <!-- 时段选择 -->
              <div class="period-selection">
                <div class="selection-header">
                  <h4 class="selection-title">选择投稿时段</h4>
                  <button class="select-all-btn" @click="toggleAllPeriods">
                    {{
                      selectedPeriodIds.length === selectablePeriods.length
                        ? '取消全选'
                        : '全选'
                    }}
                  </button>
                </div>

                <div class="periods-list">
                  <label
                    v-for="period in campaign?.timePeriods"
                    :key="period.id"
                    class="period-item"
                    :class="{
                      selected: selectedPeriodIds.includes(period.id),
                      disabled: !canSubmitToPeriod(period.id),
                    }"
                  >
                    <input
                      type="checkbox"
                      :checked="selectedPeriodIds.includes(period.id)"
                      :disabled="!canSubmitToPeriod(period.id)"
                      @change="togglePeriod(period.id)"
                    />
                    <span class="period-label">{{ period.name }}</span>
                    <span class="period-status">
                      {{ getSubmissionCount(period.id) }} 首
                      <template v-if="!canSubmitToPeriod(period.id)">（已满）</template>
                    </span>
                  </label>
                </div>
              </div>

              <!-- 提交按钮 -->
              <div class="modal-actions">
                <button class="modal-btn cancel" @click="closeSearchModal">取消</button>
                <button
                  class="modal-btn confirm"
                  :disabled="selectedPeriodIds.length === 0 || isSubmitting"
                  @click="submitSubmission"
                >
                  {{ isSubmitting ? '提交中...' : `投稿到 ${selectedPeriodIds.length} 个时段` }}
                </button>
              </div>
            </template>
          </div>
        </Transition>
      </div>
    </Transition>
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
  padding-bottom: var(--spacing-md);
}

.page-content.has-player {
  padding-bottom: 180px;
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
  margin-bottom: var(--spacing-sm);
}

.meta-divider {
  color: var(--color-border);
}

.rules-hint {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  color: var(--color-secondary);
  background: rgba(6, 182, 212, 0.1);
  border-radius: var(--radius-md);
}

.rules-hint svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

/* ===== Section ===== */
.section-title {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-sm);
}

/* ===== Action Section ===== */
.action-section {
  margin-bottom: var(--spacing-lg);
}

.submit-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-md);
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: white;
  background: var(--color-secondary);
  border: none;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.submit-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.submit-btn svg {
  width: 20px;
  height: 20px;
}

/* ===== Submissions ===== */
.submissions-section {
  margin-bottom: var(--spacing-lg);
}

.empty-submissions {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--color-text-placeholder);
  font-size: var(--text-sm);
}

.submissions-by-period {
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

.period-count {
  font-size: var(--text-xs);
  color: var(--color-secondary);
}

.period-empty {
  padding: var(--spacing-md);
  text-align: center;
  font-size: var(--text-sm);
  color: var(--color-text-placeholder);
}

.submissions-list {
  display: flex;
  flex-direction: column;
}

.submission-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-top: 1px solid var(--color-border);
}

.submission-card:first-child {
  border-top: none;
}

.music-cover {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  flex-shrink: 0;
}

.music-info {
  flex: 1;
  min-width: 0;
}

.music-name {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
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

.submit-time {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
  flex-shrink: 0;
}

/* ===== Modal ===== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
  padding: 0;
}

.modal-content {
  background: var(--color-card);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  padding: var(--spacing-lg);
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.modal-content.modal-lg {
  max-height: 85vh;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-md);
  flex-shrink: 0;
}

.modal-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
}

.modal-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-border);
  border: none;
  border-radius: var(--radius-full);
  cursor: pointer;
  color: var(--color-text-secondary);
}

.modal-close svg {
  width: 18px;
  height: 18px;
}

.modal-actions {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: flex-end;
  margin-top: var(--spacing-lg);
  flex-shrink: 0;
}

.modal-btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.modal-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.modal-btn.cancel {
  background: var(--color-border);
  color: var(--color-text);
}

.modal-btn.confirm {
  background: var(--color-secondary);
  color: white;
}

/* ===== Search Box ===== */
.search-box {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  margin-bottom: var(--spacing-md);
  flex-shrink: 0;
}

.search-box svg {
  width: 20px;
  height: 20px;
  color: var(--color-text-placeholder);
  flex-shrink: 0;
}

.search-box input {
  flex: 1;
  border: none;
  background: none;
  font-size: var(--text-sm);
  color: var(--color-text);
  outline: none;
}

.search-box input::placeholder {
  color: var(--color-text-placeholder);
}

/* ===== Search Results ===== */
.search-results {
  flex: 1;
  min-height: 200px;
  max-height: 400px;
  overflow-y: auto;
}

.search-loading,
.search-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.loading-spinner-sm {
  width: 24px;
  height: 24px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-secondary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: var(--spacing-sm);
}

.results-list {
  display: flex;
  flex-direction: column;
}

.music-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.music-item:hover {
  background: var(--color-bg);
}

.music-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(6, 182, 212, 0.1);
  color: var(--color-secondary);
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.music-icon svg {
  width: 20px;
  height: 20px;
}

.music-details {
  flex: 1;
  min-width: 0;
}

.music-title {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.music-subtitle {
  font-weight: normal;
  color: var(--color-text-secondary);
}

.music-artist {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.select-arrow {
  width: 16px;
  height: 16px;
  color: var(--color-text-placeholder);
  flex-shrink: 0;
}

.load-more {
  display: flex;
  justify-content: center;
  padding: var(--spacing-md);
}

.load-more-btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  font-size: var(--text-sm);
  color: var(--color-secondary);
  background: rgba(6, 182, 212, 0.1);
  border: none;
  border-radius: var(--radius-full);
  cursor: pointer;
}

.load-more-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ===== Back Button ===== */
.back-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: var(--spacing-xs) 0;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  background: none;
  border: none;
  cursor: pointer;
  margin-bottom: var(--spacing-md);
}

.back-btn svg {
  width: 16px;
  height: 16px;
}

/* ===== Music Detail ===== */
.detail-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
  color: var(--color-text-secondary);
}

.music-detail {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--color-bg);
  border-radius: var(--radius-lg);
  margin-bottom: var(--spacing-md);
}

.detail-cover {
  width: 80px;
  height: 80px;
  border-radius: var(--radius-md);
  object-fit: cover;
  flex-shrink: 0;
}

.detail-info {
  flex: 1;
  min-width: 0;
}

.detail-title {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-singer {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: 2px;
}

.detail-album,
.detail-duration {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
}

.play-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: white;
  background: var(--color-secondary);
  border: none;
  border-radius: var(--radius-full);
  cursor: pointer;
  flex-shrink: 0;
}

.play-btn svg {
  width: 14px;
  height: 14px;
}

/* ===== Period Selection ===== */
.period-selection {
  margin-bottom: var(--spacing-md);
}

.selection-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-sm);
}

.selection-title {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
}

.select-all-btn {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--text-xs);
  color: var(--color-secondary);
  background: rgba(6, 182, 212, 0.1);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.periods-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.period-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.period-item:hover:not(.disabled) {
  border-color: var(--color-secondary);
}

.period-item.selected {
  background: rgba(6, 182, 212, 0.1);
  border-color: var(--color-secondary);
}

.period-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.period-item input {
  accent-color: var(--color-secondary);
}

.period-label {
  flex: 1;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.period-status {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

/* ===== Desktop ===== */
@media (min-width: 768px) {
  .modal-overlay {
    align-items: center;
    padding: var(--spacing-md);
  }

  .modal-content {
    border-radius: var(--radius-xl);
    max-width: 500px;
  }
}

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
}

/* ===== Modal Animations ===== */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-scale-enter-active,
.modal-scale-leave-active {
  transition: all 0.2s ease;
}

.modal-scale-enter-from,
.modal-scale-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

@media (min-width: 768px) {
  .modal-scale-enter-from,
  .modal-scale-leave-to {
    transform: scale(0.9);
  }
}
</style>
