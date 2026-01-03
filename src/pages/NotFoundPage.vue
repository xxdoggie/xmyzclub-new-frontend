<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function goHome() {
  router.push('/')
}
</script>

<template>
  <div class="not-found">
    <div class="content">
      <h1 class="code">404</h1>
      <p class="message">页面不存在</p>
      <button class="btn" @click="goHome">返回首页</button>
    </div>
  </div>
</template>

<style scoped>
.not-found {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg);
}

.content {
  text-align: center;
}

.code {
  font-size: 120px;
  font-weight: var(--font-bold);
  color: var(--color-primary);
  line-height: 1;
  margin-bottom: var(--spacing-sm);
}

.message {
  font-size: var(--text-xl);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xl);
}

.btn {
  padding: var(--spacing-sm) var(--spacing-xl);
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.btn:hover {
  background: var(--color-primary-dark);
}
</style>
