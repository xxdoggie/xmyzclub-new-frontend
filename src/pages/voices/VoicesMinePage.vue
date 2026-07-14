<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useVxNotice } from './composables/useVxNotice'
import { getMyVoiceAnswers, getMyVoiceFavorites, getMyVoiceQuestions } from '@/api/voices'
import { identityLabel, type MyAnswer, type MyQuestion, type QuestionCard } from '@/types/voices'
import VxBackButton from './components/VxBackButton.vue'
import VxFooter from './components/VxFooter.vue'
import VxLoading from './components/VxLoading.vue'
import VxNoticeHost from './components/VxNoticeHost.vue'
import VxTabs from './components/VxTabs.vue'
import { useIsDesktop } from './composables/useIsDesktop'
import './voices-theme.css'

const router = useRouter()
const userStore = useUserStore()
const notice = useVxNotice()
// 桌面端拆顶栏：悬浮返回 + 页内标题行
const isDesktop = useIsDesktop()

const tab = ref('questions')
const myQuestions = ref<MyQuestion[]>([])
const myAnswers = ref<MyAnswer[]>([])
const myFavorites = ref<QuestionCard[]>([])
const loaded = ref(false)

async function load() {
  try {
    const [qRes, aRes, fRes] = await Promise.all([
      getMyVoiceQuestions(1, 50),
      getMyVoiceAnswers(1, 50),
      getMyVoiceFavorites(1, 50),
    ])
    if (qRes.data.code === 200) myQuestions.value = qRes.data.data.records
    if (aRes.data.code === 200) myAnswers.value = aRes.data.data.records
    if (fRes.data.code === 200) myFavorites.value = fRes.data.data.records
    loaded.value = true
  } catch {
    notice.error('档案袋加载失败')
  }
}

onMounted(() => {
  if (!userStore.isLoggedIn) {
    userStore.openLoginModal()
    router.replace('/voices')
    return
  }
  load()
})
</script>

<template>
  <div class="vx-page">
    <header v-if="!isDesktop" class="vx-topbar vx-topbar--center">
      <VxBackButton to="/voices" />
      <span class="vx-topbar-title">我的档案袋</span>
    </header>
    <VxBackButton v-else to="/voices" class="vx-desk-back" />

    <main class="vx-container mine-container">
      <div class="mine-head" :class="{ 'vx-desk-head': isDesktop }">
        <h2 v-if="isDesktop">我的档案袋</h2>
        <VxTabs
          v-model="tab"
          :options="[
            { value: 'questions', label: `我出的卷（${myQuestions.length}）` },
            { value: 'answers', label: `我交的答卷（${myAnswers.length}）` },
            { value: 'favorites', label: `我的收藏（${myFavorites.length}）` },
          ]"
        />
      </div>

      <VxLoading v-if="!loaded" text="翻档案中…" />

      <template v-else-if="tab === 'questions'">
        <div v-if="myQuestions.length === 0" class="vx-empty">
          还没出过题，去出第一道吧
        </div>
        <div
          v-for="q in myQuestions"
          :key="q.id"
          class="vx-paper-card vx-paper-card--plain vx-paper-card--clickable mine-item"
          @click="q.status === 0 && router.push(`/voices/question/${q.id}`)"
        >
          <div class="mine-item-content vx-kaiti">{{ q.content }}</div>
          <div class="vx-card-meta">
            <span>
              投给：<span v-for="t in q.targetIdentities" :key="t" class="vx-target-chip" style="margin-right: 4px">{{ identityLabel(t) }}卷</span>
            </span>
            <span v-if="q.status !== 0" class="mine-takedown">已下架</span>
            <span v-else>已收 <b>{{ q.answerCount }}</b> 份答卷</span>
          </div>
        </div>
      </template>

      <template v-else-if="tab === 'favorites'">
        <div v-if="myFavorites.length === 0" class="vx-empty">
          还没收藏过题目，看到喜欢的题点「收藏」就会出现在这里
        </div>
        <div
          v-for="f in myFavorites"
          :key="f.id"
          class="vx-paper-card vx-paper-card--plain vx-paper-card--clickable mine-item"
          @click="router.push(`/voices/question/${f.id}`)"
        >
          <div class="mine-item-q">{{ f.askerIdentityLabel }} 出的题</div>
          <div class="mine-item-content vx-kaiti">{{ f.content }}</div>
          <div class="vx-card-meta">
            <span>
              投给：<span v-for="t in f.targetIdentities" :key="t" class="vx-target-chip" style="margin-right: 4px">{{ identityLabel(t) }}卷</span>
            </span>
            <span>已收 <b>{{ f.answerCount }}</b> 份答卷</span>
          </div>
        </div>
      </template>

      <template v-else>
        <div v-if="myAnswers.length === 0" class="vx-empty">
          还没交过答卷，去答题大厅看看
        </div>
        <div
          v-for="a in myAnswers"
          :key="a.id"
          class="vx-paper-card vx-paper-card--plain vx-paper-card--clickable mine-item"
          @click="router.push(`/voices/question/${a.questionId}`)"
        >
          <div class="mine-item-q">问：{{ a.questionContent }}</div>
          <div class="mine-item-content vx-kaiti">答：{{ a.content }}</div>
          <div class="vx-card-meta">
            <span>{{ new Date(a.createdAt).toLocaleDateString('zh-CN') }}</span>
            <span v-if="a.status !== 0" class="mine-takedown">已下架</span>
          </div>
        </div>
      </template>

      <VxFooter />
    </main>

    <VxNoticeHost />
  </div>
</template>

<style scoped>
.mine-container {
  max-width: 680px;
}

.mine-head {
  display: flex;
  justify-content: center;
  margin: 8px 0 20px;
}

/* 三个页签压缩，窄屏也能完整显示 */
.mine-head :deep(.vx-tab) {
  padding: 5px 9px;
  font-size: 12px;
  letter-spacing: 0;
}

.mine-item {
  margin-bottom: 12px;
}

.mine-item-q {
  font-size: 13px;
  color: var(--vx-ink-faint);
  margin-bottom: 6px;
}

.mine-item-content {
  font-size: 18px;
  word-break: break-word;
}

.mine-takedown {
  color: var(--vx-red);
}

@media (max-width: 560px) {
  .mine-head {
    margin-top: 2px;
  }
}

/* ---------- 桌面端（≥920px） ---------- */
@media (min-width: 920px) {
  .mine-container {
    max-width: 760px;
  }

  /* 标题居左、页签居右（覆盖移动端的居中） */
  .mine-head.vx-desk-head {
    justify-content: space-between;
  }

  .mine-head :deep(.vx-tab) {
    font-size: 13px;
    padding: 6px 12px;
    letter-spacing: 0.5px;
  }
}
</style>
