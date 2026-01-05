<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/composables/useToast'
import { getExamDetail } from '@/api/grade'
import { getExamTypeName } from '@/types/grade'
import type { ExamDetail } from '@/types/grade'
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const toast = useToast()

// 考试ID
const examId = computed(() => Number(route.params.examId))

// 状态
const isLoading = ref(true)
const examDetail = ref<ExamDetail | null>(null)

// 加载考试详情
async function loadExamDetail() {
  try {
    const res = await getExamDetail(examId.value)
    if (res.data.code === 200) {
      examDetail.value = res.data.data
    } else {
      toast.error(res.data.message || '获取考试详情失败')
      router.push('/grade')
    }
  } catch {
    toast.error('网络错误，请稍后重试')
    router.push('/grade')
  } finally {
    isLoading.value = false
  }
}

// 格式化时间
function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// 计算得分率
function getScoreRate(score: number, manfen: number): number {
  return Math.round((score / manfen) * 100)
}

// 获取得分率颜色
function getScoreRateColor(rate: number): string {
  if (rate >= 85) return 'var(--color-success)'
  if (rate >= 70) return 'var(--color-primary)'
  if (rate >= 60) return 'var(--color-warning)'
  return 'var(--color-error)'
}

// 监听登录状态
watch(
  () => userStore.isLoggedIn,
  (isLoggedIn) => {
    if (isLoggedIn) {
      loadExamDetail()
    }
  }
)

onMounted(() => {
  if (!userStore.isLoggedIn) {
    userStore.openLoginModal('请先登录以查看成绩')
    router.push('/')
    return
  }
  loadExamDetail()
})
</script>

<template>
  <div class="page-container">
    <PageHeader back-to="/grade" />

    <main class="page-content">
      <div class="content-container">
        <!-- 桌面端面包屑 -->
        <div class="breadcrumb-wrapper">
          <PageBreadcrumb />
        </div>

        <!-- 加载状态 -->
        <div v-if="isLoading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>

        <template v-else-if="examDetail">
          <!-- 考试信息卡片 -->
          <section class="exam-header-section">
            <div class="exam-header-card">
              <div class="exam-title-row">
                <h1 class="exam-title">{{ examDetail.name }}</h1>
                <span class="exam-type">{{ getExamTypeName(examDetail.type) }}</span>
              </div>
              <p class="exam-time">{{ formatTime(examDetail.time) }}</p>

              <!-- 总分 -->
              <div class="total-score">
                <div class="score-main">
                  <span class="score-value">{{ examDetail.score }}</span>
                  <span class="score-divider">/</span>
                  <span class="score-full">{{ examDetail.manfen }}</span>
                </div>
                <div class="score-rate" :style="{ color: getScoreRateColor(getScoreRate(examDetail.score, examDetail.manfen)) }">
                  {{ getScoreRate(examDetail.score, examDetail.manfen) }}%
                </div>
              </div>

              <!-- 总分进度条 -->
              <div class="score-progress">
                <div
                  class="progress-bar"
                  :style="{
                    width: getScoreRate(examDetail.score, examDetail.manfen) + '%',
                    background: getScoreRateColor(getScoreRate(examDetail.score, examDetail.manfen))
                  }"
                ></div>
              </div>
            </div>
          </section>

          <!-- 排名信息 -->
          <section class="rank-section">
            <h2 class="section-title">排名信息</h2>
            <div class="rank-cards">
              <div class="rank-card">
                <div class="rank-header">
                  <span class="rank-label">班级排名</span>
                  <span class="rank-total">共 {{ examDetail.rankInfo.classStuNum }} 人</span>
                </div>
                <div class="rank-value">{{ examDetail.rankInfo.classRank }}</div>
                <div class="rank-defeat">
                  超越 <span class="defeat-value">{{ examDetail.rankInfo.classDefeatRatio }}%</span> 同学
                </div>
              </div>

              <div class="rank-card">
                <div class="rank-header">
                  <span class="rank-label">年级排名</span>
                  <span class="rank-total">共 {{ examDetail.rankInfo.gradeStuNum }} 人</span>
                </div>
                <div class="rank-value">{{ examDetail.rankInfo.gradeRank }}</div>
                <div class="rank-defeat">
                  超越 <span class="defeat-value">{{ examDetail.rankInfo.gradeDefeatRatio }}%</span> 同学
                </div>
              </div>
            </div>
          </section>

          <!-- 对比信息 -->
          <section v-if="examDetail.compareInfo" class="compare-section">
            <h2 class="section-title">成绩对比</h2>
            <div class="compare-card">
              <div class="compare-row">
                <span class="compare-label">班级最高分</span>
                <span class="compare-value">{{ examDetail.compareInfo.classHighest ?? '-' }}</span>
              </div>
              <div class="compare-row">
                <span class="compare-label">班级平均分</span>
                <span class="compare-value">{{ examDetail.compareInfo.classAvg ?? '-' }}</span>
              </div>
              <div class="compare-divider"></div>
              <div class="compare-row">
                <span class="compare-label">年级最高分</span>
                <span class="compare-value">{{ examDetail.compareInfo.gradeHighest ?? '-' }}</span>
              </div>
              <div class="compare-row">
                <span class="compare-label">年级平均分</span>
                <span class="compare-value">{{ examDetail.compareInfo.gradeAvg ?? '-' }}</span>
              </div>
            </div>
          </section>

          <!-- 科目成绩 -->
          <section class="subjects-section">
            <h2 class="section-title">科目成绩</h2>
            <div class="subjects-list">
              <div
                v-for="subject in examDetail.subjects"
                :key="subject.paperId"
                class="subject-card"
              >
                <div class="subject-info">
                  <span class="subject-name">{{ subject.subject }}</span>
                  <span class="subject-score">
                    <span class="subject-score-value">{{ subject.score }}</span>
                    <span class="subject-score-full">/ {{ subject.manfen }}</span>
                  </span>
                </div>
                <div class="subject-progress">
                  <div
                    class="progress-bar"
                    :style="{
                      width: getScoreRate(subject.score, subject.manfen) + '%',
                      background: getScoreRateColor(getScoreRate(subject.score, subject.manfen))
                    }"
                  ></div>
                </div>
                <div class="subject-rate" :style="{ color: getScoreRateColor(getScoreRate(subject.score, subject.manfen)) }">
                  {{ getScoreRate(subject.score, subject.manfen) }}%
                </div>
              </div>
            </div>
          </section>
        </template>
      </div>
    </main>

    <PageFooter />
  </div>
</template>

<style scoped>
/* ===== Base ===== */
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
  padding: var(--spacing-sm);
}

.content-container {
  max-width: 800px;
  margin: 0 auto;
}

/* ===== Breadcrumb ===== */
.breadcrumb-wrapper {
  display: none;
  margin-bottom: var(--spacing-lg);
}

/* ===== Loading ===== */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-2xl);
  color: var(--color-text-secondary);
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

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ===== Section Title ===== */
.section-title {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: var(--spacing-md);
  padding: 0 var(--spacing-xs);
}

/* ===== Exam Header Section ===== */
.exam-header-section {
  margin-bottom: var(--spacing-lg);
}

.exam-header-card {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  color: white;
  border-radius: var(--radius-xl);
  padding: var(--spacing-lg);
}

.exam-title-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-xs);
}

.exam-title {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  flex: 1;
}

.exam-type {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.exam-time {
  font-size: var(--text-sm);
  opacity: 0.9;
  margin-bottom: var(--spacing-lg);
}

.total-score {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: var(--spacing-sm);
}

.score-main {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.score-value {
  font-size: var(--text-4xl);
  font-weight: var(--font-bold);
}

.score-divider {
  font-size: var(--text-xl);
  opacity: 0.7;
}

.score-full {
  font-size: var(--text-xl);
  opacity: 0.7;
}

.score-rate {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 12px;
  border-radius: var(--radius-md);
}

.score-progress {
  height: 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.score-progress .progress-bar {
  height: 100%;
  background: white;
  border-radius: var(--radius-full);
  transition: width var(--transition-normal);
}

/* ===== Rank Section ===== */
.rank-section {
  margin-bottom: var(--spacing-lg);
}

.rank-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-sm);
}

.rank-card {
  background: var(--color-card);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
  text-align: center;
}

.rank-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-sm);
}

.rank-label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
}

.rank-total {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
}

.rank-value {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--color-primary);
  margin-bottom: var(--spacing-xs);
}

.rank-defeat {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.defeat-value {
  font-weight: var(--font-semibold);
  color: var(--color-success);
}

/* ===== Compare Section ===== */
.compare-section {
  margin-bottom: var(--spacing-lg);
}

.compare-card {
  background: var(--color-card);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
}

.compare-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-xs) 0;
}

.compare-label {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.compare-value {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
}

.compare-divider {
  height: 1px;
  background: var(--color-border);
  margin: var(--spacing-sm) 0;
}

/* ===== Subjects Section ===== */
.subjects-section {
  margin-bottom: var(--spacing-lg);
}

.subjects-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.subject-card {
  background: var(--color-card);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
}

.subject-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-sm);
}

.subject-name {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
}

.subject-score {
  display: flex;
  align-items: baseline;
  gap: 2px;
}

.subject-score-value {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
}

.subject-score-full {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.subject-progress {
  height: 6px;
  background: var(--color-border);
  border-radius: var(--radius-full);
  overflow: hidden;
  margin-bottom: var(--spacing-xs);
}

.subject-progress .progress-bar {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width var(--transition-normal);
}

.subject-rate {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  text-align: right;
}

/* ===== Desktop ===== */
@media (min-width: 1024px) {
  .breadcrumb-wrapper {
    display: block;
  }

  .page-content {
    padding: var(--spacing-xl);
  }

  .content-container {
    max-width: 900px;
  }

  .exam-header-card {
    padding: var(--spacing-xl);
  }

  .exam-title {
    font-size: var(--text-xl);
  }

  .score-value {
    font-size: var(--text-5xl);
  }

  .rank-cards {
    gap: var(--spacing-md);
  }

  .rank-card {
    padding: var(--spacing-lg);
  }

  .subjects-list {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-md);
  }
}
</style>
