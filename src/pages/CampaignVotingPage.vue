<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { getCampaignDetail } from '@/api/campaign'
import type { Campaign } from '@/types/campaign'
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const campaignId = Number(route.params.id)
const campaign = ref<Campaign | null>(null)
const isLoading = ref(true)

// 加载活动详情
async function loadCampaign() {
  isLoading.value = true
  try {
    const res = await getCampaignDetail(campaignId)
    if (res.data.code === 200) {
      campaign.value = res.data.data
      // 检查活动状态
      if (campaign.value.currentStage?.stageType !== 'voting') {
        toast.warning('当前不在投票阶段')
      }
    } else {
      toast.error(res.data.message || '获取活动详情失败')
      router.push('/ringtone')
    }
  } catch (error) {
    toast.error('获取活动详情失败')
    router.push('/ringtone')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadCampaign()
})
</script>

<template>
  <div class="page-container">
    <PageHeader :back-to="`/ringtone`" />

    <main class="page-content">
      <div class="content-container">
        <!-- 加载状态 -->
        <div v-if="isLoading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>

        <!-- 占位内容 -->
        <div v-else class="placeholder-container">
          <div class="placeholder-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <h2 v-if="campaign">{{ campaign.title }}</h2>
          <h3>投票功能</h3>
          <p>投票功能正在开发中，敬请期待...</p>
          <button class="back-btn" @click="router.push('/ringtone')">
            返回活动列表
          </button>
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
  max-width: 800px;
  margin: 0 auto;
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

/* ===== Placeholder ===== */
.placeholder-container {
  text-align: center;
  padding: var(--spacing-2xl) var(--spacing-md);
}

.placeholder-icon {
  width: 100px;
  height: 100px;
  margin: 0 auto var(--spacing-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-info-bg);
  color: var(--color-info);
  border-radius: var(--radius-xl);
}

.placeholder-icon svg {
  width: 50px;
  height: 50px;
}

.placeholder-container h2 {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-sm);
}

.placeholder-container h3 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-md);
}

.placeholder-container p {
  font-size: var(--text-sm);
  color: var(--color-text-placeholder);
  margin-bottom: var(--spacing-lg);
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-lg);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: white;
  background: var(--color-primary);
  border: none;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.back-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* ===== Desktop ===== */
@media (min-width: 1024px) {
  .page-content {
    padding: var(--spacing-xl);
  }

  .content-container {
    max-width: 900px;
  }

  .placeholder-icon {
    width: 120px;
    height: 120px;
  }

  .placeholder-icon svg {
    width: 60px;
    height: 60px;
  }
}
</style>
