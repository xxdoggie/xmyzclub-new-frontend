<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { getMusicUrl } from '@/api/campaign'
import { useToast } from '@/composables/useToast'
import type { MusicDetail } from '@/types/campaign'

const props = defineProps<{
  music: MusicDetail | null
}>()

const emit = defineEmits<{
  close: []
}>()

const toast = useToast()

// 播放器状态
const isExpanded = ref(true)
const isPlaying = ref(false)
const isLoading = ref(false)
const audioUrl = ref('')
const currentTime = ref(0)
const duration = ref(0)
const audioRef = ref<HTMLAudioElement | null>(null)

// 进度百分比
const progressPercent = computed(() => {
  if (duration.value === 0) return 0
  return (currentTime.value / duration.value) * 100
})

// 格式化时间
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 加载音乐
async function loadMusic() {
  if (!props.music) return

  isLoading.value = true
  try {
    const res = await getMusicUrl(props.music.mid)
    if (res.data.code === 200 && res.data.data.url) {
      audioUrl.value = res.data.data.url
    } else {
      toast.error('获取播放链接失败')
    }
  } catch (error) {
    toast.error('获取播放链接失败')
  } finally {
    isLoading.value = false
  }
}

// 切换播放/暂停
function togglePlay() {
  if (!audioRef.value) return

  if (isPlaying.value) {
    audioRef.value.pause()
  } else {
    audioRef.value.play()
  }
}

// 音频事件处理
function onPlay() {
  isPlaying.value = true
}

function onPause() {
  isPlaying.value = false
}

function onTimeUpdate() {
  if (audioRef.value) {
    currentTime.value = audioRef.value.currentTime
  }
}

function onLoadedMetadata() {
  if (audioRef.value) {
    duration.value = audioRef.value.duration
  }
}

function onEnded() {
  isPlaying.value = false
  currentTime.value = 0
}

// 点击进度条跳转
function onProgressClick(event: MouseEvent) {
  if (!audioRef.value || duration.value === 0) return

  const progressBar = event.currentTarget as HTMLElement
  const rect = progressBar.getBoundingClientRect()
  const percent = (event.clientX - rect.left) / rect.width
  audioRef.value.currentTime = percent * duration.value
}

// 关闭播放器
function closePlayer() {
  if (audioRef.value) {
    audioRef.value.pause()
  }
  emit('close')
}

// 切换展开/收起
function toggleExpand() {
  isExpanded.value = !isExpanded.value
}

// 监听音乐变化
watch(() => props.music, (newMusic) => {
  if (newMusic) {
    // 重置状态
    currentTime.value = 0
    duration.value = 0
    isPlaying.value = false
    audioUrl.value = ''
    isExpanded.value = true
    // 加载新音乐
    loadMusic()
  }
}, { immediate: true })

// 清理
onUnmounted(() => {
  if (audioRef.value) {
    audioRef.value.pause()
  }
})
</script>

<template>
  <Transition name="player-slide">
    <div v-if="music" class="music-player" :class="{ collapsed: !isExpanded }">
      <!-- 隐藏的 audio 元素 -->
      <audio
        ref="audioRef"
        :src="audioUrl"
        @play="onPlay"
        @pause="onPause"
        @timeupdate="onTimeUpdate"
        @loadedmetadata="onLoadedMetadata"
        @ended="onEnded"
      ></audio>

      <!-- 收起状态的迷你条 -->
      <div v-if="!isExpanded" class="mini-bar" @click="toggleExpand">
        <img :src="music.cover" :alt="music.title" class="mini-cover" />
        <div class="mini-info">
          <span class="mini-title">{{ music.title }}</span>
          <span class="mini-singer">{{ music.singer }}</span>
        </div>
        <button class="mini-play-btn" @click.stop="togglePlay">
          <svg v-if="isPlaying" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1"></rect>
            <rect x="14" y="4" width="4" height="16" rx="1"></rect>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        </button>
        <button class="mini-expand-btn" @click.stop="toggleExpand">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="18 15 12 9 6 15"></polyline>
          </svg>
        </button>
      </div>

      <!-- 展开状态 -->
      <div v-else class="expanded-player">
        <!-- 头部操作栏 -->
        <div class="player-header">
          <button class="collapse-btn" @click="toggleExpand">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
            收起
          </button>
          <span class="player-title">正在试听</span>
          <button class="close-btn" @click="closePlayer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- 歌曲信息 -->
        <div class="music-info">
          <img :src="music.cover" :alt="music.title" class="music-cover" />
          <div class="music-details">
            <h3 class="music-title">{{ music.title }}</h3>
            <p class="music-singer">{{ music.singer }}</p>
            <p class="music-album">{{ music.album }}</p>
          </div>
        </div>

        <!-- 播放控制 -->
        <div class="player-controls">
          <!-- 进度条 -->
          <div class="progress-wrapper">
            <span class="time-current">{{ formatTime(currentTime) }}</span>
            <div class="progress-bar" @click="onProgressClick">
              <div class="progress-bg"></div>
              <div class="progress-fill" :style="{ width: `${progressPercent}%` }"></div>
              <div class="progress-thumb" :style="{ left: `${progressPercent}%` }"></div>
            </div>
            <span class="time-duration">{{ formatTime(duration) }}</span>
          </div>

          <!-- 播放按钮 -->
          <div class="control-buttons">
            <button
              class="play-btn"
              :class="{ loading: isLoading }"
              :disabled="isLoading || !audioUrl"
              @click="togglePlay"
            >
              <div v-if="isLoading" class="loading-spinner"></div>
              <svg v-else-if="isPlaying" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1"></rect>
                <rect x="14" y="4" width="4" height="16" rx="1"></rect>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.music-player {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 60px; /* 底部导航栏高度 */
  background: var(--color-card);
  border-top: 1px solid var(--color-border);
  z-index: 200;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
}

/* ===== 迷你条 ===== */
.mini-bar {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  cursor: pointer;
}

.mini-cover {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  flex-shrink: 0;
}

.mini-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mini-title {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mini-singer {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mini-play-btn,
.mini-expand-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--color-text);
  cursor: pointer;
  flex-shrink: 0;
}

.mini-play-btn svg {
  width: 20px;
  height: 20px;
}

.mini-expand-btn svg {
  width: 18px;
  height: 18px;
  color: var(--color-text-secondary);
}

/* ===== 展开状态 ===== */
.expanded-player {
  padding: var(--spacing-md);
}

.player-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-md);
}

.player-title {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
}

.collapse-btn,
.close-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  background: none;
  border: none;
  cursor: pointer;
}

.collapse-btn svg,
.close-btn svg {
  width: 16px;
  height: 16px;
}

.close-btn {
  color: var(--color-error);
}

/* 歌曲信息 */
.music-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.music-cover {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-md);
  object-fit: cover;
  flex-shrink: 0;
}

.music-details {
  flex: 1;
  min-width: 0;
}

.music-title {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.music-singer {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.music-album {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 播放控制 */
.player-controls {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.progress-wrapper {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.time-current,
.time-duration {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
  min-width: 36px;
  text-align: center;
}

.progress-bar {
  flex: 1;
  height: 24px;
  display: flex;
  align-items: center;
  position: relative;
  cursor: pointer;
}

.progress-bg {
  position: absolute;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--color-border);
  border-radius: var(--radius-full);
}

.progress-fill {
  position: absolute;
  left: 0;
  height: 4px;
  background: var(--color-secondary);
  border-radius: var(--radius-full);
  transition: width 0.1s linear;
}

.progress-thumb {
  position: absolute;
  width: 12px;
  height: 12px;
  background: var(--color-secondary);
  border-radius: 50%;
  transform: translateX(-50%);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.control-buttons {
  display: flex;
  justify-content: center;
}

.play-btn {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-secondary);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.play-btn:hover:not(:disabled) {
  transform: scale(1.05);
}

.play-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.play-btn svg {
  width: 24px;
  height: 24px;
}

.play-btn.loading .loading-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ===== 动画 ===== */
.player-slide-enter-active,
.player-slide-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.player-slide-enter-from,
.player-slide-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

/* ===== 桌面端 ===== */
@media (min-width: 768px) {
  .music-player {
    left: 50%;
    transform: translateX(-50%);
    max-width: 500px;
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
    border-left: 1px solid var(--color-border);
    border-right: 1px solid var(--color-border);
  }

  .music-cover {
    width: 80px;
    height: 80px;
  }
}
</style>
