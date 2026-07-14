<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import QRCode from 'qrcode'
import { getRoundById } from '@/api/debate'
import { useDebateSocket } from '@/composables/useDebateSocket'
import type { ActiveRound } from '@/types/debate'

const route = useRoute()
const roundId = computed(() => Number(route.query.round || 0))
const round = ref<ActiveRound | null>(null)
const loading = ref(true)
const errorMsg = ref('')
const qrDataUrl = ref('')
const secondsLeft = ref<number | null>(null)
let pollTimer: ReturnType<typeof setInterval> | null = null
let countdownTimer: ReturnType<typeof setInterval> | null = null

const voterUrl = computed(() =>
  roundId.value ? `${window.location.origin}/vote?round=${roundId.value}` : ''
)

// 实时数据（用于"已投 X 票" + 锁票后切换结果视图）
const roundIdRef = ref<number | null>(null)
watch(roundId, (v) => (roundIdRef.value = v || null), { immediate: true })
const { result: liveResult } = useDebateSocket(roundIdRef)

const stage = computed<'pending' | 'live' | 'ended'>(() => {
  if (!round.value) return 'pending'
  if (!round.value.isActive && !round.value.startedAt) return 'pending'
  if (!round.value.isActive || round.value.locked) return 'ended'
  return 'live'
})

async function loadRound() {
  if (!roundId.value) {
    errorMsg.value = 'URL 缺少 round 参数'
    loading.value = false
    return
  }
  try {
    const res = await getRoundById(roundId.value)
    if (res.data.code === 200 && res.data.data) {
      round.value = res.data.data
      secondsLeft.value = round.value.secondsLeft
      if (round.value.startedAt && round.value.isActive && !round.value.locked) {
        startCountdown()
      } else if (countdownTimer) {
        clearInterval(countdownTimer)
      }
    } else {
      errorMsg.value = res.data.message || '场次不存在'
    }
  } catch (e: unknown) {
    errorMsg.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function startCountdown() {
  if (countdownTimer) clearInterval(countdownTimer)
  countdownTimer = setInterval(() => {
    if (secondsLeft.value === null) return
    secondsLeft.value = Math.max(0, secondsLeft.value - 1)
    if (secondsLeft.value === 0 && round.value) {
      round.value.locked = true
      if (countdownTimer) clearInterval(countdownTimer)
    }
  }, 1000)
}

async function generateQR() {
  if (!voterUrl.value) return
  try {
    qrDataUrl.value = await QRCode.toDataURL(voterUrl.value, {
      width: 900,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#111827', light: '#ffffff' },
    })
  } catch (e) {
    console.error('QR generation failed', e)
  }
}

function formatTime(s: number | null): string {
  if (s === null) return '--:--'
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.()
  } else {
    document.exitFullscreen?.()
  }
}

onMounted(async () => {
  await loadRound()
  await generateQR()
  pollTimer = setInterval(loadRound, 5000)
})

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer)
  if (countdownTimer) clearInterval(countdownTimer)
})
</script>

<template>
  <div class="screen-root">
    <div v-if="loading" class="placeholder">
      <div class="spinner"></div>
      <div>加载中…</div>
    </div>
    <div v-else-if="errorMsg" class="placeholder error">{{ errorMsg }}</div>

    <template v-else-if="round">
      <!-- 顶部信息（居中） -->
      <header class="head">
        <div class="topic">{{ round.topic }}</div>
        <div class="sides">
          <span class="side">{{ round.sideAName }}</span>
          <span class="vs">VS</span>
          <span class="side">{{ round.sideBName }}</span>
        </div>
        <button class="fs-btn" @click="toggleFullscreen" title="全屏">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </svg>
        </button>
      </header>

      <!-- 投票中 / 待开始：QR + 大倒计时 -->
      <main v-if="stage !== 'ended'" class="qr-stage">
        <!-- 超大倒计时 -->
        <div class="countdown-wrap">
          <div v-if="stage === 'live'" class="countdown-label">距离投票结束还有</div>
          <div v-else class="countdown-label pending">等待主持人开启</div>

          <div v-if="stage === 'live'" class="countdown-big" :class="{ urgent: (secondsLeft ?? 0) < 60 }">
            {{ formatTime(secondsLeft) }}
          </div>
          <div v-else class="countdown-big pending">--:--</div>

          <div v-if="liveResult && liveResult.totalVotes > 0" class="vote-tally">
            已投 <b>{{ liveResult.totalVotes }}</b> 票
          </div>
        </div>

        <!-- 二维码区（无卡片） -->
        <div class="qr-area">
          <img v-if="qrDataUrl" :src="qrDataUrl" alt="投票二维码" class="qr-img" />
          <div class="scan-title">微信扫一扫参与投票</div>
        </div>
      </main>

      <!-- 已锁票：不展示结果，只显示已结束 -->
      <main v-else class="ended-stage">
        <div class="ended-title">本场投票已结束</div>
        <div class="ended-sub">感谢参与</div>
      </main>
    </template>
  </div>
</template>

<style scoped>
.screen-root {
  min-height: 100vh;
  min-height: 100dvh;
  background: #f9fafb;
  color: #1f2937;
  font-family: -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  padding: 32px 48px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.placeholder {
  margin: auto;
  text-align: center;
  font-size: 24px;
  color: #6b7280;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}
.placeholder.error { color: #dc2626; }

.spinner {
  width: 48px; height: 48px;
  border: 4px solid #e5e7eb;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ===== Header (centered) ===== */
.head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  text-align: center;
  position: relative;
  margin-top: 64px;
}
.topic {
  font-size: 64px;
  font-weight: 800;
  line-height: 1.2;
  color: #111827;
  letter-spacing: -0.02em;
  max-width: 1200px;
}
.sides {
  display: flex;
  align-items: center;
  gap: 40px;
  font-size: 36px;
}
.sides .side {
  font-weight: 700;
  color: #111827;
}
.sides .vs {
  color: #111827;
  font-size: 24px;
  font-weight: 700;
  opacity: 0.4;
}

.fs-btn {
  position: absolute;
  top: 0;
  right: 0;
  width: 44px; height: 44px;
  background: transparent;
  border: 1px solid #e5e7eb;
  color: #6b7280;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.fs-btn:hover { color: #2563eb; border-color: #2563eb; }
.fs-btn svg { width: 20px; height: 20px; }

/* ===== QR Stage ===== */
.qr-stage {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 64px;
  flex-wrap: wrap;
}

/* Huge countdown */
.countdown-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  min-width: 360px;
}
.countdown-label {
  font-size: 26px;
  color: #6b7280;
  font-weight: 500;
}
.countdown-label.pending { color: #f59e0b; }

.countdown-big {
  font-size: 220px;
  font-weight: 800;
  line-height: 1;
  color: #111827;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.04em;
  padding: 20px 40px;
  transition: color 0.3s;
}
.countdown-big.urgent {
  color: #dc2626;
  animation: pulse-red 1s ease-in-out infinite;
}
.countdown-big.pending { color: #d1d5db; }
@keyframes pulse-red {
  50% { opacity: 0.75; }
}

.vote-tally {
  font-size: 26px;
  color: #6b7280;
}
.vote-tally b {
  color: #f59e0b;
  font-size: 40px;
  margin: 0 8px;
  font-variant-numeric: tabular-nums;
}

/* QR Area (no card) */
.qr-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.qr-img {
  width: min(60vh, 640px);
  height: min(60vh, 640px);
  display: block;
}

.scan-title {
  font-size: 32px;
  font-weight: 700;
  color: #111827;
}

/* ===== Ended Stage (no results shown to audience) ===== */
.ended-stage {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #6b7280;
}
.ended-title {
  font-size: 72px;
  font-weight: 800;
  color: #111827;
  letter-spacing: -0.02em;
}
.ended-sub {
  font-size: 28px;
  color: #6b7280;
}

/* ===== Mobile ===== */
@media (max-width: 768px) {
  .screen-root { padding: 20px 16px; gap: 20px; }
  .head { margin-top: 24px; }
  .topic { font-size: 28px; }
  .sides { font-size: 18px; gap: 16px; }
  .sides .vs { font-size: 14px; }
  .fs-btn { width: 36px; height: 36px; }
  .qr-stage { flex-direction: column; gap: 24px; }
  .countdown-big { font-size: 120px; padding: 12px; }
  .countdown-label { font-size: 18px; }
  .vote-tally { font-size: 18px; }
  .vote-tally b { font-size: 26px; }
  .qr-area { gap: 14px; }
  .qr-img { width: 360px; height: 360px; }
  .scan-title { font-size: 22px; }
  .ended-title { font-size: 44px; }
  .ended-sub { font-size: 20px; }
}
</style>
