<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useVxNotice } from './composables/useVxNotice'
import { getVoiceWall, getVoicesStatus } from '@/api/voices'
import {
  VOICE_IDENTITIES,
  examTitle,
  identityLabel,
  type QuestionCard,
  type VoiceIdentity,
  type VoicesStatus,
} from '@/types/voices'
import IdentityBindModal from './components/IdentityBindModal.vue'
import IdentityIcon from './components/IdentityIcon.vue'
import VxBackButton from './components/VxBackButton.vue'
import VxLoading from './components/VxLoading.vue'
import VxNoticeHost from './components/VxNoticeHost.vue'
import VxSealLine from './components/VxSealLine.vue'
import VxTabs from './components/VxTabs.vue'
import { useIsDesktop } from './composables/useIsDesktop'
import { useVoiceIdentity } from './composables/useVoiceIdentity'
import './voices-theme.css'

const router = useRouter()
const userStore = useUserStore()
const notice = useVxNotice()
// 身份走本地缓存：页签渲染与初始筛选即时确定，避免跳变
const { identity: myIdentity, setIdentity, syncFromServer } = useVoiceIdentity()
// 桌面端拆顶栏：悬浮返回 + 页内标题行
const isDesktop = useIsDesktop()

const status = ref<VoicesStatus | null>(null)
// 首次进入默认「可能问我」（有身份时）+「默认（随机）」
const scope = ref<'mine' | 'all'>(userStore.isLoggedIn && myIdentity.value ? 'mine' : 'all')
const sort = ref<'latest' | 'hot' | 'random'>('random')

const scopeOptions = [
  { value: 'mine', label: '可能问我' },
  { value: 'all', label: '全部试卷' },
]
const sortOptions = [
  { value: 'random', label: '默认' },
  { value: 'latest', label: '最新' },
  { value: 'hot', label: '最热' },
]

const questions = ref<QuestionCard[]>([])
const page = ref(1)
const total = ref(0)
const loading = ref(false)
const PAGE_SIZE = 10

// 请求序号：快速连点时只采纳最后一次请求的结果
let reqSeq = 0
// 批次号：每次整批刷新时递增，用于重放卡片滑入动画
const batchId = ref(0)

// 随机模式一次抽一批、不分页
const hasMore = computed(() => sort.value !== 'random' && questions.value.length < total.value)
const showScopeTabs = computed(() => Boolean(userStore.isLoggedIn && myIdentity.value))
const reachedBottom = computed(
  () => sort.value !== 'random' && !hasMore.value && !loading.value && questions.value.length > 0
)

// 「全部试卷」下的目标人群多选过滤（空 = 不过滤）
const targetFilter = ref<VoiceIdentity[]>([])

function toggleTargetFilter(id: VoiceIdentity) {
  const idx = targetFilter.value.indexOf(id)
  if (idx >= 0) targetFilter.value.splice(idx, 1)
  else targetFilter.value.push(id)
  questions.value = []
  total.value = 0
  load(true)
}

async function load(reset = false) {
  const seq = ++reqSeq
  if (reset) page.value = 1
  loading.value = true
  try {
    const res = await getVoiceWall({
      scope: scope.value,
      sort: sort.value,
      targets: scope.value === 'all' ? targetFilter.value : undefined,
      page: page.value,
      size: PAGE_SIZE,
    })
    if (seq !== reqSeq) return
    if (res.data.code === 200) {
      questions.value = reset
        ? res.data.data.records
        : [...questions.value, ...res.data.data.records]
      total.value = res.data.data.total
      // 新一批内容：重放依次滑入动画
      if (reset) batchId.value += 1
    } else {
      notice.error(res.data.message || '加载失败')
    }
  } catch {
    if (seq === reqSeq) notice.error('网络错误，请稍后再试')
  } finally {
    if (seq === reqSeq) loading.value = false
  }
}

function switchScope(next: string) {
  if (scope.value === next) return
  scope.value = next as 'mine' | 'all'
  // 筛选切换先清空进入加载态，加载完成再展示
  questions.value = []
  total.value = 0
  load(true)
}

function switchSort(next: string) {
  if (sort.value === next) return
  sort.value = next as 'latest' | 'hot' | 'random'
  questions.value = []
  total.value = 0
  load(true)
}

// ==================== 无限滚动 ====================

const sentinel = ref<HTMLElement | null>(null)
let sentinelVisible = false
let observer: IntersectionObserver | null = null

function maybeLoadMore() {
  if (sentinelVisible && hasMore.value && !loading.value) {
    page.value += 1
    load()
  }
}

watch(loading, (v) => {
  if (!v) maybeLoadMore()
})

// ==================== 随机刷新（常驻按钮） ====================

/**
 * 任意筛选下都可点：非「默认」时自动切回「默认」再重抽一批。
 * 每次点击立即发起请求，reqSeq 保证只显示最后一次的结果；刷新期间保留旧内容。
 */
function refreshRandom() {
  dismissGuide()
  if (sort.value !== 'random') sort.value = 'random'
  load(true)
}

// ==================== 首次引导 ====================

const GUIDE_KEY = 'vx-wall-guide-shown'
const showGuide = ref(false)

function dismissGuide() {
  if (!showGuide.value) return
  showGuide.value = false
  localStorage.setItem(GUIDE_KEY, '1')
}

// ==================== 身份登记入口 ====================

const showBindModal = ref(false)

function onTipClick() {
  if (!userStore.isLoggedIn) {
    userStore.openLoginModal()
    return
  }
  showBindModal.value = true
}

function onBound(identity: VoiceIdentity) {
  setIdentity(identity)
  showBindModal.value = false
  scope.value = 'mine'
  questions.value = []
  total.value = 0
  load(true)
}

onMounted(() => {
  // 有身份缓存时立即出墙，不等状态接口
  load(true)
  getVoicesStatus()
    .then((res) => {
      if (res.data.code === 200) {
        status.value = res.data.data
        if (userStore.isLoggedIn) {
          syncFromServer(res.data.data.myIdentity)
          if (!res.data.data.myIdentity && scope.value === 'mine') {
            scope.value = 'all'
            load(true)
          }
        }
      }
    })
    .catch(() => {
      // 状态获取失败不影响浏览
    })

  if (!localStorage.getItem(GUIDE_KEY)) showGuide.value = true

  observer = new IntersectionObserver(
    (entries) => {
      sentinelVisible = entries[0]?.isIntersecting ?? false
      maybeLoadMore()
    },
    { rootMargin: '240px' }
  )
  if (sentinel.value) observer.observe(sentinel.value)
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div class="vx-page">
    <header v-if="!isDesktop" class="vx-topbar vx-topbar--center">
      <VxBackButton to="/voices" />
      <span class="vx-topbar-title">答题大厅</span>
    </header>
    <VxBackButton v-else to="/voices" class="vx-desk-back" />

    <main class="vx-container wall-container">
      <div class="wall-toolbar" :class="{ 'vx-desk-head': isDesktop }">
        <h2 v-if="isDesktop">答题大厅</h2>
        <VxTabs
          v-if="showScopeTabs"
          :options="scopeOptions"
          :model-value="scope"
          @update:model-value="switchScope"
        />
        <button v-else class="wall-tip vx-kaiti" type="button" @click="onTipClick">
          {{ userStore.isLoggedIn ? '登记身份后可筛选可能问你的试卷 →' : '登录并登记身份后即可作答 →' }}
        </button>

        <VxTabs class="wall-sort" :options="sortOptions" :model-value="sort" @update:model-value="switchSort" />
      </div>

      <!-- 全部试卷：目标人群多选过滤 -->
      <Transition name="target-row">
        <div v-if="scope === 'all'" class="target-filter-row">
          <span class="target-filter-label">只看投给：</span>
          <button
            v-for="id in VOICE_IDENTITIES"
            :key="id"
            type="button"
            class="vx-target-option target-filter-option"
            :class="{ 'vx-target-option--active': targetFilter.includes(id) }"
            @click="toggleTargetFilter(id)"
          >
            {{ identityLabel(id) }}
          </button>
        </div>
      </Transition>

      <div v-if="!loading && questions.length === 0" class="vx-empty">
        {{ scope === 'mine' ? '还没有投放给你的试卷，去看看全部试卷吧' : '还没有人出题，去出第一道吧' }}
      </div>

      <div :key="batchId" class="vx-grid">
        <div
          v-for="(q, i) in questions"
          :key="q.id"
          class="vx-paper-card vx-paper-card--clickable wall-card-in"
          :style="{ animationDelay: `${(i % PAGE_SIZE) * 45}ms` }"
          @click="router.push(`/voices/question/${q.id}`)"
        >
          <VxSealLine />
          <span v-if="q.answeredByMe" class="vx-corner-stamp">已答</span>
          <span v-else-if="q.mine" class="vx-corner-stamp">我出的</span>

          <div class="vx-exam-head">
            <h3><IdentityIcon :identity="q.askerIdentity" :size="16" />{{ examTitle(q.askerIdentity) }}</h3>
          </div>

          <div class="vx-question-text wall-q">{{ q.content }}</div>

          <div class="vx-card-meta">
            <span class="wall-targets">
              <span v-for="t in q.targetIdentities" :key="t" class="vx-target-chip">{{ identityLabel(t) }}卷</span>
            </span>
            <span class="wall-count">已有 <b>{{ q.answerCount }}</b> 人回答</span>
          </div>
        </div>
      </div>

      <!-- 无限滚动哨兵 -->
      <div ref="sentinel" class="wall-sentinel"></div>

      <VxLoading v-if="loading && questions.length === 0" text="翻卷中…" />
      <VxLoading v-else-if="loading && hasMore" text="翻卷中…" />
      <div v-else-if="reachedBottom" class="wall-bottom vx-kaiti">—— 你已经到达底部啦！——</div>
    </main>

    <!-- 常驻的换一批按钮 -->
    <button
      class="wall-refresh"
      :class="{ 'wall-refresh--spinning': loading && sort === 'random', 'wall-refresh--guiding': showGuide }"
      type="button"
      title="换一批"
      aria-label="换一批"
      @click="refreshRandom"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M21 12 a9 9 0 1 1 -2.64 -6.36" />
        <path d="M21 3 v5 h-5" />
      </svg>
    </button>

    <!-- 首次进入引导 -->
    <Transition name="guide-fade">
      <div v-if="showGuide" class="guide-mask" @click="dismissGuide">
        <div class="guide-bubble vx-kaiti">
          当筛选器处于【默认】时，<br />可以点我刷新一组问题！
          <span class="guide-arrow"></span>
        </div>
      </div>
    </Transition>

    <Transition name="vx-modal">
      <IdentityBindModal v-if="showBindModal" @bound="onBound" @close="showBindModal = false" />
    </Transition>

    <VxNoticeHost />
  </div>
</template>

<style scoped>
.wall-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: nowrap;
  margin-bottom: 20px;
}

/* 页签压缩到一行放得下 */
.wall-toolbar :deep(.vx-tab) {
  padding: 5px 10px;
  font-size: 12px;
  letter-spacing: 0.5px;
}

.wall-tip {
  font-size: 13px;
  color: var(--vx-ink-faint);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font-family: var(--vx-kaiti);
  transition: color 0.15s ease;
}

.wall-tip:hover {
  color: var(--vx-red);
}

/* ---------- 目标人群过滤行 ---------- */
.target-filter-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin: -8px 0 18px;
}

.target-filter-label {
  font-size: 12px;
  color: var(--vx-ink-faint);
  letter-spacing: 1px;
}

.target-filter-option {
  font-size: 12px;
  padding: 4px 12px;
}

.target-row-enter-active,
.target-row-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.target-row-enter-from,
.target-row-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* 卡片依次从左滑入 */
.wall-card-in {
  animation: wall-card-in 0.24s ease-out both;
}

@keyframes wall-card-in {
  from {
    opacity: 0;
    transform: translateX(-28px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.wall-q {
  min-height: 66px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.wall-targets {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}

/* 大厅卡片间距略收紧 */
.vx-grid {
  gap: 12px;
}

.wall-count {
  font-size: 11px;
  white-space: nowrap;
}

.wall-count b {
  font-size: 13px;
}

.wall-sentinel {
  height: 1px;
}

.wall-bottom {
  text-align: center;
  font-size: 14px;
  color: var(--vx-ink-faint);
  letter-spacing: 2px;
  padding: 28px 0 8px;
}

.wall-refresh {
  position: fixed;
  right: 22px;
  bottom: 26px;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 1.5px solid var(--vx-ink);
  background: var(--vx-paper);
  color: var(--vx-ink-soft);
  cursor: pointer;
  box-shadow: 2px 3px 0 rgba(120, 110, 90, 0.35);
  transition: color 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
}

.wall-refresh:hover {
  color: var(--vx-red);
  border-color: var(--vx-red);
  transform: translateY(-2px);
}

.wall-refresh--spinning svg {
  animation: wall-refresh-spin 0.6s linear infinite;
}

/* 引导时按钮浮在遮罩上方并强调 */
.wall-refresh--guiding {
  z-index: 72;
  color: var(--vx-red);
  border-color: var(--vx-red);
  box-shadow: 0 0 0 6px rgba(253, 251, 244, 0.18), 2px 3px 0 rgba(0, 0, 0, 0.4);
}

@keyframes wall-refresh-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* ---------- 首次引导 ---------- */
.guide-mask {
  position: fixed;
  inset: 0;
  background: rgba(10, 8, 6, 0.78);
  z-index: 70;
}

.guide-bubble {
  position: fixed;
  right: 22px;
  bottom: 92px;
  z-index: 72;
  max-width: 240px;
  background: var(--vx-paper);
  border: 1px solid var(--vx-line);
  box-shadow: 3px 4px 0 rgba(0, 0, 0, 0.35);
  padding: 12px 16px;
  font-size: 15px;
  line-height: 1.7;
  color: var(--vx-ink);
  text-align: center;
}

.guide-arrow {
  position: absolute;
  right: 16px;
  bottom: -8px;
  width: 14px;
  height: 14px;
  background: var(--vx-paper);
  border-right: 1px solid var(--vx-line);
  border-bottom: 1px solid var(--vx-line);
  transform: rotate(45deg);
}

.guide-fade-enter-active,
.guide-fade-leave-active {
  transition: opacity 0.25s ease;
}

.guide-fade-enter-from,
.guide-fade-leave-to {
  opacity: 0;
}

/* ---------- 桌面端（≥920px） ---------- */
@media (min-width: 920px) {
  .wall-container {
    max-width: 1200px;
  }

  .wall-toolbar {
    justify-content: flex-start;
    gap: 16px;
  }

  .wall-sort {
    margin-left: auto;
  }

  .wall-toolbar :deep(.vx-tab) {
    font-size: 13px;
    padding: 6px 14px;
    letter-spacing: 1px;
  }
}
</style>
