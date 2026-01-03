<script setup lang="ts">
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'
</script>

<template>
  <div class="page-container">
    <PageHeader back-to="/" />

    <main class="page-content">
      <div class="placeholder-container">
        <div class="placeholder-icon secondary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
        </div>
        <h2 class="placeholder-title">宿舍铃声</h2>
        <p class="placeholder-desc">功能开发中，敬请期待...</p>
        <p class="placeholder-hint">这里将会提供宿舍铃声定制和下载</p>
      </div>
    </main>

    <PageFooter />
  </div>
</template>

<style scoped>
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
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-md);
}

.placeholder-container {
  text-align: center;
  max-width: 300px;
}

.placeholder-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto var(--spacing-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary-bg);
  color: var(--color-primary);
  border-radius: var(--radius-xl);
}

.placeholder-icon.secondary {
  background: rgba(6, 182, 212, 0.1);
  color: var(--color-secondary);
}

.placeholder-icon svg {
  width: 40px;
  height: 40px;
}

.placeholder-title {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-sm);
}

.placeholder-desc {
  font-size: var(--text-base);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-md);
}

.placeholder-hint {
  font-size: var(--text-sm);
  color: var(--color-text-placeholder);
}
</style>
