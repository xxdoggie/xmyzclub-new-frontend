<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useVxNotice } from './composables/useVxNotice'
import { createVoiceQuestion, getVoicesStatus } from '@/api/voices'
import type { AxiosError } from 'axios'
import type { ApiResponse } from '@/api/index'
import {
  IDENTITY_LABELS,
  VOICE_IDENTITIES,
  examTitle,
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
import { usePageScrollLock } from './composables/usePageScrollLock'
import { useVoiceIdentity } from './composables/useVoiceIdentity'
import './voices-theme.css'

const MAX_LEN = 200
const MIN_LEN = 4

const router = useRouter()
const userStore = useUserStore()
const notice = useVxNotice()
// 身份走本地缓存，进页面即时可用；接口返回后静默同步
const { identity: myIdentity, setIdentity, syncFromServer } = useVoiceIdentity()

// 出卷页为单屏页面：锁定整页滚动，题目输入框自适应撑满剩余空间
usePageScrollLock()

const statusLoaded = ref(false)
const showBindModal = ref(false)

const content = ref('')
const targets = ref<VoiceIdentity[]>([])
const submitting = ref(false)
const submitted = ref(false)

// ---------- 草稿：自动保存/恢复，防止内容丢失 ----------
const DRAFT_KEY = 'vx-draft-ask'
try {
  const raw = localStorage.getItem(DRAFT_KEY)
  if (raw) {
    const draft = JSON.parse(raw) as { content?: string; targets?: VoiceIdentity[] }
    content.value = draft.content ?? ''
    targets.value = draft.targets ?? []
  }
} catch {
  localStorage.removeItem(DRAFT_KEY)
}

watch([content, targets], () => {
  if (content.value.trim() || targets.value.length) {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ content: content.value, targets: targets.value }))
  } else {
    localStorage.removeItem(DRAFT_KEY)
  }
}, { deep: true })
// 递交时的目标快照，供“已递交”卡片展示（askAgain 清空 targets 时不闪变）
const submittedTargets = ref<VoiceIdentity[]>([])

// 纸张过渡：递交=折起(fold)，再出一题=传走换新纸(pass)
const paperTransition = ref<'paper-fold' | 'paper-pass'>('paper-fold')

const paperTitle = computed(() =>
  myIdentity.value ? examTitle(myIdentity.value) : '＿＿的问题'
)

const contentLen = computed(() => content.value.trim().length)
const canSubmit = computed(
  () =>
    !submitting.value &&
    contentLen.value >= MIN_LEN &&
    contentLen.value <= MAX_LEN &&
    targets.value.length > 0
)

function toggleTarget(id: VoiceIdentity) {
  const idx = targets.value.indexOf(id)
  if (idx >= 0) targets.value.splice(idx, 1)
  else targets.value.push(id)
}

async function submit() {
  if (!canSubmit.value) return
  submitting.value = true
  try {
    const res = await createVoiceQuestion(content.value.trim(), [...targets.value].sort())
    if (res.data.code === 200) {
      submittedTargets.value = [...targets.value].sort()
      paperTransition.value = 'paper-fold'
      submitted.value = true
      localStorage.removeItem(DRAFT_KEY)
    } else {
      notice.error(res.data.message || '递交失败')
    }
  } catch (e) {
    const err = e as AxiosError<ApiResponse>
    notice.error(err.response?.data?.message || '网络错误，请稍后再试')
  } finally {
    submitting.value = false
  }
}

function askAgain() {
  content.value = ''
  targets.value = []
  localStorage.removeItem(DRAFT_KEY)
  paperTransition.value = 'paper-pass'
  submitted.value = false
}

onMounted(async () => {
  if (!userStore.isLoggedIn) {
    userStore.openLoginModal()
    router.replace('/voices')
    return
  }
  try {
    const res = await getVoicesStatus()
    if (res.data.code === 200) {
      if (!res.data.data.open) {
        notice.info('活动已结束，不再收卷')
        router.replace('/voices')
        return
      }
      syncFromServer(res.data.data.myIdentity)
      if (!res.data.data.myIdentity) {
        showBindModal.value = true
      }
    }
  } catch {
    notice.error('加载失败，请稍后再试')
  } finally {
    statusLoaded.value = true
  }
})

function onBound(identity: VoiceIdentity) {
  setIdentity(identity)
  showBindModal.value = false
}

function onBindClose() {
  showBindModal.value = false
  if (!myIdentity.value) {
    router.replace('/voices')
  }
}
</script>

<template>
  <div class="vx-page vx-page--lock">
    <header class="vx-topbar vx-topbar--center">
      <VxBackButton to="/voices" />
      <span class="vx-topbar-title">我要出卷</span>
    </header>

    <main class="vx-container ask-container">
      <Transition :name="paperTransition" mode="out-in">
        <!-- 有身份缓存时直接渲染表单；仅在无缓存且状态未返回时短暂显示 -->
        <VxLoading v-if="!myIdentity && !statusLoaded" key="loading" text="备卷中…" />

        <!-- 出卷表单 -->
        <div v-else-if="!submitted" key="form" class="vx-paper-card ask-paper">
          <VxSealLine />

          <div class="vx-exam-head">
            <h3>{{ paperTitle }}</h3>
            <span class="vx-stamp">全国卷</span>
          </div>

          <div class="ask-by">
            出题人：<b v-if="myIdentity" class="vx-kaiti" :class="`vx-id-${myIdentity}`">
              <IdentityIcon :identity="myIdentity" :size="17" />一位匿名的{{ IDENTITY_LABELS[myIdentity] }}
            </b>
            <span v-else class="vx-kaiti">（待登记）</span>
          </div>

          <div class="vx-field-label">题 目</div>
          <textarea
            v-model="content"
            class="vx-textarea ask-textarea"
            :maxlength="MAX_LEN + 20"
            rows="4"
            placeholder="写下你想问另一代人的问题，比如：幸福是什么？"
          ></textarea>
          <div class="vx-char-count" :class="{ 'vx-char-count--over': contentLen > MAX_LEN }">
            {{ contentLen }} / {{ MAX_LEN }}
          </div>

          <div class="vx-field-label">投 放 给（可多选）</div>
          <div class="vx-target-select">
            <button
              v-for="id in VOICE_IDENTITIES"
              :key="id"
              type="button"
              class="vx-target-option"
              :class="{ 'vx-target-option--active': targets.includes(id) }"
              @click="toggleTarget(id)"
            >
              {{ IDENTITY_LABELS[id] }}
            </button>
          </div>
          <p class="ask-hint">小提示：你的问题将会指定投放给所选身份的人</p>

          <div class="ask-actions">
            <button class="vx-btn vx-btn--red" type="button" :disabled="!canSubmit" @click="submit">
              <template v-if="submitting"><VxPen /> 递交中…</template>
              <template v-else>递 交 试 卷</template>
            </button>
          </div>
        </div>

        <!-- 递交成功 -->
        <div v-else key="done" class="vx-paper-card ask-paper ask-done">
          <VxSealLine />
          <div class="done-stamp">已收卷</div>
          <h2 class="done-title vx-kaiti">试卷已递交</h2>
          <p class="done-sub">
            你的问题已进入答题大厅，等待
            <template v-for="(t, i) in submittedTargets" :key="t">{{ i > 0 ? '、' : '' }}{{ IDENTITY_LABELS[t] }}</template>
            来作答。收到答卷后可在「我的档案袋」查看。
          </p>
          <div class="ask-actions done-actions">
            <button class="vx-btn" type="button" @click="askAgain">再出一题</button>
            <router-link class="vx-btn vx-btn--red" to="/voices/answer">去答题大厅</router-link>
          </div>
        </div>
      </Transition>

      <VxFooter />
    </main>

    <Transition name="vx-modal" appear>
      <IdentityBindModal v-if="showBindModal" @bound="onBound" @close="onBindClose" />
    </Transition>

    <VxNoticeHost />
  </div>
</template>

<style scoped>
.ask-container {
  max-width: 680px;
  /* 折纸动画需要景深 */
  perspective: 1100px;
  /* 单屏布局：纸卡撑满剩余高度，页面不滚动 */
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding-top: 16px;
  padding-bottom: 16px;
}

.ask-paper {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding-top: 20px;
  padding-bottom: 18px;
}

/* 题目输入框吃掉剩余空间，内容超长时框内滚动 */
.ask-textarea {
  flex: 1;
  min-height: 3em;
  resize: none;
  overflow-y: auto;
}

.ask-container :deep(.vx-footer) {
  margin-top: 12px;
}

.ask-by {
  font-size: 13px;
  color: var(--vx-ink-faint);
  margin-bottom: 4px;
}

.ask-by b {
  font-size: 15px;
}

.ask-hint {
  font-size: 12px;
  color: var(--vx-ink-faint);
  margin: 10px 0 0;
}

.ask-actions {
  display: flex;
  justify-content: center;
  margin-top: 14px;
}

.ask-done {
  text-align: center;
  position: relative;
}

.done-stamp {
  position: absolute;
  right: 26px;
  top: 20px;
  font-size: 14px;
  color: var(--vx-red);
  border: 2px solid var(--vx-red);
  border-radius: 50%;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: rotate(14deg);
  letter-spacing: 2px;
  opacity: 0.9;
}

.done-title {
  font-size: 30px;
  margin: 28px 0 10px;
}

.done-sub {
  font-size: 14px;
  line-height: 1.9;
  color: var(--vx-ink-faint);
  max-width: 400px;
  margin: 0 auto;
}

.done-actions {
  gap: 14px;
}

/* ---------- 纸张过渡 ----------
   递交（paper-fold）：试卷先被"拿起来"（微抬+倾斜），再向上递出视野，递交单随后滑入
   再出一题（paper-pass）：递交单向上传走，新纸从折叠状态展开 */
.paper-fold-leave-active {
  animation: paper-submit 0.55s cubic-bezier(0.5, 0, 0.85, 0.4) forwards;
}

.paper-pass-leave-active {
  transition: transform 0.4s ease-in, opacity 0.36s ease-in;
}

.paper-fold-enter-active,
.paper-pass-enter-active {
  transition: transform 0.48s cubic-bezier(0.2, 0.85, 0.3, 1.08), opacity 0.36s ease-out;
}

.paper-fold-enter-from {
  transform: translateY(30px) rotate(1.2deg);
  opacity: 0;
}

.paper-pass-leave-to {
  transform: translateY(-115%) rotate(-5deg);
  opacity: 0;
}

.paper-pass-enter-active {
  transform-origin: 50% 0;
}

.paper-pass-enter-from {
  transform: rotateX(80deg);
  opacity: 0;
}

@keyframes paper-submit {
  0% {
    transform: none;
    opacity: 1;
  }
  /* 先拿起来：微抬、轻微倾斜、影子变大 */
  32% {
    transform: translateY(-14px) rotate(-1.6deg) scale(1.01);
    box-shadow: 6px 14px 22px rgba(120, 110, 90, 0.35);
    opacity: 1;
  }
  /* 再递出去：向上飞出视野 */
  100% {
    transform: translateY(-130%) rotate(-8deg) scale(0.92);
    box-shadow: 2px 3px 0 rgba(120, 110, 90, 0.18);
    opacity: 0;
  }
}

@media (max-width: 560px) {
  .ask-container {
    padding-top: 8px;
    padding-bottom: 8px;
  }

  .ask-paper {
    padding-top: 14px;
    padding-bottom: 12px;
  }
}
</style>
