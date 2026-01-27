<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/composables/useToast'
import { getQRCode, checkQRCodeStatus, getAuthStatus } from '@/api/qqmusic'
import type { QQMusicAuthStatus, QQMusicQRCode, QQMusicQRCodeStatus } from '@/api/qqmusic'
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb.vue'

const router = useRouter()
const userStore = useUserStore()
const toast = useToast()

// ==================== 状态 ====================
const isLoading = ref(true)
const authStatus = ref<QQMusicAuthStatus | null>(null)

// 二维码相关
const showQRCodeModal = ref(false)
const qrCodeData = ref<QQMusicQRCode | null>(null)
const qrCodeStatus = ref<QQMusicQRCodeStatus | null>(null)
const isLoadingQRCode = ref(false)
const pollTimer = ref<number | null>(null)
const qrCodeExpireTimer = ref<number | null>(null)
const qrCodeRemainingSeconds = ref(0)

// ==================== 计算属性 ====================
const statusInfo = computed(() => {
  if (!authStatus.value) {
    return { status: 'unknown', label: '未知', class: 'status-unknown', desc: '无法获取状态信息' }
  }

  if (!authStatus.value.loggedIn) {
    return { status: 'not-logged', label: '未登录', class: 'status-error', desc: '尚未登录QQ音乐账号' }
  }

  if (authStatus.value.expired) {
    return { status: 'expired', label: '已过期', class: 'status-error', desc: '凭证已过期，请重新登录' }
  }

  const remaining = authStatus.value.remainingSeconds || 0
  if (remaining < 3600) {
    return { status: 'expiring', label: '即将过期', class: 'status-warning', desc: '凭证即将过期，建议重新登录' }
  }

  return { status: 'normal', label: '正常', class: 'status-success', desc: '凭证有效' }
})

const qrCodeStatusText = computed(() => {
  if (!qrCodeStatus.value) return '等待扫描'
  switch (qrCodeStatus.value.code) {
    case 0:
      return '登录成功'
    case 66:
      return '等待扫描二维码'
    case 67:
      return qrCodeStatus.value.nickname
        ? `${qrCodeStatus.value.nickname} 已扫码，请在手机上确认`
        : '已扫码，请在手机上确认'
    case 65:
      return '二维码已过期，请刷新'
    case 68:
      return '用户取消登录'
    default:
      return '未知状态'
  }
})

const qrCodeStatusClass = computed(() => {
  if (!qrCodeStatus.value) return ''
  switch (qrCodeStatus.value.code) {
    case 0:
      return 'status-success'
    case 66:
      return ''
    case 67:
      return 'status-info'
    case 65:
    case 68:
      return 'status-error'
    default:
      return ''
  }
})

// ==================== 辅助函数 ====================
function formatRemainingTime(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return '已过期'

  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (days > 0) {
    return `${days}天${hours}小时`
  }
  if (hours > 0) {
    return `${hours}小时${minutes}分钟`
  }
  return `${minutes}分钟`
}

function formatExpireDate(timestamp: number | null): string {
  if (!timestamp) return '未知'
  const date = new Date(timestamp * 1000)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ==================== 数据加载 ====================
async function loadAuthStatus() {
  isLoading.value = true
  try {
    const res = await getAuthStatus()
    if (res.data.code === 200) {
      authStatus.value = res.data.data
    } else {
      toast.error(res.data.message || '获取登录状态失败')
    }
  } catch (error) {
    toast.error('获取登录状态失败')
  } finally {
    isLoading.value = false
  }
}

// ==================== 二维码登录 ====================
async function openQRCodeModal() {
  showQRCodeModal.value = true
  qrCodeStatus.value = null
  await fetchQRCode()
}

function closeQRCodeModal() {
  showQRCodeModal.value = false
  stopPolling()
  stopExpireTimer()
  qrCodeData.value = null
  qrCodeStatus.value = null
}

async function fetchQRCode() {
  isLoadingQRCode.value = true
  stopPolling()
  stopExpireTimer()
  qrCodeStatus.value = null

  try {
    const res = await getQRCode()
    if (res.data.code === 200) {
      qrCodeData.value = res.data.data
      qrCodeRemainingSeconds.value = res.data.data.expiresIn
      startExpireTimer()
      startPolling()
    } else {
      toast.error(res.data.message || '获取二维码失败')
    }
  } catch (error) {
    toast.error('获取二维码失败')
  } finally {
    isLoadingQRCode.value = false
  }
}

function startExpireTimer() {
  stopExpireTimer()
  qrCodeExpireTimer.value = window.setInterval(() => {
    if (qrCodeRemainingSeconds.value > 0) {
      qrCodeRemainingSeconds.value--
    } else {
      stopExpireTimer()
    }
  }, 1000)
}

function stopExpireTimer() {
  if (qrCodeExpireTimer.value) {
    clearInterval(qrCodeExpireTimer.value)
    qrCodeExpireTimer.value = null
  }
}

function startPolling() {
  if (!qrCodeData.value?.qrKey) return

  pollTimer.value = window.setInterval(async () => {
    if (!qrCodeData.value?.qrKey) {
      stopPolling()
      return
    }

    try {
      const res = await checkQRCodeStatus(qrCodeData.value.qrKey)
      if (res.data.code === 200) {
        qrCodeStatus.value = res.data.data

        switch (res.data.data.code) {
          case 0: // 登录成功
            stopPolling()
            stopExpireTimer()
            toast.success('登录成功')
            closeQRCodeModal()
            await loadAuthStatus()
            break
          case 65: // 二维码过期
          case 68: // 用户取消
            stopPolling()
            stopExpireTimer()
            break
          // 66, 67 继续轮询
        }
      }
    } catch (error) {
      console.error('Check QR code status failed:', error)
    }
  }, 2000)
}

function stopPolling() {
  if (pollTimer.value) {
    clearInterval(pollTimer.value)
    pollTimer.value = null
  }
}

// ==================== 生命周期 ====================
onMounted(() => {
  if (!userStore.isLoggedIn || !userStore.canManageCampaigns) {
    toast.error('无权访问此页面')
    router.push('/')
    return
  }
  loadAuthStatus()
})

onUnmounted(() => {
  stopPolling()
  stopExpireTimer()
})
</script>

<template>
  <div class="page-container">
    <PageHeader back-to="/" />

    <main class="page-content">
      <div class="content-container">
        <!-- 桌面端面包屑 -->
        <div class="breadcrumb-wrapper">
          <PageBreadcrumb />
        </div>

        <!-- 页面标题（仅桌面端显示） -->
        <div class="page-header-section">
          <div class="header-main">
            <div class="header-text">
              <h1 class="page-title">QQ音乐管理</h1>
              <p class="page-subtitle">管理QQ音乐账号登录状态</p>
            </div>
          </div>
        </div>

        <!-- 加载状态 -->
        <div v-if="isLoading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>

        <template v-else>
          <!-- 状态卡片 -->
          <div class="status-card">
            <div class="status-header">
              <div class="status-icon" :class="statusInfo.class">
                <!-- 成功图标 -->
                <svg v-if="statusInfo.status === 'normal'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <!-- 警告图标 -->
                <svg v-else-if="statusInfo.status === 'expiring'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <!-- 错误图标 -->
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="15" y1="9" x2="9" y2="15"></line>
                  <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
              </div>
              <div class="status-text">
                <span class="status-label" :class="statusInfo.class">{{ statusInfo.label }}</span>
                <p class="status-desc">{{ statusInfo.desc }}</p>
              </div>
            </div>

            <!-- 详细信息 -->
            <div v-if="authStatus?.loggedIn" class="status-details">
              <div class="detail-item">
                <span class="detail-label">用户ID</span>
                <span class="detail-value">{{ authStatus.musicid }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">剩余有效期</span>
                <span class="detail-value" :class="{ 'text-warning': (authStatus.remainingSeconds || 0) < 86400 }">
                  {{ formatRemainingTime(authStatus.remainingSeconds) }}
                </span>
              </div>
              <div class="detail-item">
                <span class="detail-label">过期时间</span>
                <span class="detail-value">{{ formatExpireDate(authStatus.expiredAt) }}</span>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="status-actions">
              <button class="action-button secondary" @click="loadAuthStatus" :disabled="isLoading">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                </svg>
                刷新状态
              </button>
              <button class="action-button primary" @click="openQRCodeModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                </svg>
                {{ authStatus?.loggedIn && !authStatus?.expired ? '重新登录' : '扫码登录' }}
              </button>
            </div>
          </div>

          <!-- 说明卡片 -->
          <div class="info-card">
            <h3 class="info-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              使用说明
            </h3>
            <ul class="info-list">
              <li>QQ音乐账号用于获取音乐资源，需要保持登录状态</li>
              <li>登录凭证有效期有限，过期后需要重新扫码登录</li>
              <li>建议在凭证即将过期时提前刷新登录</li>
              <li>扫码登录需要使用QQ或QQ音乐APP扫描</li>
            </ul>
          </div>
        </template>
      </div>
    </main>

    <PageFooter />

    <!-- 二维码登录 Modal -->
    <Transition name="modal-fade">
      <div v-if="showQRCodeModal" class="modal-overlay" @click.self="closeQRCodeModal">
        <Transition name="modal-scale" appear>
          <div v-if="showQRCodeModal" class="modal-content qrcode-modal" @click.stop>
            <h3 class="modal-title">扫码登录QQ音乐</h3>
            <p class="modal-subtitle">请使用QQ或QQ音乐APP扫描二维码</p>

            <!-- 二维码区域 -->
            <div class="qrcode-container">
              <!-- 加载状态 -->
              <div v-if="isLoadingQRCode" class="qrcode-loading">
                <div class="loading-spinner"></div>
                <p>加载中...</p>
              </div>

              <!-- 二维码图片 -->
              <template v-else-if="qrCodeData">
                <div class="qrcode-wrapper" :class="{ expired: qrCodeStatus?.code === 65 || qrCodeStatus?.code === 68 }">
                  <img :src="qrCodeData.qrCodeBase64" alt="QQ音乐登录二维码" class="qrcode-image" />

                  <!-- 过期/取消遮罩 -->
                  <div v-if="qrCodeStatus?.code === 65 || qrCodeStatus?.code === 68" class="qrcode-overlay">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="23 4 23 10 17 10"></polyline>
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                    </svg>
                    <span>点击刷新</span>
                  </div>

                  <!-- 点击刷新 -->
                  <div v-if="qrCodeStatus?.code === 65 || qrCodeStatus?.code === 68" class="qrcode-refresh-click" @click="fetchQRCode"></div>
                </div>

                <!-- 倒计时 -->
                <div v-if="qrCodeRemainingSeconds > 0 && qrCodeStatus?.code !== 65" class="qrcode-timer">
                  二维码有效期：{{ qrCodeRemainingSeconds }}秒
                </div>
              </template>
            </div>

            <!-- 状态提示 -->
            <div class="qrcode-status" :class="qrCodeStatusClass">
              <template v-if="qrCodeStatus?.code === 67 && qrCodeStatus.avatar">
                <img :src="qrCodeStatus.avatar" alt="头像" class="qrcode-avatar" />
              </template>
              <span>{{ qrCodeStatusText }}</span>
            </div>

            <!-- 刷新按钮 -->
            <div class="modal-actions">
              <button class="modal-btn cancel" @click="closeQRCodeModal">取消</button>
              <button
                class="modal-btn confirm"
                @click="fetchQRCode"
                :disabled="isLoadingQRCode"
              >
                {{ isLoadingQRCode ? '加载中...' : '刷新二维码' }}
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
  max-width: 600px;
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

/* ===== Status Card ===== */
.status-card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-md);
}

.status-header {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.status-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.status-icon svg {
  width: 24px;
  height: 24px;
}

.status-icon.status-success {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.status-icon.status-warning {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.status-icon.status-error {
  background: var(--color-error-bg);
  color: var(--color-error);
}

.status-icon.status-unknown {
  background: var(--color-border);
  color: var(--color-text-secondary);
}

.status-text {
  flex: 1;
  min-width: 0;
}

.status-label {
  display: inline-block;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  margin-bottom: var(--spacing-xs);
}

.status-label.status-success {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.status-label.status-warning {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.status-label.status-error {
  background: var(--color-error-bg);
  color: var(--color-error);
}

.status-label.status-unknown {
  background: var(--color-border);
  color: var(--color-text-secondary);
}

.status-desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

/* ===== Status Details ===== */
.status-details {
  background: var(--color-bg);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-xs) 0;
}

.detail-item:not(:last-child) {
  border-bottom: 1px solid var(--color-border);
}

.detail-label {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.detail-value {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.detail-value.text-warning {
  color: var(--color-warning);
}

/* ===== Status Actions ===== */
.status-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.action-button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.action-button svg {
  width: 16px;
  height: 16px;
}

.action-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.action-button.primary {
  background: var(--color-primary);
  color: white;
}

.action-button.primary:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.action-button.secondary {
  background: var(--color-border);
  color: var(--color-text);
}

.action-button.secondary:hover:not(:disabled) {
  background: var(--color-text-placeholder);
}

/* ===== Info Card ===== */
.info-card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
}

.info-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-md);
}

.info-title svg {
  width: 18px;
  height: 18px;
  color: var(--color-primary);
}

.info-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.info-list li {
  position: relative;
  padding-left: var(--spacing-md);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.info-list li:not(:last-child) {
  margin-bottom: var(--spacing-xs);
}

.info-list li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  width: 4px;
  height: 4px;
  background: var(--color-text-placeholder);
  border-radius: 50%;
}

/* ===== Modal ===== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--spacing-md);
}

.modal-content {
  background: var(--color-card);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  max-width: 360px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-xs);
  text-align: center;
}

.modal-subtitle {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  text-align: center;
  margin-bottom: var(--spacing-lg);
}

.modal-actions {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: center;
  margin-top: var(--spacing-lg);
}

.modal-btn {
  flex: 1;
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

.modal-btn.cancel:hover:not(:disabled) {
  background: var(--color-text-placeholder);
}

.modal-btn.confirm {
  background: var(--color-primary);
  color: white;
}

.modal-btn.confirm:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

/* ===== QRCode Modal ===== */
.qrcode-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 200px;
  justify-content: center;
}

.qrcode-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: var(--color-text-secondary);
}

.qrcode-wrapper {
  position: relative;
  width: 200px;
  height: 200px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: white;
}

.qrcode-wrapper.expired {
  opacity: 0.3;
}

.qrcode-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.qrcode-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  gap: var(--spacing-xs);
  opacity: 1;
}

.qrcode-wrapper.expired .qrcode-overlay {
  opacity: 1;
}

.qrcode-overlay svg {
  width: 32px;
  height: 32px;
}

.qrcode-overlay span {
  font-size: var(--text-sm);
}

.qrcode-refresh-click {
  position: absolute;
  inset: 0;
  cursor: pointer;
}

.qrcode-timer {
  margin-top: var(--spacing-sm);
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.qrcode-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.qrcode-status.status-success {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.qrcode-status.status-info {
  background: var(--color-info-bg);
  color: var(--color-info);
}

.qrcode-status.status-error {
  background: var(--color-error-bg);
  color: var(--color-error);
}

.qrcode-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
}

/* ===== Desktop ===== */
@media (min-width: 768px) {
  .action-button {
    flex: none;
    min-width: 140px;
  }
}

@media (min-width: 1024px) {
  .breadcrumb-wrapper {
    display: block;
  }

  .page-content {
    padding: var(--spacing-xl);
  }

  .page-header-section {
    margin-bottom: var(--spacing-lg);
  }

  .header-main {
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-start;
  }

  .header-text {
    display: block;
  }

  .page-title {
    font-size: var(--text-2xl);
  }

  .page-subtitle {
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
  transform: scale(0.9);
}
</style>
