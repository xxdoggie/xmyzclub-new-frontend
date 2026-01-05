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
const hasSearched = ref(false) // 标记是否已发起过搜索
const searchResults = ref<MusicSearchItem[]>([])
const searchDebounceTimer = ref<ReturnType<typeof setTimeout> | null>(null)

// 选择的音乐
const selectedMusic = ref<MusicSearchItem | null>(null)
const selectedMusicDetail = ref<MusicDetail | null>(null)
const isLoadingDetail = ref(false)

// 选择的时段
const selectedPeriodIds = ref<number[]>([])

// 用户信息表单
const userInfoForm = ref<{
  dormitory: string
  bed: string
  student_id: string
  phone: string
}>({
  dormitory: '',
  bed: '',
  student_id: '',
  phone: '',
})

// 提交相关
const isSubmitting = ref(false)

// 播放器
const playingMusic = ref<MusicDetail | null>(null)

// 获取投稿规则配置
const submissionConfig = computed<SubmissionStageConfig | null>(() => {
  if (!campaign.value?.currentStage) return null
  return campaign.value.currentStage.config as SubmissionStageConfig
})

// 是否需要用户信息
const requireUserInfo = computed(() => {
  return submissionConfig.value?.require_user_info === true
})

// 需要填写的用户信息字段
const userInfoFields = computed(() => {
  return submissionConfig.value?.user_info_fields || []
})

// 获取字段标签
function getFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    dormitory: '宿舍号',
    bed: '床位号',
    student_id: '学号',
    phone: '手机号',
  }
  return labels[field] || field
}

// 获取字段占位符
function getFieldPlaceholder(field: string): string {
  const placeholders: Record<string, string> = {
    dormitory: '例如：101',
    bed: '例如：1',
    student_id: '请输入学号',
    phone: '请输入手机号',
  }
  return placeholders[field] || `请输入${getFieldLabel(field)}`
}

// 验证用户信息
function validateUserInfo(): boolean {
  if (!requireUserInfo.value) return true

  for (const field of userInfoFields.value) {
    const value = userInfoForm.value[field as keyof typeof userInfoForm.value]
    if (!value || !value.trim()) {
      toast.error(`请填写${getFieldLabel(field)}`)
      return false
    }
  }
  return true
}

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

// 总投稿数量
const totalSubmissions = computed(() => {
  return userSubmissions.value.reduce((sum, p) => sum + (p.submissions?.length || 0), 0)
})

// 加载活动详情
async function loadCampaign() {
  try {
    const res = await getCampaignDetail(campaignId.value)
    if (res.data.code === 200) {
      campaign.value = res.data.data
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
  hasSearched.value = false
  selectedMusic.value = null
  selectedMusicDetail.value = null
  selectedPeriodIds.value = []
  // 重置用户信息表单
  userInfoForm.value = { dormitory: '', bed: '', student_id: '', phone: '' }
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
    hasSearched.value = false
    return
  }

  // 立即显示搜索中状态
  isSearching.value = true
  hasSearched.value = true

  searchDebounceTimer.value = setTimeout(() => {
    doSearch()
  }, 500)
}

// 执行搜索
async function doSearch() {
  if (!searchKeyword.value.trim()) return

  isSearching.value = true
  try {
    const res = await searchMusic(searchKeyword.value.trim(), 1, 50)
    if (res.data.code === 200) {
      const { data } = res.data.data
      searchResults.value = data
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

  // 验证用户信息
  if (!validateUserInfo()) {
    return
  }

  isSubmitting.value = true
  try {
    const musicId = selectedMusic.value.mid || selectedMusic.value.id

    // 构建用户信息
    const userInfo: Record<string, string> = {}
    if (requireUserInfo.value) {
      for (const field of userInfoFields.value) {
        const value = userInfoForm.value[field as keyof typeof userInfoForm.value]
        if (value) {
          userInfo[field] = value.trim()
        }
      }
    }

    const res = await createSubmission({
      campaignId: campaignId.value,
      musicServiceId: `qq_${musicId}`,
      timePeriodIds: selectedPeriodIds.value,
      userInfo: Object.keys(userInfo).length > 0 ? userInfo : undefined,
    })

    if (res.data.code === 200) {
      toast.success('投稿成功')
      closeSearchModal()
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
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()

  if (diffMs < 0) return '已结束'

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (diffDays > 0) {
    return `剩余 ${diffDays}天${diffHours}小时`
  } else if (diffHours > 0) {
    return `剩余 ${diffHours}小时`
  } else {
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    return `剩余 ${diffMinutes}分钟`
  }
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
          <!-- 活动信息卡片 -->
          <div class="campaign-card">
            <div class="campaign-info">
              <h1 class="campaign-title">{{ campaign.title }}</h1>
              <p v-if="campaign.description" class="campaign-desc">{{ campaign.description }}</p>
              <div class="campaign-meta">
                <span class="meta-item">{{ campaign.campus?.name }}</span>
                <span class="meta-divider">·</span>
                <span class="meta-item">{{ rulesDescription }}</span>
                <template v-if="campaign.currentStage?.endTime">
                  <span class="meta-divider">·</span>
                  <span class="meta-item countdown">{{ formatEndTime(campaign.currentStage.endTime) }}</span>
                </template>
              </div>
            </div>
            <button class="submit-btn" @click="openSearchModal">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span class="btn-text">投稿歌曲</span>
            </button>
          </div>

          <!-- 我的投稿 -->
          <section class="submissions-section">
            <div class="section-header desktop-only">
              <h2 class="section-title">我的投稿</h2>
              <span class="section-count">{{ totalSubmissions }} 首</span>
            </div>

            <div v-if="totalSubmissions === 0" class="empty-submissions">
              <div class="empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M9 18V5l12-2v13"></path>
                  <circle cx="6" cy="18" r="3"></circle>
                  <circle cx="18" cy="16" r="3"></circle>
                </svg>
              </div>
              <p>暂无投稿</p>
              <span>快去搜索喜欢的歌曲投稿吧</span>
            </div>

            <div v-else class="submissions-by-period">
              <div
                v-for="periodData in userSubmissions"
                :key="periodData.timePeriod.id"
                class="period-group"
              >
                <div class="period-header">
                  <span class="period-name">{{ periodData.timePeriod.name }}</span>
                  <span class="period-count">{{ periodData.submissions?.length || 0 }} 首</span>
                </div>

                <div v-if="periodData.submissions?.length" class="submissions-list">
                  <div
                    v-for="submission in periodData.submissions"
                    :key="submission.id"
                    class="submission-item"
                  >
                    <img
                      :src="submission.music.cover"
                      :alt="submission.music.song"
                      class="music-cover"
                    />
                    <div class="music-info">
                      <h4 class="music-name">{{ submission.music.song }}</h4>
                      <p class="music-singer">{{ submission.music.singer }}</p>
                    </div>
                    <span class="submit-time">{{ formatDate(submission.createdAt) }}</span>
                  </div>
                </div>

                <div v-else class="period-empty">
                  <span>暂无投稿</span>
                </div>
              </div>
            </div>
          </section>
        </template>
      </div>
    </main>

    <PageFooter />

    <!-- 音乐播放器 -->
    <MusicPlayer :music="playingMusic" @close="closePlayer" />

    <!-- 搜索投稿弹窗 -->
    <Transition name="modal-fade">
      <div v-if="showSearchModal" class="modal-overlay" @click.self="closeSearchModal">
        <Transition name="modal-slide" appear>
          <div v-if="showSearchModal" class="modal-content" @click.stop>
            <div class="modal-handle"></div>

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

              <div class="search-results">
                <!-- 搜索中状态 -->
                <div v-if="isSearching" class="search-loading">
                  <div class="loading-spinner-sm"></div>
                  <span>搜索中...</span>
                </div>

                <!-- 未输入关键词 -->
                <div v-else-if="!searchKeyword" class="search-hint">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <p>输入歌曲名或歌手搜索</p>
                </div>

                <!-- 搜索完成但无结果 -->
                <div v-else-if="hasSearched && searchResults.length === 0" class="search-empty">
                  <p>未找到相关歌曲</p>
                  <span>换个关键词试试</span>
                </div>

                <!-- 搜索结果列表 -->
                <div v-else-if="searchResults.length > 0" class="results-list">
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
                        <span v-if="music.subtitle" class="music-subtitle">{{ music.subtitle }}</span>
                      </h4>
                      <p class="music-artist">{{ music.singer }} · {{ music.album }}</p>
                    </div>
                    <svg class="select-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </div>
                </div>
              </div>
            </template>

            <!-- 已选择歌曲：显示详情和时段选择 -->
            <template v-else>
              <button class="back-btn" @click="cancelSelection">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
                返回搜索
              </button>

              <div v-if="isLoadingDetail" class="detail-loading">
                <div class="loading-spinner-sm"></div>
                <span>加载中...</span>
              </div>

              <div v-else-if="selectedMusicDetail" class="music-detail-card">
                <img
                  :src="selectedMusicDetail.cover"
                  :alt="selectedMusicDetail.title"
                  class="detail-cover"
                />
                <div class="detail-info">
                  <h3 class="detail-title">{{ selectedMusicDetail.title }}</h3>
                  <p class="detail-singer">{{ selectedMusicDetail.singer }}</p>
                  <div class="detail-meta">
                    <span>{{ selectedMusicDetail.album }}</span>
                    <span>·</span>
                    <span>{{ selectedMusicDetail.interval }}</span>
                  </div>
                </div>
                <button class="play-btn" @click="playMusic">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                </button>
              </div>

              <!-- 用户信息填写（如果需要） -->
              <div v-if="requireUserInfo && userInfoFields.length > 0" class="user-info-section">
                <h4 class="section-label">填写信息</h4>
                <div class="user-info-form">
                  <div v-for="field in userInfoFields" :key="field" class="form-field">
                    <label :for="`field-${field}`">{{ getFieldLabel(field) }}</label>
                    <input
                      :id="`field-${field}`"
                      v-model="userInfoForm[field as keyof typeof userInfoForm]"
                      type="text"
                      :placeholder="getFieldPlaceholder(field)"
                    />
                  </div>
                </div>
              </div>

              <!-- 时段选择 -->
              <div class="period-selection">
                <div class="selection-header">
                  <h4 class="selection-title">选择投稿时段</h4>
                  <button
                    v-if="selectablePeriods.length > 1"
                    class="select-all-btn"
                    @click="toggleAllPeriods"
                  >
                    {{ selectedPeriodIds.length === selectablePeriods.length ? '取消全选' : '全选' }}
                  </button>
                </div>

                <div class="periods-grid">
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
                    <div class="period-content">
                      <span class="period-label">{{ period.name }}</span>
                      <span class="period-status">
                        {{ getSubmissionCount(period.id) }} 首
                        <template v-if="!canSubmitToPeriod(period.id)">（已满）</template>
                      </span>
                    </div>
                    <div class="period-check">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                  </label>
                </div>
              </div>

              <!-- 提交按钮 -->
              <div class="modal-actions">
                <button class="action-btn cancel" @click="closeSearchModal">取消</button>
                <button
                  class="action-btn confirm"
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

/* ===== Campaign Card ===== */
.campaign-card {
  background: var(--color-card);
  border-radius: var(--radius-xl);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.campaign-info {
  flex: 1;
}

.campaign-title {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-xs);
  line-height: 1.3;
}

.campaign-desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: 1.5;
  margin-bottom: var(--spacing-sm);
}

.campaign-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

.meta-divider {
  color: var(--color-border);
}

.meta-item.countdown {
  color: var(--color-warning);
}

/* ===== Submit Button ===== */
.submit-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-lg);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-primary);
  background: var(--color-primary-bg);
  border: none;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
  align-self: flex-start;
}

.submit-btn:hover {
  background: var(--color-primary);
  color: white;
}

.submit-btn:active {
  transform: scale(0.98);
}

.submit-btn svg {
  width: 16px;
  height: 16px;
}

/* ===== Submissions Section ===== */
.submissions-section {
  margin-bottom: var(--spacing-lg);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-sm);
}

.section-title {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
}

.section-count {
  font-size: var(--text-sm);
  color: var(--color-primary);
  font-weight: var(--font-medium);
}

.empty-submissions {
  text-align: center;
  padding: var(--spacing-xl);
  background: var(--color-card);
  border-radius: var(--radius-lg);
}

.empty-icon {
  width: 60px;
  height: 60px;
  margin: 0 auto var(--spacing-md);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-border);
  color: var(--color-text-placeholder);
  border-radius: var(--radius-lg);
}

.empty-icon svg {
  width: 28px;
  height: 28px;
}

.empty-submissions p {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  margin-bottom: var(--spacing-xs);
}

.empty-submissions span {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
}

/* ===== Submissions by Period ===== */
.submissions-by-period {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
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
  color: var(--color-primary);
  font-weight: var(--font-medium);
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

.submission-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-top: 1px solid var(--color-border);
}

.music-cover {
  width: 44px;
  height: 44px;
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
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--color-card);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  padding: var(--spacing-md);
  padding-bottom: var(--spacing-lg);
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.modal-handle {
  width: 40px;
  height: 4px;
  background: var(--color-border);
  border-radius: 2px;
  margin: 0 auto var(--spacing-md);
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
  background: var(--color-bg);
  border: none;
  border-radius: var(--radius-full);
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
}

.modal-close:hover {
  background: var(--color-border);
}

.modal-close svg {
  width: 18px;
  height: 18px;
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
  transition: all var(--transition-fast);
}

.search-box:focus-within {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-bg);
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
  max-height: 50vh;
  overflow-y: auto;
}

.search-loading,
.search-empty,
.search-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
  color: var(--color-text-secondary);
  text-align: center;
}

.search-hint svg {
  width: 48px;
  height: 48px;
  color: var(--color-border);
  margin-bottom: var(--spacing-sm);
}

.search-hint p,
.search-empty p {
  font-size: var(--text-sm);
  margin-bottom: var(--spacing-xs);
}

.search-empty span {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
}

.loading-spinner-sm {
  width: 24px;
  height: 24px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
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

.music-item:active {
  transform: scale(0.98);
}

.music-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary-bg);
  color: var(--color-primary);
  border-radius: var(--radius-md);
  flex-shrink: 0;
}

.music-icon svg {
  width: 22px;
  height: 22px;
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

/* ===== Desktop Only ===== */
.desktop-only {
  display: none;
}

/* ===== Back Button ===== */
.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: var(--spacing-xs) 0;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  background: none;
  border: none;
  cursor: pointer;
  margin-bottom: var(--spacing-md);
  transition: color var(--transition-fast);
}

.back-btn:hover {
  color: var(--color-text);
}

.back-btn svg {
  width: 16px;
  height: 16px;
}

/* ===== Music Detail Card ===== */
.detail-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
  color: var(--color-text-secondary);
}

.music-detail-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--color-bg);
  border-radius: var(--radius-lg);
  margin-bottom: var(--spacing-md);
}

.detail-cover {
  width: 72px;
  height: 72px;
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
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
}

.play-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  background: var(--color-primary);
  border: none;
  border-radius: var(--radius-full);
  cursor: pointer;
  flex-shrink: 0;
  transition: all var(--transition-fast);
}

.play-btn:hover {
  transform: scale(1.05);
}

.play-btn:active {
  transform: scale(0.95);
}

.play-btn svg {
  width: 18px;
  height: 18px;
  margin-left: 2px;
}

/* ===== User Info Section ===== */
.user-info-section {
  margin-bottom: var(--spacing-md);
}

.section-label {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-sm);
}

.user-info-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.form-field label {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  font-weight: var(--font-medium);
}

.form-field input {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  color: var(--color-text);
  outline: none;
  transition: all var(--transition-fast);
}

.form-field input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-bg);
}

.form-field input::placeholder {
  color: var(--color-text-placeholder);
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
  color: var(--color-primary);
  background: var(--color-primary-bg);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.select-all-btn:hover {
  background: var(--color-primary);
  color: white;
}

.periods-grid {
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

.period-item input {
  display: none;
}

.period-item:hover:not(.disabled) {
  border-color: var(--color-primary);
}

.period-item.selected {
  background: var(--color-primary-bg);
  border-color: var(--color-primary);
}

.period-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.period-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.period-label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.period-status {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.period-check {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: transparent;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.period-item.selected .period-check {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.period-check svg {
  width: 12px;
  height: 12px;
}

/* ===== Modal Actions ===== */
.modal-actions {
  display: flex;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-md);
}

.action-btn {
  flex: 1;
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.action-btn.cancel {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  color: var(--color-text);
}

.action-btn.cancel:hover:not(:disabled) {
  background: var(--color-border);
}

.action-btn.confirm {
  background: var(--color-primary);
  color: white;
}

.action-btn.confirm:hover:not(:disabled) {
  opacity: 0.9;
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

.modal-slide-enter-active,
.modal-slide-leave-active {
  transition: all 0.3s ease;
}

.modal-slide-enter-from,
.modal-slide-leave-to {
  opacity: 0;
  transform: translateY(100%);
}

/* ===== Desktop ===== */
@media (min-width: 768px) {
  .modal-overlay {
    align-items: center;
    padding: var(--spacing-md);
  }

  .modal-content {
    border-radius: var(--radius-xl);
    max-width: 480px;
    max-height: 80vh;
  }

  .modal-handle {
    display: none;
  }

  .modal-slide-enter-from,
  .modal-slide-leave-to {
    transform: scale(0.95);
  }
}

@media (min-width: 1024px) {
  .desktop-only {
    display: flex;
  }

  .breadcrumb-wrapper {
    display: block;
  }

  .page-content {
    padding: var(--spacing-xl);
  }

  .content-container {
    max-width: 900px;
  }

  .campaign-card {
    flex-direction: row;
    align-items: center;
    padding: var(--spacing-lg);
  }

  .campaign-title {
    font-size: var(--text-xl);
  }

  .campaign-desc {
    font-size: var(--text-base);
    margin-bottom: var(--spacing-xs);
  }

  .submit-btn {
    flex-shrink: 0;
    padding: var(--spacing-sm) var(--spacing-xl);
  }

  .user-info-form {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .form-field {
    flex: 1;
    min-width: 150px;
  }
}
</style>
