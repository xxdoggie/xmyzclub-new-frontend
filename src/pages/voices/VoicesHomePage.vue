<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { getVoicesStatus } from '@/api/voices'
import { identityLabel, type VoiceIdentity, type VoicesStatus } from '@/types/voices'
import IdentityBindModal from './components/IdentityBindModal.vue'
import IdentityIcon from './components/IdentityIcon.vue'
import VxBackButton from './components/VxBackButton.vue'
import VxFooter from './components/VxFooter.vue'
import VxNoticeHost from './components/VxNoticeHost.vue'
import VxSealLine from './components/VxSealLine.vue'
import { usePageScrollLock } from './composables/usePageScrollLock'
import { useVoiceIdentity } from './composables/useVoiceIdentity'
import './voices-theme.css'

const router = useRouter()
const userStore = useUserStore()
// 身份走本地缓存：渲染和入口判断即时可用，接口返回后静默同步
const { identity: myIdentity, setIdentity, syncFromServer } = useVoiceIdentity()

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

// 活动首页为单屏页面：锁定整页滚动（含移动端回弹）
usePageScrollLock()

onMounted(loadStatus)
</script>

<template>
  <div class="vx-page vx-page--lock">
    <header class="vx-topbar vx-topbar--center">
      <VxBackButton to="/" home />
      <span class="vx-topbar-title">跨代留声</span>
    </header>

    <main class="vx-container home-container">
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
</style>
