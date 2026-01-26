<script setup lang="ts">
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'
import wallImage from '@/assets/wall.jpg'
</script>

<template>
  <div class="page-container">
    <PageHeader back-to="/" />

    <main class="page-content">
      <div class="content-container">
        <div class="wall-image-container">
          <img :src="wallImage" alt="厦一万能墙" class="wall-image" />
        </div>
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
  padding: var(--spacing-md);
}

.content-container {
  max-width: 900px;
  margin: 0 auto;
}

.wall-image-container {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.wall-image {
  width: 100%;
  height: auto;
  display: block;
}

@media (min-width: 1024px) {
  .page-content {
    padding: var(--spacing-xl);
  }
}
</style>
