<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { getMinorSections } from '@/api/rating'
import type { MinorSection } from '@/types/rating'
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'

const router = useRouter()
const route = useRoute()
const toast = useToast()

// 获取路由参数
const majorId = Number(route.params.majorId)

// 状态
const isLoading = ref(true)
const minorSections = ref<MinorSection[]>([])

// 加载小分区列表
async function loadMinorSections() {
  isLoading.value = true
  try {
    const res = await getMinorSections(majorId)
    if (res.data.code === 200) {
      minorSections.value = res.data.data
    } else {
      toast.error(res.data.message || '获取分区列表失败')
    }
  } catch {
    toast.error('获取分区列表失败')
  } finally {
    isLoading.value = false
  }
}

// 进入评分项目页面
function goToRatingItems(section: MinorSection) {
  router.push(`/community/minor/${section.id}`)
}

// 获取占位渐变色（使用柔和的颜色）
const PLACEHOLDER_GRADIENTS = [
  'linear-gradient(135deg, #667eea, #764ba2)',
  'linear-gradient(135deg, #f093fb, #f5576c)',
  'linear-gradient(135deg, #4facfe, #00f2fe)',
  'linear-gradient(135deg, #43e97b, #38f9d7)',
  'linear-gradient(135deg, #fa709a, #fee140)',
  'linear-gradient(135deg, #a8edea, #fed6e3)',
]
function getPlaceholderGradient(index: number): string {
  return PLACEHOLDER_GRADIENTS[index % PLACEHOLDER_GRADIENTS.length] || 'linear-gradient(135deg, #667eea, #764ba2)'
}

onMounted(() => {
  loadMinorSections()
})
</script>

<template>
  <div class="page-container">
    <PageHeader />

    <main class="page-content">
      <div class="content-container">
        <!-- 桌面端标题 -->
        <h1 class="page-title desktop-only">选择小分区</h1>

        <!-- 加载状态 -->
        <div v-if="isLoading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>

        <!-- 空状态 -->
        <div v-else-if="minorSections.length === 0" class="empty-container">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="9" y1="21" x2="9" y2="9"></line>
            </svg>
          </div>
          <h2>暂无区域</h2>
          <p>该分区暂无可用区域</p>
        </div>

        <!-- 小分区网格 -->
        <div v-else class="section-grid">
          <div
            v-for="(section, index) in minorSections"
            :key="section.id"
            class="section-card"
            @click="goToRatingItems(section)"
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
                :style="{ background: getPlaceholderGradient(index) }"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="3" y1="9" x2="21" y2="9"></line>
                  <line x1="9" y1="21" x2="9" y2="9"></line>
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
  max-width: 1200px;
  margin: 0 auto;
}

/* ===== Desktop Only Title ===== */
.page-title {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-lg);
}

.desktop-only {
  display: none;
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

/* ===== Empty ===== */
.empty-container {
  text-align: center;
  padding: var(--spacing-2xl) var(--spacing-md);
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

.empty-container p {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
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
  opacity: 0.8;
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
