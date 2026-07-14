<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'
import { useToast } from '@/composables/useToast'
import {
  adminGetVoiceAnswers,
  adminGetVoiceQuestions,
  adminGetVoiceReports,
  adminGetVoicesStats,
  adminHandleVoiceReport,
  adminRestoreVoiceAnswer,
  adminRestoreVoiceQuestion,
  adminTakedownVoiceAnswer,
  adminTakedownVoiceQuestion,
} from '@/api/voices'
import {
  identityLabel,
  type AdminAnswer,
  type AdminQuestion,
  type AdminReport,
  type VoicesStats,
} from '@/types/voices'

const toast = useToast()

type Tab = 'stats' | 'questions' | 'answers' | 'reports'
const tab = ref<Tab>('stats')

// ==================== 统计 ====================

const stats = ref<VoicesStats | null>(null)

async function loadStats() {
  try {
    const res = await adminGetVoicesStats()
    if (res.data.code === 200) stats.value = res.data.data
    else toast.error(res.data.message || '统计加载失败')
  } catch {
    toast.error('统计加载失败（可能没有 voices.manage 权限）')
  }
}

// ==================== 问题 ====================

const questions = ref<AdminQuestion[]>([])
const qStatus = ref<number | ''>('')
const qKeyword = ref('')
const qPage = ref(1)
const qTotal = ref(0)
const qLoading = ref(false)
const PAGE_SIZE = 20

async function loadQuestions(resetPage = false) {
  if (resetPage) qPage.value = 1
  qLoading.value = true
  try {
    const res = await adminGetVoiceQuestions({
      status: qStatus.value === '' ? undefined : qStatus.value,
      keyword: qKeyword.value || undefined,
      page: qPage.value,
      size: PAGE_SIZE,
    })
    if (res.data.code === 200) {
      questions.value = res.data.data.records
      qTotal.value = res.data.data.total
    } else {
      toast.error(res.data.message || '加载失败')
    }
  } catch {
    toast.error('加载失败')
  } finally {
    qLoading.value = false
  }
}

async function toggleQuestion(q: AdminQuestion) {
  const takedown = q.status === 0
  if (takedown && !confirm(`确认下架该问题？\n「${q.content}」\n下架后墙上不可见，其回答也一并隐藏。`)) return
  try {
    const res = takedown
      ? await adminTakedownVoiceQuestion(q.id)
      : await adminRestoreVoiceQuestion(q.id)
    if (res.data.code === 200) {
      toast.success(takedown ? '已下架' : '已恢复')
      await loadQuestions()
    } else {
      toast.error(res.data.message || '操作失败')
    }
  } catch {
    toast.error('操作失败')
  }
}

// ==================== 回答 ====================

const answers = ref<AdminAnswer[]>([])
const aStatus = ref<number | ''>('')
const aKeyword = ref('')
const aQuestionId = ref<string>('')
const aPage = ref(1)
const aTotal = ref(0)
const aLoading = ref(false)

async function loadAnswers(resetPage = false) {
  if (resetPage) aPage.value = 1
  aLoading.value = true
  try {
    const res = await adminGetVoiceAnswers({
      status: aStatus.value === '' ? undefined : aStatus.value,
      keyword: aKeyword.value || undefined,
      questionId: aQuestionId.value ? Number(aQuestionId.value) : undefined,
      page: aPage.value,
      size: PAGE_SIZE,
    })
    if (res.data.code === 200) {
      answers.value = res.data.data.records
      aTotal.value = res.data.data.total
    } else {
      toast.error(res.data.message || '加载失败')
    }
  } catch {
    toast.error('加载失败')
  } finally {
    aLoading.value = false
  }
}

async function toggleAnswer(a: AdminAnswer) {
  const takedown = a.status === 0
  if (takedown && !confirm(`确认下架该回答？\n「${a.content}」`)) return
  try {
    const res = takedown
      ? await adminTakedownVoiceAnswer(a.id)
      : await adminRestoreVoiceAnswer(a.id)
    if (res.data.code === 200) {
      toast.success(takedown ? '已下架' : '已恢复')
      await loadAnswers()
    } else {
      toast.error(res.data.message || '操作失败')
    }
  } catch {
    toast.error('操作失败')
  }
}

// ==================== 举报 ====================

const reports = ref<AdminReport[]>([])
const rStatus = ref<number | ''>(0)
const rPage = ref(1)
const rTotal = ref(0)
const rLoading = ref(false)

async function loadReports(resetPage = false) {
  if (resetPage) rPage.value = 1
  rLoading.value = true
  try {
    const res = await adminGetVoiceReports({
      status: rStatus.value === '' ? undefined : rStatus.value,
      page: rPage.value,
      size: PAGE_SIZE,
    })
    if (res.data.code === 200) {
      reports.value = res.data.data.records
      rTotal.value = res.data.data.total
    } else {
      toast.error(res.data.message || '加载失败')
    }
  } catch {
    toast.error('加载失败')
  } finally {
    rLoading.value = false
  }
}

async function handleReportOnly(r: AdminReport) {
  try {
    const res = await adminHandleVoiceReport(r.id)
    if (res.data.code === 200) {
      toast.success('已标记处理')
      await loadReports()
    } else {
      toast.error(res.data.message || '操作失败')
    }
  } catch {
    toast.error('操作失败')
  }
}

async function takedownAndHandle(r: AdminReport) {
  if (!confirm(`确认下架该${r.targetType === 1 ? '问题' : '回答'}并标记举报已处理？\n「${r.targetContent}」`)) return
  try {
    const takedown = r.targetType === 1
      ? await adminTakedownVoiceQuestion(r.targetId)
      : await adminTakedownVoiceAnswer(r.targetId)
    if (takedown.data.code !== 200) {
      toast.error(takedown.data.message || '下架失败')
      return
    }
    await adminHandleVoiceReport(r.id)
    toast.success('已下架并处理')
    await loadReports()
  } catch {
    toast.error('操作失败')
  }
}

function switchTab(next: Tab) {
  tab.value = next
  if (next === 'stats') loadStats()
  if (next === 'questions' && questions.value.length === 0) loadQuestions(true)
  if (next === 'answers' && answers.value.length === 0) loadAnswers(true)
  if (next === 'reports') loadReports(true)
}

function fmt(time: string) {
  return new Date(time).toLocaleString('zh-CN')
}

onMounted(loadStats)
</script>

<template>
  <div class="page-container">
    <PageHeader back-to="/" />

    <main class="page-content">
      <div class="content-container">
        <div class="page-title-row">
          <h1 class="page-title">跨代留声管理</h1>
          <router-link class="preview-link" to="/voices" target="_blank">查看活动页 →</router-link>
        </div>

        <div class="tabs">
          <button
            v-for="t in [
              { key: 'stats', label: '统计' },
              { key: 'questions', label: '问题管理' },
              { key: 'answers', label: '回答管理' },
              { key: 'reports', label: '举报处理' },
            ]"
            :key="t.key"
            class="tab"
            :class="{ 'tab--active': tab === t.key }"
            type="button"
            @click="switchTab(t.key as Tab)"
          >
            {{ t.label }}
          </button>
        </div>

        <!-- 统计 -->
        <section v-if="tab === 'stats'">
          <div v-if="stats" class="stats-grid">
            <div class="stat-card">
              <div class="stat-num">{{ stats.questionCount }}</div>
              <div class="stat-label">在线问题</div>
            </div>
            <div class="stat-card">
              <div class="stat-num">{{ stats.answerCount }}</div>
              <div class="stat-label">在线回答</div>
            </div>
            <div class="stat-card">
              <div class="stat-num">{{ stats.bindCount }}</div>
              <div class="stat-label">身份登记人数</div>
            </div>
            <div class="stat-card">
              <div class="stat-num">{{ stats.takedownQuestionCount }} / {{ stats.takedownAnswerCount }}</div>
              <div class="stat-label">已下架 问题/回答</div>
            </div>
            <div class="stat-card">
              <div class="stat-num" :class="{ 'stat-num--warn': stats.pendingReportCount > 0 }">{{ stats.pendingReportCount }}</div>
              <div class="stat-label">待处理举报</div>
            </div>
          </div>
          <div v-if="stats" class="identity-stats">
            <div v-for="id in [1, 2, 3, 4]" :key="id" class="identity-stat">
              {{ identityLabel(id) }}：<b>{{ stats.bindCountByIdentity?.[id] ?? 0 }}</b> 人
            </div>
          </div>
        </section>

        <!-- 问题管理 -->
        <section v-if="tab === 'questions'">
          <div class="filter-row">
            <select v-model="qStatus" class="filter-select" @change="loadQuestions(true)">
              <option value="">全部状态</option>
              <option :value="0">正常</option>
              <option :value="1">已下架</option>
            </select>
            <input
              v-model="qKeyword"
              class="filter-input"
              placeholder="搜索问题内容"
              @keydown.enter="loadQuestions(true)"
            />
            <button class="btn" type="button" @click="loadQuestions(true)">搜索</button>
            <span class="total-hint">共 {{ qTotal }} 条</span>
          </div>

          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th class="col-content">内容</th>
                  <th>提问人</th>
                  <th>投放给</th>
                  <th>回答数</th>
                  <th>状态</th>
                  <th>时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="q in questions" :key="q.id" :class="{ 'row-takedown': q.status !== 0 }">
                  <td>{{ q.id }}</td>
                  <td class="col-content">
                    <router-link :to="`/voices/question/${q.id}`" target="_blank">{{ q.content }}</router-link>
                  </td>
                  <td>{{ q.askerIdentityLabel }}（uid:{{ q.askerUserId }}）</td>
                  <td>{{ q.targetIdentities.map((t) => identityLabel(t)).join('、') }}</td>
                  <td>{{ q.answerCount }}</td>
                  <td>
                    <span :class="q.status === 0 ? 'status-ok' : 'status-down'">
                      {{ q.status === 0 ? '正常' : '已下架' }}
                    </span>
                  </td>
                  <td class="col-time">{{ fmt(q.createdAt) }}</td>
                  <td>
                    <button class="btn btn--sm" :class="{ 'btn--danger': q.status === 0 }" type="button" @click="toggleQuestion(q)">
                      {{ q.status === 0 ? '下架' : '恢复' }}
                    </button>
                  </td>
                </tr>
                <tr v-if="!qLoading && questions.length === 0">
                  <td colspan="8" class="empty-cell">暂无数据</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="pager">
            <button class="btn btn--sm" type="button" :disabled="qPage <= 1" @click="qPage--; loadQuestions()">上一页</button>
            <span>第 {{ qPage }} 页</span>
            <button class="btn btn--sm" type="button" :disabled="qPage * PAGE_SIZE >= qTotal" @click="qPage++; loadQuestions()">下一页</button>
          </div>
        </section>

        <!-- 回答管理 -->
        <section v-if="tab === 'answers'">
          <div class="filter-row">
            <select v-model="aStatus" class="filter-select" @change="loadAnswers(true)">
              <option value="">全部状态</option>
              <option :value="0">正常</option>
              <option :value="1">已下架</option>
            </select>
            <input
              v-model="aQuestionId"
              class="filter-input filter-input--narrow"
              placeholder="问题ID"
              @keydown.enter="loadAnswers(true)"
            />
            <input
              v-model="aKeyword"
              class="filter-input"
              placeholder="搜索回答内容"
              @keydown.enter="loadAnswers(true)"
            />
            <button class="btn" type="button" @click="loadAnswers(true)">搜索</button>
            <span class="total-hint">共 {{ aTotal }} 条</span>
          </div>

          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th class="col-content">回答内容</th>
                  <th class="col-content">所属问题</th>
                  <th>回答人</th>
                  <th>状态</th>
                  <th>时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="a in answers" :key="a.id" :class="{ 'row-takedown': a.status !== 0 }">
                  <td>{{ a.id }}</td>
                  <td class="col-content">{{ a.content }}</td>
                  <td class="col-content">
                    <router-link :to="`/voices/question/${a.questionId}`" target="_blank">{{ a.questionContent }}</router-link>
                  </td>
                  <td>{{ a.answererIdentityLabel }}（uid:{{ a.answererUserId }}）</td>
                  <td>
                    <span :class="a.status === 0 ? 'status-ok' : 'status-down'">
                      {{ a.status === 0 ? '正常' : '已下架' }}
                    </span>
                  </td>
                  <td class="col-time">{{ fmt(a.createdAt) }}</td>
                  <td>
                    <button class="btn btn--sm" :class="{ 'btn--danger': a.status === 0 }" type="button" @click="toggleAnswer(a)">
                      {{ a.status === 0 ? '下架' : '恢复' }}
                    </button>
                  </td>
                </tr>
                <tr v-if="!aLoading && answers.length === 0">
                  <td colspan="7" class="empty-cell">暂无数据</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="pager">
            <button class="btn btn--sm" type="button" :disabled="aPage <= 1" @click="aPage--; loadAnswers()">上一页</button>
            <span>第 {{ aPage }} 页</span>
            <button class="btn btn--sm" type="button" :disabled="aPage * PAGE_SIZE >= aTotal" @click="aPage++; loadAnswers()">下一页</button>
          </div>
        </section>

        <!-- 举报处理 -->
        <section v-if="tab === 'reports'">
          <div class="filter-row">
            <select v-model="rStatus" class="filter-select" @change="loadReports(true)">
              <option :value="0">待处理</option>
              <option :value="1">已处理</option>
              <option value="">全部</option>
            </select>
            <span class="total-hint">共 {{ rTotal }} 条</span>
          </div>

          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>类型</th>
                  <th class="col-content">被举报内容</th>
                  <th class="col-content">举报理由</th>
                  <th>对象状态</th>
                  <th>举报人</th>
                  <th>时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in reports" :key="r.id" :class="{ 'row-takedown': r.status === 1 }">
                  <td>{{ r.id }}</td>
                  <td>{{ r.targetType === 1 ? '问题' : '回答' }}</td>
                  <td class="col-content">
                    <router-link v-if="r.questionId" :to="`/voices/question/${r.questionId}`" target="_blank">{{ r.targetContent }}</router-link>
                    <template v-else>{{ r.targetContent }}</template>
                  </td>
                  <td class="col-content">{{ r.reason || '—' }}</td>
                  <td>
                    <span :class="r.targetStatus === 0 ? 'status-ok' : 'status-down'">
                      {{ r.targetStatus === 0 ? '正常' : r.targetStatus === 1 ? '已下架' : '已删除' }}
                    </span>
                  </td>
                  <td>uid:{{ r.reporterUserId }}</td>
                  <td class="col-time">{{ fmt(r.createdAt) }}</td>
                  <td>
                    <template v-if="r.status === 0">
                      <button
                        v-if="r.targetStatus === 0"
                        class="btn btn--sm btn--danger"
                        type="button"
                        @click="takedownAndHandle(r)"
                      >
                        下架并处理
                      </button>
                      <button class="btn btn--sm" type="button" @click="handleReportOnly(r)">
                        {{ r.targetStatus === 0 ? '忽略' : '标记已处理' }}
                      </button>
                    </template>
                    <span v-else class="status-ok">已处理</span>
                  </td>
                </tr>
                <tr v-if="!rLoading && reports.length === 0">
                  <td colspan="8" class="empty-cell">暂无举报</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="pager">
            <button class="btn btn--sm" type="button" :disabled="rPage <= 1" @click="rPage--; loadReports()">上一页</button>
            <span>第 {{ rPage }} 页</span>
            <button class="btn btn--sm" type="button" :disabled="rPage * PAGE_SIZE >= rTotal" @click="rPage++; loadReports()">下一页</button>
          </div>
        </section>
      </div>
    </main>

    <PageFooter />
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
}

.content-container {
  max-width: 1100px;
  margin: 0 auto;
}

.page-title-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: var(--spacing-md);
}

.page-title {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  margin: 0;
}

.preview-link {
  font-size: var(--text-sm);
  color: var(--color-primary);
  text-decoration: none;
}

.tabs {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-lg);
  border-bottom: 1px solid var(--color-border);
}

.tab {
  padding: 8px 18px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--text-base);
  cursor: pointer;
  border-bottom: 2px solid transparent;
}

.tab--active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
  font-weight: var(--font-semibold);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--spacing-md);
}

.stat-card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  text-align: center;
}

.stat-num {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--color-primary);
}

.stat-label {
  margin-top: 6px;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.stat-num--warn {
  color: var(--color-warning);
}

.identity-stats {
  display: flex;
  gap: var(--spacing-lg);
  flex-wrap: wrap;
  margin-top: var(--spacing-lg);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.identity-stat b {
  color: var(--color-text);
}

.filter-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
  margin-bottom: var(--spacing-md);
}

.filter-select,
.filter-input {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text);
  padding: 7px 10px;
  font-size: var(--text-sm);
}

.filter-input {
  min-width: 200px;
}

.filter-input--narrow {
  min-width: 90px;
  width: 90px;
}

.total-hint {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.btn {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text);
  padding: 7px 16px;
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn--sm {
  padding: 4px 12px;
  font-size: var(--text-xs);
}

.btn--danger {
  color: var(--color-error);
  border-color: var(--color-error);
}

.table-wrap {
  overflow-x: auto;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.data-table th,
.data-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
  vertical-align: top;
}

.data-table th {
  color: var(--color-text-secondary);
  font-weight: var(--font-medium);
  background: var(--color-bg);
}

.col-content {
  white-space: normal !important;
  min-width: 220px;
  max-width: 340px;
  word-break: break-word;
}

.col-content a {
  color: var(--color-text);
  text-decoration: none;
}

.col-content a:hover {
  color: var(--color-primary);
}

.col-time {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.row-takedown {
  opacity: 0.55;
}

.status-ok {
  color: var(--color-success);
}

.status-down {
  color: var(--color-error);
}

.empty-cell {
  text-align: center;
  color: var(--color-text-placeholder);
  padding: var(--spacing-xl) !important;
}

.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  margin-top: var(--spacing-md);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}
</style>
