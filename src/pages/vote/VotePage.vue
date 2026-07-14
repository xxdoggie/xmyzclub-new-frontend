<template>
  <div class="vote-container">
    <div v-if="loading" class="loading-wrap">
      <div class="spinner"></div>
      <div class="loading-text">正在进入投票系统，若长时间未响应请重新扫描二维码</div>
    </div>

    <div v-else-if="!isWeChat" class="state warn">
      <h2>请在微信中扫码进入</h2>
      <p>本投票需要使用微信进行身份识别（防止重复投票）。请回到大屏前用微信扫一扫。</p>
    </div>

    <div v-else-if="errorMsg" class="state error">
      {{ errorMsg }}
      <button class="btn" @click="reload">刷新重试</button>
    </div>

    <div v-else-if="!round" class="state">
      <h2>暂无进行中的投票</h2>
      <p>请等待主持人开启下一场。</p>
    </div>

    <div v-else-if="!round.isActive && !round.startedAt" class="state">
      <h2>本场投票尚未开始</h2>
      <p class="sub">{{ round.topic }}</p>
      <p class="hint">请等待主持人开启此场。</p>
    </div>

    <div v-else-if="alreadyVoted" class="state success">
      <h2>✓ 你已为本场投票</h2>
      <p class="sub">{{ round.topic }}</p>
      <p class="hint">感谢参与，等待主持人公布结果。</p>
    </div>

    <div v-else-if="!round.isActive || round.locked" class="state">
      <h2>本场投票已结束</h2>
      <p class="sub">{{ round.topic }}</p>
    </div>

    <form v-else class="vote-form" @submit.prevent="onSubmit">
      <div class="header">
        <div class="topic">{{ round.topic }}</div>
        <div class="timer" :class="{ urgent: secondsLeft !== null && secondsLeft < 60 }">
          距离投票结束还有 {{ formatTime(secondsLeft) }}
        </div>
      </div>

      <div class="section">
        <h3>你支持哪一方？</h3>
        <div class="side-pick">
          <label class="side-card" :class="{ active: form.supportSide === 'A' }">
            <input v-model="form.supportSide" type="radio" value="A" />
            <span class="side-tag">正方</span>
            <span class="side-name">{{ round.sideAName }}</span>
          </label>
          <label class="side-card" :class="{ active: form.supportSide === 'B' }">
            <input v-model="form.supportSide" type="radio" value="B" />
            <span class="side-tag">反方</span>
            <span class="side-name">{{ round.sideBName }}</span>
          </label>
        </div>
      </div>

      <template v-if="!isSolo">
        <div class="section">
          <h3>{{ round.sideAName }}（正方）佳辩</h3>
          <div class="debater-list">
            <label
              v-for="d in round.debatersA"
              :key="d.id"
              class="debater-card"
              :class="{ active: form.bestAId === d.id }"
            >
              <input v-model="form.bestAId" type="radio" :value="d.id" />
              <span class="position">{{ d.position || '辩手' }}</span>
              <span class="name">{{ d.name }}</span>
            </label>
          </div>
        </div>

        <div class="section">
          <h3>{{ round.sideBName }}（反方）佳辩</h3>
          <div class="debater-list">
            <label
              v-for="d in round.debatersB"
              :key="d.id"
              class="debater-card"
              :class="{ active: form.bestBId === d.id }"
            >
              <input v-model="form.bestBId" type="radio" :value="d.id" />
              <span class="position">{{ d.position || '辩手' }}</span>
              <span class="name">{{ d.name }}</span>
            </label>
          </div>
        </div>
      </template>

      <button class="btn primary" :disabled="!canSubmit || submitting" type="submit">
        {{ submitting ? '提交中…' : '提交投票' }}
      </button>
      <p v-if="submitError" class="form-error">{{ submitError }}</p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getActiveRound, getRoundById, getMyStatus, submitVote, buildWechatLoginUrl } from '@/api/debate'
import type { ActiveRound } from '@/types/debate'

const route = useRoute()

const loading = ref(true)
const round = ref<ActiveRound | null>(null)
const errorMsg = ref('')
const alreadyVoted = ref(false)
const submitting = ref(false)
const submitError = ref('')
const secondsLeft = ref<number | null>(null)
let timer: ReturnType<typeof setInterval> | null = null

const form = ref<{ supportSide: 'A' | 'B' | ''; bestAId: number | null; bestBId: number | null }>({
  supportSide: '',
  bestAId: null,
  bestBId: null,
})

const isWeChat = computed(() => /MicroMessenger/i.test(navigator.userAgent))

// 单人辩论赛：每方只有一名辩手，无须再选"佳辩"
const isSolo = computed(
  () =>
    !!round.value &&
    (round.value.debatersA?.length ?? 0) <= 1 &&
    (round.value.debatersB?.length ?? 0) <= 1
)

const canSubmit = computed(
  () =>
    !!form.value.supportSide && !!form.value.bestAId && !!form.value.bestBId
)

async function init() {
  loading.value = true
  errorMsg.value = ''

  // URL 上的错误提示
  if (route.query.err) {
    errorMsg.value = String(route.query.err) === 'oauth_failed' ? '微信登录失败，请重新扫码' : '会话已失效，请重新扫码'
    loading.value = false
    return
  }

  let redirecting = false
  try {
    const meRes = await getMyStatus()
    if (meRes.data.code !== 200) {
      errorMsg.value = meRes.data.message || '请求失败'
      return
    }
    const me = meRes.data.data

    if (!me.openid) {
      // 没有 openid → 跳微信授权（保留当前完整路径以便回跳）
      if (isWeChat.value) {
        const returnTo = window.location.pathname + window.location.search
        // 保持 loading = true，避免跳转前的一瞬间闪出"无投票"状态
        redirecting = true
        window.location.replace(buildWechatLoginUrl(returnTo))
        return
      }
      return
    }

    // 优先使用 URL 上的 ?round= 指定具体场次；否则用当前激活场
    const roundParam = route.query.round
    let roundData
    if (roundParam) {
      const res = await getRoundById(Number(roundParam))
      roundData = res.data.data
    } else {
      const res = await getActiveRound()
      roundData = res.data.data
    }
    round.value = roundData
    if (round.value) {
      secondsLeft.value = round.value.secondsLeft
      if (round.value.startedAt && !round.value.locked) startTimer()
      // 仅当与当前激活场一致时才能从 me 推断已投，否则需要后端单独查询
      // 这里简化：如果 me 说投过激活场且 id 相同，就标记已投
      alreadyVoted.value = me.votedActive && me.activeRoundId === round.value.id

      // 单人赛：自动锁定唯一辩手为佳辩，UI 隐藏佳辩选择
      if (isSolo.value) {
        const onlyA = round.value.debatersA?.[0]
        const onlyB = round.value.debatersB?.[0]
        if (onlyA) form.value.bestAId = onlyA.id
        if (onlyB) form.value.bestBId = onlyB.id
      }
    }
  } catch (e: unknown) {
    errorMsg.value = (e as Error)?.message || '加载失败'
  } finally {
    if (!redirecting) loading.value = false
  }
}

function startTimer() {
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    if (secondsLeft.value === null) return
    secondsLeft.value = Math.max(0, secondsLeft.value - 1)
    if (secondsLeft.value === 0 && round.value) {
      round.value.locked = true
      if (timer) clearInterval(timer)
    }
  }, 1000)
}

function formatTime(s: number | null): string {
  if (s === null) return '--:--'
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

async function onSubmit() {
  if (!round.value || !canSubmit.value) return
  submitting.value = true
  submitError.value = ''
  try {
    const res = await submitVote({
      roundId: round.value.id,
      supportSide: form.value.supportSide as 'A' | 'B',
      bestAId: form.value.bestAId!,
      bestBId: form.value.bestBId!,
    })
    if (res.data.code === 200) {
      alreadyVoted.value = true
    } else {
      submitError.value = res.data.message || '投票失败'
    }
  } catch (e: unknown) {
    submitError.value = (e as Error)?.message || '网络异常，请重试'
  } finally {
    submitting.value = false
  }
}

function reload() {
  window.location.href = '/vote'
}

onMounted(init)
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.vote-container {
  min-height: 100vh;
  background: #f5f6fa;
  padding: 20px 16px 40px;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.loading-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 120px 20px 40px;
  color: #6b7280;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 14px;
  letter-spacing: 0.02em;
}

.state {
  max-width: 480px;
  margin: 80px auto;
  text-align: center;
  padding: 32px 24px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}
.state h2 { margin: 0 0 12px; font-size: 18px; }
.state.warn { color: #d97706; }
.state.error { color: #dc2626; }
.state.success { color: #059669; }
.state .sub { color: #6b7280; font-size: 14px; margin: 8px 0; }
.state .hint { color: #9ca3af; font-size: 13px; margin-top: 16px; }

.vote-form {
  max-width: 520px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.header {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.topic { font-size: 17px; font-weight: 600; line-height: 1.5; color: #111827; }
.timer { font-size: 13px; color: #6b7280; font-variant-numeric: tabular-nums; }
.timer.urgent { color: #dc2626; font-weight: 600; }

.section {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}
.section h3 { font-size: 14px; font-weight: 600; margin: 0 0 14px; color: #374151; }

.side-pick { display: flex; gap: 12px; }
.side-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 12px;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;
  position: relative;
}
.side-card input { position: absolute; opacity: 0; }
.side-card.active { border-color: #2563eb; background: #eff6ff; }
.side-tag { font-size: 12px; color: #6b7280; margin-bottom: 6px; }
.side-card.active .side-tag { color: #2563eb; }
.side-name { font-size: 15px; font-weight: 600; color: #111827; text-align: center; }

.debater-list { display: flex; flex-direction: column; gap: 8px; }
.debater-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;
  position: relative;
}
.debater-card input { position: absolute; opacity: 0; }
.debater-card.active { border-color: #2563eb; background: #eff6ff; }
.debater-card .position { font-size: 12px; color: #6b7280; min-width: 36px; }
.debater-card.active .position { color: #2563eb; }
.debater-card .name { font-size: 15px; color: #111827; }

.btn {
  display: inline-block;
  padding: 14px 24px;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  background: #e5e7eb;
  color: #374151;
}
.btn.primary { background: #2563eb; color: #fff; }
.btn.primary:disabled { background: #93c5fd; cursor: not-allowed; }

.form-error { color: #dc2626; font-size: 13px; text-align: center; margin: 4px 0 0; }
</style>
