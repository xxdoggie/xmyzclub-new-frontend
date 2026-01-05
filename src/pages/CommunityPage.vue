<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { getSchools, getMajorSections } from '@/api/rating'
import type { School, MajorSection } from '@/types/rating'
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'

const router = useRouter()
const toast = useToast()

// 状态
const isLoadingSchools = ref(true)
const isLoadingSections = ref(false)
const schools = ref<School[]>([])
const majorSections = ref<MajorSection[]>([])
const selectedSchoolId = ref<number | null>(null)

// 当前选中的学校
const selectedSchool = computed(() => {
  return schools.value.find((s) => s.id === selectedSchoolId.value)
})

// 加载学校列表
async function loadSchools() {
  isLoadingSchools.value = true
  try {
    const res = await getSchools()
    if (res.data.code === 200) {
      schools.value = res.data.data
      // 如果只有一个学校，自动选中
      if (schools.value.length === 1 && schools.value[0]) {
        selectedSchoolId.value = schools.value[0].id
      }
    } else {
      toast.error(res.data.message || '获取学校列表失败')
    }
  } catch {
    toast.error('获取学校列表失败')
  } finally {
    isLoadingSchools.value = false
  }
}

// 加载大分区列表
async function loadMajorSections(schoolId: number) {
  isLoadingSections.value = true
  majorSections.value = []
  try {
    const res = await getMajorSections(schoolId)
    if (res.data.code === 200) {
      majorSections.value = res.data.data
    } else {
      toast.error(res.data.message || '获取分区列表失败')
    }
  } catch {
    toast.error('获取分区列表失败')
  } finally {
    isLoadingSections.value = false
  }
}

// 选择学校
function selectSchool(schoolId: number) {
  selectedSchoolId.value = schoolId
}

// 进入大分区
function goToMajorSection(section: MajorSection) {
  router.push(`/community/major/${section.id}`)
}

// 获取分区图标（根据分区名称返回不同图标）
function getSectionIcon(name: string): string {
  if (name.includes('食堂') || name.includes('档口') || name.includes('餐')) {
    return 'utensils'
  }
  if (name.includes('建筑') || name.includes('楼') || name.includes('馆')) {
    return 'building'
  }
  if (name.includes('考试') || name.includes('测验')) {
    return 'clipboard'
  }
  if (name.includes('活动') || name.includes('社团')) {
    return 'users'
  }
  if (name.includes('图书') || name.includes('阅读')) {
    return 'book'
  }
  if (name.includes('运动') || name.includes('体育')) {
    return 'trophy'
  }
  return 'star'
}

// 获取分区渐变色（根据分区名称返回不同颜色）
function getSectionGradient(name: string): string {
  if (name.includes('食堂') || name.includes('档口') || name.includes('餐')) {
    return 'linear-gradient(135deg, #FF6B6B, #E74C3C)'
  }
  if (name.includes('建筑') || name.includes('楼') || name.includes('馆')) {
    return 'linear-gradient(135deg, #4ECDC4, #2ECC71)'
  }
  if (name.includes('考试') || name.includes('测验')) {
    return 'linear-gradient(135deg, #A29BFE, #6C5CE7)'
  }
  if (name.includes('活动') || name.includes('社团')) {
    return 'linear-gradient(135deg, #FDCB6E, #F39C12)'
  }
  if (name.includes('图书') || name.includes('阅读')) {
    return 'linear-gradient(135deg, #74B9FF, #3498DB)'
  }
  if (name.includes('运动') || name.includes('体育')) {
    return 'linear-gradient(135deg, #55EFC4, #00B894)'
  }
  return 'linear-gradient(135deg, #FD79A8, #E84393)'
}

// 监听学校选择变化
watch(selectedSchoolId, (newId) => {
  if (newId) {
    loadMajorSections(newId)
  }
})

onMounted(() => {
  loadSchools()
})
</script>

<template>
  <div class="page-container">
    <PageHeader back-to="/" />

    <main class="page-content">
      <!-- 加载状态 -->
      <div v-if="isLoadingSchools" class="loading-container">
        <div class="loading-spinner"></div>
        <p>加载中...</p>
      </div>

      <!-- 学校列表为空 -->
      <div v-else-if="schools.length === 0" class="empty-container">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
        </div>
        <h2>暂无学校</h2>
        <p>目前没有可用的学校</p>
      </div>

      <template v-else>
        <!-- Hero Section -->
        <div class="hero-section">
          <div class="hero-content">
            <h1 class="hero-title">评分社区</h1>
            <p class="hero-desc">探索校园，分享你的评价</p>
          </div>
          <div class="hero-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          </div>
        </div>

        <!-- 学校选择 Tabs -->
        <div class="school-tabs" v-if="schools.length > 1">
          <span class="tabs-label desktop-only">选择学校</span>
          <div class="tabs-list">
            <button
              v-for="school in schools"
              :key="school.id"
              class="tab-item"
              :class="{ active: selectedSchoolId === school.id }"
              @click="selectSchool(school.id)"
            >
              {{ school.name }}
            </button>
          </div>
        </div>

        <!-- 大分区网格 -->
        <div class="sections-container">
          <h2 class="sections-title desktop-only">
            {{ selectedSchool?.name ? `${selectedSchool.name} · 分区` : '选择分区' }}
          </h2>

          <!-- 加载大分区 -->
          <div v-if="isLoadingSections" class="loading-container small">
            <div class="loading-spinner"></div>
            <p>加载中...</p>
          </div>

          <!-- 未选择学校提示 -->
          <div v-else-if="!selectedSchoolId" class="hint-container">
            <p>请先选择学校</p>
          </div>

          <!-- 大分区为空 -->
          <div v-else-if="majorSections.length === 0" class="empty-container small">
            <p>该学校暂无分区</p>
          </div>

          <!-- 大分区网格 -->
          <div v-else class="section-grid">
            <div
              v-for="section in majorSections"
              :key="section.id"
              class="section-card"
              @click="goToMajorSection(section)"
            >
              <!-- 封面图 -->
              <div class="section-cover">
                <img
                  v-if="section.url"
                  :src="section.url"
                  :alt="section.name"
                  loading="lazy"
                />
                <div
                  v-else
                  class="section-placeholder"
                  :style="{ background: getSectionGradient(section.name) }"
                >
                  <!-- 餐厅图标 -->
                  <svg v-if="getSectionIcon(section.name) === 'utensils'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"></path>
                    <path d="M7 2v20"></path>
                    <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"></path>
                  </svg>
                  <!-- 建筑图标 -->
                  <svg v-else-if="getSectionIcon(section.name) === 'building'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
                    <line x1="9" y1="22" x2="9" y2="2"></line>
                    <line x1="15" y1="22" x2="15" y2="2"></line>
                    <line x1="4" y1="12" x2="20" y2="12"></line>
                  </svg>
                  <!-- 考试图标 -->
                  <svg v-else-if="getSectionIcon(section.name) === 'clipboard'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                    <line x1="8" y1="10" x2="16" y2="10"></line>
                    <line x1="8" y1="14" x2="16" y2="14"></line>
                    <line x1="8" y1="18" x2="12" y2="18"></line>
                  </svg>
                  <!-- 活动图标 -->
                  <svg v-else-if="getSectionIcon(section.name) === 'users'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                  <!-- 图书图标 -->
                  <svg v-else-if="getSectionIcon(section.name) === 'book'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                  </svg>
                  <!-- 运动图标 -->
                  <svg v-else-if="getSectionIcon(section.name) === 'trophy'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
                    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
                    <path d="M4 22h16"></path>
                    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
                    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
                    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
                  </svg>
                  <!-- 默认星星图标 -->
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                </div>
              </div>
              <!-- 信息 -->
              <div class="section-info">
                <h3 class="section-name">{{ section.name }}</h3>
                <p v-if="section.description" class="section-desc">{{ section.description }}</p>
              </div>
            </div>
          </div>
        </div>
      </template>
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
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.desktop-only {
  display: none;
}

/* ===== Hero Section ===== */
.hero-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-lg) var(--spacing-md);
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  border-radius: var(--radius-xl);
  margin-bottom: var(--spacing-md);
  color: white;
}

.hero-content {
  flex: 1;
}

.hero-title {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-xs);
}

.hero-desc {
  font-size: var(--text-sm);
  opacity: 0.9;
}

.hero-icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-lg);
  flex-shrink: 0;
}

.hero-icon svg {
  width: 28px;
  height: 28px;
}

/* ===== School Tabs ===== */
.school-tabs {
  margin-bottom: var(--spacing-md);
}

.tabs-label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-sm);
}

.tabs-list {
  display: flex;
  gap: var(--spacing-sm);
  overflow-x: auto;
  padding-bottom: var(--spacing-xs);
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.tabs-list::-webkit-scrollbar {
  display: none;
}

.tab-item {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  background: var(--color-card);
  border: 2px solid transparent;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
  flex-shrink: 0;
}

.tab-item:hover {
  border-color: var(--color-border);
}

.tab-item.active {
  color: var(--color-primary);
  background: var(--color-primary-bg);
  border-color: var(--color-primary);
}

/* ===== Sections Container ===== */
.sections-container {
  flex: 1;
}

.sections-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-md);
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

.loading-container.small {
  padding: var(--spacing-xl);
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

/* ===== Empty & Hint ===== */
.empty-container,
.hint-container {
  text-align: center;
  padding: var(--spacing-xl) var(--spacing-md);
  color: var(--color-text-secondary);
}

.empty-container.small {
  padding: var(--spacing-lg);
}

.empty-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto var(--spacing-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-border);
  color: var(--color-text-secondary);
  border-radius: var(--radius-xl);
}

.empty-icon svg {
  width: 40px;
  height: 40px;
}

.empty-container h2 {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-sm);
}

.empty-container p,
.hint-container p {
  font-size: var(--text-sm);
}

/* ===== Section Grid ===== */
.section-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-sm);
}

.section-card {
  display: flex;
  flex-direction: column;
  background: var(--color-card);
  border-radius: var(--radius-lg);
  overflow: hidden;
  cursor: pointer;
  transition: all var(--transition-fast);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.section-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.section-card:active {
  transform: translateY(0);
}

.section-cover {
  position: relative;
  aspect-ratio: 16 / 10;
  overflow: hidden;
}

.section-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.section-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.section-placeholder svg {
  width: 36px;
  height: 36px;
  color: white;
  opacity: 0.9;
}

.section-info {
  flex: 1;
  padding: var(--spacing-sm);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.section-name {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.section-desc {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ===== Desktop ===== */
@media (min-width: 1024px) {
  .desktop-only {
    display: block;
  }

  .page-content {
    padding: var(--spacing-xl);
  }

  .hero-section {
    padding: var(--spacing-xl) var(--spacing-2xl);
    margin-bottom: var(--spacing-lg);
  }

  .hero-title {
    font-size: var(--text-2xl);
  }

  .hero-desc {
    font-size: var(--text-base);
  }

  .hero-icon {
    width: 80px;
    height: 80px;
  }

  .hero-icon svg {
    width: 40px;
    height: 40px;
  }

  .school-tabs {
    margin-bottom: var(--spacing-lg);
  }

  .tabs-label {
    display: inline-block;
    margin-right: var(--spacing-md);
    margin-bottom: 0;
  }

  .tabs-list {
    display: inline-flex;
  }

  .tab-item {
    padding: var(--spacing-sm) var(--spacing-lg);
  }

  .section-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: var(--spacing-md);
  }

  .section-placeholder svg {
    width: 48px;
    height: 48px;
  }

  .section-info {
    padding: var(--spacing-md);
  }

  .section-name {
    font-size: var(--text-base);
  }

  .section-desc {
    font-size: var(--text-sm);
  }
}
</style>
