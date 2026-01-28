<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/composables/useToast'
import { getDailyRatingStatistics, getStatistics } from '@/api/rating'
import type { DailyRatingStatistics, RatingStatistics, DailyRatingPreset } from '@/types/rating'
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb.vue'

const router = useRouter()
const userStore = useUserStore()
const toast = useToast()

// 加载状态
const isLoading = ref(true)
const isLoadingChart = ref(false)

// 统计概览
const overview = ref<RatingStatistics | null>(null)

// 每日评分统计
const dailyStats = ref<DailyRatingStatistics | null>(null)

// 时间范围选择
type RangeType = 'preset' | 'custom'
const rangeType = ref<RangeType>('preset')
const selectedPreset = ref<DailyRatingPreset>('last7days')
const customStartDate = ref('')
const customEndDate = ref('')

// 预设选项
const presetOptions: { value: DailyRatingPreset; label: string }[] = [
  { value: 'today', label: '今日' },
  { value: 'yesterday', label: '昨日' },
  { value: 'last7days', label: '近7天' },
  { value: 'last30days', label: '近30天' },
]

// 加载统计概览
async function loadOverview() {
  try {
    const res = await getStatistics()
    if (res.data.code === 200) {
      overview.value = res.data.data
    }
  } catch (error) {
    console.error('获取统计概览失败', error)
  }
}

// 加载每日评分统计
async function loadDailyStats() {
  isLoadingChart.value = true
  try {
    const params = rangeType.value === 'preset'
      ? { preset: selectedPreset.value }
      : { startDate: customStartDate.value, endDate: customEndDate.value }

    const res = await getDailyRatingStatistics(params)
    if (res.data.code === 200) {
      dailyStats.value = res.data.data
    } else {
      toast.error(res.data.message || '获取数据失败')
    }
  } catch (error) {
    toast.error('获取数据失败')
  } finally {
    isLoadingChart.value = false
  }
}

// 监听时间范围变化
watch([selectedPreset], () => {
  if (rangeType.value === 'preset') {
    loadDailyStats()
  }
})

// 自定义范围确认
function applyCustomRange() {
  if (!customStartDate.value || !customEndDate.value) {
    toast.error('请选择开始和结束日期')
    return
  }
  if (customStartDate.value > customEndDate.value) {
    toast.error('开始日期不能晚于结束日期')
    return
  }
  loadDailyStats()
}

// 切换范围类型
function switchRangeType(type: RangeType) {
  rangeType.value = type
  if (type === 'preset') {
    loadDailyStats()
  }
}

// 图表计算属性
const chartData = computed(() => {
  if (!dailyStats.value || dailyStats.value.dailyStats.length === 0) {
    return null
  }

  const stats = dailyStats.value.dailyStats
  const maxCount = Math.max(...stats.map(s => s.count), 1)

  return {
    stats,
    maxCount,
    // 图表尺寸
    width: 100,
    height: 60,
    // 计算点的位置
    points: stats.map((stat, index) => ({
      x: stats.length === 1 ? 50 : (index / (stats.length - 1)) * 100,
      y: 60 - (stat.count / maxCount) * 55 - 2.5,
      date: stat.date,
      count: stat.count,
    })),
  }
})

// 生成折线路径
const linePath = computed(() => {
  if (!chartData.value || chartData.value.points.length === 0) return ''
  const points = chartData.value.points
  const firstPoint = points[0]
  if (!firstPoint) return ''
  if (points.length === 1) {
    return `M ${firstPoint.x} ${firstPoint.y}`
  }
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
})

// 生成填充区域路径
const areaPath = computed(() => {
  if (!chartData.value || chartData.value.points.length === 0) return ''
  const points = chartData.value.points
  const height = chartData.value.height
  const firstPoint = points[0]
  const lastPoint = points[points.length - 1]
  if (!firstPoint || !lastPoint) return ''
  if (points.length === 1) {
    return `M ${firstPoint.x} ${height} L ${firstPoint.x} ${firstPoint.y} L ${firstPoint.x} ${height} Z`
  }
  const pathStart = `M ${firstPoint.x} ${height}`
  const pathLine = points.map(p => `L ${p.x} ${p.y}`).join(' ')
  const pathEnd = `L ${lastPoint.x} ${height} Z`
  return `${pathStart} ${pathLine} ${pathEnd}`
})

// X轴标签
const xAxisLabels = computed(() => {
  if (!chartData.value || chartData.value.stats.length === 0) return null
  const stats = chartData.value.stats
  const first = stats[0]
  const last = stats[stats.length - 1]
  const mid = stats.length > 2 ? stats[Math.floor(stats.length / 2)] : null
  if (!first || !last) return null
  return { first, mid, last }
})

// 格式化日期显示
function formatDateDisplay(dateStr: string) {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

// 格式化完整日期
function formatFullDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

// 初始化
async function init() {
  isLoading.value = true
  try {
    // 设置默认自定义日期范围
    const today = new Date()
    const weekAgo = new Date()
    weekAgo.setDate(today.getDate() - 6)
    customEndDate.value = today.toISOString().split('T')[0] ?? ''
    customStartDate.value = weekAgo.toISOString().split('T')[0] ?? ''

    await Promise.all([loadOverview(), loadDailyStats()])
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  if (!userStore.isLoggedIn || !userStore.canManageRating) {
    toast.error('无权访问此页面')
    router.push('/')
    return
  }
  init()
})
</script>

<template>
  <div class="page-container">
    <PageHeader back-to="/admin/rating" />

    <main class="page-content">
      <div class="content-container">
        <!-- 桌面端面包屑 -->
        <div class="breadcrumb-wrapper">
          <PageBreadcrumb />
        </div>

        <!-- 页面标题 -->
        <div class="page-header-section">
          <div class="header-text">
            <h1 class="page-title">数据统计</h1>
            <p class="page-subtitle">查看评分社区的数据统计</p>
          </div>
        </div>

        <!-- 加载状态 -->
        <div v-if="isLoading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>

        <template v-else>
          <!-- 统计概览卡片 -->
          <div v-if="overview" class="overview-section">
            <h2 class="section-title">数据概览</h2>
            <div class="overview-grid">
              <div class="overview-card">
                <div class="overview-value">{{ overview.userRatingCount }}</div>
                <div class="overview-label">总评分数</div>
              </div>
              <div class="overview-card">
                <div class="overview-value">{{ overview.commentCount }}</div>
                <div class="overview-label">总评论数</div>
              </div>
              <div class="overview-card">
                <div class="overview-value">{{ overview.ratingItemCount }}</div>
                <div class="overview-label">评分项目</div>
              </div>
              <div class="overview-card">
                <div class="overview-value">{{ overview.enabledRatingItemCount }}</div>
                <div class="overview-label">已启用项目</div>
              </div>
            </div>
          </div>

          <!-- 每日评分趋势 -->
          <div class="chart-section">
            <h2 class="section-title">评分趋势</h2>

            <!-- 时间范围选择器 -->
            <div class="range-selector">
              <div class="range-tabs">
                <button
                  class="range-tab"
                  :class="{ active: rangeType === 'preset' }"
                  @click="switchRangeType('preset')"
                >
                  预设
                </button>
                <button
                  class="range-tab"
                  :class="{ active: rangeType === 'custom' }"
                  @click="switchRangeType('custom')"
                >
                  自定义
                </button>
              </div>

              <!-- 预设选项 -->
              <div v-if="rangeType === 'preset'" class="preset-options">
                <button
                  v-for="option in presetOptions"
                  :key="option.value"
                  class="preset-btn"
                  :class="{ active: selectedPreset === option.value }"
                  @click="selectedPreset = option.value"
                >
                  {{ option.label }}
                </button>
              </div>

              <!-- 自定义日期 -->
              <div v-else class="custom-range">
                <div class="date-inputs">
                  <input
                    v-model="customStartDate"
                    type="date"
                    class="date-input"
                  />
                  <span class="date-separator">至</span>
                  <input
                    v-model="customEndDate"
                    type="date"
                    class="date-input"
                  />
                </div>
                <button class="apply-btn" @click="applyCustomRange">
                  查询
                </button>
              </div>
            </div>

            <!-- 图表区域 -->
            <div class="chart-container">
              <div v-if="isLoadingChart" class="chart-loading">
                <div class="loading-spinner small"></div>
              </div>

              <template v-else-if="dailyStats && chartData">
                <!-- 统计摘要 -->
                <div class="chart-summary">
                  <div class="summary-item">
                    <span class="summary-label">时间范围</span>
                    <span class="summary-value">
                      {{ formatFullDate(dailyStats.startDate) }} - {{ formatFullDate(dailyStats.endDate) }}
                    </span>
                  </div>
                  <div class="summary-item">
                    <span class="summary-label">总评分数</span>
                    <span class="summary-value highlight">{{ dailyStats.totalRatings }}</span>
                  </div>
                  <div class="summary-item">
                    <span class="summary-label">日均评分</span>
                    <span class="summary-value">
                      {{ dailyStats.totalDays > 0 ? (dailyStats.totalRatings / dailyStats.totalDays).toFixed(1) : 0 }}
                    </span>
                  </div>
                </div>

                <!-- SVG 折线图 -->
                <div class="chart-wrapper">
                  <svg
                    class="line-chart"
                    viewBox="0 0 100 60"
                    preserveAspectRatio="none"
                  >
                    <!-- 网格线 -->
                    <line x1="0" y1="15" x2="100" y2="15" class="grid-line" />
                    <line x1="0" y1="30" x2="100" y2="30" class="grid-line" />
                    <line x1="0" y1="45" x2="100" y2="45" class="grid-line" />

                    <!-- 填充区域 -->
                    <path :d="areaPath" class="chart-area" />

                    <!-- 折线 -->
                    <path :d="linePath" class="chart-line" />

                    <!-- 数据点 -->
                    <circle
                      v-for="(point, index) in chartData.points"
                      :key="index"
                      :cx="point.x"
                      :cy="point.y"
                      r="1.5"
                      class="chart-point"
                    />
                  </svg>

                  <!-- Y轴刻度 -->
                  <div class="y-axis">
                    <span>{{ chartData.maxCount }}</span>
                    <span>{{ Math.round(chartData.maxCount / 2) }}</span>
                    <span>0</span>
                  </div>
                </div>

                <!-- X轴日期标签 -->
                <div class="x-axis" v-if="chartData.points.length > 1 && xAxisLabels">
                  <span>{{ formatDateDisplay(xAxisLabels.first.date) }}</span>
                  <span v-if="xAxisLabels.mid">
                    {{ formatDateDisplay(xAxisLabels.mid.date) }}
                  </span>
                  <span>{{ formatDateDisplay(xAxisLabels.last.date) }}</span>
                </div>

                <!-- 详细数据列表 -->
                <div class="data-list">
                  <div class="data-list-header">
                    <span>日期</span>
                    <span>评分数</span>
                  </div>
                  <div
                    v-for="stat in [...dailyStats.dailyStats].reverse()"
                    :key="stat.date"
                    class="data-list-item"
                  >
                    <span class="data-date">{{ formatFullDate(stat.date) }}</span>
                    <span class="data-count">{{ stat.count }}</span>
                  </div>
                </div>
              </template>

              <div v-else class="chart-empty">
                <p>暂无数据</p>
              </div>
            </div>
          </div>
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

/* ===== Page Header ===== */
.page-header-section {
  margin-bottom: var(--spacing-lg);
}

.header-text {
  display: none;
}

.page-title {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-xs);
}

.page-subtitle {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
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

.loading-spinner.small {
  width: 24px;
  height: 24px;
  border-width: 2px;
  margin-bottom: 0;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ===== Section ===== */
.section-title {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-md);
}

/* ===== Overview Section ===== */
.overview-section {
  margin-bottom: var(--spacing-xl);
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-sm);
}

.overview-card {
  padding: var(--spacing-md);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  text-align: center;
}

.overview-value {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  color: var(--color-primary);
  margin-bottom: 2px;
}

.overview-label {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

/* ===== Chart Section ===== */
.chart-section {
  margin-bottom: var(--spacing-xl);
}

/* ===== Range Selector ===== */
.range-selector {
  margin-bottom: var(--spacing-md);
}

.range-tabs {
  display: flex;
  gap: 2px;
  padding: 3px;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  margin-bottom: var(--spacing-sm);
}

.range-tab {
  flex: 1;
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
}

.range-tab:hover {
  color: var(--color-text);
}

.range-tab.active {
  color: var(--color-primary);
  background: var(--color-primary-bg);
}

.preset-options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.preset-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
}

.preset-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.preset-btn.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.custom-range {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.date-inputs {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.date-input {
  flex: 1;
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--text-xs);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-card);
  color: var(--color-text);
}

.date-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.date-separator {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.apply-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: white;
  background: var(--color-primary);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
}

.apply-btn:hover {
  background: var(--color-primary-dark);
}

/* ===== Chart Container ===== */
.chart-container {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
}

.chart-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-2xl);
}

.chart-empty {
  text-align: center;
  padding: var(--spacing-2xl);
  color: var(--color-text-secondary);
}

/* ===== Chart Summary ===== */
.chart-summary {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
  padding-bottom: var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.summary-label {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.summary-value {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
}

.summary-value.highlight {
  color: var(--color-primary);
  font-size: var(--text-lg);
}

/* ===== Line Chart ===== */
.chart-wrapper {
  position: relative;
  height: 180px;
  margin-bottom: var(--spacing-sm);
}

.line-chart {
  position: absolute;
  left: 32px;
  right: 0;
  top: 0;
  bottom: 0;
  width: calc(100% - 32px);
  height: 100%;
}

.grid-line {
  stroke: var(--color-border);
  stroke-width: 0.5;
  stroke-dasharray: 2 2;
}

.chart-area {
  fill: var(--color-primary);
  fill-opacity: 0.1;
}

.chart-line {
  fill: none;
  stroke: var(--color-primary);
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.chart-point {
  fill: var(--color-primary);
}

/* ===== Y Axis ===== */
.y-axis {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 28px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font-size: 10px;
  color: var(--color-text-placeholder);
  text-align: right;
  padding: 2px 0;
}

/* ===== X Axis ===== */
.x-axis {
  display: flex;
  justify-content: space-between;
  padding-left: 32px;
  font-size: 10px;
  color: var(--color-text-placeholder);
}

/* ===== Data List ===== */
.data-list {
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-border);
  max-height: 200px;
  overflow-y: auto;
}

.data-list-header {
  display: flex;
  justify-content: space-between;
  padding: var(--spacing-xs) 0;
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  border-bottom: 1px solid var(--color-border);
}

.data-list-item {
  display: flex;
  justify-content: space-between;
  padding: var(--spacing-xs) 0;
  font-size: var(--text-sm);
  border-bottom: 1px solid var(--color-border);
}

.data-list-item:last-child {
  border-bottom: none;
}

.data-date {
  color: var(--color-text-secondary);
}

.data-count {
  font-weight: var(--font-medium);
  color: var(--color-primary);
}

/* ===== Desktop ===== */
@media (min-width: 768px) {
  .overview-grid {
    grid-template-columns: repeat(4, 1fr);
  }

  .custom-range {
    flex-direction: row;
    align-items: center;
  }

  .date-inputs {
    flex: 1;
  }
}

@media (min-width: 1024px) {
  .breadcrumb-wrapper {
    display: block;
  }

  .page-content {
    padding: var(--spacing-xl);
  }

  .header-text {
    display: block;
  }

  .page-title {
    font-size: var(--text-2xl);
  }

  .page-subtitle {
    font-size: var(--text-base);
  }

  .section-title {
    font-size: var(--text-lg);
  }

  .overview-value {
    font-size: var(--text-2xl);
  }

  .overview-label {
    font-size: var(--text-sm);
  }

  .chart-wrapper {
    height: 240px;
  }

  .range-tab,
  .preset-btn {
    font-size: var(--text-sm);
  }

  .date-input {
    font-size: var(--text-sm);
  }
}
</style>
