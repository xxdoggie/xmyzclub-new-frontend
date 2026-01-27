<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { getUserPublicProfile } from '@/api/user'
import type { UserPublicProfile } from '@/types/user'

const props = defineProps<{
  userId: number
  triggerElement: HTMLElement | null
}>()

const emit = defineEmits<{
  close: []
}>()

const isLoading = ref(true)
const profile = ref<UserPublicProfile | null>(null)
const error = ref(false)
const popoverRef = ref<HTMLElement | null>(null)
const isAbove = ref(false) // 气泡是否显示在头像上方
const arrowLeft = ref(0) // 小三角的水平位置
const popoverStyle = ref<{ top: string; left: string; transformOrigin: string }>({
  top: '0px',
  left: '0px',
  transformOrigin: 'top left',
})

// 性别文本
function getGenderText(gender: number) {
  switch (gender) {
    case 1:
      return '男'
    case 2:
      return '女'
    default:
      return '保密'
  }
}

// 加载用户资料
async function loadProfile() {
  isLoading.value = true
  error.value = false

  try {
    const res = await getUserPublicProfile(props.userId)
    if (res.data.code === 200) {
      profile.value = res.data.data
    } else {
      error.value = true
    }
  } catch {
    error.value = true
  } finally {
    isLoading.value = false
  }
}

// 计算气泡位置
function updatePosition() {
  if (!props.triggerElement || !popoverRef.value) return

  const popover = popoverRef.value
  // 实时获取触发元素的位置
  const rect = props.triggerElement.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  // 移动端使用更小的宽度
  const popoverWidth = viewportWidth < 768 ? 240 : 280
  const popoverHeight = popover.offsetHeight || 300
  const gap = 12 // 增加间距以容纳小三角

  let top = rect.bottom + gap
  let left = rect.left + rect.width / 2 - popoverWidth / 2
  let transformOrigin = 'top center'
  isAbove.value = false

  // 检查是否超出右边界
  if (left + popoverWidth > viewportWidth - 16) {
    left = viewportWidth - popoverWidth - 16
    transformOrigin = 'top right'
  }

  // 检查是否超出左边界
  if (left < 16) {
    left = 16
    transformOrigin = 'top left'
  }

  // 检查是否超出下边界，如果是则显示在上方
  if (top + popoverHeight > viewportHeight - 16) {
    top = rect.top - popoverHeight - gap
    transformOrigin = transformOrigin.replace('top', 'bottom')
    isAbove.value = true
  }

  // 计算小三角相对于气泡左边缘的位置
  const triggerCenterX = rect.left + rect.width / 2
  arrowLeft.value = Math.max(16, Math.min(triggerCenterX - left, popoverWidth - 16))

  popoverStyle.value = {
    top: `${top}px`,
    left: `${left}px`,
    transformOrigin,
  }
}

// 点击外部关闭
function handleClickOutside(e: MouseEvent) {
  if (popoverRef.value && !popoverRef.value.contains(e.target as Node)) {
    emit('close')
  }
}

// 监听 userId 变化
watch(
  () => props.userId,
  () => {
    loadProfile()
  },
  { immediate: true }
)

// 监听 triggerElement 变化
watch(
  () => props.triggerElement,
  () => {
    nextTick(updatePosition)
  },
  { immediate: true }
)

onMounted(() => {
  document.addEventListener('click', handleClickOutside, true)
  window.addEventListener('resize', updatePosition)
  window.addEventListener('scroll', updatePosition, true)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside, true)
  window.removeEventListener('resize', updatePosition)
  window.removeEventListener('scroll', updatePosition, true)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="popover">
      <div
        ref="popoverRef"
        class="user-popover"
        :class="{ 'is-above': isAbove }"
        :style="popoverStyle"
        @click.stop
      >
        <!-- 小三角 -->
        <div class="popover-arrow" :style="{ left: `${arrowLeft}px` }"></div>

        <!-- 加载状态 -->
        <div v-if="isLoading" class="popover-loading">
          <div class="loading-spinner"></div>
          <span>加载中...</span>
        </div>

        <!-- 错误状态 -->
        <div v-else-if="error" class="popover-error">
          <span>加载失败</span>
        </div>

        <!-- 用户资料 -->
        <template v-else-if="profile">
          <!-- 头部 -->
          <div class="popover-header">
            <div class="popover-avatar" :class="{ 'has-avatar': profile.hasAvatar }">
              <img v-if="profile.hasAvatar && profile.avatarUrl" :src="profile.avatarUrl" alt="" />
              <template v-else>{{ profile.nickname.charAt(0) }}</template>
            </div>
            <div class="popover-user-info">
              <div class="popover-nickname">{{ profile.nickname }}</div>
              <div class="popover-meta">
                <span class="popover-gender">{{ getGenderText(profile.gender) }}</span>
                <span class="popover-join">{{ profile.joinDate }} 加入</span>
              </div>
            </div>
          </div>

          <!-- 签名 -->
          <div v-if="profile.signature" class="popover-signature">
            {{ profile.signature }}
          </div>

          <!-- 校园网绑定信息 -->
          <div v-if="profile.showCampusBinding && profile.hasCampusBinding" class="popover-section">
            <div class="popover-section-icon campus">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
              </svg>
            </div>
            <div class="popover-section-content">
              <span class="popover-section-label">{{ profile.campusName }}</span>
              <span class="popover-section-value">{{ profile.classAlias }}</span>
            </div>
          </div>

          <!-- 统计数据 -->
          <div v-if="profile.showStatistics" class="popover-stats">
            <div class="stat-item">
              <span class="stat-value">{{ profile.ratingCount ?? 0 }}</span>
              <span class="stat-label">评分</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ profile.commentCount ?? 0 }}</span>
              <span class="stat-label">评论</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ profile.likeCount ?? 0 }}</span>
              <span class="stat-label">获赞</span>
            </div>
          </div>

          <!-- 贡献数 -->
          <div v-if="profile.showContributions" class="popover-contribution">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            <span>贡献 {{ profile.contributionCount ?? 0 }} 条内容</span>
          </div>
        </template>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.user-popover {
  position: fixed;
  width: 280px;
  background: rgba(var(--color-card-rgb, 255, 255, 255), 0.95);
  backdrop-filter: blur(8px);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  z-index: 2000;
  overflow: visible;
}

/* 小三角 - 默认在下方（气泡在头像下面时） */
.popover-arrow {
  position: absolute;
  top: -6px;
  width: 12px;
  height: 12px;
  background: rgba(var(--color-card-rgb, 255, 255, 255), 0.95);
  border: 1px solid var(--color-border);
  border-right: none;
  border-bottom: none;
  transform: translateX(-50%) rotate(45deg);
  z-index: 1;
}

/* 气泡在上方时，小三角在底部 */
.user-popover.is-above .popover-arrow {
  top: auto;
  bottom: -6px;
  border: 1px solid var(--color-border);
  border-left: none;
  border-top: none;
}

/* 加载状态 */
.popover-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
  gap: var(--spacing-sm);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 错误状态 */
.popover-error {
  padding: var(--spacing-lg);
  text-align: center;
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

/* 头部 */
.popover-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  color: white;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}

.popover-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  flex-shrink: 0;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.popover-avatar.has-avatar {
  background: transparent;
  overflow: hidden;
  border: none;
}

.popover-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.popover-user-info {
  flex: 1;
  min-width: 0;
}

.popover-nickname {
  font-size: var(--text-base);
  font-weight: var(--font-bold);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.popover-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--text-xs);
  opacity: 0.85;
  margin-top: 2px;
}

.popover-gender::after {
  content: '·';
  margin-left: var(--spacing-sm);
}

/* 签名 */
.popover-signature {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  font-style: italic;
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 校园网绑定信息 */
.popover-section {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
}

.popover-section-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  flex-shrink: 0;
}

.popover-section-icon.campus {
  background: rgba(6, 182, 212, 0.1);
  color: var(--color-secondary);
}

.popover-section-icon svg {
  width: 14px;
  height: 14px;
}

.popover-section-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.popover-section-label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.popover-section-value {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 统计数据 */
.popover-stats {
  display: flex;
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.stat-value {
  font-size: var(--text-base);
  font-weight: var(--font-bold);
  color: var(--color-text);
}

.stat-label {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

/* 贡献数 */
.popover-contribution {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.popover-contribution svg {
  width: 14px;
  height: 14px;
  color: var(--color-warning);
}

/* 动画 */
.popover-enter-active,
.popover-leave-active {
  transition: all var(--transition-fast);
}

.popover-enter-from,
.popover-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* 移动端样式调整 */
@media (max-width: 767px) {
  .user-popover {
    width: 240px;
  }

  .popover-loading {
    padding: var(--spacing-md);
  }

  .popover-error {
    padding: var(--spacing-md);
  }

  .popover-header {
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
  }

  .popover-avatar {
    width: 36px;
    height: 36px;
    font-size: var(--text-sm);
  }

  .popover-nickname {
    font-size: var(--text-sm);
  }

  .popover-meta {
    font-size: 10px;
  }

  .popover-signature {
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: 10px;
  }

  .popover-section {
    padding: var(--spacing-xs) var(--spacing-sm);
  }

  .popover-section-icon {
    width: 24px;
    height: 24px;
  }

  .popover-section-icon svg {
    width: 12px;
    height: 12px;
  }

  .popover-section-label {
    font-size: var(--text-xs);
  }

  .popover-section-value {
    font-size: 10px;
  }

  .popover-stats {
    padding: var(--spacing-xs) var(--spacing-sm);
  }

  .stat-value {
    font-size: var(--text-sm);
  }

  .stat-label {
    font-size: 10px;
  }

  .popover-contribution {
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: 10px;
  }

  .popover-contribution svg {
    width: 12px;
    height: 12px;
  }
}

/* 暗色模式支持 */
.dark .user-popover {
  background: rgba(var(--color-card-rgb, 30, 30, 30), 0.95);
}

.dark .popover-arrow {
  background: rgba(var(--color-card-rgb, 30, 30, 30), 0.95);
}
</style>
