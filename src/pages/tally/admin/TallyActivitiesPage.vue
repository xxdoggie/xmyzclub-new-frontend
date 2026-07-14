<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb.vue'
import { useToast } from '@/composables/useToast'
import {
  adminCreateActivity,
  adminDeleteActivity,
  adminListActivities,
  adminUpdateActivity,
} from '@/api/tally'
import type { ActivityStatus, TallyActivity } from '@/types/tally'

const router = useRouter()
const toast = useToast()

const isLoading = ref(true)
const activities = ref<TallyActivity[]>([])

const createOpen = ref(false)
const createTitle = ref('')
const creating = ref(false)

function statusLabel(s: ActivityStatus): string {
  return s === 0 ? '待开始' : s === 1 ? '进行中' : '已结束'
}

function statusClass(s: ActivityStatus): string {
  return s === 0 ? 'pending' : s === 1 ? 'live' : 'ended'
}

function formatTime(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('zh-CN')
}

async function load() {
  isLoading.value = true
  try {
    const res = await adminListActivities()
    if (res.data.code === 200) {
      activities.value = res.data.data || []
    } else {
      toast.error(res.data.message || '加载失败')
    }
  } catch (e: unknown) {
    toast.error((e as Error)?.message || '网络错误')
  } finally {
    isLoading.value = false
  }
}

function openCreate() {
  createTitle.value = ''
  createOpen.value = true
}

function closeCreate() {
  if (creating.value) return
  createOpen.value = false
}

async function submitCreate() {
  const title = createTitle.value.trim()
  if (!title) {
    toast.warning('请输入活动标题')
    return
  }
  creating.value = true
  try {
    const res = await adminCreateActivity(title)
    if (res.data.code === 200) {
      toast.success('已创建')
      createOpen.value = false
      await load()
    } else {
      toast.error(res.data.message || '创建失败')
    }
  } catch (e: unknown) {
    toast.error((e as Error)?.message || '网络错误')
  } finally {
    creating.value = false
  }
}

async function onStatusChange(a: TallyActivity, evt: Event) {
  const target = evt.target as HTMLSelectElement
  const next = Number(target.value) as ActivityStatus
  if (next === a.status) return
  try {
    const res = await adminUpdateActivity(a.id, { status: next })
    if (res.data.code === 200) {
      toast.success('状态已更新')
      await load()
    } else {
      toast.error(res.data.message || '更新失败')
      target.value = String(a.status)
    }
  } catch (e: unknown) {
    toast.error((e as Error)?.message || '网络错误')
    target.value = String(a.status)
  }
}

async function onDelete(a: TallyActivity) {
  if (!confirm(`确认删除活动「${a.title}」？\n候选人与唱票记录将一并删除，不可恢复。`)) return
  try {
    const res = await adminDeleteActivity(a.id)
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

function goEdit(id: number) {
  router.push(`/admin/tally/activities/${id}/edit`)
}

function goControl(id: number) {
  router.push(`/admin/tally/activities/${id}/control`)
}

function screenUrl(id: number): string {
  return `${window.location.origin}/tally/screen/${id}`
}

function copyScreenUrl(id: number) {
  const url = screenUrl(id)
  navigator.clipboard.writeText(url).then(
    () => toast.success(`已复制大屏链接：${url}`),
    () => toast.error(`复制失败：${url}`),
  )
}

function openScreen(id: number) {
  window.open(screenUrl(id), '_blank', 'noopener,noreferrer')
}

onMounted(load)
</script>

<template>
  <div class="page-container">
    <PageHeader back-to="/" />

    <main class="page-content">
      <div class="content-container">
        <div class="breadcrumb-wrapper">
          <PageBreadcrumb />
        </div>

        <div class="page-header-section">
          <div class="header-main">
            <div class="header-text">
              <h1 class="page-title">实时唱票管理</h1>
              <p class="page-subtitle">管理活动、候选人、唱票控制台</p>
            </div>
            <div class="header-actions">
              <button class="action-button primary" @click="openCreate">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                新建活动
              </button>
            </div>
          </div>
        </div>

        <div v-if="isLoading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>

        <template v-else>
          <div v-if="activities.length === 0" class="empty-container">
            <div class="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <h2>暂无唱票活动</h2>
            <p>点击右上角「新建活动」开始</p>
            <button class="empty-action-btn" @click="openCreate">新建第一个活动</button>
          </div>

          <div v-else class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>标题</th>
                  <th class="col-status">状态</th>
                  <th class="col-time">创建时间</th>
                  <th class="col-actions">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="a in activities" :key="a.id">
                  <td class="cell-title">{{ a.title }}</td>
                  <td>
                    <span class="badge" :class="statusClass(a.status)">{{ statusLabel(a.status) }}</span>
                  </td>
                  <td class="cell-time">{{ formatTime(a.createdAt) }}</td>
                  <td>
                    <div class="row-actions">
                      <button class="act-btn" @click="goEdit(a.id)">配置候选人</button>
                      <button class="act-btn primary" @click="goControl(a.id)">唱票控制台</button>
                      <button class="act-btn" @click="openScreen(a.id)">打开大屏</button>
                      <button class="act-btn" @click="copyScreenUrl(a.id)">复制大屏链接</button>
                      <select
                        class="status-select"
                        :value="a.status"
                        @change="onStatusChange(a, $event)"
                      >
                        <option :value="0">待开始</option>
                        <option :value="1">进行中</option>
                        <option :value="2">已结束</option>
                      </select>
                      <button class="act-btn danger" @click="onDelete(a)">删除</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </div>
    </main>

    <PageFooter />

    <!-- 新建活动 Modal -->
    <div v-if="createOpen" class="modal-mask" @click.self="closeCreate">
      <div class="modal">
        <header class="modal-head">
          <h2>新建活动</h2>
          <button class="modal-close" @click="closeCreate">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </header>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">活动标题</label>
            <input
              v-model="createTitle"
              type="text"
              class="form-input"
              placeholder="例：2026 年校园歌手大赛决赛"
              @keydown.enter="submitCreate"
            />
          </div>
        </div>
        <div class="modal-foot">
          <button class="modal-btn ghost" :disabled="creating" @click="closeCreate">取消</button>
          <button class="modal-btn primary" :disabled="creating" @click="submitCreate">
            {{ creating ? '创建中...' : '确认创建' }}
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
.page-content {
  flex: 1;
  padding: var(--spacing-md);
}
.content-container {
  max-width: 1100px;
  margin: 0 auto;
}

.breadcrumb-wrapper {
  display: none;
  margin-bottom: var(--spacing-lg);
}

.page-header-section { margin-bottom: var(--spacing-md); }
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
}
.empty-action-btn:hover { background: var(--color-primary-dark); }

/* ===== Table ===== */
.table-wrapper {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow-x: auto;
  box-shadow: var(--shadow-sm);
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 720px;
}
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

.cell-title { font-weight: var(--font-medium); color: var(--color-text); }
.cell-time { color: var(--color-text-secondary); font-size: var(--text-xs); white-space: nowrap; }
.col-status { width: 100px; }
.col-time { width: 180px; }
.col-actions { width: 1px; white-space: nowrap; }

.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  border-radius: var(--radius-sm);
}
.badge.pending {
  background: var(--color-border);
  color: var(--color-text-secondary);
}
.badge.live {
  background: var(--color-success, var(--color-primary));
  color: white;
}
.badge.ended {
  background: var(--color-warning-bg, var(--color-border));
  color: var(--color-warning, var(--color-text-secondary));
}

.row-actions {
  display: flex;
  gap: var(--spacing-xs);
  flex-wrap: wrap;
  align-items: center;
}

.act-btn {
  padding: 6px 12px;
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  background: var(--color-card);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.act-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }
.act-btn.primary { background: var(--color-primary); color: white; border-color: var(--color-primary); }
.act-btn.primary:hover { background: var(--color-primary-dark); color: white; }
.act-btn.danger { color: var(--color-error); border-color: var(--color-error-bg); }
.act-btn.danger:hover { background: var(--color-error-bg); color: var(--color-error); }

.status-select {
  padding: 5px 8px;
  font-size: var(--text-xs);
  background: var(--color-card);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
}
.status-select:focus { outline: none; border-color: var(--color-primary); }

/* ===== Modal ===== */
.modal-mask {
  position: fixed;
  inset: 0;
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

.form-group { display: flex; flex-direction: column; gap: var(--spacing-xs); }
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
  .header-text { display: block; }
  .header-main { flex-direction: row; justify-content: space-between; align-items: flex-end; }
  .modal-mask { align-items: center; padding: var(--spacing-lg); }
  .modal {
    max-width: 480px;
    border-radius: var(--radius-lg);
    animation: fade-in var(--transition-normal);
  }
  @keyframes fade-in { from { opacity: 0; transform: translateY(8px); } }
}
</style>
