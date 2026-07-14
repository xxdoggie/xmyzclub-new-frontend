<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/composables/useToast'
import { searchMusic, getMusicDetail, getMusicUrl } from '@/api/campaign'
import type { MusicSearchItem, MusicDetail } from '@/types/campaign'
import api from '@/api/index'
import type { ApiResponse } from '@/api/index'
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb.vue'
import MusicPlayer from '@/components/MusicPlayer.vue'

interface QualityOption {
  id: number
  name: string
  description: string
}

const router = useRouter()
const userStore = useUserStore()
const toast = useToast()

// ==================== 搜索状态 ====================
const searchKeyword = ref('')
const isSearching = ref(false)
const hasSearched = ref(false)
const searchResults = ref<MusicSearchItem[]>([])
const searchDebounceTimer = ref<ReturnType<typeof setTimeout> | null>(null)

// ==================== 选中歌曲状态 ====================
const selectedMusic = ref<MusicSearchItem | null>(null)
const selectedMusicDetail = ref<MusicDetail | null>(null)
const isLoadingDetail = ref(false)

// ==================== 播放状态 ====================
const playingMusic = ref<MusicDetail | null>(null)

// ==================== 音质与下载状态 ====================
const qualities = ref<QualityOption[]>([])
const selectedQuality = ref(8) // 默认 MP3 320K
const isDownloading = ref(false)
const downloadStatus = ref('') // 下载阶段提示文字

// ==================== 搜索逻辑 ====================

function handleSearchInput() {
  if (searchDebounceTimer.value) {
    clearTimeout(searchDebounceTimer.value)
  }

  if (!searchKeyword.value.trim()) {
    searchResults.value = []
    hasSearched.value = false
    return
  }

  isSearching.value = true
  hasSearched.value = true

  searchDebounceTimer.value = setTimeout(() => {
    doSearch()
  }, 500)
}

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
  } catch {
    toast.error('搜索失败')
  } finally {
    isSearching.value = false
  }
}

// ==================== 选择歌曲 ====================

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
  } catch {
    toast.error('获取歌曲详情失败')
    selectedMusic.value = null
  } finally {
    isLoadingDetail.value = false
  }
}

function cancelSelection() {
  selectedMusic.value = null
  selectedMusicDetail.value = null
}

// ==================== 播放 ====================

function playMusic() {
  if (selectedMusicDetail.value) {
    playingMusic.value = selectedMusicDetail.value
  }
}

function closePlayer() {
  playingMusic.value = null
}

// ==================== 下载 ====================

async function downloadMusic() {
  if (!selectedMusicDetail.value) return

  isDownloading.value = true
  downloadStatus.value = '正在获取下载链接...'
  try {
    const res = await getMusicUrl(selectedMusicDetail.value.mid, selectedQuality.value)
    if (res.data.code === 200 && res.data.data.url) {
      const musicUrl = res.data.data.url.replace(/^http:\/\//, 'https://')
      const qualityInfo = qualities.value.find(q => q.id === selectedQuality.value)
      const qualityLabel = qualityInfo?.name || ''
      const fileName = `${selectedMusicDetail.value.singer} - ${selectedMusicDetail.value.title} (${qualityLabel})`

      downloadStatus.value = '正在下载文件...'
      const response = await fetch(musicUrl)
      if (!response.ok) {
        throw new Error('下载失败')
      }
      const blob = await response.blob()

      downloadStatus.value = '正在保存...'
      const ext = getExtFromUrl(musicUrl) || getExtFromContentType(blob.type) || 'mp3'

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${fileName}.${ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('下载成功')
    } else {
      toast.error(res.data.message || '获取下载链接失败')
    }
  } catch {
    toast.error('下载失败，请稍后重试')
  } finally {
    isDownloading.value = false
    downloadStatus.value = ''
  }
}

function getExtFromUrl(url: string): string | null {
  const match = url.match(/\.(\w+)(?:\?|$)/)
  if (match && match[1]) {
    const ext = match[1].toLowerCase()
    if (['mp3', 'flac', 'm4a', 'ogg', 'ape', 'mp4', 'wav'].includes(ext)) {
      return ext
    }
  }
  return null
}

function getExtFromContentType(type: string): string | null {
  const map: Record<string, string> = {
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/flac': 'flac',
    'audio/ogg': 'ogg',
    'audio/mp4': 'm4a',
    'audio/x-m4a': 'm4a',
    'audio/ape': 'ape',
  }
  return map[type] || null
}

// ==================== 获取音质列表 ====================

async function fetchQualities() {
  try {
    const res = await api.get<ApiResponse<QualityOption[]>>('/qqmusic/qualities')
    if (res.data.code === 200) {
      qualities.value = res.data.data
    }
  } catch {
    // 获取失败时使用默认常用音质
    qualities.value = [
      { id: 0, name: '试听', description: '音乐试听' },
      { id: 7, name: '128mp3', description: '标准音质' },
      { id: 8, name: '320mp3', description: 'HQ高音质' },
      { id: 10, name: '无损', description: 'SQ无损音质' },
    ]
  }
}

// ==================== 生命周期 ====================

onMounted(async () => {
  if (!userStore.isLoggedIn || !userStore.canManageCampaigns) {
    toast.error('无权访问此页面')
    router.push('/')
    return
  }

  await fetchQualities()
})
</script>

<template>
  <div class="page">
    <PageHeader />
    <PageBreadcrumb />

    <main class="page-content">
      <div class="container">
        <h1 class="page-title">歌曲下载</h1>
        <p class="page-desc">搜索并下载歌曲，支持多种音质选择</p>

        <!-- 搜索区域 -->
        <div class="search-section">
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
            <button
              v-if="searchKeyword"
              class="clear-btn"
              @click="searchKeyword = ''; searchResults = []; hasSearched = false"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        <!-- 已选歌曲详情 -->
        <Transition name="fade" mode="out-in">
          <div v-if="selectedMusic" key="detail" class="detail-section">
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

            <div v-else-if="selectedMusicDetail" class="selected-detail">
              <!-- 歌曲信息卡片 -->
              <div class="music-detail-card">
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
                <button class="play-btn" @click="playMusic" title="播放试听">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                </button>
              </div>

              <!-- 音质选择 - 手机端下拉 -->
              <div class="quality-section">
                <h4 class="section-label">选择音质</h4>

                <!-- 手机端：下拉选择 -->
                <div class="quality-select-wrapper">
                  <select v-model="selectedQuality" class="quality-select">
                    <option
                      v-for="quality in qualities"
                      :key="quality.id"
                      :value="quality.id"
                    >
                      {{ quality.description }} ({{ quality.name }})
                    </option>
                  </select>
                  <svg class="quality-select-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>

                <!-- 桌面端：卡片网格 -->
                <div class="quality-grid">
                  <label
                    v-for="quality in qualities"
                    :key="quality.id"
                    class="quality-item"
                    :class="{ selected: selectedQuality === quality.id }"
                  >
                    <input
                      type="radio"
                      :value="quality.id"
                      v-model="selectedQuality"
                    />
                    <div class="quality-content">
                      <span class="quality-name">{{ quality.description }}</span>
                      <span class="quality-tag">{{ quality.name }}</span>
                    </div>
                    <div class="quality-check">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                  </label>
                </div>
              </div>

              <!-- 下载按钮 -->
              <button
                class="download-btn"
                :disabled="isDownloading"
                @click="downloadMusic"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                下载歌曲
              </button>

              <!-- 下载中遮罩 -->
              <Transition name="fade">
                <div v-if="isDownloading" class="download-overlay">
                  <div class="download-overlay-content">
                    <div class="download-spinner"></div>
                    <p class="download-status-text">{{ downloadStatus }}</p>
                    <p class="download-status-hint">请勿离开页面</p>
                  </div>
                </div>
              </Transition>
            </div>
          </div>

          <!-- 搜索结果列表 -->
          <div v-else key="search" class="search-results">
            <!-- 搜索中 -->
            <div v-if="isSearching" class="search-loading">
              <div class="loading-spinner-sm"></div>
              <span>搜索中...</span>
            </div>

            <!-- 未输入 -->
            <div v-else-if="!searchKeyword" class="search-hint">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <p>输入歌曲名或歌手开始搜索</p>
            </div>

            <!-- 无结果 -->
            <div v-else-if="hasSearched && searchResults.length === 0" class="search-empty">
              <p>未找到相关歌曲</p>
              <span>换个关键词试试</span>
            </div>

            <!-- 结果列表 -->
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
        </Transition>
      </div>
    </main>

    <PageFooter />

    <!-- 音乐播放器 -->
    <MusicPlayer :music="playingMusic" @close="closePlayer" />
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.page-content {
  flex: 1;
  padding: var(--spacing-lg) var(--spacing-md);
}

.container {
  max-width: 640px;
  margin: 0 auto;
}

.page-title {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-xs);
}

.page-desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-lg);
}

/* ===== Search ===== */
.search-section {
  margin-bottom: var(--spacing-lg);
}

.search-box {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
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

.clear-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: none;
  border: none;
  color: var(--color-text-placeholder);
  cursor: pointer;
  border-radius: var(--radius-full);
  transition: all var(--transition-fast);
}

.clear-btn:hover {
  background: var(--color-bg);
  color: var(--color-text-secondary);
}

.clear-btn svg {
  width: 16px;
  height: 16px;
}

/* ===== Search Results ===== */
.search-results {
  min-height: 200px;
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
  background: var(--color-card);
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

/* ===== Detail Section ===== */
.back-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
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
  background: var(--color-card);
  border-radius: var(--radius-lg);
  margin-bottom: var(--spacing-lg);
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

/* ===== Quality Selection ===== */
.quality-section {
  margin-bottom: var(--spacing-lg);
}

.section-label {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-sm);
}

/* 手机端下拉选择 */
.quality-select-wrapper {
  position: relative;
}

.quality-select {
  width: 100%;
  appearance: none;
  -webkit-appearance: none;
  padding: var(--spacing-sm) var(--spacing-md);
  padding-right: 40px;
  font-size: var(--text-sm);
  color: var(--color-text);
  background: var(--color-card);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.quality-select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-bg);
}

.quality-select-arrow {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  color: var(--color-text-secondary);
  pointer-events: none;
}

/* 手机端：显示下拉，隐藏网格 */
.quality-grid {
  display: none;
}

.quality-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-card);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.quality-item:hover {
  border-color: var(--color-primary-light, var(--color-primary));
}

.quality-item.selected {
  border-color: var(--color-primary);
  background: var(--color-primary-bg);
}

.quality-item input {
  display: none;
}

.quality-content {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.quality-name {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.quality-tag {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  background: var(--color-bg);
  padding: 1px 6px;
  border-radius: var(--radius-sm);
}

.quality-item.selected .quality-tag {
  background: rgba(var(--color-primary-rgb, 99, 102, 241), 0.15);
  color: var(--color-primary);
}

.quality-check {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.quality-item.selected .quality-check {
  opacity: 1;
}

.quality-check svg {
  width: 16px;
  height: 16px;
}

/* ===== Download Button ===== */
.download-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  width: 100%;
  padding: var(--spacing-md);
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: white;
  background: var(--color-primary);
  border: none;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.download-btn:hover:not(:disabled) {
  filter: brightness(1.05);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(var(--color-primary-rgb, 99, 102, 241), 0.3);
}

.download-btn:active:not(:disabled) {
  transform: translateY(0);
}

.download-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.download-btn svg {
  width: 20px;
  height: 20px;
}

/* ===== Download Overlay ===== */
.download-overlay {
  position: fixed;
  inset: 0;
  z-index: 500;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.download-overlay-content {
  background: var(--color-card);
  border-radius: var(--radius-xl);
  padding: var(--spacing-xl) var(--spacing-2xl);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  min-width: 220px;
}

.download-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.download-status-text {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text);
  text-align: center;
}

.download-status-hint {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
}

/* ===== Transitions ===== */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ===== Desktop ===== */
@media (min-width: 768px) {
  .page-content {
    padding: var(--spacing-xl) var(--spacing-lg);
  }

  .quality-select-wrapper {
    display: none;
  }

  .quality-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-sm);
  }
}
</style>
