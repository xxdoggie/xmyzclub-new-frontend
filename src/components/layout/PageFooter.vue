<script setup lang="ts">
// 页面底部组件 - 仅桌面端显示
</script>

<template>
  <footer class="page-footer">
    <div class="footer-container">
      <div class="footer-links">
        <a href="#">关于我们</a>
        <a href="#">使用条款</a>
        <a href="#">隐私政策</a>
        <a href="#">帮助中心</a>
      </div>
      <p class="copyright">© 2026 厦门一中学生社区 · designed by 23届玄学狗狗</p>
      <a
        href="https://beian.miit.gov.cn/"
        target="_blank"
        rel="noopener"
        class="icp-link"
      >
        闽ICP备2024074144号-4
      </a>
    </div>
  </footer>
</template>

<style scoped>
.page-footer {
  display: none;
  border-top: 1px solid var(--color-border);
  padding: var(--spacing-xl);
  background: var(--color-card);
  margin-top: auto;
}

.footer-container {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.footer-links {
  display: flex;
  gap: var(--spacing-md);
}

.footer-links a {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: color var(--transition-fast);
}

.footer-links a:hover {
  color: var(--color-primary);
}

.copyright {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.icp-link {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
  text-decoration: none;
  transition: color var(--transition-fast);
}

.icp-link:hover {
  color: var(--color-text-secondary);
}

/* 仅桌面端显示 */
@media (min-width: 1024px) {
  .page-footer {
    display: block;
  }
}
</style>
