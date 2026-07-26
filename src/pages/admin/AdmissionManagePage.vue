<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import { useToast } from '@/composables/useToast'
import {
  adminExempt,
  adminKick,
  adminListGroups,
  adminListMembers,
  adminResendLink,
  adminRevokeExempt,
  type AdmissionGroupSummary,
  type AdmissionMemberRow,
} from '@/api/admission'

const toast = useToast()

const groups = ref<AdmissionGroupSummary[]>([])
const activeGroupId = ref('')
const members = ref<AdmissionMemberRow[]>([])
const total = ref(0)
const botOnline = ref(true)

const statusFilter = ref('')
const keyword = ref('')
const page = ref(1)
const pageSize = 50

/** 首次加载用整块骨架，后续刷新只显示角标，避免列表跳动 */
const firstLoad = ref(true)
const refreshing = ref(false)

/** 正在执行的操作：qq号 + 动作，用于禁用按钮 */
const acting = ref<string>('')

type DialogKind = 'exempt' | 'kick' | 'resend' | 'revoke'
const dialog = ref<{ kind: DialogKind; member: AdmissionMemberRow } | null>(null)
const exemptNote = ref('')

const statusTabs = [
  { key: '', label: '全部' },
  { key: 'pending', label: '待认证' },
  { key: 'verified', label: '已认证' },
  { key: 'exempted', label: '已豁免' },
  { key: 'kicked', label: '已移出' },
  { key: 'left', label: '已退群' },
]

const activeGroup = computed(() =>
  groups.value.find((g) => g.groupId === activeGroupId.value) || null
)

/**
 * 自动刷新期间不能干扰操作：弹窗开着、或有动作正在执行时一律不刷。
 * 否则管理员正要点某一行，列表在他手底下重排了。
 */
const canAutoRefresh = computed(() => !dialog.value && !acting.value)

let timer: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  await loadGroups()
  await loadMembers()
  firstLoad.value = false
  timer = setInterval(() => {
    if (canAutoRefresh.value) {
      loadMembers(true)
      loadGroups()
    }
  }, 15000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

async function loadGroups() {
  try {
    const res = await adminListGroups()
    if (res.data.code !== 200) {
      toast.error(res.data.message || '群列表加载失败')
      return
    }
    groups.value = res.data.data
    const first = groups.value[0]
    if (!activeGroupId.value && first) {
      activeGroupId.value = first.groupId
    }
  } catch {
    toast.error('群列表加载失败（可能没有 admission.manage 权限）')
  }
}

async function loadMembers(silent = false) {
  if (!activeGroupId.value) return
  if (!silent) refreshing.value = true
  try {
    const res = await adminListMembers({
      groupId: activeGroupId.value,
      status: statusFilter.value || undefined,
      keyword: keyword.value.trim() || undefined,
      page: page.value,
      pageSize,
    })
    if (res.data.code !== 200) {
      toast.error(res.data.message || '成员列表加载失败')
      return
    }
    members.value = res.data.data.members
    total.value = res.data.data.total
    botOnline.value = res.data.data.botOnline
  } catch {
    if (!silent) toast.error('成员列表加载失败')
  } finally {
    refreshing.value = false
  }
}

watch([activeGroupId, statusFilter], () => {
  page.value = 1
  loadMembers()
})

let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(keyword, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    loadMembers()
  }, 400)
})

// ==================== 操作 ====================

function openDialog(kind: DialogKind, member: AdmissionMemberRow) {
  exemptNote.value = ''
  dialog.value = { kind, member }
}

function closeDialog() {
  dialog.value = null
}

async function confirmDialog() {
  if (!dialog.value) return
  const { kind, member } = dialog.value
  const gid = member.groupId
  const qq = member.qqNumber

  acting.value = `${qq}:${kind}`
  closeDialog()

  try {
    const res =
      kind === 'exempt'
        ? await adminExempt(gid, qq, exemptNote.value.trim() || undefined)
        : kind === 'revoke'
          ? await adminRevokeExempt(gid, qq)
          : kind === 'kick'
            ? await adminKick(gid, qq)
            : await adminResendLink(gid, qq)

    if (res.data.code === 200) {
      toast.success(res.data.message || '操作成功')
    } else {
      toast.error(res.data.message || '操作失败')
    }
  } catch {
    toast.error('网络错误，请稍后重试')
  } finally {
    acting.value = ''
    // 操作完立刻拉一次最新状态，别等下一个轮询周期
    await Promise.all([loadMembers(true), loadGroups()])
  }
}

const dialogText = computed(() => {
  if (!dialog.value) return null
  const who = dialog.value.member.nickname || dialog.value.member.qqNumber
  switch (dialog.value.kind) {
    case 'exempt':
      return {
        title: `豁免 ${who} 的实名要求`,
        body: '本群内该 QQ 号将不再需要实名信息，当前禁言会一并解除。重新入群也依然有效。',
        confirm: '确认豁免',
        danger: false,
      }
    case 'revoke':
      return {
        title: `撤销 ${who} 的豁免`,
        body: '撤销后该成员会回到正常验证流程。不会立刻禁言，下次入群或到期扫描时生效。',
        confirm: '确认撤销',
        danger: false,
      }
    case 'kick':
      return {
        title: `将 ${who} 移出群聊`,
        body: '立即移出，不拉黑，对方仍可重新申请入群。此操作无法撤销。',
        confirm: '确认移出',
        danger: true,
      }
    case 'resend':
      return {
        title: `为 ${who} 重发认证链接`,
        body: '会在群内重新 @ 该成员并发送链接，同时把禁言与认证期限重新算起。',
        confirm: '确认重发',
        danger: false,
      }
  }
})

function statusLabel(m: AdmissionMemberRow) {
  if (m.status === 'pending') return m.muteExpired ? '已超期' : '待认证'
  if (m.status === 'verified') return '已认证'
  if (m.status === 'kicked') return '已移出'
  return '已退群'
}

function statusClass(m: AdmissionMemberRow) {
  if (m.status === 'pending') return m.muteExpired ? 'badge--danger' : 'badge--warn'
  if (m.status === 'verified') return 'badge--ok'
  return 'badge--muted'
}
</script>

<template>
  <div class="page-container">
    <PageHeader />

    <main class="page-content">
      <div class="content-container">
        <div class="page-title-row">
          <h1 class="page-title">入群实名认证管理</h1>
          <span class="head-meta">
            <span v-if="!botOnline" class="badge badge--danger">机器人离线</span>
            <span v-if="refreshing" class="refresh-dot">刷新中</span>
          </span>
        </div>

        <!-- 群选择 -->
        <div class="group-tabs">
          <button
            v-for="g in groups"
            :key="g.groupId"
            class="group-tab"
            :class="{ 'group-tab--active': g.groupId === activeGroupId }"
            @click="activeGroupId = g.groupId"
          >
            <span class="group-tab-name">
              {{ g.groupName || g.groupId }}
              <span v-if="g.isTarget" class="dot-target" title="当前验证目标群">●</span>
            </span>
            <span class="group-tab-sub">{{ g.groupId }}</span>
          </button>
        </div>

        <!-- 概览 -->
        <div v-if="activeGroup" class="stats">
          <div class="stat">
            <span class="stat-num">{{ activeGroup.pending }}</span>
            <span class="stat-label">待认证</span>
          </div>
          <div class="stat">
            <span class="stat-num stat-num--danger">{{ activeGroup.overdue }}</span>
            <span class="stat-label">已超期</span>
          </div>
          <div class="stat">
            <span class="stat-num">{{ activeGroup.verified }}</span>
            <span class="stat-label">已认证</span>
          </div>
          <div class="stat">
            <span class="stat-num">{{ activeGroup.exempted }}</span>
            <span class="stat-label">已豁免</span>
          </div>
          <div class="stat">
            <span class="stat-num">{{ activeGroup.kicked }}</span>
            <span class="stat-label">已移出</span>
          </div>
          <div class="stat">
            <span class="stat-num">{{ activeGroup.left }}</span>
            <span class="stat-label">已退群</span>
          </div>
        </div>

        <!-- 筛选 -->
        <div class="toolbar">
          <div class="tabs">
            <button
              v-for="t in statusTabs"
              :key="t.key"
              class="tab"
              :class="{ 'tab--active': statusFilter === t.key }"
              @click="statusFilter = t.key"
            >
              {{ t.label }}
            </button>
          </div>
          <input
            v-model="keyword"
            class="search"
            type="text"
            placeholder="搜 QQ 号 / 姓名 / 校园网账号"
          />
        </div>

        <!-- 列表 -->
        <div class="list-wrap">
          <p v-if="firstLoad" class="empty">加载中……</p>
          <p v-else-if="!members.length" class="empty">没有符合条件的成员</p>

          <ul v-else class="list">
            <li v-for="m in members" :key="m.id" class="row">
              <img :src="m.avatarUrl" alt="" class="avatar" />

              <div class="row-main">
                <div class="row-head">
                  <span class="who">{{ m.nickname || '（昵称未取到）' }}</span>
                  <span class="qq">{{ m.qqNumber }}</span>
                  <span class="badge" :class="statusClass(m)">{{ statusLabel(m) }}</span>
                  <span v-if="m.exempted" class="badge badge--info">已豁免</span>
                </div>

                <div class="row-info">
                  <template v-if="m.realName">
                    <span class="kv"><i>姓名</i>{{ m.realName }}</span>
                    <span class="kv"><i>学号</i>{{ m.campusAccount }}</span>
                    <span v-if="m.classAlias" class="kv"><i>班级</i>{{ m.classAlias }}</span>
                    <span v-if="m.previousQqNumber" class="kv kv--warn">
                      <i>改绑自</i>{{ m.previousQqNumber }}
                    </span>
                  </template>
                  <span v-else class="kv kv--dim">未绑定实名信息</span>
                </div>

                <div class="row-time">
                  <span v-if="m.joinTime">入群 {{ m.joinTime }}</span>
                  <span v-if="m.muteUntil && m.status === 'pending'">
                    期限 {{ m.muteUntil }}
                  </span>
                  <span v-if="m.verifyTime">认证 {{ m.verifyTime }}</span>
                  <span v-if="m.kickTime">移出 {{ m.kickTime }}</span>
                  <span v-if="m.exemptedNote" class="note">备注：{{ m.exemptedNote }}</span>
                </div>
              </div>

              <div class="row-actions">
                <button
                  v-if="!m.exempted"
                  class="act"
                  :disabled="!!acting"
                  @click="openDialog('exempt', m)"
                >
                  豁免
                </button>
                <button
                  v-else
                  class="act"
                  :disabled="!!acting"
                  @click="openDialog('revoke', m)"
                >
                  撤销豁免
                </button>
                <button
                  v-if="m.status === 'pending' && !m.exempted"
                  class="act"
                  :disabled="!!acting || !botOnline"
                  @click="openDialog('resend', m)"
                >
                  重发链接
                </button>
                <button
                  class="act act--danger"
                  :disabled="!!acting || !botOnline"
                  @click="openDialog('kick', m)"
                >
                  移出
                </button>
              </div>
            </li>
          </ul>
        </div>

        <p class="total">共 {{ total }} 条</p>
      </div>
    </main>

    <!-- 操作确认 -->
    <Transition name="modal">
      <div v-if="dialog && dialogText" class="mask" @click.self="closeDialog">
        <div class="modal">
          <h2 class="modal-title">{{ dialogText.title }}</h2>
          <p class="modal-body">{{ dialogText.body }}</p>

          <input
            v-if="dialog.kind === 'exempt'"
            v-model="exemptNote"
            class="search modal-input"
            type="text"
            maxlength="200"
            placeholder="备注（可选，例如：老师 / 家长代管）"
          />

          <div class="modal-actions">
            <button class="act" @click="closeDialog">取消</button>
            <button
              class="act act--primary"
              :class="{ 'act--danger': dialogText.danger }"
              @click="confirmDialog"
            >
              {{ dialogText.confirm }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
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
  padding: var(--spacing-md);
  min-height: 0;
}

.content-container {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.page-title-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: var(--spacing-md);
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}

.head-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.refresh-dot {
  font-size: 12px;
  color: var(--color-text-secondary);
}

/* ===== 群选择 ===== */
.group-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
  margin-bottom: var(--spacing-md);
}

.group-tab {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 14px;
  text-align: left;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-family: inherit;
}

.group-tab--active {
  border-color: var(--color-primary);
  background: var(--color-primary-bg);
}

.group-tab-name {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--color-text);
}

.group-tab-sub {
  font-size: 11.5px;
  color: var(--color-text-secondary);
  font-family: var(--font-mono, monospace);
}

.dot-target {
  color: var(--color-primary);
  font-size: 10px;
}

/* ===== 概览 ===== */
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(88px, 1fr));
  gap: 8px;
  margin-bottom: var(--spacing-md);
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.stat-num {
  font-size: 20px;
  font-weight: 600;
}

.stat-num--danger {
  color: var(--color-error);
}

.stat-label {
  font-size: 12px;
  color: var(--color-text-secondary);
}

/* ===== 筛选 ===== */
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-sm);
}

.tabs {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.tab {
  padding: 6px 12px;
  font-size: 13px;
  color: var(--color-text-secondary);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  cursor: pointer;
  font-family: inherit;
}

.tab--active {
  color: #fff;
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.search {
  flex: 1;
  min-width: 200px;
  padding: 8px 12px;
  font-size: 13.5px;
  font-family: inherit;
  color: var(--color-text);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.search:focus {
  outline: none;
  border-color: var(--color-primary);
}

/* ===== 列表 =====
   桌面端列表内部滚动，页面本身不长出去。 */
.list-wrap {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: calc(100vh - 400px);
  min-height: 200px;
  overflow-y: auto;
}

.row {
  display: flex;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--color-border);
}

.row:last-child {
  border-bottom: 0;
}

.avatar {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border-radius: var(--radius-full);
  object-fit: cover;
  background: var(--color-border);
}

.row-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.row-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.who {
  font-size: 14px;
  font-weight: 500;
}

.qq {
  font-size: 12.5px;
  color: var(--color-text-secondary);
  font-family: var(--font-mono, monospace);
}

.row-info,
.row-time {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  font-size: 12.5px;
  color: var(--color-text-secondary);
}

.row-time {
  font-size: 11.5px;
}

.kv i {
  font-style: normal;
  margin-right: 5px;
  color: var(--color-text-placeholder);
}

.kv--dim {
  color: var(--color-text-placeholder);
}

.kv--warn {
  color: var(--color-warning);
}

.note {
  color: var(--color-text);
}

.row-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
}

/* ===== 徽标 ===== */
.badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  white-space: nowrap;
}

.badge--ok {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.badge--warn {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.badge--danger {
  background: var(--color-error-bg);
  color: var(--color-error);
}

.badge--info {
  background: var(--color-info-bg);
  color: var(--color-info);
}

.badge--muted {
  background: var(--color-bg);
  color: var(--color-text-secondary);
}

/* ===== 按钮 ===== */
.act {
  padding: 5px 11px;
  font-size: 12.5px;
  font-family: inherit;
  color: var(--color-text);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  white-space: nowrap;
}

.act:hover:not(:disabled) {
  border-color: var(--color-text-secondary);
}

.act:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.act--primary {
  color: #fff;
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.act--danger {
  color: var(--color-error);
  border-color: var(--color-error);
}

.act--primary.act--danger {
  color: #fff;
  background: var(--color-error);
}

.empty {
  padding: 40px 0;
  text-align: center;
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 0;
}

.total {
  margin: var(--spacing-sm) 2px 0;
  font-size: 12px;
  color: var(--color-text-secondary);
}

/* ===== 弹窗 ===== */
.mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-md);
  background: rgba(0, 0, 0, 0.45);
}

.modal {
  width: 100%;
  max-width: 400px;
  padding: var(--spacing-lg);
  background: var(--color-card);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
}

.modal-title {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.5;
  margin: 0 0 var(--spacing-sm);
}

.modal-body {
  font-size: 13px;
  line-height: 1.7;
  color: var(--color-text-secondary);
  margin: 0;
}

.modal-input {
  width: 100%;
  margin-top: var(--spacing-md);
  flex: none;
}

.modal-actions {
  display: flex;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-lg);
}

.modal-actions > .act {
  flex: 1;
  padding: 10px;
  font-size: 14px;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity var(--transition-normal) ease;
}

.modal-leave-active {
  transition-duration: 160ms;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal,
.modal-leave-active .modal {
  transition: transform 250ms cubic-bezier(0.16, 1, 0.3, 1), opacity 250ms ease;
}

.modal-enter-from .modal {
  opacity: 0;
  transform: translateY(10px) scale(0.96);
}

.modal-leave-to .modal {
  opacity: 0;
  transform: translateY(4px) scale(0.98);
}

@media (prefers-reduced-motion: reduce) {
  .modal-enter-active,
  .modal-leave-active,
  .modal-enter-active .modal,
  .modal-leave-active .modal {
    transition: none;
  }
}

@media (max-width: 700px) {
  .list {
    max-height: none;
  }

  .row {
    flex-wrap: wrap;
  }

  .row-actions {
    flex-direction: row;
    width: 100%;
    flex-wrap: wrap;
  }
}
</style>
