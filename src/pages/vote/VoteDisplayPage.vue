<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { useDebateSocket } from '@/composables/useDebateSocket'
import {
  getActiveRound,
  getRoundResults,
  operatorVerify,
  operatorResetCountdown,
  operatorLock,
  operatorActivate,
  operatorUpdateRound,
} from '@/api/debate'
import type {
  CreateRoundRequest,
  DebateRound,
  DebaterInput,
  RoundResult,
} from '@/types/debate'

const route = useRoute()
const toast = useToast()

const roundId = ref<number | null>(null)
const { result: wsResult } = useDebateSocket(roundId)
const fallbackResult = ref<RoundResult | null>(null)
const result = computed(() => wsResult.value || fallbackResult.value)

// ============ 本地倒计时（每秒 tick，WS/轮询回来时同步）============
const localSecondsLeft = ref<number | null>(null)
let countdownTimer: ReturnType<typeof setInterval> | null = null

function restartCountdown() {
  if (countdownTimer) clearInterval(countdownTimer)
  if (!result.value || result.value.locked) return
  countdownTimer = setInterval(() => {
    if (localSecondsLeft.value === null || localSecondsLeft.value <= 0) {
      if (countdownTimer) clearInterval(countdownTimer)
      return
    }
    localSecondsLeft.value -= 1
  }, 1000)
}

// 每次 WS 推或 fallback 更新，把服务端的 secondsLeft 当作权威值同步下来
watch(
  () => result.value?.secondsLeft,
  (v) => {
    if (v === null || v === undefined) {
      localSecondsLeft.value = null
    } else {
      localSecondsLeft.value = v
    }
    restartCountdown()
  }
)
watch(
  () => result.value?.locked,
  (locked) => {
    if (locked && countdownTimer) {
      clearInterval(countdownTimer)
      localSecondsLeft.value = 0
    }
  }
)

const debatersA = computed(() =>
  (result.value?.debaterVotes || [])
    .filter((d) => d.side === 'A')
    .sort((a, b) => b.votes - a.votes)
)
const debatersB = computed(() =>
  (result.value?.debaterVotes || [])
    .filter((d) => d.side === 'B')
    .sort((a, b) => b.votes - a.votes)
)

// 单人辩论赛：每方仅 1 名辩手，无须展示"佳辩排行"（信息与正反方支持票数重复）
const isSolo = computed(() => debatersA.value.length <= 1 && debatersB.value.length <= 1)

function pct(n: number): number {
  if (!result.value) return 0
  const total = result.value.supportA + result.value.supportB
  return total === 0 ? 0 : Math.round((n / total) * 100)
}

function formatTime(s: number | null): string {
  if (s === null || s === undefined) return '--:--'
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

// ============ 操作员面板 ============
const PASSWORD_KEY = 'debate_op_pwd'
const passwordPromptOpen = ref(false)
const passwordInput = ref('')
const passwordSubmitting = ref(false)
const passwordError = ref('')
const operatorMode = ref(false)
const operatorRound = ref<DebateRound | null>(null)
const controlsOpen = ref(false)

function cachedPassword(): string {
  if (!roundId.value) return ''
  return sessionStorage.getItem(`${PASSWORD_KEY}:${roundId.value}`) || ''
}
function setCachedPassword(pwd: string) {
  if (!roundId.value) return
  sessionStorage.setItem(`${PASSWORD_KEY}:${roundId.value}`, pwd)
}
function clearCachedPassword() {
  if (!roundId.value) return
  sessionStorage.removeItem(`${PASSWORD_KEY}:${roundId.value}`)
}

async function tryRestoreOperator() {
  if (!roundId.value) return
  const cached = cachedPassword()
  if (!cached) return
  try {
    const res = await operatorVerify(roundId.value, cached)
    if (res.data.code === 200 && res.data.data) {
      operatorRound.value = res.data.data
      operatorMode.value = true
    } else {
      clearCachedPassword()
    }
  } catch {
    clearCachedPassword()
  }
}

function openPasswordPrompt() {
  passwordError.value = ''
  passwordInput.value = ''
  passwordPromptOpen.value = true
}

async function onSubmitPassword() {
  if (!roundId.value) return
  const pwd = passwordInput.value.trim()
  if (!pwd) {
    passwordError.value = '请输入密码'
    return
  }
  passwordSubmitting.value = true
  passwordError.value = ''
  try {
    const res = await operatorVerify(roundId.value, pwd)
    if (res.data.code === 200 && res.data.data) {
      setCachedPassword(pwd)
      operatorRound.value = res.data.data
      operatorMode.value = true
      passwordPromptOpen.value = false
      controlsOpen.value = true
      toast.success('已进入操作员模式')
    } else {
      passwordError.value = res.data.message || '密码错误'
    }
  } catch (e: unknown) {
    passwordError.value = (e as Error)?.message || '验证失败'
  } finally {
    passwordSubmitting.value = false
  }
}

function logoutOperator() {
  clearCachedPassword()
  operatorMode.value = false
  operatorRound.value = null
  controlsOpen.value = false
}

async function opReset() {
  if (!roundId.value) return
  if (!confirm('确认重置倒计时？时钟会回到满时长重新开始，已投票数保留。')) return
  try {
    const res = await operatorResetCountdown(roundId.value, cachedPassword())
    if (res.data.code === 200) {
      toast.success('已重置倒计时')
      await refreshRound()
    } else {
      toast.error(res.data.message || '操作失败')
    }
  } catch (e: unknown) {
    toast.error((e as Error)?.message || '操作失败')
  }
}

async function opLock() {
  if (!roundId.value) return
  if (!confirm('确认立即锁票？观众将无法再投票。')) return
  try {
    const res = await operatorLock(roundId.value, cachedPassword())
    if (res.data.code === 200) {
      toast.success('已锁票')
      await refreshRound()
    } else {
      toast.error(res.data.message || '操作失败')
    }
  } catch (e: unknown) {
    toast.error((e as Error)?.message || '操作失败')
  }
}

async function opActivate() {
  if (!roundId.value) return
  if (!confirm('确认激活此场并开始计时？\n其他场次会被自动停用。')) return
  try {
    const res = await operatorActivate(roundId.value, cachedPassword())
    if (res.data.code === 200) {
      toast.success('已激活')
      await refreshRound()
    } else {
      toast.error(res.data.message || '操作失败')
    }
  } catch (e: unknown) {
    toast.error((e as Error)?.message || '操作失败')
  }
}

function copyScreenUrl() {
  if (!roundId.value) return
  const url = `${window.location.origin}/vote/screen?round=${roundId.value}`
  navigator.clipboard.writeText(url).then(
    () => toast.success('投屏二维码链接已复制'),
    () => toast.error('复制失败：' + url)
  )
}

async function refreshRound() {
  if (!roundId.value) return
  try {
    const res = await operatorVerify(roundId.value, cachedPassword())
    if (res.data.code === 200 && res.data.data) operatorRound.value = res.data.data
    const r = await getRoundResults(roundId.value)
    if (r.data.code === 200) fallbackResult.value = r.data.data
  } catch {
    // ignore
  }
}

// ============ 编辑器 ============
const editorOpen = ref(false)
const form = ref<CreateRoundRequest>({
  topic: '',
  sideAName: '',
  sideBName: '',
  voteDurationSeconds: 600,
  displayOrder: 0,
  publicDisplay: false,
  debaters: [],
})
const debatersAEdit = ref<DebaterInput[]>([])
const debatersBEdit = ref<DebaterInput[]>([])
const editorSaving = ref(false)

function openEditor() {
  const r = operatorRound.value
  if (!r) return
  form.value = {
    topic: r.topic,
    sideAName: r.sideAName,
    sideBName: r.sideBName,
    voteDurationSeconds: r.voteDurationSeconds,
    displayOrder: r.displayOrder,
    publicDisplay: r.publicDisplay === 1,
    debaters: [],
  }
  debatersAEdit.value = (r.debaters || [])
    .filter((d) => d.side === 'A')
    .map((d) => ({ name: d.name, side: 'A', position: d.position, displayOrder: d.displayOrder }))
  debatersBEdit.value = (r.debaters || [])
    .filter((d) => d.side === 'B')
    .map((d) => ({ name: d.name, side: 'B', position: d.position, displayOrder: d.displayOrder }))
  editorOpen.value = true
}

function addDebater(side: 'A' | 'B') {
  const list = side === 'A' ? debatersAEdit : debatersBEdit
  list.value.push({ name: '', side, position: '', displayOrder: list.value.length + 1 })
}

function removeDebater(d: DebaterInput) {
  debatersAEdit.value = debatersAEdit.value.filter((x) => x !== d)
  debatersBEdit.value = debatersBEdit.value.filter((x) => x !== d)
}

async function onSaveEditor() {
  if (!roundId.value) return
  const all = [...debatersAEdit.value, ...debatersBEdit.value].filter((d) => d.name.trim())
  if (!form.value.topic.trim()) {
    toast.error('辩题不能为空')
    return
  }
  if (all.length === 0) {
    toast.error('至少需要一名辩手')
    return
  }
  form.value.debaters = all
  editorSaving.value = true
  try {
    const res = await operatorUpdateRound(roundId.value, cachedPassword(), form.value)
    if (res.data.code === 200) {
      operatorRound.value = res.data.data
      toast.success('已保存')
      editorOpen.value = false
    } else {
      toast.error(res.data.message || '保存失败')
    }
  } catch (e: unknown) {
    toast.error((e as Error)?.message || '保存失败')
  } finally {
    editorSaving.value = false
  }
}

// ============ 初始化 ============
onMounted(async () => {
  const param = route.query.round
  if (param) {
    roundId.value = Number(param)
  } else {
    try {
      const res = await getActiveRound()
      if (res.data.code === 200 && res.data.data) roundId.value = res.data.data.id
    } catch {
      // ignore
    }
  }

  if (roundId.value) {
    try {
      const r = await getRoundResults(roundId.value)
      if (r.data.code === 200) fallbackResult.value = r.data.data
    } catch {
      // ignore
    }
    await tryRestoreOperator()
  }
})

onBeforeUnmount(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})
</script>

<template>
  <div class="display-root">
    <div v-if="!result" class="placeholder">
      <div class="spinner"></div>
      <div>加载中…</div>
    </div>

    <template v-else>
      <!-- 顶部信息 -->
      <header class="head">
        <div class="topic-block">
          <h1 class="topic">{{ result.topic }}</h1>
          <div class="sides">
            <span class="side a">{{ result.sideAName }}</span>
            <span class="vs">VS</span>
            <span class="side b">{{ result.sideBName }}</span>
          </div>
        </div>
        <div class="meta-block">
          <div class="total">
            <span class="total-num">{{ result.totalVotes }}</span>
            <span class="total-label">总票数</span>
          </div>
          <div class="badge" :class="result.locked ? 'locked' : 'live'">
            <span v-if="result.locked">已锁票</span>
            <span v-else>
              <span class="dot"></span>
              进行中 · {{ formatTime(localSecondsLeft) }}
            </span>
          </div>
        </div>
      </header>

      <!-- 支持方柱状图 -->
      <section class="bars">
        <div class="bar-row">
          <div class="bar-label a">{{ result.sideAName }}（正方）</div>
          <div class="bar-track">
            <div class="bar-fill a" :style="{ width: pct(result.supportA) + '%' }"></div>
            <span class="bar-num">{{ result.supportA }}</span>
          </div>
        </div>
        <div class="bar-row">
          <div class="bar-label b">{{ result.sideBName }}（反方）</div>
          <div class="bar-track">
            <div class="bar-fill b" :style="{ width: pct(result.supportB) + '%' }"></div>
            <span class="bar-num">{{ result.supportB }}</span>
          </div>
        </div>
      </section>

      <!-- 辩手排行（单人赛隐藏） -->
      <section v-if="!isSolo" class="debaters-grid">
        <div class="dcol">
          <h3>{{ result.sideAName }} 佳辩排行</h3>
          <ol>
            <li v-for="d in debatersA" :key="d.id">
              <span class="rank">{{ d.position || '' }}</span>
              <span class="dname">{{ d.name }}</span>
              <span class="dvotes">{{ d.votes }}</span>
            </li>
          </ol>
        </div>
        <div class="dcol">
          <h3>{{ result.sideBName }} 佳辩排行</h3>
          <ol>
            <li v-for="d in debatersB" :key="d.id">
              <span class="rank">{{ d.position || '' }}</span>
              <span class="dname">{{ d.name }}</span>
              <span class="dvotes">{{ d.votes }}</span>
            </li>
          </ol>
        </div>
      </section>
    </template>

    <!-- 操作员入口按钮（右下角悬浮） -->
    <button
      v-if="!operatorMode"
      class="op-trigger"
      @click="openPasswordPrompt"
      title="操作员登录"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="11" width="18" height="11" rx="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
      </svg>
    </button>

    <!-- 操作员工具栏 -->
    <div v-else class="op-toolbar" :class="{ open: controlsOpen }">
      <button class="op-toggle" @click="controlsOpen = !controlsOpen" title="操作员面板">
        <svg v-if="!controlsOpen" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
      <div v-if="controlsOpen" class="op-menu">
        <div class="op-header">
          <span class="op-title">操作员</span>
          <button class="op-logout" @click="logoutOperator">登出</button>
        </div>
        <button class="op-btn" @click="openEditor">
          <span class="op-icon">✏️</span>
          <span>编辑场次信息</span>
        </button>
        <button class="op-btn" @click="opReset">
          <span class="op-icon">🔄</span>
          <span>重置倒计时</span>
        </button>
        <button v-if="operatorRound && operatorRound.isActive !== 1" class="op-btn" @click="opActivate">
          <span class="op-icon">▶️</span>
          <span>激活并开始</span>
        </button>
        <button v-if="operatorRound && operatorRound.isActive === 1 && operatorRound.locked !== 1" class="op-btn danger" @click="opLock">
          <span class="op-icon">🔒</span>
          <span>立即锁票</span>
        </button>
        <button class="op-btn" @click="copyScreenUrl">
          <span class="op-icon">🔗</span>
          <span>复制二维码链接</span>
        </button>
      </div>
    </div>

    <!-- 密码提示弹窗 -->
    <div v-if="passwordPromptOpen" class="modal-mask" @click.self="passwordPromptOpen = false">
      <div class="modal-card">
        <h2>操作员登录</h2>
        <p class="modal-sub">输入管理员提供的 6 位操作员密码</p>
        <input
          v-model="passwordInput"
          class="pwd-input"
          type="tel"
          inputmode="numeric"
          maxlength="6"
          placeholder="••••••"
          autofocus
          @keyup.enter="onSubmitPassword"
        />
        <p v-if="passwordError" class="modal-error">{{ passwordError }}</p>
        <div class="modal-foot">
          <button class="modal-btn ghost" @click="passwordPromptOpen = false">取消</button>
          <button class="modal-btn primary" :disabled="passwordSubmitting" @click="onSubmitPassword">
            {{ passwordSubmitting ? '验证中…' : '进入' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 编辑器弹窗 -->
    <div v-if="editorOpen" class="modal-mask" @click.self="editorOpen = false">
      <div class="modal-card editor">
        <h2>编辑场次</h2>
        <div class="editor-body">
          <label class="field">
            <span>辩题</span>
            <input v-model="form.topic" class="form-input" type="text" />
          </label>
          <div class="field-row">
            <label class="field">
              <span>正方名称</span>
              <input v-model="form.sideAName" class="form-input" type="text" />
            </label>
            <label class="field">
              <span>反方名称</span>
              <input v-model="form.sideBName" class="form-input" type="text" />
            </label>
          </div>
          <div class="field-row">
            <label class="field">
              <span>时长（秒）</span>
              <input v-model.number="form.voteDurationSeconds" class="form-input" type="number" />
            </label>
            <label class="field">
              <span>顺序</span>
              <input v-model.number="form.displayOrder" class="form-input" type="number" />
            </label>
            <label class="field check">
              <input v-model="form.publicDisplay" type="checkbox" />
              大屏公开
            </label>
          </div>

          <div class="debater-editor">
            <div class="dec-col">
              <div class="dec-head">
                <h4>正方辩手</h4>
                <button type="button" class="add-btn" @click="addDebater('A')">+ 添加</button>
              </div>
              <div v-for="(d, i) in debatersAEdit" :key="`a-${i}`" class="d-row">
                <input v-model="d.position" class="d-input pos" placeholder="一辩" />
                <input v-model="d.name" class="d-input name" placeholder="姓名" />
                <button class="d-remove" @click="removeDebater(d)" type="button">×</button>
              </div>
            </div>
            <div class="dec-col">
              <div class="dec-head">
                <h4>反方辩手</h4>
                <button type="button" class="add-btn" @click="addDebater('B')">+ 添加</button>
              </div>
              <div v-for="(d, i) in debatersBEdit" :key="`b-${i}`" class="d-row">
                <input v-model="d.position" class="d-input pos" placeholder="一辩" />
                <input v-model="d.name" class="d-input name" placeholder="姓名" />
                <button class="d-remove" @click="removeDebater(d)" type="button">×</button>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-foot">
          <button class="modal-btn ghost" @click="editorOpen = false">取消</button>
          <button class="modal-btn primary" :disabled="editorSaving" @click="onSaveEditor">
            {{ editorSaving ? '保存中…' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.display-root {
  min-height: 100vh;
  min-height: 100dvh;
  background: #f9fafb;
  color: #1f2937;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  padding: 40px 56px 80px;
  display: flex;
  flex-direction: column;
  gap: 36px;
}

.placeholder {
  margin: auto;
  text-align: center;
  color: #6b7280;
  font-size: 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
}
.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ===== Header ===== */
.head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 32px;
  flex-wrap: wrap;
}

.topic { font-size: 44px; font-weight: 700; line-height: 1.25; margin: 0 0 16px; color: #111827; }
.sides { display: flex; align-items: center; gap: 24px; font-size: 22px; font-weight: 600; }
.sides .a { color: #2563eb; }
.sides .b { color: #dc2626; }
.sides .vs { color: #9ca3af; font-size: 18px; }

.meta-block { display: flex; gap: 20px; align-items: center; flex-wrap: wrap; }
.total {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 14px 24px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
.total-num {
  display: block;
  font-size: 36px;
  font-weight: 700;
  color: #f59e0b;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.total-label { font-size: 13px; color: #6b7280; margin-top: 4px; display: block; }

.badge {
  padding: 10px 18px;
  border-radius: 10px;
  font-size: 18px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-variant-numeric: tabular-nums;
}
.badge.live { background: #fee2e2; color: #dc2626; }
.badge.locked { background: #e5e7eb; color: #6b7280; }
.badge .dot {
  width: 8px; height: 8px;
  background: #dc2626;
  border-radius: 50%;
  animation: pulse 1.2s ease-in-out infinite;
}
@keyframes pulse { 50% { opacity: 0.3; } }

/* ===== Support Bars ===== */
.bars { display: flex; flex-direction: column; gap: 24px; }
.bar-row { display: flex; align-items: center; gap: 20px; }
.bar-label {
  font-size: 22px;
  font-weight: 600;
  min-width: 220px;
}
.bar-label.a { color: #2563eb; }
.bar-label.b { color: #dc2626; }

.bar-track {
  flex: 1;
  height: 48px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.04);
}
.bar-fill {
  height: 100%;
  transition: width 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.bar-fill.a { background: linear-gradient(90deg, #2563eb, #60a5fa); }
.bar-fill.b { background: linear-gradient(90deg, #dc2626, #f87171); }
.bar-num {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 22px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #111827;
}

/* ===== Debaters ===== */
.debaters-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
.dcol h3 {
  font-size: 18px;
  color: #374151;
  font-weight: 600;
  margin-bottom: 12px;
}
.dcol ol {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dcol li {
  display: flex;
  align-items: center;
  gap: 14px;
  background: #fff;
  border: 1px solid #e5e7eb;
  padding: 12px 18px;
  border-radius: 10px;
  font-size: 17px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.03);
}
.dcol li:first-child {
  background: linear-gradient(90deg, #fffbeb, #fff);
  border-color: #fbbf24;
}
.rank { color: #6b7280; font-size: 13px; min-width: 40px; }
.dname { flex: 1; font-weight: 600; color: #111827; }
.dvotes {
  font-size: 22px;
  font-weight: 700;
  color: #f59e0b;
  font-variant-numeric: tabular-nums;
}

/* ===== Operator Trigger ===== */
.op-trigger {
  position: fixed;
  right: 24px;
  bottom: 24px;
  width: 48px;
  height: 48px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
  transition: all 0.15s;
  z-index: 100;
}
.op-trigger:hover {
  color: #2563eb;
  border-color: #2563eb;
  transform: translateY(-2px);
}
.op-trigger svg { width: 22px; height: 22px; }

/* ===== Operator Toolbar ===== */
.op-toolbar {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
}
.op-toggle {
  width: 52px;
  height: 52px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(37,99,235,0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.op-toggle:hover { background: #1d4ed8; transform: scale(1.05); }
.op-toggle svg { width: 24px; height: 24px; }

.op-menu {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 10px;
  box-shadow: 0 12px 32px rgba(0,0,0,0.15);
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 220px;
  animation: slide-up 0.2s ease-out;
}
@keyframes slide-up { from { opacity: 0; transform: translateY(10px); } }

.op-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px 10px;
  border-bottom: 1px solid #f3f4f6;
  margin-bottom: 6px;
}
.op-title { font-size: 13px; color: #6b7280; font-weight: 600; }
.op-logout {
  background: none;
  border: none;
  color: #9ca3af;
  font-size: 12px;
  cursor: pointer;
}
.op-logout:hover { color: #dc2626; }

.op-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  font-size: 14px;
  background: transparent;
  color: #1f2937;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s;
}
.op-btn:hover { background: #f3f4f6; }
.op-btn.danger { color: #dc2626; }
.op-btn.danger:hover { background: #fee2e2; }
.op-icon { font-size: 16px; width: 20px; display: inline-flex; justify-content: center; }

/* ===== Modal ===== */
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.modal-card {
  background: #fff;
  border-radius: 16px;
  padding: 28px;
  width: 100%;
  max-width: 380px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}
.modal-card.editor { max-width: 720px; max-height: 90vh; display: flex; flex-direction: column; padding-bottom: 0; }
.modal-card h2 { font-size: 20px; font-weight: 600; margin: 0 0 6px; }
.modal-sub { color: #6b7280; font-size: 13px; margin: 0 0 18px; }

.pwd-input {
  width: 100%;
  padding: 16px;
  font-size: 28px;
  font-weight: 600;
  text-align: center;
  letter-spacing: 0.4em;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  outline: none;
  transition: border-color 0.15s;
  font-variant-numeric: tabular-nums;
}
.pwd-input:focus { border-color: #2563eb; }

.modal-error { color: #dc2626; font-size: 13px; margin: 8px 0 0; text-align: center; }

.modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 18px;
  padding: 12px 0 0;
}
.modal-card.editor .modal-foot {
  margin: 0;
  padding: 12px 0;
  border-top: 1px solid #e5e7eb;
}

.modal-btn {
  padding: 10px 18px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
}
.modal-btn.ghost { background: #f3f4f6; color: #374151; }
.modal-btn.ghost:hover { background: #e5e7eb; }
.modal-btn.primary { background: #2563eb; color: white; }
.modal-btn.primary:hover:not(:disabled) { background: #1d4ed8; }
.modal-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* ===== Editor ===== */
.editor-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 8px 0;
  overflow-y: auto;
  flex: 1;
}
.field { display: flex; flex-direction: column; gap: 4px; flex: 1; }
.field span { font-size: 12px; color: #6b7280; font-weight: 500; }
.field.check { flex-direction: row; align-items: center; gap: 6px; font-size: 13px; }
.field-row { display: flex; gap: 10px; }
.form-input {
  padding: 8px 10px;
  font-size: 14px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  outline: none;
}
.form-input:focus { border-color: #2563eb; }

.debater-editor {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  background: #f9fafb;
  padding: 14px;
  border-radius: 10px;
}
.dec-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.dec-head h4 { font-size: 13px; font-weight: 600; }
.add-btn {
  padding: 3px 10px;
  font-size: 12px;
  background: #fff;
  border: 1px solid #2563eb;
  color: #2563eb;
  border-radius: 4px;
  cursor: pointer;
}
.add-btn:hover { background: #2563eb; color: white; }
.d-row { display: flex; gap: 6px; margin-bottom: 6px; }
.d-input {
  padding: 6px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 13px;
  outline: none;
  min-width: 0;
}
.d-input:focus { border-color: #2563eb; }
.d-input.pos { flex: 0 0 80px; }
.d-input.name { flex: 1; }
.d-remove {
  width: 30px;
  background: transparent;
  border: 1px solid #d1d5db;
  color: #9ca3af;
  border-radius: 4px;
  cursor: pointer;
  line-height: 1;
  font-size: 18px;
}
.d-remove:hover { color: #dc2626; border-color: #dc2626; }

/* ===== Mobile ===== */
@media (max-width: 768px) {
  .display-root { padding: 20px 16px 80px; gap: 24px; }
  .topic { font-size: 28px; }
  .sides { font-size: 16px; gap: 12px; }
  .head { flex-direction: column; }
  .meta-block { width: 100%; justify-content: space-between; }
  .bar-label { min-width: 0; font-size: 16px; }
  .bar-row { flex-direction: column; align-items: stretch; gap: 8px; }
  .bar-track { height: 36px; }
  .bar-num { font-size: 18px; right: 12px; }
  .debaters-grid { grid-template-columns: 1fr; gap: 20px; }
  .debater-editor { grid-template-columns: 1fr; }
  .field-row { flex-wrap: wrap; }
}
</style>
