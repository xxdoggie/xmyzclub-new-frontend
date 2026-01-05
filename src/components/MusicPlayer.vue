<script setup lang="ts">
import { ref, computed, watch, onUnmounted, nextTick } from 'vue'
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
const showModal = ref(false)
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

// 加载音乐并自动播放
async function loadMusic() {
  if (!props.music) return

  isLoading.value = true
  try {
    const res = await getMusicUrl(props.music.mid)
    if (res.data.code === 200 && res.data.data.url) {
      audioUrl.value = res.data.data.url
      // 等待 audio 元素加载完成后自动播放
      await nextTick()
      if (audioRef.value) {
        audioRef.value.play().catch(() => {
          // 自动播放可能被浏览器阻止，忽略错误
        })
      }
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

function onCanPlay() {
  // 音频可以播放时自动开始
  if (audioRef.value && !isPlaying.value) {
    audioRef.value.play().catch(() => {
      // 自动播放可能被浏览器阻止
    })
  }
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
  showModal.value = false
  emit('close')
}

// 打开模态框
function openModal() {
  showModal.value = true
}

// 关闭模态框（不关闭播放器）
function closeModal() {
  showModal.value = false
}

// 监听音乐变化
watch(() => props.music, (newMusic) => {
  if (newMusic) {
    // 重置状态
    currentTime.value = 0
    duration.value = 0
    isPlaying.value = false
    audioUrl.value = ''
    // 加载新音乐（会自动播放）
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
  <!-- 隐藏的 audio 元素 -->
  <audio
    v-if="music"
    ref="audioRef"
    :src="audioUrl"
    @play="onPlay"
    @pause="onPause"
    @timeupdate="onTimeUpdate"
    @loadedmetadata="onLoadedMetadata"
    @ended="onEnded"
    @canplay="onCanPlay"
  ></audio>

  <!-- 悬浮唱片按钮 -->
  <Transition name="disc-pop">
    <div v-if="music" class="floating-disc" :class="{ playing: isPlaying }" @click="openModal">
      <div class="disc-wrapper">
        <img :src="music.cover" :alt="music.title" class="disc-cover" />
        <div class="disc-center"></div>
      </div>
      <!-- 播放/暂停小图标 -->
      <button class="disc-control" @click.stop="togglePlay">
        <svg v-if="isLoading" class="loading-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" stroke-dasharray="60" stroke-linecap="round"></circle>
        </svg>
        <svg v-else-if="isPlaying" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" rx="1"></rect>
          <rect x="14" y="4" width="4" height="16" rx="1"></rect>
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
      </button>
    </div>
  </Transition>

  <!-- 播放器模态框 -->
  <Transition name="modal-fade">
    <div v-if="music && showModal" class="player-modal-overlay" @click.self="closeModal">
      <Transition name="modal-slide" appear>
        <div v-if="showModal" class="player-modal">
          <div class="modal-handle"></div>

          <!-- 头部 -->
          <div class="modal-header">
            <span class="modal-title">正在播放</span>
            <button class="close-btn" @click="closePlayer">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <!-- 封面唱片 -->
          <div class="album-disc-container">
            <div class="album-disc" :class="{ playing: isPlaying }">
              <img :src="music.cover" :alt="music.title" class="album-cover" />
              <div class="album-center"></div>
            </div>
          </div>

          <!-- 歌曲信息 -->
          <div class="song-info">
            <h2 class="song-title">{{ music.title }}</h2>
            <p class="song-artist">{{ music.singer }}</p>
            <p class="song-album">{{ music.album }}</p>
          </div>

          <!-- 进度条 -->
          <div class="progress-section">
            <div class="progress-bar" @click="onProgressClick">
              <div class="progress-bg"></div>
              <div class="progress-fill" :style="{ width: `${progressPercent}%` }"></div>
              <div class="progress-thumb" :style="{ left: `${progressPercent}%` }"></div>
            </div>
            <div class="time-display">
              <span>{{ formatTime(currentTime) }}</span>
              <span>{{ formatTime(duration) }}</span>
            </div>
          </div>

          <!-- 控制按钮 -->
          <div class="control-section">
            <button
              class="main-play-btn"
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
      </Transition>
    </div>
  </Transition>
</template>

<style scoped>
/* ===== 悬浮唱片 ===== */
.floating-disc {
  position: fixed;
  right: var(--spacing-md);
  bottom: 80px;
  z-index: 200;
  cursor: pointer;
}

.disc-wrapper {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  overflow: hidden;
  position: relative;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  animation: none;
}

.floating-disc.playing .disc-wrapper {
  animation: spin 8s linear infinite;
}

.disc-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.disc-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 16px;
  height: 16px;
  background: var(--color-card);
  border-radius: 50%;
  border: 2px solid var(--color-border);
}

.disc-control {
  position: absolute;
  bottom: -4px;
  right: -4px;
  width: 24px;
  height: 24px;
  background: var(--color-primary);
  color: white;
  border: 2px solid var(--color-card);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.disc-control:hover {
  transform: scale(1.1);
}

.disc-control svg {
  width: 10px;
  height: 10px;
}

.disc-control .loading-icon {
  animation: spin 1s linear infinite;
}

/* ===== 模态框 ===== */
.player-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
}

.player-modal {
  background: var(--color-card);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  padding: var(--spacing-md);
  padding-bottom: calc(var(--spacing-xl) + env(safe-area-inset-bottom));
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
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
  margin-bottom: var(--spacing-lg);
}

.modal-title {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  font-weight: var(--font-medium);
}

.close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg);
  border: none;
  border-radius: var(--radius-full);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.close-btn:hover {
  background: var(--color-border);
  color: var(--color-error);
}

.close-btn svg {
  width: 18px;
  height: 18px;
}

/* ===== 封面唱片 ===== */
.album-disc-container {
  display: flex;
  justify-content: center;
  margin-bottom: var(--spacing-lg);
}

.album-disc {
  width: 200px;
  height: 200px;
  border-radius: 50%;
  overflow: hidden;
  position: relative;
  box-shadow:
    0 0 0 8px var(--color-bg),
    0 0 0 10px var(--color-border),
    0 10px 40px rgba(0, 0, 0, 0.2);
  animation: none;
}

.album-disc.playing {
  animation: spin 8s linear infinite;
}

.album-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.album-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 40px;
  height: 40px;
  background: var(--color-card);
  border-radius: 50%;
  border: 4px solid var(--color-border);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* ===== 歌曲信息 ===== */
.song-info {
  text-align: center;
  margin-bottom: var(--spacing-lg);
}

.song-title {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-xs);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.song-artist {
  font-size: var(--text-base);
  color: var(--color-text-secondary);
  margin-bottom: 2px;
}

.song-album {
  font-size: var(--text-sm);
  color: var(--color-text-placeholder);
}

/* ===== 进度条 ===== */
.progress-section {
  margin-bottom: var(--spacing-lg);
}

.progress-bar {
  height: 32px;
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
  background: var(--color-primary);
  border-radius: var(--radius-full);
  transition: width 0.1s linear;
}

.progress-thumb {
  position: absolute;
  width: 14px;
  height: 14px;
  background: var(--color-primary);
  border-radius: 50%;
  transform: translateX(-50%);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.time-display {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
  margin-top: var(--spacing-xs);
}

/* ===== 控制按钮 ===== */
.control-section {
  display: flex;
  justify-content: center;
  padding-bottom: var(--spacing-md);
}

.main-play-btn {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.main-play-btn:hover:not(:disabled) {
  transform: scale(1.05);
}

.main-play-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.main-play-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.main-play-btn svg {
  width: 28px;
  height: 28px;
}

.main-play-btn.loading .loading-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* ===== 动画 ===== */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.disc-pop-enter-active,
.disc-pop-leave-active {
  transition: all 0.3s ease;
}

.disc-pop-enter-from,
.disc-pop-leave-to {
  opacity: 0;
  transform: scale(0.5);
}

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

/* ===== 桌面端 ===== */
@media (min-width: 768px) {
  .floating-disc {
    bottom: 100px;
    right: var(--spacing-xl);
  }

  .disc-wrapper {
    width: 64px;
    height: 64px;
  }

  .disc-center {
    width: 18px;
    height: 18px;
  }

  .disc-control {
    width: 28px;
    height: 28px;
  }

  .disc-control svg {
    width: 12px;
    height: 12px;
  }

  .player-modal-overlay {
    align-items: center;
    padding: var(--spacing-xl);
  }

  .player-modal {
    border-radius: var(--radius-xl);
    max-width: 400px;
    padding-bottom: var(--spacing-xl);
  }

  .modal-handle {
    display: none;
  }

  .album-disc {
    width: 240px;
    height: 240px;
  }

  .album-center {
    width: 48px;
    height: 48px;
  }

  .modal-slide-enter-from,
  .modal-slide-leave-to {
    transform: scale(0.95);
  }
}
</style>
