<script setup lang="ts">
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'
</script>

<template>
  <div class="page-container">
    <PageHeader back-to="/" />

    <main class="page-content">
      <div class="placeholder-container">
        <div class="placeholder-icon accent">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
        </div>
        <h2 class="placeholder-title">评分社区</h2>
        <p class="placeholder-desc">功能开发中，敬请期待...</p>
        <p class="placeholder-hint">这里将会展示校园评分和社区讨论</p>
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

.placeholder-icon.accent {
  background: rgba(245, 158, 11, 0.1);
  color: var(--color-accent);
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
