<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { getVoicesStatus, getVoiceWall } from '@/api/voices'
import {
  examTitle,
  identityLabel,
  type QuestionCard,
  type VoiceIdentity,
  type VoicesStatus,
} from '@/types/voices'
import IdentityBindModal from './components/IdentityBindModal.vue'
import IdentityIcon from './components/IdentityIcon.vue'
import VxBackButton from './components/VxBackButton.vue'
import VxFooter from './components/VxFooter.vue'
import VxNoticeHost from './components/VxNoticeHost.vue'
import VxSealLine from './components/VxSealLine.vue'
import { useIsDesktop } from './composables/useIsDesktop'
import { usePageScrollLock } from './composables/usePageScrollLock'
import { useVoiceIdentity } from './composables/useVoiceIdentity'
import './voices-theme.css'

const router = useRouter()
const userStore = useUserStore()
// 身份走本地缓存：渲染和入口判断即时可用，接口返回后静默同步
const { identity: myIdentity, setIdentity, syncFromServer } = useVoiceIdentity()

// 桌面端拆掉顶栏、右侧加考题速览面板；移动端保持原布局
const isDesktop = useIsDesktop()

const status = ref<VoicesStatus | null>(null)
const statusLoaded = ref(false)
const showBindModal = ref(false)
// 绑定成功后要去的页面
const pendingRoute = ref<string | null>(null)
// 无缓存且状态未返回时点了入口：等状态返回后自动继续
const pendingEnter = ref<string | null>(null)

// 参与人数常显：先用上次缓存的值渲染，避免接口返回时跳变
const PARTICIPANT_CACHE_KEY = 'vx-participant-count'
const participantCount = ref<string>(sessionStorage.getItem(PARTICIPANT_CACHE_KEY) ?? '--')

async function loadStatus() {
  try {
    const res = await getVoicesStatus()
    if (res.data.code === 200) {
      status.value = res.data.data
      participantCount.value = String(res.data.data.participantCount)
      sessionStorage.setItem(PARTICIPANT_CACHE_KEY, participantCount.value)
      if (userStore.isLoggedIn) syncFromServer(res.data.data.myIdentity)
    }
  } catch {
    // 静默失败，页面仍可展示
  } finally {
    statusLoaded.value = true
    if (pendingEnter.value) {
      const path = pendingEnter.value
      pendingEnter.value = null
      enter(path)
    }
  }
}

/**
 * 进入出卷/答卷页：未登录先登录，未绑定身份先登记
 */
function enter(path: string) {
  if (!userStore.isLoggedIn) {
    userStore.openLoginModal()
    return
  }
  if (myIdentity.value) {
    router.push(path)
    return
  }
  if (!statusLoaded.value) {
    // 本地无缓存且服务端状态未返回，等一下再决定，避免误弹登记表
    pendingEnter.value = path
    return
  }
  pendingRoute.value = path
  showBindModal.value = true
}

function onBound(identity: VoiceIdentity) {
  setIdentity(identity)
  if (status.value) {
    status.value.myIdentity = identity
    status.value.myIdentityLabel = identityLabel(identity)
  }
  showBindModal.value = false
  if (pendingRoute.value) {
    router.push(pendingRoute.value)
    pendingRoute.value = null
  }
}

// ==================== 桌面端：考题速览 ====================

const previewQuestions = ref<QuestionCard[]>([])
const previewLoaded = ref(false)
let previewRequested = false

async function loadPreview() {
  if (previewRequested) return
  previewRequested = true
  try {
    const res = await getVoiceWall({ scope: 'all', sort: 'latest', page: 1, size: 12 })
    if (res.data.code === 200) previewQuestions.value = res.data.data.records
  } catch {
    // 静默失败：面板显示空态即可
  } finally {
    previewLoaded.value = true
  }
}

watch(isDesktop, (v) => v && loadPreview(), { immediate: true })

// 活动首页为单屏页面：锁定整页滚动（含移动端回弹）
usePageScrollLock()

onMounted(loadStatus)
</script>

<template>
  <div class="vx-page vx-page--lock">
    <!-- 移动端：保留顶栏；桌面端：拆掉顶栏，悬浮回主站按钮 -->
    <header v-if="!isDesktop" class="vx-topbar vx-topbar--center">
      <VxBackButton to="/" home />
      <span class="vx-topbar-title">跨代留声</span>
    </header>
    <VxBackButton v-else to="/" home class="vx-desk-back" />

    <main class="vx-container home-container">
      <div class="home-grid">
        <div class="home-left">
          <!-- 卷首语 -->
          <section class="hero">
            <h1 class="hero-title">跨代留声</h1>
            <p class="hero-sub vx-kaiti">
              初中生的大问题、高中生的中问题、大学生的小问题、社会人的老问题——<br />
              把你的问题投给另一代人，匿名出卷，匿名作答。
            </p>
            <div class="hero-stats">
              已有 <b>{{ participantCount }}</b> 人参与活动
            </div>
          </section>

          <!-- 考生身份 -->
          <div class="identity-line">
            <template v-if="userStore.isLoggedIn && myIdentity">
              <span class="vx-kaiti">考生身份：</span>
              <b class="vx-kaiti" :class="`vx-id-${myIdentity}`">
                <IdentityIcon :identity="myIdentity" :size="20" />{{ identityLabel(myIdentity) }}
              </b>
              <button
                class="archive-btn"
                type="button"
                @click="router.push('/voices/mine')"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M4 8 a2 2 0 0 1 2 -2 h4 l2 2 h6 a2 2 0 0 1 2 2 v8 a2 2 0 0 1 -2 2 H6 a2 2 0 0 1 -2 -2 Z" />
                </svg>
                <span>档案袋</span>
              </button>
            </template>
            <!-- 已登录但无缓存且状态未返回：占位防跳变 -->
            <template v-else-if="userStore.isLoggedIn && !statusLoaded">
              <span class="vx-kaiti identity-placeholder">考生身份核对中…</span>
            </template>
            <template v-else-if="userStore.isLoggedIn">
              <span class="vx-kaiti">尚未登记考生身份</span>
              <button class="vx-btn vx-btn--red vx-btn--sm" type="button" @click="showBindModal = true">
                填写登记表
              </button>
            </template>
            <template v-else>
              <span class="vx-kaiti">登录后即可出卷、答卷</span>
              <button class="vx-btn vx-btn--sm" type="button" @click="userStore.openLoginModal()">
                登录
              </button>
            </template>
          </div>

          <!-- 两个入口 -->
          <section class="entries">
            <div class="vx-paper-card entry-card" role="button" tabindex="0" @click="enter('/voices/ask')" @keydown.enter="enter('/voices/ask')">
              <VxSealLine />
              <div class="vx-exam-head">
                <h3>我要出卷</h3>
                <span class="vx-stamp">提问</span>
              </div>
              <p class="entry-desc vx-kaiti">写下你想问另一代人的问题，选好投放对象，等他们来答。</p>
              <div class="entry-foot">去出题 →</div>
            </div>

            <div class="vx-paper-card entry-card" role="button" tabindex="0" @click="router.push('/voices/answer')" @keydown.enter="router.push('/voices/answer')">
              <VxSealLine />
              <div class="vx-exam-head">
                <h3>我要答卷</h3>
                <span class="vx-stamp">回答</span>
              </div>
              <p class="entry-desc vx-kaiti">看看另一代人给你出了什么题，选题作答。</p>
              <div class="entry-foot">进入答题大厅 →</div>
            </div>
          </section>
        </div>

        <!-- 桌面端：考题速览面板（面板内滚动，页面不滚动） -->
        <aside v-if="isDesktop" class="home-right vx-paper-card">
          <VxSealLine />
          <div class="vx-exam-head panel-head">
            <h3>考题速览</h3>
            <router-link class="panel-link" to="/voices/answer">进入答题大厅 →</router-link>
          </div>
          <div class="panel-list">
            <div
              v-for="(q, i) in previewQuestions"
              :key="q.id"
              class="pq"
              role="button"
              tabindex="0"
              @click="router.push(`/voices/question/${q.id}`)"
              @keydown.enter="router.push(`/voices/question/${q.id}`)"
            >
              <span class="pq-num">{{ i + 1 }}.</span>
              <div class="pq-body">
                <div class="pq-text vx-kaiti">{{ q.content }}</div>
                <div class="pq-meta">
                  <span class="pq-from">
                    <IdentityIcon :identity="q.askerIdentity" :size="14" />{{ examTitle(q.askerIdentity) }}
                  </span>
                  <span class="pq-count">已有 <b>{{ q.answerCount }}</b> 人作答</span>
                </div>
              </div>
            </div>
            <div v-if="previewLoaded && !previewQuestions.length" class="vx-empty">
              还没有人出题，去出第一道吧
            </div>
          </div>
        </aside>
      </div>

      <VxFooter class="home-footer" />
    </main>

    <Transition name="vx-modal">
      <IdentityBindModal
        v-if="showBindModal"
        @bound="onBound"
        @close="showBindModal = false; pendingRoute = null"
      />
    </Transition>

    <VxNoticeHost />
  </div>
</template>

<style scoped>
.home-container {
  display: flex;
  flex-direction: column;
  padding-bottom: 20px;
  min-height: 0;
}

/* 移动端：包裹层不参与布局，保持原有文档流 */
.home-grid,
.home-left {
  display: contents;
}

.hero {
  text-align: center;
  padding: 32px 0 18px;
}

.hero-title {
  margin: 0;
  font-size: 44px;
  font-weight: 700;
  letter-spacing: 14px;
  text-indent: 14px;
  color: var(--vx-ink);
}

.hero-sub {
  margin: 16px 0 0;
  font-size: 15px;
  line-height: 1.9;
  color: var(--vx-ink-soft);
}

.hero-stats {
  margin-top: 16px;
  font-size: 13px;
  color: var(--vx-ink-faint);
}

.hero-stats b {
  color: var(--vx-red);
  font-size: 16px;
}

.identity-line {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 16px;
  margin: 6px 0 22px;
}

.identity-line b {
  font-size: 19px;
}

.identity-placeholder {
  color: var(--vx-ink-faint);
}

.archive-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 12px;
  font-family: var(--vx-serif);
  font-size: 13px;
  letter-spacing: 1px;
  border: 1.5px solid var(--vx-line-dash);
  background: var(--vx-paper);
  color: var(--vx-ink-soft);
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 1px 1px 0 rgba(120, 110, 90, 0.25);
}

.archive-btn:hover {
  color: var(--vx-red);
  border-color: var(--vx-red);
  transform: translateY(-1px);
}

.entries {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.entry-card {
  outline: none;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.entry-card:hover,
.entry-card:focus-visible {
  transform: translateY(-4px);
  box-shadow: 3px 8px 18px rgba(120, 110, 90, 0.3);
}

.entry-desc {
  font-size: 17px;
  line-height: 1.7;
  min-height: 58px;
  margin: 0;
}

.entry-foot {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px dashed var(--vx-line-dash);
  font-size: 13px;
  color: var(--vx-red);
  letter-spacing: 1px;
}

.home-footer {
  margin-top: auto;
  padding-top: 20px;
}

/* ==================== 移动端 ==================== */
@media (max-width: 640px) {
  .hero {
    padding: 18px 0 12px;
  }

  .hero-title {
    font-size: 30px;
    letter-spacing: 8px;
    text-indent: 8px;
  }

  .hero-sub {
    font-size: 13px;
    line-height: 1.8;
    margin-top: 10px;
  }

  .hero-stats {
    margin-top: 10px;
  }

  .identity-line {
    margin: 4px 0 14px;
  }

  .entries {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .entry-desc {
    font-size: 15px;
    min-height: 0;
  }

  .home-footer {
    padding-top: 12px;
  }
}

/* ==================== 桌面端（≥920px）：单屏双栏 ==================== */
@media (min-width: 920px) {
  .home-container {
    max-width: 1200px;
    padding: 28px 24px 14px;
  }

  .home-grid {
    display: grid;
    grid-template-columns: 11fr 9fr;
    gap: 36px;
    align-items: stretch;
    flex: 1;
    min-height: 0;
  }

  /* 左栏：标题 + 身份 + 入口，垂直居中 */
  .home-left {
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-width: 0;
  }

  .hero {
    padding: 0 0 6px;
  }

  .hero-title {
    font-size: 58px;
    letter-spacing: 22px;
    text-indent: 22px;
  }

  .hero-sub {
    font-size: 16px;
    margin-top: 18px;
  }

  .hero-stats {
    margin-top: 14px;
    font-size: 14px;
    letter-spacing: 1px;
  }

  .identity-line {
    margin: 14px 0 26px;
  }

  .entries {
    gap: 22px;
  }

  /* 右栏：考题速览面板，内部滚动 */
  .home-right {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    padding: 20px 22px 12px 52px;
  }

  .panel-head {
    margin-bottom: 4px;
  }

  .panel-link {
    font-size: 13px;
    color: var(--vx-red);
    text-decoration: none;
    letter-spacing: 1px;
    white-space: nowrap;
  }

  .panel-link:hover {
    text-decoration: underline;
  }

  .panel-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--vx-line-dash) transparent;
  }

  .panel-list::-webkit-scrollbar {
    width: 6px;
  }

  .panel-list::-webkit-scrollbar-thumb {
    background: var(--vx-line-dash);
  }

  .pq {
    display: flex;
    gap: 10px;
    padding: 12px 8px 12px 2px;
    border-bottom: 1px dashed var(--vx-line-dash);
    cursor: pointer;
    outline: none;
    transition: background 0.15s ease;
  }

  .pq:last-of-type {
    border-bottom: none;
  }

  .pq:hover,
  .pq:focus-visible {
    background: rgba(192, 57, 43, 0.03);
  }

  .pq-num {
    flex-shrink: 0;
    font-size: 15px;
    font-weight: 700;
    line-height: 1.65;
    color: var(--vx-ink);
  }

  .pq-body {
    flex: 1;
    min-width: 0;
  }

  .pq-text {
    font-size: 17px;
    line-height: 1.65;
    word-break: break-word;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    transition: color 0.15s ease;
  }

  .pq:hover .pq-text,
  .pq:focus-visible .pq-text {
    color: var(--vx-red);
  }

  .pq-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-top: 5px;
    font-size: 12px;
    color: var(--vx-ink-faint);
  }

  .pq-from {
    display: inline-flex;
    align-items: center;
    white-space: nowrap;
  }

  .pq-count {
    white-space: nowrap;
  }

  .pq-count b {
    color: var(--vx-red);
    font-size: 13px;
  }

  .home-footer {
    padding-top: 14px;
  }
}
</style>
