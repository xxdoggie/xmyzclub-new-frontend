<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import PageHeader from '@/components/layout/PageHeader.vue'
import { useToast } from '@/composables/useToast'
import { adminListRecords, adminUndo, adminVote } from '@/api/tally'
import { useTallySocket } from '@/composables/useTallySocket'
import type { ActivityStatus, TallyCandidate, TallyRecord } from '@/types/tally'

const route = useRoute()
const toast = useToast()

const activityId = ref<number | null>(Number(route.params.id) || null)

const { snapshot, connected } = useTallySocket(activityId)

const records = ref<TallyRecord[]>([])
const recordsLoading = ref(false)
const undoBusy = ref(false)
// 每个候选人的自定义输入值
const customDeltas = ref<Record<number, string>>({})
// 正在录票的候选人 id（防并发抖动）
const votingId = ref<number | null>(null)

const sortedCandidates = computed<TallyCandidate[]>(() => {
  const list = snapshot.value?.candidates || []
  return [...list].sort((a, b) => a.displayOrder - b.displayOrder)
})

const isLive = computed(() => snapshot.value?.status === 1)

function screenUrl(): string | null {
  if (!activityId.value) return null
  return `${window.location.origin}/tally/screen/${activityId.value}`
}

function copyScreenUrl() {
  const url = screenUrl()
  if (!url) return
  navigator.clipboard.writeText(url).then(
    () => toast.success(`已复制大屏链接：${url}`),
    () => toast.error(`复制失败：${url}`),
  )
}

function openScreen() {
  const url = screenUrl()
  if (!url) return
  window.open(url, '_blank', 'noopener,noreferrer')
}
const disabled = computed(() => !isLive.value || !snapshot.value)

function statusLabel(s: ActivityStatus | undefined): string {
  if (s === undefined) return '加载中'
  return s === 0 ? '待开始' : s === 1 ? '进行中' : '已结束'
}
function statusClass(s: ActivityStatus | undefined): string {
  if (s === undefined) return 'pending'
  return s === 0 ? 'pending' : s === 1 ? 'live' : 'ended'
}

function formatTime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

async function loadRecords() {
  if (!activityId.value) return
  recordsLoading.value = true
  try {
    const res = await adminListRecords(activityId.value)
    if (res.data.code === 200) {
      records.value = (res.data.data || []).slice(0, 20)
    }
  } catch {
    // 静默：不阻塞主流程
  } finally {
    recordsLoading.value = false
  }
}

async function castVote(c: TallyCandidate, delta: number) {
  if (disabled.value) return
  if (!Number.isFinite(delta) || delta === 0) {
    toast.warning('票数变化不能为 0')
    return
  }
  if (votingId.value === c.id) return
  votingId.value = c.id
  try {
    const res = await adminVote(c.id, delta)
    if (res.data.code === 200) {
      // 不要乐观更新，等 WS 推送
      await loadRecords()
    } else {
      toast.error(res.data.message || '录票失败')
    }
  } catch (e: unknown) {
    toast.error((e as Error)?.message || '网络错误')
  } finally {
    votingId.value = null
  }
}

async function applyCustom(c: TallyCandidate) {
  const raw = customDeltas.value[c.id]
  const delta = Number(raw)
  if (!raw || !Number.isFinite(delta) || delta === 0) {
    toast.warning('请输入非 0 的整数')
    return
  }
  await castVote(c, Math.trunc(delta))
  // 成功 / 失败都清空（用户可重新输入）
  customDeltas.value[c.id] = ''
}

async function onUndo() {
  if (!activityId.value) return
  if (undoBusy.value) return
  undoBusy.value = true
  try {
    const res = await adminUndo(activityId.value)
    if (res.data.code === 200) {
      if (res.data.data) {
        toast.success('已撤销最近一次操作')
        await loadRecords()
      } else {
        toast.info('无可撤销操作')
      }
    } else {
      toast.error(res.data.message || '撤销失败')
    }
  } catch (e: unknown) {
    toast.error((e as Error)?.message || '网络错误')
  } finally {
    undoBusy.value = false
  }
}

onMounted(() => {
  loadRecords()
})
</script>

<template>
  <div class="page-container">
    <PageHeader back-to="/admin/tally" />

    <main class="control-main">
      <!-- 顶部状态条 -->
      <div class="topbar">
        <div class="topbar-left">
          <h1 class="control-title">
            {{ snapshot?.title || '加载中...' }}
          </h1>
          <div class="topbar-meta">
            <span class="badge" :class="statusClass(snapshot?.status)">
              {{ statusLabel(snapshot?.status) }}
            </span>
            <span class="conn" :class="{ ok: connected }">
              <span class="dot"></span>
              {{ connected ? '已连接' : '断线重连中' }}
            </span>
          </div>
        </div>
        <div class="topbar-right">
          <router-link to="/admin/tally" class="back-link">← 返回</router-link>
          <button class="screen-btn" @click="openScreen" title="新窗口打开大屏">打开大屏</button>
          <button class="screen-btn" @click="copyScreenUrl" title="复制大屏链接">复制链接</button>
          <button
            class="undo-btn"
            :disabled="undoBusy || !snapshot"
            @click="onUndo"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M3 7v6h6"></path>
              <path d="M21 17a9 9 0 0 0-15-6.7L3 13"></path>
            </svg>
            {{ undoBusy ? '撤销中...' : '撤销上一步' }}
          </button>
        </div>
      </div>

      <!-- 状态横幅 -->
      <div v-if="snapshot && !isLive" class="banner warn">
        活动当前状态为「{{ statusLabel(snapshot.status) }}」，无法录票。请在活动配置页或活动列表将状态改为「进行中」。
      </div>

      <!-- 候选人卡片 -->
      <div v-if="!snapshot" class="loading-block">
        <div class="loading-spinner"></div>
        <p>正在连接实时唱票通道...</p>
      </div>

      <div v-else-if="sortedCandidates.length === 0" class="empty-block">
        <p>此活动暂无候选人，请先到「配置候选人」页添加。</p>
      </div>

      <div v-else class="candidates-grid">
        <article
          v-for="c in sortedCandidates"
          :key="c.id"
          class="cand-card"
          :class="{ disabled, busy: votingId === c.id }"
        >
          <div class="cand-head">
            <div class="cand-number">{{ c.number }}</div>
            <div class="cand-name">{{ c.name }}</div>
            <div class="cand-votes">{{ c.voteCount }}</div>
          </div>

          <div class="cand-actions">
            <button class="big-btn plus" :disabled="disabled || votingId === c.id" @click="castVote(c, 1)">+1</button>
            <button class="big-btn plus" :disabled="disabled || votingId === c.id" @click="castVote(c, 5)">+5</button>
            <button class="big-btn plus" :disabled="disabled || votingId === c.id" @click="castVote(c, 10)">+10</button>
            <button class="big-btn minus" :disabled="disabled || votingId === c.id" @click="castVote(c, -1)">-1</button>
            <div class="custom-wrap">
              <input
                v-model="customDeltas[c.id]"
                type="number"
                class="custom-input"
                placeholder="自定义"
                :disabled="disabled"
                @keydown.enter="applyCustom(c)"
              />
              <button
                class="apply-btn"
                :disabled="disabled || votingId === c.id"
                @click="applyCustom(c)"
              >
                应用
              </button>
            </div>
          </div>
        </article>
      </div>

      <!-- 操作日志 -->
      <section class="log-section">
        <div class="log-head">
          <h2 class="log-title">操作日志</h2>
          <button class="log-refresh" :disabled="recordsLoading" @click="loadRecords">
            {{ recordsLoading ? '刷新中...' : '刷新' }}
          </button>
        </div>
        <div v-if="records.length === 0" class="log-empty">暂无操作记录</div>
        <ul v-else class="log-list">
          <li v-for="r in records" :key="r.id" class="log-item">
            <span class="log-time">{{ formatTime(r.createdAt) }}</span>
            <span class="log-cand">{{ r.candidateNumber }} · {{ r.candidateName }}</span>
            <span class="log-delta" :class="r.delta >= 0 ? 'up' : 'down'">
              {{ r.delta > 0 ? `+${r.delta}` : r.delta }}
            </span>
            <span class="log-type" :class="r.type === 1 ? 'undo' : 'normal'">
              {{ r.type === 1 ? '撤销' : '普通' }}
            </span>
          </li>
        </ul>
      </section>
    </main>
  </div>
</template>

<style scoped>
.page-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
}
.control-main {
  flex: 1;
  padding: var(--spacing-md);
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

/* ===== Topbar ===== */
.topbar {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}
.topbar-left { display: flex; flex-direction: column; gap: var(--spacing-xs); }
.control-title {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  color: var(--color-text);
  line-height: 1.3;
}
.topbar-meta { display: flex; align-items: center; gap: var(--spacing-sm); flex-wrap: wrap; }

.badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  border-radius: var(--radius-sm);
}
.badge.pending { background: var(--color-border); color: var(--color-text-secondary); }
.badge.live { background: var(--color-success, var(--color-primary)); color: white; }
.badge.ended { background: var(--color-warning-bg, var(--color-border)); color: var(--color-warning, var(--color-text-secondary)); }

.conn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}
.conn .dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--color-error);
}
.conn.ok .dot { background: var(--color-success, #2ecc71); }

.topbar-right {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-sm);
}
.back-link {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  text-decoration: none;
}
.back-link:hover { color: var(--color-primary); }

.undo-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-lg);
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: white;
  background: var(--color-warning, #f39c12);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: opacity var(--transition-fast);
  min-height: 44px;
}
.undo-btn svg { width: 18px; height: 18px; }

.screen-btn {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  min-height: 44px;
}
.screen-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }
.undo-btn:hover:not(:disabled) { opacity: 0.9; }
.undo-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* ===== Banner ===== */
.banner {
  margin-bottom: var(--spacing-md);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}
.banner.warn {
  background: var(--color-warning-bg, #fff7e6);
  color: var(--color-warning, #b06f00);
  border: 1px solid var(--color-warning, #f39c12);
}

/* ===== Loading / Empty ===== */
.loading-block, .empty-block {
  padding: var(--spacing-2xl);
  text-align: center;
  color: var(--color-text-secondary);
}
.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto var(--spacing-md);
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ===== Candidate Cards ===== */
.candidates-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.cand-card {
  background: var(--color-card);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
  box-shadow: var(--shadow-sm);
  transition: border-color var(--transition-fast), opacity var(--transition-fast);
}
.cand-card.disabled { opacity: 0.55; }
.cand-card.busy { border-color: var(--color-primary); }

.cand-head {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
  padding-bottom: var(--spacing-md);
  border-bottom: 1px dashed var(--color-border);
}
.cand-number {
  font-family: var(--font-family-mono, monospace);
  font-size: 2rem;
  font-weight: var(--font-bold);
  color: var(--color-primary);
  padding: 4px 14px;
  background: var(--color-primary-bg, rgba(231, 76, 60, 0.08));
  border-radius: var(--radius-md);
  min-width: 72px;
  text-align: center;
}
.cand-name {
  flex: 1;
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-text);
}
.cand-votes {
  font-size: 2.5rem;
  font-weight: var(--font-bold);
  font-variant-numeric: tabular-nums;
  color: var(--color-text);
  line-height: 1;
  min-width: 80px;
  text-align: right;
}

.cand-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  align-items: center;
}

.big-btn {
  flex: 1 0 60px;
  min-height: 56px;
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: 1.4rem;
  font-weight: var(--font-bold);
  border: 2px solid transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-variant-numeric: tabular-nums;
  transition: transform var(--transition-fast), opacity var(--transition-fast);
}
.big-btn:active:not(:disabled) { transform: scale(0.96); }
.big-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.big-btn.plus {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}
.big-btn.plus:hover:not(:disabled) { background: var(--color-primary-dark); }
.big-btn.minus {
  background: var(--color-card);
  color: var(--color-error);
  border-color: var(--color-error);
}
.big-btn.minus:hover:not(:disabled) {
  background: var(--color-error-bg);
}

.custom-wrap {
  display: flex;
  gap: var(--spacing-xs);
  flex: 2 0 200px;
  min-height: 56px;
}
.custom-input {
  flex: 1;
  min-width: 0;
  padding: 0 var(--spacing-md);
  font-size: var(--text-lg);
  font-weight: var(--font-medium);
  color: var(--color-text);
  background: var(--color-card);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.custom-input:focus { outline: none; border-color: var(--color-primary); }
.custom-input:disabled { opacity: 0.5; }
.apply-btn {
  padding: 0 var(--spacing-lg);
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: white;
  background: var(--color-info, #3498db);
  border: 2px solid var(--color-info, #3498db);
  border-radius: var(--radius-md);
  cursor: pointer;
}
.apply-btn:hover:not(:disabled) { opacity: 0.9; }
.apply-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* ===== Log ===== */
.log-section {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
  box-shadow: var(--shadow-sm);
}
.log-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
}
.log-title { font-size: var(--text-base); font-weight: var(--font-semibold); color: var(--color-text); }
.log-refresh {
  padding: 4px 12px;
  font-size: var(--text-xs);
  background: var(--color-card);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
}
.log-refresh:hover:not(:disabled) { border-color: var(--color-primary); color: var(--color-primary); }
.log-empty {
  padding: var(--spacing-lg);
  text-align: center;
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}
.log-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 320px;
  overflow-y: auto;
  list-style: none;
  padding: 0;
  margin: 0;
}
.log-item {
  display: grid;
  grid-template-columns: 80px 1fr 70px 60px;
  gap: var(--spacing-sm);
  align-items: center;
  padding: 6px var(--spacing-sm);
  font-size: var(--text-xs);
  background: var(--color-bg);
  border-radius: var(--radius-sm);
}
.log-time {
  font-family: var(--font-family-mono, monospace);
  color: var(--color-text-secondary);
}
.log-cand {
  color: var(--color-text);
  font-weight: var(--font-medium);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.log-delta {
  font-weight: var(--font-bold);
  font-variant-numeric: tabular-nums;
  text-align: right;
}
.log-delta.up { color: var(--color-success, #2ecc71); }
.log-delta.down { color: var(--color-error); }
.log-type {
  text-align: center;
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  font-size: 10px;
  font-weight: var(--font-semibold);
}
.log-type.normal {
  background: var(--color-info-bg, rgba(52, 152, 219, 0.12));
  color: var(--color-info, #3498db);
}
.log-type.undo {
  background: var(--color-warning-bg, rgba(243, 156, 18, 0.12));
  color: var(--color-warning, #f39c12);
}

/* ===== Desktop ===== */
@media (min-width: 768px) {
  .control-main { padding: var(--spacing-lg); }
  .topbar {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
  .topbar-right { justify-content: flex-end; gap: var(--spacing-md); }
  .candidates-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (min-width: 1200px) {
  .candidates-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
