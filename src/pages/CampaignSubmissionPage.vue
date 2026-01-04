<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/composables/useToast'
import {
  getCampaignDetail,
  getSubmissionProgress,
  getUserSubmissions,
  searchMusic,
  createSubmission,
  deleteUserSubmission,
} from '@/api/campaign'
import type {
  Campaign,
  ProgressResponse,
  UserSubmission,
  MusicSearchItem,
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
const submissions = ref<UserSubmission[]>([])

// 当前选中的时段
const selectedPeriodId = ref<number | null>(null)

// 搜索相关
const showSearchModal = ref(false)
const searchKeyword = ref('')
const isSearching = ref(false)
const searchResults = ref<MusicSearchItem[]>([])
const searchDebounceTimer = ref<ReturnType<typeof setTimeout> | null>(null)

// 提交相关
const isSubmitting = ref(false)
const selectedMusic = ref<MusicSearchItem | null>(null)

// 删除相关
const showDeleteConfirm = ref(false)
const deletingSubmission = ref<UserSubmission | null>(null)
const isDeleting = ref(false)

// 当前时段的进度信息
const currentPeriodProgress = computed<TimePeriodProgressItem | null>(() => {
  if (!progress.value || !selectedPeriodId.value) return null
  return progress.value.timePeriodProgress.find(
    (p) => p.timePeriod.id === selectedPeriodId.value
  ) || null
})

// 当前时段是否可以继续投稿
const canSubmitMore = computed(() => {
  if (!currentPeriodProgress.value) return false
  return !currentPeriodProgress.value.reachedMax
})

// 当前时段的用户投稿
const currentPeriodSubmissions = computed(() => {
  if (!selectedPeriodId.value) return []
  return submissions.value.filter((s) => s.timePeriod.id === selectedPeriodId.value)
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

// 加载投稿进度
async function loadProgress() {
  try {
    const res = await getSubmissionProgress(campaignId.value)
    if (res.data.code === 200) {
      progress.value = res.data.data
    }
  } catch (error) {
    console.error('获取投稿进度失败', error)
  }
}

// 加载用户投稿
async function loadSubmissions() {
  try {
    const res = await getUserSubmissions(campaignId.value)
    if (res.data.code === 200) {
      submissions.value = res.data.data
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
    await Promise.all([loadProgress(), loadSubmissions()])
  } finally {
    isLoading.value = false
  }
}

// 打开搜索弹窗
function openSearchModal() {
  if (!canSubmitMore.value) {
    toast.warning('该时段已达到投稿上限')
    return
  }
  showSearchModal.value = true
  searchKeyword.value = ''
  searchResults.value = []
  selectedMusic.value = null
}

// 关闭搜索弹窗
function closeSearchModal() {
  showSearchModal.value = false
  searchKeyword.value = ''
  searchResults.value = []
  selectedMusic.value = null
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
    doSearch()
  }, 500)
}

// 执行搜索
async function doSearch() {
  if (!searchKeyword.value.trim()) return

  isSearching.value = true
  try {
    const res = await searchMusic(searchKeyword.value.trim())
    if (res.data.code === 200) {
      searchResults.value = res.data.data
    } else {
      toast.error(res.data.message || '搜索失败')
    }
  } catch (error) {
    toast.error('搜索失败')
  } finally {
    isSearching.value = false
  }
}

// 选择音乐
function selectMusic(music: MusicSearchItem) {
  selectedMusic.value = music
}

// 提交投稿
async function submitSubmission() {
  if (!selectedMusic.value || !selectedPeriodId.value) return

  isSubmitting.value = true
  try {
    const res = await createSubmission({
      campaignId: campaignId.value,
      timePeriodId: selectedPeriodId.value,
      musicMid: selectedMusic.value.mid,
    })

    if (res.data.code === 200) {
      toast.success('投稿成功')
      closeSearchModal()
      // 刷新数据
      await Promise.all([loadProgress(), loadSubmissions()])
    } else {
      toast.error(res.data.message || '投稿失败')
    }
  } catch (error) {
    toast.error('投稿失败')
  } finally {
    isSubmitting.value = false
  }
}

// 打开删除确认
function openDeleteConfirm(submission: UserSubmission) {
  deletingSubmission.value = submission
  showDeleteConfirm.value = true
}

// 关闭删除确认
function closeDeleteConfirm() {
  showDeleteConfirm.value = false
  deletingSubmission.value = null
}

// 确认删除
async function confirmDelete() {
  if (!deletingSubmission.value) return

  isDeleting.value = true
  try {
    const res = await deleteUserSubmission(deletingSubmission.value.id)
    if (res.data.code === 200) {
      toast.success('删除成功')
      closeDeleteConfirm()
      // 刷新数据
      await Promise.all([loadProgress(), loadSubmissions()])
    } else {
      toast.error(res.data.message || '删除失败')
    }
  } catch (error) {
    toast.error('删除失败')
  } finally {
    isDeleting.value = false
  }
}

// 获取状态标签
function getStatusLabel(status: string) {
  const statusMap: Record<string, { label: string; class: string }> = {
    pending: { label: '待审核', class: 'status-pending' },
    approved: { label: '已通过', class: 'status-approved' },
    rejected: { label: '已拒绝', class: 'status-rejected' },
  }
  return statusMap[status] || { label: status, class: '' }
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

          <!-- 投稿进度 -->
          <div v-if="currentPeriodProgress" class="progress-section">
            <div class="progress-info">
              <span class="progress-label">投稿进度</span>
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
              已达到投稿上限
            </p>
          </div>

          <!-- 投稿按钮 -->
          <div class="action-section">
            <button
              class="submit-btn"
              :disabled="!canSubmitMore"
              @click="openSearchModal"
            >
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

            <div v-if="currentPeriodSubmissions.length === 0" class="empty-submissions">
              <p>暂无投稿，快去搜索喜欢的歌曲投稿吧</p>
            </div>

            <div v-else class="submissions-list">
              <div
                v-for="submission in currentPeriodSubmissions"
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
                  <div class="submission-meta">
                    <span
                      class="status-badge"
                      :class="getStatusLabel(submission.status).class"
                    >
                      {{ getStatusLabel(submission.status).label }}
                    </span>
                    <span class="submit-time">{{ formatDate(submission.createdAt) }}</span>
                  </div>
                </div>
                <button
                  v-if="submission.status === 'pending'"
                  class="delete-btn"
                  @click="openDeleteConfirm(submission)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="m19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </template>
      </div>
    </main>

    <PageFooter />

    <!-- 搜索音乐弹窗 -->
    <Transition name="modal-fade">
      <div v-if="showSearchModal" class="modal-overlay" @click.self="closeSearchModal">
        <Transition name="modal-scale" appear>
          <div v-if="showSearchModal" class="modal-content modal-lg" @click.stop>
            <div class="modal-header">
              <h3 class="modal-title">搜索歌曲</h3>
              <button class="modal-close" @click="closeSearchModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

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
              <div v-if="isSearching" class="search-loading">
                <div class="loading-spinner-sm"></div>
                <span>搜索中...</span>
              </div>

              <div v-else-if="searchResults.length === 0 && searchKeyword" class="search-empty">
                <p>未找到相关歌曲</p>
              </div>

              <div v-else class="results-list">
                <div
                  v-for="music in searchResults"
                  :key="music.mid"
                  class="music-item"
                  :class="{ selected: selectedMusic?.mid === music.mid }"
                  @click="selectMusic(music)"
                >
                  <img :src="music.cover" :alt="music.song" class="music-cover-sm" />
                  <div class="music-details">
                    <h4 class="music-title">{{ music.song }}</h4>
                    <p class="music-artist">{{ music.singer }}</p>
                  </div>
                  <span class="music-duration">{{ music.interval }}</span>
                  <div v-if="selectedMusic?.mid === music.mid" class="selected-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <!-- 提交按钮 -->
            <div class="modal-actions">
              <button class="modal-btn cancel" @click="closeSearchModal">取消</button>
              <button
                class="modal-btn confirm"
                :disabled="!selectedMusic || isSubmitting"
                @click="submitSubmission"
              >
                {{ isSubmitting ? '提交中...' : '确认投稿' }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>

    <!-- 删除确认弹窗 -->
    <Transition name="modal-fade">
      <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="closeDeleteConfirm">
        <Transition name="modal-scale" appear>
          <div v-if="showDeleteConfirm" class="modal-content" @click.stop>
            <h3 class="modal-title">确认删除</h3>
            <p class="modal-desc">
              确定要删除投稿「{{ deletingSubmission?.music.song }}」吗？
            </p>
            <div class="modal-actions">
              <button class="modal-btn cancel" @click="closeDeleteConfirm" :disabled="isDeleting">
                取消
              </button>
              <button class="modal-btn confirm danger" @click="confirmDelete" :disabled="isDeleting">
                {{ isDeleting ? '删除中...' : '确认删除' }}
              </button>
            </div>
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
  border-color: var(--color-secondary);
  color: var(--color-secondary);
}

.period-tab.active {
  background: var(--color-secondary);
  border-color: var(--color-secondary);
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
  color: var(--color-secondary);
}

.progress-bar {
  height: 6px;
  background: var(--color-border);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-secondary);
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

.submit-btn:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.submit-btn:disabled {
  background: var(--color-border);
  color: var(--color-text-placeholder);
  cursor: not-allowed;
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

.submissions-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.submission-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--color-card);
  border-radius: var(--radius-lg);
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
  margin-bottom: var(--spacing-xs);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.submission-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.status-badge {
  font-size: 10px;
  font-weight: var(--font-semibold);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}

.status-badge.status-pending {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.status-badge.status-approved {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.status-badge.status-rejected {
  background: var(--color-error-bg);
  color: var(--color-error);
}

.submit-time {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
}

.delete-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-error-bg);
  color: var(--color-error);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.delete-btn:hover {
  background: var(--color-error);
  color: white;
}

.delete-btn svg {
  width: 18px;
  height: 18px;
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
}

.modal-content.modal-lg {
  max-height: 85vh;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-md);
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

.modal-desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-lg);
}

.modal-actions {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: flex-end;
  margin-top: var(--spacing-lg);
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

.modal-btn.confirm.danger {
  background: var(--color-error);
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
  gap: var(--spacing-xs);
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

.music-item.selected {
  background: rgba(6, 182, 212, 0.1);
}

.music-cover-sm {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  flex-shrink: 0;
}

.music-details {
  flex: 1;
  min-width: 0;
}

.music-title {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.music-artist {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.music-duration {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
  flex-shrink: 0;
}

.selected-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-secondary);
  color: white;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.selected-icon svg {
  width: 14px;
  height: 14px;
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
