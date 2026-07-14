<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import QRCode from 'qrcode'
import { useUserStore } from '@/stores/user'
import { useVxNotice } from './composables/useVxNotice'
import {
  createVoiceAnswer,
  getVoiceQuestionDetail,
  reportVoiceContent,
  toggleVoiceAnswerLike,
  toggleVoiceQuestionFavorite,
} from '@/api/voices'
import type { AxiosError } from 'axios'
import type { ApiResponse } from '@/api/index'
import {
  examTitle,
  identityLabel,
  type QuestionDetail,
  type ReportTargetType,
  type VoiceAnswerItem,
  type VoiceIdentity,
} from '@/types/voices'
import IdentityBindModal from './components/IdentityBindModal.vue'
import IdentityIcon from './components/IdentityIcon.vue'
import VxBackButton from './components/VxBackButton.vue'
import VxFooter from './components/VxFooter.vue'
import VxLoading from './components/VxLoading.vue'
import VxNoticeHost from './components/VxNoticeHost.vue'
import VxPen from './components/VxPen.vue'
import VxSealLine from './components/VxSealLine.vue'
import { useIsDesktop } from './composables/useIsDesktop'
import { useVoiceIdentity } from './composables/useVoiceIdentity'
import './voices-theme.css'

const MAX_LEN = 500
const MIN_LEN = 2

const route = useRoute()
const userStore = useUserStore()
const notice = useVxNotice()
const { identity: myIdentity, setIdentity } = useVoiceIdentity()
// 桌面端拆顶栏：悬浮返回（试卷本身即标题，不另设页内标题）
const isDesktop = useIsDesktop()

const questionId = Number(route.params.id)
const detail = ref<QuestionDetail | null>(null)
const loading = ref(true)
const loadError = ref<string | null>(null)

// 本题二维码（用当前域名生成，扫码直达）
const qrDataUrl = ref('')
QRCode.toDataURL(`${window.location.origin}/voices/question/${questionId}`, {
  margin: 0,
  width: 128,
  color: { dark: '#1a1611', light: '#fdfbf4' },
})
  .then((url) => (qrDataUrl.value = url))
  .catch(() => {
    /* 二维码生成失败不影响页面 */
  })

// ==================== 作答 ====================

const writing = ref(false)
const answerContent = ref('')
const submitting = ref(false)

// ---------- 草稿：按题保存 ----------
const DRAFT_KEY = `vx-draft-answer-${questionId}`
try {
  answerContent.value = localStorage.getItem(DRAFT_KEY) ?? ''
} catch {
  /* ignore */
}
watch(answerContent, (v) => {
  if (v.trim()) localStorage.setItem(DRAFT_KEY, v)
  else localStorage.removeItem(DRAFT_KEY)
})

const answerLen = computed(() => answerContent.value.trim().length)
const canSubmit = computed(
  () => !submitting.value && answerLen.value >= MIN_LEN && answerLen.value <= MAX_LEN
)

// ==================== 只看 / 排序 ====================

const viewIdentity = ref(0) // 0 = 所有都看
const showViewModal = ref(false)
const answerSort = ref<'latest' | 'hot' | 'random'>('latest')
// 随机排序时固定一次乱序结果，避免每次渲染重排
const randomOrder = ref<Map<number, number>>(new Map())

const SORT_LABELS = { latest: '最新', hot: '最热', random: '随机' } as const

const viewLabel = computed(() =>
  viewIdentity.value === 0 ? '全部' : identityLabel(viewIdentity.value)
)

function cycleSort() {
  const order: Array<'latest' | 'hot' | 'random'> = ['latest', 'hot', 'random']
  const next = order[(order.indexOf(answerSort.value) + 1) % order.length] ?? 'latest'
  answerSort.value = next
  if (next === 'random') reshuffle()
}

/** 刷新：回到随机排序并重抽一次乱序（与答题大厅的刷新按钮逻辑一致） */
function refreshRandom() {
  if (answerSort.value !== 'random') answerSort.value = 'random'
  reshuffle()
}

function reshuffle() {
  const ids = (detail.value?.answers ?? []).map((a) => a.id)
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = ids[i] as number
    ids[i] = ids[j] as number
    ids[j] = tmp
  }
  randomOrder.value = new Map(ids.map((id, idx) => [id, idx]))
}

const displayAnswers = computed<VoiceAnswerItem[]>(() => {
  let list = [...(detail.value?.answers ?? [])]
  if (viewIdentity.value !== 0) {
    list = list.filter((a) => a.answererIdentity === viewIdentity.value)
  }
  if (answerSort.value === 'latest') {
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  } else if (answerSort.value === 'hot') {
    list.sort((a, b) => b.likeCount - a.likeCount || a.id - b.id)
  } else {
    // 不在乱序表里的（如刚乐观插入的）排最前
    list.sort(
      (a, b) => (randomOrder.value.get(a.id) ?? -1) - (randomOrder.value.get(b.id) ?? -1)
    )
  }
  // 我的回答不论怎么排序都置顶
  return [...list.filter((a) => a.mine), ...list.filter((a) => !a.mine)]
})

// ==================== 加载 ====================

async function load() {
  loading.value = true
  loadError.value = null
  try {
    const res = await getVoiceQuestionDetail(questionId)
    if (res.data.code === 200) {
      detail.value = res.data.data
      // 重新拉取后，同步基线重置为服务端最新状态
      likeSyncMap.clear()
      favSync.serverFavorited = res.data.data.favoritedByMe
      favSync.initialized = true
    } else {
      loadError.value = res.data.message || '加载失败'
    }
  } catch (e) {
    const err = e as AxiosError<ApiResponse>
    loadError.value = err.response?.data?.message || '问题不存在或已下架'
  } finally {
    loading.value = false
  }
}

onMounted(load)

// ==================== 提交（乐观更新） ====================

async function submit() {
  if (!canSubmit.value || !detail.value) return
  const contentVal = answerContent.value.trim()
  const d = detail.value

  // 乐观插入到第一位，先收起作答区
  const optimistic: VoiceAnswerItem = {
    id: -Date.now(),
    content: contentVal,
    answererIdentity: (myIdentity.value ?? 1),
    answererIdentityLabel: identityLabel(myIdentity.value),
    createdAt: new Date().toISOString(),
    mine: true,
    likeCount: 0,
    likedByMe: false,
  }
  const prevState = {
    canAnswer: d.canAnswer,
    reason: d.cannotAnswerReason,
    answeredByMe: d.answeredByMe,
  }
  d.answers.unshift(optimistic)
  d.answerCount += 1
  d.canAnswer = false
  d.cannotAnswerReason = '你已经交过卷了'
  d.answeredByMe = true
  writing.value = false
  answerContent.value = ''
  localStorage.removeItem(DRAFT_KEY)
  answerSort.value = 'latest'

  submitting.value = true
  try {
    const res = await createVoiceAnswer(questionId, contentVal)
    if (res.data.code === 200) {
      // 用服务端返回替换乐观条目（拿到真实 id）
      const idx = d.answers.findIndex((a) => a.id === optimistic.id)
      if (idx >= 0) d.answers[idx] = res.data.data
      notice.success('答卷已交')
    } else {
      revertOptimistic(optimistic, prevState, contentVal)
      notice.error(res.data.message || '交卷失败')
    }
  } catch (e) {
    const err = e as AxiosError<ApiResponse>
    revertOptimistic(optimistic, prevState, contentVal)
    notice.error(err.response?.data?.message || '网络错误，答卷已帮你留在草稿里')
  } finally {
    submitting.value = false
  }
}

function revertOptimistic(
  optimistic: VoiceAnswerItem,
  prev: { canAnswer: boolean; reason: string | null; answeredByMe: boolean },
  contentVal: string
) {
  const d = detail.value
  if (!d) return
  d.answers = d.answers.filter((a) => a.id !== optimistic.id)
  d.answerCount = Math.max(0, d.answerCount - 1)
  d.canAnswer = prev.canAnswer
  d.cannotAnswerReason = prev.reason
  d.answeredByMe = prev.answeredByMe
  // 内容放回草稿并重新展开作答区，方便重试
  answerContent.value = contentVal
  writing.value = true
}

// ==================== 点赞（乐观更新，抗疯狂连点） ====================
// 本地状态即"意图"，点击只翻转本地、永不等待；
// 后台串行同步：服务端是 toggle 语义，循环调用直到服务端状态追平本地意图，
// 期间新的点击只改本地意图，循环会自然继续追，绝不会用旧响应覆盖本地。

interface LikeSync {
  inFlight: boolean
  serverLiked: boolean
  serverCount: number
}

const likeSyncMap = new Map<number, LikeSync>()

function ensureLikeSync(a: VoiceAnswerItem): LikeSync {
  let s = likeSyncMap.get(a.id)
  if (!s) {
    s = { inFlight: false, serverLiked: a.likedByMe, serverCount: a.likeCount }
    likeSyncMap.set(a.id, s)
  }
  return s
}

function toggleLike(a: VoiceAnswerItem) {
  if (!userStore.isLoggedIn) {
    userStore.openLoginModal()
    return
  }
  if (a.id < 0) return // 乐观条目尚未落库

  const s = ensureLikeSync(a)
  // 本地立即翻转，计数本地推算，不等任何响应
  a.likedByMe = !a.likedByMe
  a.likeCount = s.serverCount + (a.likedByMe === s.serverLiked ? 0 : a.likedByMe ? 1 : -1)
  syncLike(a, s)
}

async function syncLike(a: VoiceAnswerItem, s: LikeSync) {
  if (s.inFlight) return
  s.inFlight = true
  try {
    while (s.serverLiked !== a.likedByMe) {
      const res = await toggleVoiceAnswerLike(a.id)
      if (res.data.code === 200) {
        s.serverLiked = res.data.data.liked
        s.serverCount = res.data.data.likeCount
      } else {
        // 服务端拒绝：本地回退到服务端状态
        a.likedByMe = s.serverLiked
        a.likeCount = s.serverCount
        notice.error(res.data.message || '操作失败')
        return
      }
    }
    // 已追平意图，用服务端计数校准
    a.likeCount = s.serverCount
  } catch {
    a.likedByMe = s.serverLiked
    a.likeCount = s.serverCount
    notice.error('网络错误，请稍后再试')
  } finally {
    s.inFlight = false
    // 循环退出后若用户又点了，补追一次
    if (s.serverLiked !== a.likedByMe) syncLike(a, s)
  }
}

// ==================== 收藏（同款抗连点乐观更新） ====================

const favSync = { inFlight: false, serverFavorited: false, initialized: false }

function toggleFavorite() {
  if (!detail.value) return
  if (!userStore.isLoggedIn) {
    userStore.openLoginModal()
    return
  }
  if (!favSync.initialized) {
    favSync.serverFavorited = detail.value.favoritedByMe
    favSync.initialized = true
  }
  detail.value.favoritedByMe = !detail.value.favoritedByMe
  syncFavorite()
}

async function syncFavorite() {
  if (favSync.inFlight || !detail.value) return
  favSync.inFlight = true
  try {
    while (detail.value && favSync.serverFavorited !== detail.value.favoritedByMe) {
      const res = await toggleVoiceQuestionFavorite(questionId)
      if (res.data.code === 200) {
        favSync.serverFavorited = res.data.data.favorited
      } else {
        detail.value.favoritedByMe = favSync.serverFavorited
        notice.error(res.data.message || '操作失败')
        return
      }
    }
  } catch {
    if (detail.value) detail.value.favoritedByMe = favSync.serverFavorited
    notice.error('网络错误，请稍后再试')
  } finally {
    favSync.inFlight = false
    if (detail.value && favSync.serverFavorited !== detail.value.favoritedByMe) syncFavorite()
  }
}

// ==================== 举报 ====================

const REPORT_MAX_LEN = 200
const reportTarget = ref<{ type: ReportTargetType; id: number; summary: string } | null>(null)
const reportReason = ref('')
const reportSubmitting = ref(false)

function openReport(type: ReportTargetType, id: number, summary: string) {
  if (!userStore.isLoggedIn) {
    userStore.openLoginModal()
    return
  }
  if (id < 0) return // 乐观条目尚未落库
  reportReason.value = ''
  reportTarget.value = { type, id, summary }
}

async function submitReport() {
  if (!reportTarget.value || reportSubmitting.value) return
  if (reportReason.value.trim().length > REPORT_MAX_LEN) {
    notice.error(`举报理由最多 ${REPORT_MAX_LEN} 字`)
    return
  }
  reportSubmitting.value = true
  try {
    const res = await reportVoiceContent(
      reportTarget.value.type,
      reportTarget.value.id,
      reportReason.value.trim() || undefined
    )
    if (res.data.code === 200) {
      notice.success('已收到举报，我们会尽快处理')
      reportTarget.value = null
    } else {
      notice.error(res.data.message || '举报失败')
    }
  } catch (e) {
    const err = e as AxiosError<ApiResponse>
    notice.error(err.response?.data?.message || '网络错误，请稍后再试')
  } finally {
    reportSubmitting.value = false
  }
}

// ==================== 登记身份弹窗 ====================

const showBindModal = ref(false)

function onBound(identity: VoiceIdentity) {
  setIdentity(identity)
  showBindModal.value = false
  load() // 重新拉详情，刷新可否作答
}
</script>

<template>
  <div class="vx-page">
    <header v-if="!isDesktop" class="vx-topbar vx-topbar--center">
      <VxBackButton />
      <span class="vx-topbar-title">试题详情</span>
    </header>
    <VxBackButton v-else class="vx-desk-back" />

    <main class="vx-container detail-container">
      <VxLoading v-if="loading" text="调卷中…" />

      <div v-else-if="loadError" class="vx-paper-card vx-paper-card--plain detail-error">
        <p class="vx-kaiti">{{ loadError }}</p>
        <router-link class="vx-btn vx-btn--sm" to="/voices/answer">回答题大厅</router-link>
      </div>

      <div v-else-if="detail" class="vx-paper-card detail-paper">
        <VxSealLine />

        <div class="vx-exam-head">
          <h3><IdentityIcon :identity="detail.askerIdentity" :size="17" />{{ examTitle(detail.askerIdentity) }}</h3>
          <button class="report-stamp" type="button" @click="openReport(1, detail.id, detail.content)">
            举报
          </button>
        </div>

        <div class="vx-question-text detail-q">{{ detail.content }}</div>

        <div class="detail-meta">
          <div class="detail-by">
            <span>
              出题人：<b :class="`vx-id-${detail.askerIdentity}`">
                <IdentityIcon :identity="detail.askerIdentity" :size="16" />一位匿名的{{ detail.askerIdentityLabel }}
              </b>
            </span>
            <span class="detail-targets">
              投放给：<span v-for="t in detail.targetIdentities" :key="t" class="vx-target-chip" style="margin-right: 4px">{{ identityLabel(t) }}卷</span>
            </span>
          </div>

          <div class="detail-side">
            <img v-if="qrDataUrl" :src="qrDataUrl" class="detail-qr" alt="扫码打开这道题" />
            <span class="detail-qr-tip">扫码看题</span>
            <button
              class="fav-btn"
              :class="{ 'fav-btn--on': detail.favoritedByMe }"
              type="button"
              :aria-label="detail.favoritedByMe ? '取消收藏' : '收藏'"
              @click="toggleFavorite"
            >
              <span class="fav-seal">藏</span>
              <span class="fav-label">{{ detail.favoritedByMe ? '已收藏' : '收藏' }}</span>
            </button>
          </div>
        </div>

        <!-- 答题区 -->
        <div class="vx-answer-sheet">
          <!-- 答卷模式下隐藏标题与筛选工具 -->
          <div v-show="!writing" class="sheet-head">
            <div class="vx-sheet-label" style="margin: 0">答 题 区</div>
            <div v-if="detail.answers.length > 0" class="sheet-tools">
              <button class="sheet-tool" type="button" @click="showViewModal = true">
                只看：{{ viewLabel }}
              </button>
              <button class="sheet-tool" type="button" @click="cycleSort">
                排序：{{ SORT_LABELS[answerSort] }}
              </button>
              <button
                class="sheet-tool sheet-tool--icon"
                type="button"
                title="换一换"
                aria-label="换一换"
                @click="refreshRandom"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M21 12 a9 9 0 1 1 -2.64 -6.36" />
                  <path d="M21 3 v5 h-5" />
                </svg>
              </button>
            </div>
          </div>

          <!-- 作答入口 / 作答区 -->
          <template v-if="detail.canAnswer">
            <Transition name="write-swap" mode="out-in">
              <button v-if="!writing" key="cta" class="answer-cta" type="button" @click="writing = true">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M4 20 l1.2 -4.2 L16.6 4.4 a2 2 0 0 1 2.8 0 l0.2 0.2 a2 2 0 0 1 0 2.8 L8.2 18.8 Z" />
                  <path d="M14.5 6.5 l3 3" />
                </svg>
                点我回答这个问题
              </button>

              <div v-else key="form" class="detail-write">
                <div class="vx-field-label" style="margin-top: 4px">我 来 作 答</div>
                <textarea
                  v-model="answerContent"
                  class="vx-textarea"
                  :maxlength="MAX_LEN + 20"
                  rows="4"
                  placeholder="写下你的回答…"
                ></textarea>
                <div class="vx-char-count" :class="{ 'vx-char-count--over': answerLen > MAX_LEN }">
                  {{ answerLen }} / {{ MAX_LEN }}
                </div>
                <div class="write-actions">
                  <button class="vx-btn vx-btn--red" type="button" :disabled="!canSubmit" @click="submit">
                    <template v-if="submitting"><VxPen /> 交卷中…</template>
                    <template v-else>交 卷</template>
                  </button>
                  <button class="write-cancel" type="button" @click="writing = false">
                    我不想回答了
                  </button>
                </div>
              </div>
            </Transition>
          </template>

          <!-- 不可作答的原因 -->
          <div v-else-if="detail.cannotAnswerReason" class="vx-notice detail-reason">
            {{ detail.cannotAnswerReason }}
            <button
              v-if="!userStore.isLoggedIn"
              class="vx-btn vx-btn--sm"
              style="margin-left: 10px"
              type="button"
              @click="userStore.openLoginModal()"
            >
              登录
            </button>
            <button
              v-else-if="detail.cannotAnswerReason.includes('绑定身份')"
              class="vx-btn vx-btn--sm"
              style="margin-left: 10px"
              type="button"
              @click="showBindModal = true"
            >
              去登记身份
            </button>
          </div>

          <!-- 回答列表：写作时折叠收起 -->
          <div class="answers-collapse" :class="{ 'answers-collapse--closed': writing }">
            <div class="answers-inner">
              <div v-if="detail.answers.length === 0" class="vx-empty detail-noanswer">
                还没有人交卷，第一份答卷等你来写
              </div>
              <div v-else-if="displayAnswers.length === 0" class="vx-empty detail-noanswer">
                没有「{{ viewLabel }}」的答卷，换个身份看看
              </div>

              <TransitionGroup name="ans" tag="div" class="answers-list">
                <div v-for="a in displayAnswers" :key="a.id" class="vx-answer-item">
                <span class="vx-answer-who" :class="`vx-id-${a.answererIdentity}`">
                  <IdentityIcon :identity="a.answererIdentity" :size="15" />{{ a.answererIdentityLabel }}<template v-if="a.mine">（我）</template> 答：
                </span>
                <button
                  class="like-btn"
                  :class="{ 'like-btn--on': a.likedByMe }"
                  type="button"
                  :aria-label="a.likedByMe ? '取消点赞' : '点赞'"
                  @click="toggleLike(a)"
                >
                  <span class="like-seal">赞</span>
                  <span v-if="a.likeCount > 0" class="like-count">{{ a.likeCount }}</span>
                </button>
                <button
                  v-if="!a.mine"
                  class="report-btn report-btn--inline"
                  type="button"
                  @click="openReport(2, a.id, a.content)"
                >
                  举报
                </button>
                <div class="vx-answer-text vx-ruled">{{ a.content }}</div>
                </div>
              </TransitionGroup>
            </div>
          </div>
        </div>
      </div>

      <VxFooter />
    </main>

    <Transition name="vx-modal">
      <IdentityBindModal v-if="showBindModal" @bound="onBound" @close="showBindModal = false" />
    </Transition>

    <!-- 举报弹窗 -->
    <Transition name="vx-modal">
      <div v-if="reportTarget" class="vx-modal-mask" @click.self="reportTarget = null">
        <div class="vx-modal report-modal">
          <div class="vx-exam-head">
            <h3>举报{{ reportTarget.type === 1 ? '这道题' : '这份答卷' }}</h3>
          </div>
          <p class="report-quote vx-kaiti">「{{ reportTarget.summary.length > 60 ? reportTarget.summary.slice(0, 60) + '…' : reportTarget.summary }}」</p>
          <div class="vx-field-label">理 由（选填）</div>
          <textarea
            v-model="reportReason"
            class="vx-textarea"
            rows="3"
            :maxlength="REPORT_MAX_LEN + 20"
            placeholder="说说哪里不合适…"
          ></textarea>
          <div class="vx-char-count" :class="{ 'vx-char-count--over': reportReason.trim().length > REPORT_MAX_LEN }">
            {{ reportReason.trim().length }} / {{ REPORT_MAX_LEN }}
          </div>
          <div class="report-actions">
            <button class="vx-btn vx-btn--sm" type="button" @click="reportTarget = null">取消</button>
            <button class="vx-btn vx-btn--red vx-btn--sm" type="button" :disabled="reportSubmitting" @click="submitReport">
              <template v-if="reportSubmitting"><VxPen /> 提交中…</template>
              <template v-else>提交举报</template>
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 只看弹窗 -->
    <Transition name="vx-modal">
      <div v-if="showViewModal && detail" class="vx-modal-mask" @click.self="showViewModal = false">
        <div class="vx-modal view-modal">
          <div class="vx-exam-head">
            <h3>只看谁的答卷</h3>
          </div>
          <div class="view-options">
            <button
              class="view-option"
              :class="{ 'view-option--active': viewIdentity === 0 }"
              type="button"
              @click="viewIdentity = 0; showViewModal = false"
            >
              所有都看
            </button>
            <button
              v-for="t in detail.targetIdentities"
              :key="t"
              class="view-option"
              :class="{ 'view-option--active': viewIdentity === t }"
              type="button"
              @click="viewIdentity = t; showViewModal = false"
            >
              <IdentityIcon :identity="t" :size="16" />{{ identityLabel(t) }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <VxNoticeHost />
  </div>
</template>

<style scoped>
.detail-container {
  max-width: 680px;
}

.detail-paper {
  margin-top: 24px;
  padding-top: 24px;
  padding-bottom: 24px;
}

.detail-q {
  font-size: 21px;
  margin: 6px 0 10px;
}

.detail-meta {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 14px;
  margin-bottom: 16px;
}

.detail-by {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
  color: var(--vx-ink-faint);
}

.detail-by b {
  font-size: 14px;
}

/* ---------- 右侧：二维码 + 收藏 ---------- */
.detail-side {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.detail-qr {
  width: 64px;
  height: 64px;
  border: 1px solid var(--vx-line);
  background: var(--vx-paper);
  padding: 3px;
  image-rendering: pixelated;
}

.detail-qr-tip {
  font-size: 10px;
  letter-spacing: 2px;
  color: var(--vx-ink-faint);
}

/* ---------- 收藏 ---------- */
.fav-btn {
  margin-top: 4px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: none;
  border: none;
  padding: 0 2px;
  cursor: pointer;
  color: #b4ac94;
  transition: color 0.15s ease;
}

.fav-btn:hover {
  color: var(--vx-red);
}

.fav-seal {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1.5px dashed currentColor;
  font-family: var(--vx-serif);
  font-size: 11px;
  transform: rotate(-8deg);
}

.fav-label {
  font-family: var(--vx-serif);
  font-size: 12px;
  /* 固定为「已收藏」三字宽度，切换状态时按钮不变宽，二维码不动 */
  min-width: 3em;
  text-align: center;
}

.fav-btn--on {
  color: var(--vx-red);
}

.fav-btn--on .fav-seal {
  border-style: solid;
  font-weight: 700;
  animation: like-stamp 0.36s cubic-bezier(0.2, 1.6, 0.4, 1);
}

/* ---------- 举报 ---------- */
/* 卷头右上角的举报章（原「全国卷」位置） */
.report-stamp {
  font-family: var(--vx-serif);
  font-size: 12px;
  color: var(--vx-ink-faint);
  border: 1.5px dashed var(--vx-line-dash);
  border-radius: 3px;
  padding: 1px 7px;
  transform: rotate(6deg);
  background: none;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.15s ease, border-color 0.15s ease;
}

.report-stamp:hover {
  color: var(--vx-red);
  border-color: var(--vx-red);
  border-style: solid;
}

.report-btn--inline {
  float: right;
  margin-right: 10px;
  padding-top: 4px;
  background: none;
  border: none;
  font-family: var(--vx-serif);
  font-size: 11px;
  color: #b4ac94;
  cursor: pointer;
  transition: color 0.15s ease;
}

.report-btn--inline:hover {
  color: var(--vx-red);
}

.report-modal {
  max-width: 380px;
}

.report-quote {
  font-size: 14px;
  color: var(--vx-ink-soft);
  margin: 0 0 4px;
  word-break: break-word;
}

.report-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
}

/* ---------- 答题区头部工具 ---------- */
.vx-answer-sheet {
  perspective: 900px;
}

.sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin: 8px 0 10px;
}

.sheet-tools {
  display: flex;
  gap: 8px;
}

.sheet-tool {
  font-family: var(--vx-serif);
  font-size: 12px;
  letter-spacing: 0.5px;
  padding: 3px 10px;
  border: 1px solid var(--vx-line-dash);
  background: var(--vx-paper);
  color: var(--vx-ink-faint);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.sheet-tool:hover {
  color: var(--vx-red);
  border-color: var(--vx-red);
}

.sheet-tool--icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 3px 6px;
}

/* ---------- 作答入口 ---------- */
.answer-cta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  width: 100%;
  font-family: var(--vx-serif);
  font-size: 14px;
  letter-spacing: 2px;
  color: var(--vx-red);
  border: 1px dashed rgba(192, 57, 43, 0.45);
  background: rgba(192, 57, 43, 0.04);
  padding: 11px 14px;
  cursor: pointer;
  transition: all 0.15s ease;
  margin-bottom: 10px;
}

.answer-cta:hover {
  border-style: solid;
  background: rgba(192, 57, 43, 0.08);
}

.detail-write {
  margin-bottom: 10px;
}

.write-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
}

.write-cancel {
  font-family: var(--vx-serif);
  font-size: 13px;
  color: var(--vx-ink-faint);
  background: none;
  border: none;
  border-bottom: 1px dashed var(--vx-line-dash);
  padding: 2px 2px 3px;
  cursor: pointer;
  transition: color 0.15s ease;
}

.write-cancel:hover {
  color: var(--vx-red);
  border-bottom-color: var(--vx-red);
}

/* CTA <-> 作答区 的翻折切换 */
.write-swap-enter-active {
  transition: transform 0.3s ease-out, opacity 0.26s ease-out;
  transform-origin: 50% 0;
}

.write-swap-leave-active {
  transition: transform 0.22s ease-in, opacity 0.2s ease-in;
  transform-origin: 50% 0;
}

.write-swap-enter-from {
  transform: rotateX(58deg);
  opacity: 0;
}

.write-swap-leave-to {
  transform: rotateX(-50deg);
  opacity: 0;
}

/* ---------- 回答列表折叠 ---------- */
.answers-collapse {
  display: grid;
  grid-template-rows: 1fr;
  transition: grid-template-rows 0.38s ease, opacity 0.3s ease;
}

.answers-collapse--closed {
  grid-template-rows: 0fr;
  opacity: 0;
}

.answers-inner {
  overflow: hidden;
  min-height: 0;
}

/* 排序/刷新/筛选变化时，每份答卷平滑滑到新位置（FLIP） */
.answers-list {
  position: relative;
}

.ans-move,
.ans-enter-active,
.ans-leave-active {
  transition: transform 0.45s cubic-bezier(0.25, 0.8, 0.3, 1), opacity 0.3s ease;
}

.ans-enter-from,
.ans-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

/* 离场项脱离文档流，让留下的项立即开始移动 */
.ans-leave-active {
  position: absolute;
  left: 0;
  right: 0;
}

.detail-noanswer {
  padding: 28px 8px;
}

.detail-reason {
  margin-top: 4px;
  margin-bottom: 10px;
}

/* ---------- 点赞 ---------- */
.like-btn {
  float: right;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: none;
  border: none;
  padding: 0 2px;
  cursor: pointer;
  color: #b4ac94;
  transition: color 0.15s ease;
}

.like-btn:hover {
  color: var(--vx-red);
}

.like-seal {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1.5px dashed currentColor;
  font-family: var(--vx-serif);
  font-size: 11px;
  transform: rotate(8deg);
}

.like-count {
  font-family: var(--vx-serif);
  font-size: 13px;
}

.like-btn--on {
  color: var(--vx-red);
}

.like-btn--on .like-seal {
  border-style: solid;
  font-weight: 700;
  animation: like-stamp 0.36s cubic-bezier(0.2, 1.6, 0.4, 1);
}

@keyframes like-stamp {
  0% {
    transform: rotate(8deg) scale(1.7);
    opacity: 0.4;
  }
  60% {
    transform: rotate(4deg) scale(0.92);
    opacity: 1;
  }
  100% {
    transform: rotate(8deg) scale(1);
  }
}

/* ---------- 只看弹窗 ---------- */
.view-modal {
  max-width: 340px;
}

.view-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.view-option {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-family: var(--vx-kaiti);
  font-size: 17px;
  font-weight: 700;
  color: var(--vx-ink);
  padding: 10px 8px;
  background: var(--vx-paper-dim);
  border: 1.5px dashed var(--vx-line-dash);
  cursor: pointer;
  transition: all 0.15s ease;
}

.view-option--active {
  border: 1.5px solid var(--vx-red);
  color: var(--vx-red);
  background: var(--vx-paper);
}

.detail-error {
  margin-top: 40px;
  text-align: center;
  padding: 40px 20px;
}

.detail-error p {
  font-size: 18px;
  margin: 0 0 18px;
}

@media (max-width: 560px) {
  .detail-paper {
    margin-top: 8px;
  }

  .detail-q {
    font-size: 19px;
  }
}

/* ---------- 桌面端（≥920px） ---------- */
@media (min-width: 920px) {
  .detail-container {
    max-width: 760px;
  }

  .detail-paper {
    margin-top: 12px;
  }
}
</style>
