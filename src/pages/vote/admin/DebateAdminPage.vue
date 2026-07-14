<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb.vue'
import { useToast } from '@/composables/useToast'
import {
  adminActivateRound,
  adminCreateRound,
  adminDeleteRound,
  adminListRounds,
  adminLockRound,
  adminRegeneratePassword,
  adminResetRound,
  adminUnlockRound,
  adminUpdateRound,
} from '@/api/debate'
import type { CreateRoundRequest, DebateRound, Debater, DebaterInput } from '@/types/debate'
import { useDebateSocket } from '@/composables/useDebateSocket'

const toast = useToast()

const isLoading = ref(true)
const rounds = ref<DebateRound[]>([])

const activeRoundId = computed(() => rounds.value.find((r) => r.isActive === 1)?.id ?? null)
const activeRoundIdRef = ref<number | null>(null)
watch(activeRoundId, (v) => (activeRoundIdRef.value = v), { immediate: true })
const { result: liveResult } = useDebateSocket(activeRoundIdRef)

function debatersOf(r: DebateRound, side: 'A' | 'B'): Debater[] {
  return (r.debaters || []).filter((d) => d.side === side)
}

function pct(n: number): number {
  if (!liveResult.value) return 0
  const total = liveResult.value.supportA + liveResult.value.supportB
  return total === 0 ? 0 : Math.round((n / total) * 100)
}

function formatTime(s: number | null): string {
  if (s === null) return '--:--'
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

async function load() {
  isLoading.value = true
  try {
    const res = await adminListRounds()
    if (res.data.code === 200) rounds.value = res.data.data || []
    else toast.error(res.data.message || '加载失败')
  } catch (e: unknown) {
    toast.error((e as Error)?.message || '网络错误')
  } finally {
    isLoading.value = false
  }
}

async function onActivate(r: DebateRound) {
  if (!confirm(`确认激活「${r.topic}」？\n激活后投票计时立即开始，其他场次会被自动停用。`)) return
  try {
    await adminActivateRound(r.id)
    toast.success('已激活')
    await load()
  } catch (e: unknown) {
    toast.error((e as Error)?.message || '操作失败')
  }
}

async function onLock(r: DebateRound) {
  if (!confirm('确认立即锁票？锁后观众无法再投票。')) return
  try {
    await adminLockRound(r.id)
    toast.success('已锁票')
    await load()
  } catch (e: unknown) {
    toast.error((e as Error)?.message || '操作失败')
  }
}

async function onRegenPassword(r: DebateRound) {
  if (!confirm(`确认为「${r.topic}」重新生成操作员密码？\n旧密码会立即失效，已在操作员界面登录的人会被踢出。`)) return
  try {
    const res = await adminRegeneratePassword(r.id)
    if (res.data.code === 200) {
      toast.success('新密码：' + res.data.data)
      await load()
    } else {
      toast.error(res.data.message || '重置失败')
    }
  } catch (e: unknown) {
    toast.error((e as Error)?.message || '操作失败')
  }
}

async function onReset(r: DebateRound) {
  if (!confirm(`确认重置「${r.topic}」的倒计时？\n倒计时将回到满 ${r.voteDurationSeconds} 秒重新开始。已投的票数会保留。`)) return
  try {
    await adminResetRound(r.id)
    toast.success('倒计时已重置')
    await load()
  } catch (e: unknown) {
    toast.error((e as Error)?.message || '操作失败')
  }
}

async function onUnlock(r: DebateRound) {
  try {
    await adminUnlockRound(r.id, 300)
    toast.success('已解锁，再开 5 分钟')
    await load()
  } catch (e: unknown) {
    toast.error((e as Error)?.message || '操作失败')
  }
}

async function onDelete(r: DebateRound) {
  if (!confirm(`确认删除「${r.topic}」？投票数据会保留但场次和辩手会删除。`)) return
  try {
    await adminDeleteRound(r.id)
    toast.success('已删除')
    await load()
  } catch (e: unknown) {
    toast.error((e as Error)?.message || '操作失败')
  }
}

// ============ 编辑器 ============
const editorOpen = ref(false)
const editing = ref<DebateRound | null>(null)
const isSaving = ref(false)
const form = ref<CreateRoundRequest>({
  topic: '',
  sideAName: '正方',
  sideBName: '反方',
  voteDurationSeconds: 600,
  displayOrder: 0,
  publicDisplay: false,
  debaters: [],
})
const debatersA = ref<DebaterInput[]>([])
const debatersB = ref<DebaterInput[]>([])

function openEditor(r?: DebateRound) {
  editing.value = r || null
  if (r) {
    form.value = {
      topic: r.topic,
      sideAName: r.sideAName,
      sideBName: r.sideBName,
      voteDurationSeconds: r.voteDurationSeconds,
      displayOrder: r.displayOrder,
      publicDisplay: r.publicDisplay === 1,
      debaters: [],
    }
    debatersA.value = (r.debaters || [])
      .filter((d) => d.side === 'A')
      .map((d) => ({ name: d.name, side: 'A', position: d.position, displayOrder: d.displayOrder }))
    debatersB.value = (r.debaters || [])
      .filter((d) => d.side === 'B')
      .map((d) => ({ name: d.name, side: 'B', position: d.position, displayOrder: d.displayOrder }))
  } else {
    form.value = {
      topic: '',
      sideAName: '正方',
      sideBName: '反方',
      voteDurationSeconds: 600,
      displayOrder: rounds.value.length + 1,
      publicDisplay: false,
      debaters: [],
    }
    debatersA.value = [{ name: '', side: 'A', position: '一辩', displayOrder: 1 }]
    debatersB.value = [{ name: '', side: 'B', position: '一辩', displayOrder: 1 }]
  }
  editorOpen.value = true
}

function closeEditor() {
  editorOpen.value = false
}

function addDebater(side: 'A' | 'B') {
  const list = side === 'A' ? debatersA : debatersB
  list.value.push({ name: '', side, position: '', displayOrder: list.value.length + 1 })
}

function removeDebater(d: DebaterInput) {
  debatersA.value = debatersA.value.filter((x) => x !== d)
  debatersB.value = debatersB.value.filter((x) => x !== d)
}

async function onSave() {
  const all = [...debatersA.value, ...debatersB.value].filter((d) => d.name.trim())
  if (!form.value.topic.trim()) {
    toast.error('请填写辩题')
    return
  }
  if (all.length === 0) {
    toast.error('至少添加一名辩手')
    return
  }

  form.value.debaters = all
  isSaving.value = true
  try {
    if (editing.value?.id) {
      await adminUpdateRound(editing.value.id, form.value)
      toast.success('已保存')
    } else {
      await adminCreateRound(form.value)
      toast.success('已创建')
    }
    closeEditor()
    await load()
  } catch (e: unknown) {
    toast.error((e as Error)?.message || '保存失败')
  } finally {
    isSaving.value = false
  }
}

function copyToClipboard(url: string, label: string) {
  navigator.clipboard.writeText(url).then(
    () => toast.success(`已复制${label}`),
    () => toast.error(`复制失败：${url}`)
  )
}

function voterUrl(roundId: number): string {
  return `${window.location.origin}/vote?round=${roundId}`
}
function screenUrl(roundId: number): string {
  return `${window.location.origin}/vote/screen?round=${roundId}`
}
function displayUrl(roundId: number): string {
  return `${window.location.origin}/vote/display?round=${roundId}`
}

onMounted(load)
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

        <!-- 页面标题 -->
        <div class="page-header-section">
          <div class="header-main">
            <div class="header-text">
              <h1 class="page-title">辩论赛投票管理</h1>
              <p class="page-subtitle">录入场次与辩手、激活投票、实时查看结果</p>
            </div>
            <div class="header-actions">
              <button class="action-button primary" @click="openEditor()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                新建场次
              </button>
            </div>
          </div>
        </div>

        <!-- 加载状态 -->
        <div v-if="isLoading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>

        <template v-else>
          <!-- 空状态 -->
          <div v-if="rounds.length === 0" class="empty-container">
            <div class="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <h2>还没有任何辩论场次</h2>
            <p>点击右上角「新建场次」开始录入</p>
            <button class="empty-action-btn" @click="openEditor()">新建第一场</button>
          </div>

          <!-- 场次列表 -->
          <div v-else class="rounds-list">
            <article
              v-for="r in rounds"
              :key="r.id"
              class="round-card"
              :class="{ active: r.isActive === 1, locked: r.locked === 1 }"
            >
              <header class="card-head">
                <div class="badges">
                  <span class="badge order">第 {{ r.displayOrder }} 场</span>
                  <span v-if="r.isActive === 1" class="badge live">激活中</span>
                  <span v-if="r.locked === 1" class="badge locked">已锁票</span>
                  <span v-if="r.publicDisplay === 1" class="badge success">大屏公开</span>
                </div>
                <h3 class="card-topic">{{ r.topic }}</h3>
                <div class="card-sides">
                  <span class="side side-a">{{ r.sideAName }}</span>
                  <span class="vs">vs</span>
                  <span class="side side-b">{{ r.sideBName }}</span>
                </div>
              </header>

              <div class="debaters">
                <div class="dcol">
                  <h4>正方</h4>
                  <div class="dchips">
                    <span v-for="d in debatersOf(r, 'A')" :key="d.id" class="dchip">
                      {{ d.position || '辩手' }}·{{ d.name }}
                    </span>
                  </div>
                </div>
                <div class="dcol">
                  <h4>反方</h4>
                  <div class="dchips">
                    <span v-for="d in debatersOf(r, 'B')" :key="d.id" class="dchip">
                      {{ d.position || '辩手' }}·{{ d.name }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- 实时数据（仅激活场显示） -->
              <div
                v-if="r.isActive === 1 && liveResult && liveResult.roundId === r.id"
                class="live-block"
              >
                <div class="live-header">
                  <span class="live-total">
                    实时 <b>{{ liveResult.totalVotes }}</b> 票
                  </span>
                  <span class="live-timer" :class="{ urgent: (liveResult.secondsLeft ?? 0) < 60 && !liveResult.locked }">
                    {{ liveResult.locked ? '已锁票' : `剩余 ${formatTime(liveResult.secondsLeft)}` }}
                  </span>
                </div>
                <div class="live-bars">
                  <div class="lb-row">
                    <span class="lb-name">{{ liveResult.sideAName }}</span>
                    <div class="lb-track">
                      <div class="lb-fill a" :style="{ width: pct(liveResult.supportA) + '%' }" />
                    </div>
                    <span class="lb-num">{{ liveResult.supportA }}</span>
                  </div>
                  <div class="lb-row">
                    <span class="lb-name">{{ liveResult.sideBName }}</span>
                    <div class="lb-track">
                      <div class="lb-fill b" :style="{ width: pct(liveResult.supportB) + '%' }" />
                    </div>
                    <span class="lb-num">{{ liveResult.supportB }}</span>
                  </div>
                </div>
                <div class="live-debaters">
                  <div
                    v-for="d in liveResult.debaterVotes"
                    :key="d.id"
                    class="ld-chip"
                    :class="d.side === 'A' ? 'a' : 'b'"
                  >
                    <span class="ld-name">{{ d.name }}</span>
                    <span class="ld-votes">{{ d.votes }}</span>
                  </div>
                </div>
              </div>

              <!-- 本场的三个链接（投屏用）-->
              <div class="urls">
                <div class="url-row">
                  <span class="url-label">观众投票</span>
                  <code class="url-code">{{ voterUrl(r.id) }}</code>
                  <button class="url-copy" @click="copyToClipboard(voterUrl(r.id), '观众投票链接')">复制</button>
                </div>
                <div class="url-row">
                  <span class="url-label">投屏二维码</span>
                  <code class="url-code">{{ screenUrl(r.id) }}</code>
                  <button class="url-copy" @click="copyToClipboard(screenUrl(r.id), '投屏二维码链接')">复制</button>
                  <a class="url-open" :href="screenUrl(r.id)" target="_blank">打开</a>
                </div>
                <div class="url-row">
                  <span class="url-label">实时结果</span>
                  <code class="url-code">{{ displayUrl(r.id) }}</code>
                  <button class="url-copy" @click="copyToClipboard(displayUrl(r.id), '实时结果链接')">复制</button>
                  <a class="url-open" :href="displayUrl(r.id)" target="_blank">打开</a>
                </div>
                <div class="url-row password-row">
                  <span class="url-label">操作员密码</span>
                  <code class="url-code password">{{ r.accessPassword || '—' }}</code>
                  <button class="url-copy" @click="copyToClipboard(r.accessPassword || '', '操作员密码')">复制</button>
                  <button class="url-copy warn" @click="onRegenPassword(r)">重新生成</button>
                </div>
              </div>

              <footer class="card-actions">
                <button v-if="r.isActive !== 1" class="act-btn primary" @click="onActivate(r)">
                  激活并开始
                </button>
                <button v-if="r.isActive === 1" class="act-btn" @click="onReset(r)">
                  重置倒计时
                </button>
                <button v-if="r.isActive === 1 && r.locked !== 1" class="act-btn warn" @click="onLock(r)">
                  立即锁票
                </button>
                <button v-if="r.locked === 1" class="act-btn" @click="onUnlock(r)">
                  解锁再开 5 分钟
                </button>
                <button class="act-btn" @click="openEditor(r)">编辑</button>
                <button class="act-btn danger" @click="onDelete(r)">删除</button>
              </footer>
            </article>
          </div>
        </template>
      </div>
    </main>

    <PageFooter />

    <!-- 编辑器 Modal -->
    <div v-if="editorOpen" class="modal-mask" @click.self="closeEditor">
      <div class="modal">
        <header class="modal-head">
          <h2>{{ editing?.id ? '编辑场次' : '新建场次' }}</h2>
          <button class="modal-close" @click="closeEditor">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </header>

        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">辩题</label>
            <input
              v-model="form.topic"
              type="text"
              class="form-input"
              placeholder="例：高中生应不应该谈恋爱"
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">正方名称</label>
              <input v-model="form.sideAName" type="text" class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">反方名称</label>
              <input v-model="form.sideBName" type="text" class="form-input" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">顺序</label>
              <input v-model.number="form.displayOrder" type="number" class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">投票时长（秒）</label>
              <input
                v-model.number="form.voteDurationSeconds"
                type="number"
                class="form-input"
              />
            </div>
          </div>

          <label class="checkbox-row">
            <input v-model="form.publicDisplay" type="checkbox" />
            <span>允许大屏公开展示（观众可访问 /vote/display）</span>
          </label>

          <div class="debater-editor">
            <div class="dec-col">
              <div class="dec-head">
                <h4>正方辩手</h4>
                <button type="button" class="add-btn" @click="addDebater('A')">+ 添加</button>
              </div>
              <div class="d-row-list">
                <div v-for="(d, i) in debatersA" :key="`a-${i}`" class="d-row">
                  <input v-model="d.position" class="d-input d-position" placeholder="一辩" />
                  <input v-model="d.name" class="d-input d-name" placeholder="姓名" />
                  <button class="d-remove" @click="removeDebater(d)" type="button">×</button>
                </div>
              </div>
            </div>
            <div class="dec-col">
              <div class="dec-head">
                <h4>反方辩手</h4>
                <button type="button" class="add-btn" @click="addDebater('B')">+ 添加</button>
              </div>
              <div class="d-row-list">
                <div v-for="(d, i) in debatersB" :key="`b-${i}`" class="d-row">
                  <input v-model="d.position" class="d-input d-position" placeholder="一辩" />
                  <input v-model="d.name" class="d-input d-name" placeholder="姓名" />
                  <button class="d-remove" @click="removeDebater(d)" type="button">×</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer class="modal-foot">
          <button class="modal-btn ghost" @click="closeEditor">取消</button>
          <button class="modal-btn primary" :disabled="isSaving" @click="onSave">
            {{ isSaving ? '保存中…' : '保存' }}
          </button>
        </footer>
      </div>
    </div>
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
  max-width: 900px;
  margin: 0 auto;
}

.breadcrumb-wrapper {
  display: none;
  margin-bottom: var(--spacing-lg);
}

/* ===== Page Title ===== */
.page-header-section {
  margin-bottom: var(--spacing-md);
}

.header-main {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.header-text { display: none; }
.page-title { font-size: var(--text-xl); font-weight: var(--font-bold); margin-bottom: var(--spacing-xs); }
.page-subtitle { font-size: var(--text-sm); color: var(--color-text-secondary); }

.header-actions { display: flex; gap: var(--spacing-sm); flex-wrap: wrap; }

.action-button {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.action-button svg { width: 16px; height: 16px; }
.action-button.primary { background: var(--color-primary); color: white; }
.action-button.primary:hover { background: var(--color-primary-dark); }
.action-button.secondary {
  background: var(--color-card);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}
.action-button.secondary:hover { border-color: var(--color-primary); color: var(--color-primary); }

/* ===== Loading / Empty ===== */
.loading-container, .empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-2xl);
  color: var(--color-text-secondary);
  text-align: center;
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
@keyframes spin { to { transform: rotate(360deg); } }

.empty-icon {
  width: 64px;
  height: 64px;
  color: var(--color-text-placeholder);
  margin-bottom: var(--spacing-md);
}
.empty-icon svg { width: 100%; height: 100%; }
.empty-container h2 { font-size: var(--text-lg); font-weight: var(--font-semibold); color: var(--color-text); margin-bottom: var(--spacing-xs); }
.empty-container p { margin-bottom: var(--spacing-lg); }

.empty-action-btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: white;
  background: var(--color-primary);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.empty-action-btn:hover { background: var(--color-primary-dark); }

/* ===== Round Cards ===== */
.rounds-list { display: flex; flex-direction: column; gap: var(--spacing-md); }

.round-card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-fast);
}
.round-card.active {
  border-color: var(--color-primary);
  box-shadow: 0 4px 16px rgba(231, 76, 60, 0.12);
}
.round-card.locked { opacity: 0.85; }

.card-head { display: flex; flex-direction: column; gap: var(--spacing-xs); margin-bottom: var(--spacing-md); }
.badges { display: flex; flex-wrap: wrap; gap: var(--spacing-xs); }

.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  border-radius: var(--radius-sm);
}
.badge.order { background: var(--color-border); color: var(--color-text); }
.badge.live { background: var(--color-primary); color: white; }
.badge.locked { background: var(--color-text-secondary); color: white; }
.badge.success { background: var(--color-success-bg); color: var(--color-success); }

.card-topic { font-size: var(--text-base); font-weight: var(--font-semibold); color: var(--color-text); line-height: var(--leading-normal); }
.card-sides { font-size: var(--text-sm); color: var(--color-text-secondary); }
.card-sides .vs { margin: 0 var(--spacing-sm); opacity: 0.5; }
.card-sides .side-a { color: var(--color-info); font-weight: var(--font-medium); }
.card-sides .side-b { color: var(--color-primary); font-weight: var(--font-medium); }

.debaters {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--color-bg);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-md);
}
.dcol h4 { font-size: var(--text-xs); color: var(--color-text-secondary); margin-bottom: var(--spacing-xs); font-weight: var(--font-medium); }
.dchips { display: flex; flex-wrap: wrap; gap: var(--spacing-xs); }
.dchip {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  color: var(--color-text);
}

/* ===== Live Block ===== */
.live-block {
  margin-bottom: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--color-info-bg);
  border: 1px dashed var(--color-info);
  border-radius: var(--radius-md);
}
.live-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-info);
  margin-bottom: var(--spacing-sm);
}
.live-total b { font-size: var(--text-lg); margin: 0 var(--spacing-xs); }
.live-timer { font-variant-numeric: tabular-nums; }
.live-timer.urgent { color: var(--color-error); }

.live-bars { display: flex; flex-direction: column; gap: var(--spacing-xs); }
.lb-row { display: flex; align-items: center; gap: var(--spacing-sm); font-size: var(--text-xs); }
.lb-name { min-width: 80px; color: var(--color-text); }
.lb-track {
  flex: 1;
  height: 12px;
  background: var(--color-border);
  border-radius: var(--radius-full);
  overflow: hidden;
}
.lb-fill { height: 100%; transition: width 0.4s; }
.lb-fill.a { background: var(--color-info); }
.lb-fill.b { background: var(--color-primary); }
.lb-num {
  min-width: 32px;
  text-align: right;
  font-weight: var(--font-bold);
  font-variant-numeric: tabular-nums;
  color: var(--color-text);
}

.live-debaters {
  margin-top: var(--spacing-sm);
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}
.ld-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: 2px 8px;
  font-size: var(--text-xs);
  border-radius: var(--radius-sm);
  background: var(--color-card);
}
.ld-chip.a { color: var(--color-info); border: 1px solid var(--color-info); }
.ld-chip.b { color: var(--color-primary); border: 1px solid var(--color-primary); }
.ld-chip .ld-votes { font-weight: var(--font-bold); font-variant-numeric: tabular-nums; }

/* ===== URLs Block ===== */
.urls {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-md);
}

.url-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--text-xs);
}
.url-label {
  flex-shrink: 0;
  width: 72px;
  color: var(--color-text-secondary);
  font-weight: var(--font-medium);
}
.url-code {
  flex: 1;
  min-width: 0;
  font-family: var(--font-family-mono);
  font-size: 11px;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: var(--color-card);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
}
.url-copy, .url-open {
  flex-shrink: 0;
  padding: 4px 10px;
  font-size: var(--text-xs);
  background: var(--color-card);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
}
.url-copy:hover, .url-open:hover { color: var(--color-primary); border-color: var(--color-primary); }
.url-copy.warn { color: var(--color-warning); border-color: var(--color-warning); }
.url-copy.warn:hover { background: var(--color-warning); color: white; }

.password-row { padding-top: var(--spacing-xs); border-top: 1px dashed var(--color-border); margin-top: 2px; }
.url-code.password {
  font-size: 15px;
  font-weight: var(--font-bold);
  letter-spacing: 0.12em;
  color: var(--color-primary);
  background: var(--color-primary-bg);
  border-color: var(--color-primary);
}

/* ===== Card Actions ===== */
.card-actions { display: flex; flex-wrap: wrap; gap: var(--spacing-xs); }

.act-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  background: var(--color-card);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  transition: all var(--transition-fast);
}
.act-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }
.act-btn.primary { background: var(--color-primary); color: white; border-color: var(--color-primary); }
.act-btn.primary:hover { background: var(--color-primary-dark); color: white; }
.act-btn.warn { background: var(--color-warning); color: white; border-color: var(--color-warning); }
.act-btn.warn:hover { opacity: 0.88; color: white; }
.act-btn.danger { color: var(--color-error); border-color: var(--color-error-bg); }
.act-btn.danger:hover { background: var(--color-error-bg); color: var(--color-error); }

/* ===== Modal ===== */
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0;
}

.modal {
  background: var(--color-card);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  width: 100%;
  max-height: 92vh;
  display: flex;
  flex-direction: column;
  animation: slide-up var(--transition-normal);
}
@keyframes slide-up { from { transform: translateY(20px); opacity: 0; } }

.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
}
.modal-head h2 { font-size: var(--text-lg); font-weight: var(--font-semibold); }
.modal-close {
  width: 32px;
  height: 32px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--color-text-secondary);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-close:hover { background: var(--color-border); color: var(--color-text); }
.modal-close svg { width: 20px; height: 20px; }

.modal-body {
  padding: var(--spacing-md);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}
.modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-top: 1px solid var(--color-border);
  background: var(--color-bg);
}

.modal-btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.modal-btn.ghost { background: var(--color-card); color: var(--color-text); border: 1px solid var(--color-border); }
.modal-btn.ghost:hover { background: var(--color-border); }
.modal-btn.primary { background: var(--color-primary); color: white; }
.modal-btn.primary:hover { background: var(--color-primary-dark); }
.modal-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* ===== Form ===== */
.form-group { display: flex; flex-direction: column; gap: var(--spacing-xs); }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-sm); }

.form-label {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
}
.form-input {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  color: var(--color-text);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: border-color var(--transition-fast);
  width: 100%;
}
.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--text-sm);
  color: var(--color-text);
  cursor: pointer;
}

/* ===== Debater Editor ===== */
.debater-editor {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--color-bg);
  border-radius: var(--radius-md);
}
.dec-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
}
.dec-head h4 { font-size: var(--text-sm); font-weight: var(--font-semibold); color: var(--color-text); }
.add-btn {
  padding: 4px 10px;
  font-size: var(--text-xs);
  background: var(--color-card);
  color: var(--color-primary);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-sm);
  cursor: pointer;
}
.add-btn:hover { background: var(--color-primary); color: white; }

.d-row-list { display: flex; flex-direction: column; gap: var(--spacing-xs); }
.d-row { display: flex; gap: var(--spacing-xs); }
.d-input {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--text-sm);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  min-width: 0;
}
.d-input:focus { outline: none; border-color: var(--color-primary); }
.d-position { flex: 0 0 80px; }
.d-name { flex: 1; }
.d-remove {
  width: 32px;
  background: transparent;
  color: var(--color-text-placeholder);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
}
.d-remove:hover { color: var(--color-error); border-color: var(--color-error); }

/* ===== Desktop ===== */
@media (min-width: 768px) {
  .page-content { padding: var(--spacing-lg); }
  .breadcrumb-wrapper { display: block; }
  .header-text { display: block; }
  .header-main { flex-direction: row; justify-content: space-between; align-items: flex-end; }
  .debater-editor { grid-template-columns: 1fr 1fr; }

  .modal-mask { align-items: center; padding: var(--spacing-lg); }
  .modal {
    max-width: 720px;
    max-height: 85vh;
    border-radius: var(--radius-lg);
    animation: fade-in var(--transition-normal);
  }
  @keyframes fade-in { from { opacity: 0; transform: translateY(8px); } }

  .form-row { grid-template-columns: 1fr 1fr 1fr; }
}
</style>
