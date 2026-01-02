<script setup lang="ts">
import { ref } from 'vue'

const isDark = ref(false)

function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
}
</script>

<template>
  <div class="home">
    <header class="home-header">
      <div class="home-header-content">
        <h1 class="home-title">XMYZ Club</h1>
        <p class="home-subtitle">厦门一中学生社区</p>
      </div>
    </header>

    <main class="home-main">
      <section class="home-section">
        <h2 class="section-title">欢迎来到学生社区</h2>
        <p class="section-desc">
          这是厦门一中学生社区的前端项目，基于 Vue 3 + TypeScript + Vite 构建。
        </p>
      </section>

      <section class="home-section">
        <h2 class="section-title">开发资源</h2>
        <div class="resource-cards">
          <router-link to="/design-system" class="resource-card">
            <div class="resource-icon">🎨</div>
            <div class="resource-content">
              <h3>设计系统</h3>
              <p>查看完整的 UI 组件库和设计规范</p>
            </div>
            <div class="resource-arrow"></div>
          </router-link>
        </div>
      </section>

      <section class="home-section">
        <h2 class="section-title">快速开始</h2>
        <div class="code-block">
          <code>npm run dev</code>
        </div>
        <p class="section-desc">启动开发服务器后访问设计系统页面查看所有可用组件。</p>
      </section>
    </main>

    <footer class="home-footer">
      <button class="theme-toggle" @click="toggleTheme">
        {{ isDark ? '☀️ 亮色模式' : '🌙 暗色模式' }}
      </button>
      <p>&copy; 2024 厦门一中学生社区</p>
    </footer>
  </div>
</template>

<style scoped>
.home {
  min-height: 100vh;
  background: var(--color-bg);
  color: var(--color-text);
}

.home-header {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  color: white;
  padding: var(--spacing-2xl) var(--spacing-md);
  text-align: center;
}

.home-header-content {
  max-width: 600px;
  margin: 0 auto;
}

.home-title {
  font-size: var(--text-4xl);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-xs);
}

.home-subtitle {
  font-size: var(--text-lg);
  opacity: 0.9;
}

.home-main {
  max-width: 600px;
  margin: 0 auto;
  padding: var(--spacing-xl) var(--spacing-md);
}

.home-section {
  margin-bottom: var(--spacing-xl);
}

.section-title {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-md);
  padding-bottom: var(--spacing-xs);
  border-bottom: 2px solid var(--color-primary);
  display: inline-block;
}

.section-desc {
  color: var(--color-text-secondary);
  line-height: var(--leading-relaxed);
  margin-bottom: var(--spacing-md);
}

.resource-cards {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.resource-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--color-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-border);
  text-decoration: none;
  color: inherit;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}

.resource-card:active {
  transform: scale(0.98);
}

@media (min-width: 768px) {
  .resource-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }
}

.resource-icon {
  font-size: var(--text-2xl);
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary-bg);
  border-radius: var(--radius-md);
}

.resource-content {
  flex: 1;
}

.resource-content h3 {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  margin-bottom: 2px;
}

.resource-content p {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.resource-arrow {
  width: 8px;
  height: 8px;
  border-right: 2px solid var(--color-text-placeholder);
  border-bottom: 2px solid var(--color-text-placeholder);
  transform: rotate(-45deg);
}

.code-block {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.code-block code {
  font-family: var(--font-family-mono);
  font-size: var(--text-sm);
  color: var(--color-primary);
}

.home-footer {
  text-align: center;
  padding: var(--spacing-xl) var(--spacing-md);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.theme-toggle {
  padding: var(--spacing-sm) var(--spacing-md);
  margin-bottom: var(--spacing-md);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  color: var(--color-text);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.theme-toggle:active {
  transform: scale(0.95);
}
</style>
