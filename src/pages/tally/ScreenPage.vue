<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useTallySocket } from '@/composables/useTallySocket'
import type { TallyCandidate } from '@/types/tally'

const route = useRoute()
const activityId = ref<number | null>(Number(route.params.id) || null)

// 大屏页接管整个 viewport，禁用 body 默认 margin 与全局滚动条
const SCREEN_BODY_CLASS = 'tally-screen-mode'

const isFullscreen = ref(false)

function onFullscreenChange() {
  isFullscreen.value = !!document.fullscreenElement
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {
      /* 用户拒绝或浏览器不支持，静默处理 */
    })
  } else {
    document.exitFullscreen().catch(() => {})
  }
}

onMounted(() => {
  document.body.classList.add(SCREEN_BODY_CLASS)
  document.addEventListener('fullscreenchange', onFullscreenChange)
})
onBeforeUnmount(() => {
  document.body.classList.remove(SCREEN_BODY_CLASS)
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {})
  }
})

const { snapshot, connected } = useTallySocket(activityId)

/**
 * 候选人按 displayOrder 固定顺序排列（X 轴稳定）
 */
const candidates = computed<TallyCandidate[]>(() => {
  const list = snapshot.value?.candidates || []
  return [...list].sort((a, b) => a.displayOrder - b.displayOrder)
})

/**
 * Y 轴上限：max(maxVotes * 1.2, 10)，再向上取到 1/2/5 × 10ⁿ 形式的整数。
 */
const yMax = computed<number>(() => {
  const max = candidates.value.reduce((m, c) => Math.max(m, c.voteCount), 0)
  const target = Math.max(max * 1.2, 10)
  return niceCeiling(target)
})

const yTicks = computed<number[]>(() => {
  const ticks: number[] = []
  for (let i = 5; i >= 0; i--) ticks.push((yMax.value * i) / 5)
  return ticks
})

/**
 * 把 value 向上取到一个"好看"的整数，确保结果能被 5 整除（5 段刻度都为整数）。
 * 跟随数值规模自适应步长，避免大数值跳变到下一个数量级。
 */
function niceCeiling(value: number): number {
  if (value <= 0) return 10
  let step: number
  if (value < 25) step = 5          // 0/2/4/6/8/10 这种
  else if (value < 60) step = 10    // 0/4/8/.../20
  else if (value < 150) step = 25   // 0/10/20/30/40/50
  else if (value < 300) step = 50
  else if (value < 600) step = 100
  else if (value < 1500) step = 250
  else if (value < 3000) step = 500
  else if (value < 8000) step = 1000
  else step = 2500
  return Math.max(step, Math.ceil(value / step) * step)
}

/**
 * 浮动 delta 提示：watch 票数变化生成 popup，动画结束自动移除。
 */
interface Popup {
  id: string
  candidateId: number
  delta: number
}
const popups = ref<Popup[]>([])
const previousCounts = ref<Record<number, number>>({})

watch(
  () => snapshot.value?.candidates,
  (newCs) => {
    if (!newCs) return
    for (const c of newCs) {
      const prev = previousCounts.value[c.id]
      if (prev !== undefined && prev !== c.voteCount) {
        const delta = c.voteCount - prev
        const id = `${c.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
        popups.value.push({ id, candidateId: c.id, delta })
        window.setTimeout(() => {
          popups.value = popups.value.filter((p) => p.id !== id)
        }, 1400)
      }
      previousCounts.value[c.id] = c.voteCount
    }
  },
  { deep: true, immediate: true },
)

function popupsFor(candidateId: number): Popup[] {
  return popups.value.filter((p) => p.candidateId === candidateId)
}

function deltaLabel(d: number): string {
  return d > 0 ? `+${d}` : `${d}`
}

function barHeightPercent(c: TallyCandidate): number {
  if (yMax.value <= 0) return 0
  return Math.min(100, (c.voteCount / yMax.value) * 100)
}
</script>

<template>
  <div class="screen-root">
    <template v-if="snapshot">
      <header class="screen-header">
        <h1 class="title">{{ snapshot.title }}</h1>
      </header>

      <main class="chart-wrapper">
        <p v-if="candidates.length === 0" class="empty">暂无候选人</p>

        <div v-else class="chart">
          <!-- Y 轴刻度 -->
          <div class="y-ticks">
            <div
              v-for="(t, idx) in yTicks"
              :key="idx"
              class="y-tick"
              :style="{ top: `${(idx / (yTicks.length - 1)) * 100}%` }"
            >
              <span class="y-label">{{ Math.round(t) }}</span>
            </div>
          </div>

          <!-- 绘图区 -->
          <div class="bars-area">
            <!-- 网格线 -->
            <div
              v-for="(_, idx) in yTicks"
              :key="`g-${idx}`"
              class="gridline"
              :style="{ top: `${(idx / (yTicks.length - 1)) * 100}%` }"
            />

            <!-- 柱子 -->
            <div
              v-for="c in candidates"
              :key="c.id"
              class="bar-cell"
            >
              <!-- 票数标签（柱顶） -->
              <div
                class="vote-label"
                :style="{ bottom: `${barHeightPercent(c)}%` }"
              >
                {{ c.voteCount }}
              </div>

              <!-- 浮动 delta 提示 -->
              <div
                class="popups"
                :style="{ bottom: `${barHeightPercent(c)}%` }"
              >
                <span
                  v-for="p in popupsFor(c.id)"
                  :key="p.id"
                  class="popup"
                  :class="p.delta > 0 ? 'positive' : 'negative'"
                >
                  {{ deltaLabel(p.delta) }}
                </span>
              </div>

              <!-- 柱子本体 -->
              <div
                class="bar"
                :style="{ height: `${barHeightPercent(c)}%` }"
              />
            </div>
          </div>

          <!-- Y 轴底部占位（与 X 标签同高，保证网格与 X 轴对齐） -->
          <div class="axis-spacer" />

          <!-- X 轴标签 -->
          <div class="x-labels">
            <div
              v-for="c in candidates"
              :key="`xl-${c.id}`"
              class="x-label"
            >
              <span class="cand-name">{{ c.name }}</span>
            </div>
          </div>
        </div>
      </main>
    </template>

    <div v-else class="loading">加载中...</div>

    <button
      class="fullscreen-btn"
      :title="isFullscreen ? '退出全屏' : '进入全屏'"
      @click="toggleFullscreen"
    >
      <svg v-if="!isFullscreen" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 8V3h5" />
        <path d="M21 8V3h-5" />
        <path d="M3 16v5h5" />
        <path d="M21 16v5h-5" />
      </svg>
      <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M8 3v5H3" />
        <path d="M16 3v5h5" />
        <path d="M8 21v-5H3" />
        <path d="M16 21v-5h5" />
      </svg>
    </button>

    <div class="conn-indicator" :class="{ ok: connected }">
      <span class="dot" />
      <span class="conn-text">{{ connected ? '已连接' : '重连中…' }}</span>
    </div>

    <!-- 背景流动光晕（aurora），放最后但 z-index 最低，不影响交互 -->
    <div class="bg-aurora" aria-hidden="true">
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>
      <div class="blob blob-3"></div>
      <div class="blob blob-4"></div>
    </div>
  </div>
</template>

<style>
/* 仅当大屏页激活时生效；离开页面时自动恢复 */
html:has(body.tally-screen-mode),
body.tally-screen-mode {
  margin: 0;
  padding: 0;
  overflow: hidden;
  width: 100%;
  height: 100%;
}
</style>

<style scoped>
.screen-root {
  position: fixed;
  inset: 0;
  background: #fafbfc;
  color: #1a1a1a;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  /* 投影边缘容易被切，底部留更多安全区 */
  padding: 3vh 4vw 9vh 4vw;
  box-sizing: border-box;
  font-family: 'PingFang SC', 'Microsoft YaHei', system-ui, -apple-system, sans-serif;
}
/* 让 flex 流中的内容浮在背景之上（.conn-indicator 自己已经 absolute + z-index，不动它） */
.screen-header,
.chart-wrapper,
.loading {
  position: relative;
  z-index: 1;
}

/* ===== 标题居中 ===== */
.screen-header {
  display: flex;
  justify-content: center;
  margin-bottom: 2vh;
  flex-shrink: 0;
}
.title {
  font-size: clamp(1.4rem, 2.6vw, 2.8rem);
  font-weight: 700;
  margin: 0;
  letter-spacing: 0.02em;
  color: #0f172a;
  text-align: center;
}

/* ===== Chart ===== */
.chart-wrapper {
  flex: 1;
  min-height: 0;
  position: relative;
}

/*
  CSS Grid 把图表分成 2 行 × 2 列：
  ┌───────────┬───────────────────┐
  │ y-ticks   │  bars-area        │  ← 行 1（绘图主体，flex: 1）
  ├───────────┼───────────────────┤
  │ spacer    │  x-labels         │  ← 行 2（X 轴标签，auto 高度）
  └───────────┴───────────────────┘
*/
.chart {
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: clamp(40px, 3.5vw, 70px) 1fr;
  grid-template-rows: 1fr auto;
}

.y-ticks {
  grid-row: 1;
  grid-column: 1;
  position: relative;
  border-right: 1px solid #cbd5e1;
}
.y-tick {
  position: absolute;
  right: 0.5rem;
  transform: translateY(-50%);
  white-space: nowrap;
}
.y-label {
  font-size: clamp(0.7rem, 0.9vw, 1rem);
  font-weight: 600;
  color: #64748b;
  font-variant-numeric: tabular-nums;
}

.bars-area {
  grid-row: 1;
  grid-column: 2;
  position: relative;
  display: flex;
  align-items: stretch;
  gap: clamp(6px, 1vw, 18px);
  padding: 0 clamp(8px, 1.5vw, 24px);
  border-bottom: 1px solid #cbd5e1;
}
.gridline {
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background: #e2e8f0;
  transform: translateY(-50%);
  pointer-events: none;
}

.bar-cell {
  position: relative;
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

/* 柱子本体 */
.bar {
  width: 60%;
  max-width: 120px;
  background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);
  border-radius: 0.4rem 0.4rem 0 0;
  box-shadow: 0 -2px 6px rgba(37, 99, 235, 0.15);
  transition: height 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 柱顶票数标签：translateY 上抬一个字号的高度，再补偿 line-height 下方留白 */
.vote-label {
  position: absolute;
  left: 0;
  right: 0;
  text-align: center;
  font-size: clamp(0.95rem, 1.5vw, 1.7rem);
  font-weight: 800;
  color: #0f172a;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  /* -100% 把标签抬到柱顶上方；+0.6em 把数字向下贴住柱顶（消除 line-height 行框留白） */
  transform: translateY(calc(-100% + 0.6em));
  transition: bottom 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
}

/* 浮动 delta 提示 */
.popups {
  position: absolute;
  left: 0;
  right: 0;
  text-align: center;
  pointer-events: none;
  transition: bottom 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transform: translateY(calc(-100% - 1.8rem));
}
.popup {
  display: inline-block;
  font-size: clamp(1rem, 1.7vw, 1.9rem);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
  animation: popup-rise 1.4s cubic-bezier(0.2, 0.7, 0.2, 1) forwards;
}
.popup.positive { color: #16a34a; }
.popup.negative { color: #dc2626; }

@keyframes popup-rise {
  0%   { transform: translateY(0)     scale(0.6); opacity: 0; }
  15%  { transform: translateY(-20%)  scale(1.15); opacity: 1; }
  30%  { transform: translateY(-55%)  scale(1);    opacity: 1; }
  100% { transform: translateY(-200%) scale(1);    opacity: 0; }
}

/* X 轴标签行 */
.axis-spacer {
  grid-row: 2;
  grid-column: 1;
}
.x-labels {
  grid-row: 2;
  grid-column: 2;
  display: flex;
  align-items: flex-start;
  gap: clamp(6px, 1vw, 18px);
  padding: 0.5rem clamp(8px, 1.5vw, 24px) 0;
}
.x-label {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
}
.cand-name {
  font-size: clamp(0.95rem, 1.4vw, 1.6rem);
  font-weight: 700;
  color: #1e293b;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.empty {
  text-align: center;
  font-size: 1.5rem;
  color: #94a3b8;
  margin-top: 10vh;
}

.loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  color: #94a3b8;
}

.conn-indicator {
  position: absolute;
  bottom: 2vh;
  right: 1.5vw;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: #94a3b8;
  opacity: 0.7;
  z-index: 2;
}

/* ===== 全屏按钮 ===== */
.fullscreen-btn {
  position: absolute;
  top: 2vh;
  right: 1.5vw;
  width: 2.6rem;
  height: 2.6rem;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 0.5rem;
  color: #475569;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, transform 0.15s ease;
  z-index: 2;
}
.fullscreen-btn:hover {
  background: rgba(255, 255, 255, 0.85);
  color: #0f172a;
}
.fullscreen-btn:active {
  transform: scale(0.95);
}
.fullscreen-btn svg {
  width: 1.3rem;
  height: 1.3rem;
}

/* ===== 背景流动光晕 ===== */
.bg-aurora {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
}
.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  opacity: 0.55;
  will-change: transform;
}
.blob-1 {
  width: 55vw;
  height: 55vw;
  background: radial-gradient(circle at center, #93c5fd 0%, rgba(147, 197, 253, 0) 70%);
  top: -15vh;
  left: -15vw;
  animation: drift-1 28s ease-in-out infinite alternate;
}
.blob-2 {
  width: 45vw;
  height: 45vw;
  background: radial-gradient(circle at center, #c4b5fd 0%, rgba(196, 181, 253, 0) 70%);
  bottom: -15vh;
  right: -10vw;
  animation: drift-2 34s ease-in-out infinite alternate;
}
.blob-3 {
  width: 40vw;
  height: 40vw;
  background: radial-gradient(circle at center, #a5f3fc 0%, rgba(165, 243, 252, 0) 70%);
  top: 30vh;
  left: 45vw;
  animation: drift-3 42s ease-in-out infinite alternate;
  opacity: 0.5;
}
.blob-4 {
  width: 38vw;
  height: 38vw;
  background: radial-gradient(circle at center, #a7f3d0 0%, rgba(167, 243, 208, 0) 70%);
  top: 55vh;
  left: -10vw;
  animation: drift-4 38s ease-in-out infinite alternate;
  opacity: 0.4;
}
@keyframes drift-1 {
  from { transform: translate(0, 0) scale(1);      }
  to   { transform: translate(18vw, 22vh) scale(1.2); }
}
@keyframes drift-2 {
  from { transform: translate(0, 0) scale(1);        }
  to   { transform: translate(-22vw, -25vh) scale(1.15); }
}
@keyframes drift-3 {
  from { transform: translate(0, 0) scale(0.9);     }
  to   { transform: translate(-28vw, 15vh) scale(1.25); }
}
@keyframes drift-4 {
  from { transform: translate(0, 0) scale(1);       }
  to   { transform: translate(25vw, -18vh) scale(1.1); }
}
.conn-indicator .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
}
.conn-indicator.ok .dot { background: #22c55e; }
</style>
