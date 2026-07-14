<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb.vue'
import { useToast } from '@/composables/useToast'
import {
  adminAddCandidate,
  adminDeleteCandidate,
  adminGetActivity,
  adminUpdateActivity,
  adminUpdateCandidate,
} from '@/api/tally'
import type { ActivityStatus, TallyActivity, TallyCandidate } from '@/types/tally'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const activityId = computed(() => Number(route.params.id))

const isLoading = ref(true)
const activity = ref<TallyActivity | null>(null)

const candidates = computed<TallyCandidate[]>(() => {
  const list = activity.value?.candidates || []
  return [...list].sort((a, b) => a.displayOrder - b.displayOrder)
})

// 改名 modal
const renameOpen = ref(false)
const renameValue = ref('')
const renameSaving = ref(false)

// 添加/编辑候选人 modal
const candidateModalOpen = ref(false)
const candidateEditingId = ref<number | null>(null)
const cForm = ref({ number: '', name: '', displayOrder: 0 })
const candidateSaving = ref(false)

function statusLabel(s: ActivityStatus): string {
  return s === 0 ? '待开始' : s === 1 ? '进行中' : '已结束'
}
function statusClass(s: ActivityStatus): string {
  return s === 0 ? 'pending' : s === 1 ? 'live' : 'ended'
}

async function load() {
  if (!activityId.value || Number.isNaN(activityId.value)) {
    toast.error('活动 ID 无效')
    return
  }
  isLoading.value = true
  try {
    const res = await adminGetActivity(activityId.value)
    if (res.data.code === 200) {
      activity.value = res.data.data
    } else {
      toast.error(res.data.message || '加载失败')
    }
  } catch (e: unknown) {
    toast.error((e as Error)?.message || '网络错误')
  } finally {
    isLoading.value = false
  }
}

function openRename() {
  renameValue.value = activity.value?.title || ''
  renameOpen.value = true
}
function closeRename() {
  if (renameSaving.value) return
  renameOpen.value = false
}
async function submitRename() {
  const t = renameValue.value.trim()
  if (!t) {
    toast.warning('标题不能为空')
    return
  }
  renameSaving.value = true
  try {
    const res = await adminUpdateActivity(activityId.value, { title: t })
    if (res.data.code === 200) {
      toast.success('已更新')
      renameOpen.value = false
      await load()
    } else {
      toast.error(res.data.message || '更新失败')
    }
  } catch (e: unknown) {
    toast.error((e as Error)?.message || '网络错误')
  } finally {
    renameSaving.value = false
  }
}

async function onStatusChange(evt: Event) {
  if (!activity.value) return
  const target = evt.target as HTMLSelectElement
  const next = Number(target.value) as ActivityStatus
  const prev = activity.value.status
  if (next === prev) return
  try {
    const res = await adminUpdateActivity(activityId.value, { status: next })
    if (res.data.code === 200) {
      toast.success('状态已更新')
      await load()
    } else {
      toast.error(res.data.message || '更新失败')
      target.value = String(prev)
    }
  } catch (e: unknown) {
    toast.error((e as Error)?.message || '网络错误')
    target.value = String(prev)
  }
}

function openAddCandidate() {
  candidateEditingId.value = null
  // 默认 displayOrder = 已有最大 + 1
  const maxOrder = candidates.value.reduce((m, c) => Math.max(m, c.displayOrder), 0)
  cForm.value = { number: '', name: '', displayOrder: maxOrder + 1 }
  candidateModalOpen.value = true
}

function openEditCandidate(c: TallyCandidate) {
  candidateEditingId.value = c.id
  cForm.value = { number: c.number, name: c.name, displayOrder: c.displayOrder }
  candidateModalOpen.value = true
}

function closeCandidateModal() {
  if (candidateSaving.value) return
  candidateModalOpen.value = false
}

async function submitCandidate() {
  const number = cForm.value.number.trim()
  const name = cForm.value.name.trim()
  const displayOrder = Number(cForm.value.displayOrder) || 0
  if (!number) {
    toast.warning('请输入编号')
    return
  }
  if (!name) {
    toast.warning('请输入姓名')
    return
  }
  candidateSaving.value = true
  try {
    if (candidateEditingId.value === null) {
      const res = await adminAddCandidate(activityId.value, { number, name, displayOrder })
      if (res.data.code === 200) {
        toast.success('已添加')
        candidateModalOpen.value = false
        await load()
      } else {
        toast.error(res.data.message || '添加失败')
      }
    } else {
      const res = await adminUpdateCandidate(candidateEditingId.value, { number, name, displayOrder })
      if (res.data.code === 200) {
        toast.success('已更新')
        candidateModalOpen.value = false
        await load()
      } else {
        toast.error(res.data.message || '更新失败')
      }
    }
  } catch (e: unknown) {
    toast.error((e as Error)?.message || '网络错误')
  } finally {
    candidateSaving.value = false
  }
}

async function onDeleteCandidate(c: TallyCandidate) {
  if (!confirm(`确认删除候选人「${c.number} · ${c.name}」？\n其历史唱票记录将一并删除。`)) return
  try {
    const res = await adminDeleteCandidate(c.id)
    if (res.data.code === 200) {
      toast.success('已删除')
      await load()
    } else {
      toast.error(res.data.message || '删除失败')
    }
  } catch (e: unknown) {
    toast.error((e as Error)?.message || '网络错误')
  }
}

function goControl() {
  router.push(`/admin/tally/activities/${activityId.value}/control`)
}

onMounted(load)
</script>

<template>
  <div class="page-container">
    <PageHeader back-to="/admin/tally" />

    <main class="page-content">
      <div class="content-container">
        <div class="breadcrumb-wrapper">
          <PageBreadcrumb />
        </div>

        <div v-if="isLoading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>

        <template v-else-if="activity">
          <div class="page-header-section">
            <div class="header-main">
              <div class="header-text">
                <div class="title-row">
                  <h1 class="page-title">{{ activity.title }}</h1>
                  <span class="badge" :class="statusClass(activity.status)">
                    {{ statusLabel(activity.status) }}
                  </span>
                </div>
                <p class="page-subtitle">配置候选人、调整状态</p>
              </div>
              <div class="header-actions">
                <button class="action-button secondary" @click="openRename">改名</button>
                <select class="status-select-lg" :value="activity.status" @change="onStatusChange">
                  <option :value="0">待开始</option>
                  <option :value="1">进行中</option>
                  <option :value="2">已结束</option>
                </select>
                <button class="action-button primary" @click="goControl">进入唱票控制台</button>
              </div>
            </div>
          </div>

          <section class="candidates-section">
            <div class="section-head">
              <h2 class="section-title">候选人</h2>
              <button class="action-button primary" @click="openAddCandidate">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                添加候选人
              </button>
            </div>

            <div v-if="candidates.length === 0" class="empty-mini">
              <p>暂无候选人，点击右上「添加候选人」</p>
            </div>

            <div v-else class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th class="col-num">编号</th>
                    <th>姓名</th>
                    <th class="col-order">显示顺序</th>
                    <th class="col-votes">当前票数</th>
                    <th class="col-actions">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="c in candidates" :key="c.id">
                    <td class="cell-num">{{ c.number }}</td>
                    <td class="cell-name">{{ c.name }}</td>
                    <td>{{ c.displayOrder }}</td>
                    <td class="cell-votes">{{ c.voteCount }}</td>
                    <td>
                      <div class="row-actions">
                        <button class="act-btn" @click="openEditCandidate(c)">编辑</button>
                        <button class="act-btn danger" @click="onDeleteCandidate(c)">删除</button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <div class="back-link-wrap">
            <router-link to="/admin/tally" class="back-link">← 返回活动列表</router-link>
          </div>
        </template>
      </div>
    </main>

    <PageFooter />

    <!-- 改名 Modal -->
    <div v-if="renameOpen" class="modal-mask" @click.self="closeRename">
      <div class="modal">
        <header class="modal-head">
          <h2>修改活动标题</h2>
          <button class="modal-close" @click="closeRename">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </header>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">标题</label>
            <input
              v-model="renameValue"
              type="text"
              class="form-input"
              @keydown.enter="submitRename"
            />
          </div>
        </div>
        <div class="modal-foot">
          <button class="modal-btn ghost" :disabled="renameSaving" @click="closeRename">取消</button>
          <button class="modal-btn primary" :disabled="renameSaving" @click="submitRename">
            {{ renameSaving ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 候选人 Modal -->
    <div v-if="candidateModalOpen" class="modal-mask" @click.self="closeCandidateModal">
      <div class="modal">
        <header class="modal-head">
          <h2>{{ candidateEditingId === null ? '添加候选人' : '编辑候选人' }}</h2>
          <button class="modal-close" @click="closeCandidateModal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </header>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">编号</label>
              <input v-model="cForm.number" type="text" class="form-input" placeholder="如 01" />
            </div>
            <div class="form-group">
              <label class="form-label">显示顺序</label>
              <input v-model.number="cForm.displayOrder" type="number" class="form-input" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">姓名</label>
            <input
              v-model="cForm.name"
              type="text"
              class="form-input"
              placeholder="候选人姓名"
              @keydown.enter="submitCandidate"
            />
          </div>
        </div>
        <div class="modal-foot">
          <button class="modal-btn ghost" :disabled="candidateSaving" @click="closeCandidateModal">取消</button>
          <button class="modal-btn primary" :disabled="candidateSaving" @click="submitCandidate">
            {{ candidateSaving ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
}
.page-content { flex: 1; padding: var(--spacing-md); }
.content-container { max-width: 1100px; margin: 0 auto; }

.breadcrumb-wrapper { display: none; margin-bottom: var(--spacing-lg); }

.page-header-section { margin-bottom: var(--spacing-lg); }
.header-main {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}
.header-text { flex: 1; }
.title-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
  margin-bottom: var(--spacing-xs);
}
.page-title { font-size: var(--text-xl); font-weight: var(--font-bold); }
.page-subtitle { font-size: var(--text-sm); color: var(--color-text-secondary); }
.header-actions { display: flex; gap: var(--spacing-sm); flex-wrap: wrap; align-items: center; }

.action-button {
  display: inline-flex;
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

.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  border-radius: var(--radius-sm);
}
.badge.pending { background: var(--color-border); color: var(--color-text-secondary); }
.badge.live { background: var(--color-success, var(--color-primary)); color: white; }
.badge.ended { background: var(--color-warning-bg, var(--color-border)); color: var(--color-warning, var(--color-text-secondary)); }

.status-select-lg {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  background: var(--color-card);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
}
.status-select-lg:focus { outline: none; border-color: var(--color-primary); }

.loading-container {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: var(--spacing-2xl); color: var(--color-text-secondary);
}
.loading-spinner {
  width: 32px; height: 32px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: var(--spacing-md);
}
@keyframes spin { to { transform: rotate(360deg); } }

.candidates-section {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
  box-shadow: var(--shadow-sm);
}
.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}
.section-title { font-size: var(--text-lg); font-weight: var(--font-semibold); color: var(--color-text); }

.empty-mini {
  padding: var(--spacing-xl);
  text-align: center;
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  background: var(--color-bg);
  border-radius: var(--radius-md);
}

.table-wrapper { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; min-width: 640px; }
.data-table th, .data-table td {
  padding: var(--spacing-sm) var(--spacing-md);
  text-align: left;
  font-size: var(--text-sm);
  border-bottom: 1px solid var(--color-border);
  vertical-align: middle;
}
.data-table th {
  background: var(--color-bg);
  color: var(--color-text-secondary);
  font-weight: var(--font-semibold);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.data-table tbody tr:hover { background: var(--color-bg); }
.data-table tbody tr:last-child td { border-bottom: none; }

.col-num { width: 80px; }
.col-order { width: 100px; }
.col-votes { width: 100px; }
.col-actions { width: 1px; white-space: nowrap; }

.cell-num {
  font-family: var(--font-family-mono, monospace);
  font-weight: var(--font-bold);
  color: var(--color-primary);
}
.cell-name { font-weight: var(--font-medium); }
.cell-votes { font-weight: var(--font-bold); font-variant-numeric: tabular-nums; }

.row-actions { display: flex; gap: var(--spacing-xs); flex-wrap: wrap; }

.act-btn {
  padding: 4px 10px;
  font-size: var(--text-xs);
  background: var(--color-card);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
}
.act-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }
.act-btn.danger { color: var(--color-error); border-color: var(--color-error-bg); }
.act-btn.danger:hover { background: var(--color-error-bg); color: var(--color-error); }

.back-link-wrap { margin-top: var(--spacing-lg); }
.back-link {
  color: var(--color-text-secondary);
  text-decoration: none;
  font-size: var(--text-sm);
}
.back-link:hover { color: var(--color-primary); }

/* Modal (shared) */
.modal-mask {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
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
  display: flex; justify-content: space-between; align-items: center;
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
}
.modal-head h2 { font-size: var(--text-lg); font-weight: var(--font-semibold); }
.modal-close {
  width: 32px; height: 32px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--color-text-secondary);
  border-radius: var(--radius-md);
  display: flex; align-items: center; justify-content: center;
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
}
.modal-btn.ghost {
  background: var(--color-card);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}
.modal-btn.ghost:hover { background: var(--color-border); }
.modal-btn.primary { background: var(--color-primary); color: white; }
.modal-btn.primary:hover { background: var(--color-primary-dark); }
.modal-btn:disabled { opacity: 0.5; cursor: not-allowed; }

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
  width: 100%;
}
.form-input:focus { outline: none; border-color: var(--color-primary); }

@media (min-width: 768px) {
  .page-content { padding: var(--spacing-lg); }
  .breadcrumb-wrapper { display: block; }
  .header-main { flex-direction: row; justify-content: space-between; align-items: flex-start; }
  .modal-mask { align-items: center; padding: var(--spacing-lg); }
  .modal {
    max-width: 560px;
    border-radius: var(--radius-lg);
    animation: fade-in var(--transition-normal);
  }
  @keyframes fade-in { from { opacity: 0; transform: translateY(8px); } }
}
</style>
