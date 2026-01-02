<script setup lang="ts">
import { ref } from 'vue'

const isDark = ref(false)

function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
}

const primaryColors = [
  { name: '主色', var: '--color-primary', value: '#E74C3C' },
  { name: '主色-浅', var: '--color-primary-light', value: '#FF6B6B' },
  { name: '主色-深', var: '--color-primary-dark', value: '#C0392B' },
  { name: '主色-背景', var: '--color-primary-bg', value: 'rgba(231, 76, 60, 0.08)' },
]

const secondaryColors = [
  { name: '辅助色', var: '--color-secondary', value: '#06B6D4' },
  { name: '辅助色-浅', var: '--color-secondary-light', value: '#22D3EE' },
  { name: '强调色', var: '--color-accent', value: '#F59E0B' },
]

const neutralColors = [
  { name: '背景色', var: '--color-bg', value: '#F9FAFB' },
  { name: '卡片色', var: '--color-card', value: '#FFFFFF' },
  { name: '边框色', var: '--color-border', value: '#E5E7EB' },
  { name: '主文字', var: '--color-text', value: '#1F2937' },
  { name: '次要文字', var: '--color-text-secondary', value: '#6B7280' },
  { name: '占位符', var: '--color-text-placeholder', value: '#9CA3AF' },
]

const statusColors = [
  { name: '成功', var: '--color-success', value: '#10B981' },
  { name: '警告', var: '--color-warning', value: '#F59E0B' },
  { name: '错误', var: '--color-error', value: '#EF4444' },
  { name: '信息', var: '--color-info', value: '#3B82F6' },
]

const inputValue = ref('')
const checkboxValue = ref(false)
const radioValue = ref('option1')
</script>

<template>
  <div class="design-system">
    <!-- 头部 -->
    <header class="header">
      <div class="header-content">
        <h1 class="title">XMYZ Club Design System</h1>
        <p class="subtitle">厦门一中学生社区 · 设计规范 v1.0</p>
        <button class="btn btn-secondary" @click="toggleTheme">
          {{ isDark ? '切换亮色模式' : '切换暗色模式' }}
        </button>
      </div>
    </header>

    <main class="main">
      <!-- 颜色系统 -->
      <section class="section">
        <h2 class="section-title">颜色系统</h2>

        <!-- 主色 -->
        <div class="color-group">
          <h3 class="group-title">主色系</h3>
          <div class="color-grid">
            <div v-for="color in primaryColors" :key="color.var" class="color-card">
              <div
                class="color-preview"
                :style="{ backgroundColor: `var(${color.var})` }"
              ></div>
              <div class="color-info">
                <span class="color-name">{{ color.name }}</span>
                <code class="color-value">{{ color.value }}</code>
                <code class="color-var">{{ color.var }}</code>
              </div>
            </div>
          </div>
        </div>

        <!-- 辅助色 -->
        <div class="color-group">
          <h3 class="group-title">辅助色系</h3>
          <div class="color-grid">
            <div v-for="color in secondaryColors" :key="color.var" class="color-card">
              <div
                class="color-preview"
                :style="{ backgroundColor: `var(${color.var})` }"
              ></div>
              <div class="color-info">
                <span class="color-name">{{ color.name }}</span>
                <code class="color-value">{{ color.value }}</code>
                <code class="color-var">{{ color.var }}</code>
              </div>
            </div>
          </div>
        </div>

        <!-- 中性色 -->
        <div class="color-group">
          <h3 class="group-title">中性色</h3>
          <div class="color-grid">
            <div v-for="color in neutralColors" :key="color.var" class="color-card">
              <div
                class="color-preview"
                :style="{ backgroundColor: `var(${color.var})` }"
              ></div>
              <div class="color-info">
                <span class="color-name">{{ color.name }}</span>
                <code class="color-value">{{ color.value }}</code>
                <code class="color-var">{{ color.var }}</code>
              </div>
            </div>
          </div>
        </div>

        <!-- 状态色 -->
        <div class="color-group">
          <h3 class="group-title">状态色</h3>
          <div class="color-grid">
            <div v-for="color in statusColors" :key="color.var" class="color-card">
              <div
                class="color-preview"
                :style="{ backgroundColor: `var(${color.var})` }"
              ></div>
              <div class="color-info">
                <span class="color-name">{{ color.name }}</span>
                <code class="color-value">{{ color.value }}</code>
                <code class="color-var">{{ color.var }}</code>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 排版 -->
      <section class="section">
        <h2 class="section-title">排版系统</h2>
        <div class="card">
          <div class="typography-demo">
            <h1 class="demo-h1">H1 标题 - 厦门一中学生社区</h1>
            <h2 class="demo-h2">H2 标题 - Welcome to XMYZ Club</h2>
            <h3 class="demo-h3">H3 标题 - 社团活动公告</h3>
            <h4 class="demo-h4">H4 标题 - 最新动态</h4>
            <p class="demo-body">正文文字 - 厦门一中学生社区是一个面向全校学生的综合性平台，提供社团管理、活动发布、资源共享等功能。</p>
            <p class="demo-secondary">次要文字 - 本平台由学生会技术部维护</p>
            <p class="demo-small">小字文字 - 更新于 2024年1月</p>
          </div>
        </div>
      </section>

      <!-- 按钮 -->
      <section class="section">
        <h2 class="section-title">按钮组件</h2>

        <!-- 基础按钮 -->
        <div class="card">
          <h3 class="card-title">基础按钮</h3>
          <div class="button-group">
            <button class="btn btn-primary">主要按钮</button>
            <button class="btn btn-secondary">次要按钮</button>
            <button class="btn btn-outline">描边按钮</button>
            <button class="btn btn-ghost">幽灵按钮</button>
            <button class="btn btn-link">链接按钮</button>
          </div>
        </div>

        <!-- 状态按钮 -->
        <div class="card">
          <h3 class="card-title">状态按钮</h3>
          <div class="button-group">
            <button class="btn btn-success">成功</button>
            <button class="btn btn-warning">警告</button>
            <button class="btn btn-error">错误</button>
            <button class="btn btn-info">信息</button>
          </div>
        </div>

        <!-- 按钮尺寸 -->
        <div class="card">
          <h3 class="card-title">按钮尺寸</h3>
          <div class="button-group button-group-align">
            <button class="btn btn-primary btn-sm">小按钮</button>
            <button class="btn btn-primary">默认按钮</button>
            <button class="btn btn-primary btn-lg">大按钮</button>
          </div>
        </div>

        <!-- 禁用状态 -->
        <div class="card">
          <h3 class="card-title">禁用状态</h3>
          <div class="button-group">
            <button class="btn btn-primary" disabled>禁用主要</button>
            <button class="btn btn-secondary" disabled>禁用次要</button>
            <button class="btn btn-outline" disabled>禁用描边</button>
          </div>
        </div>

        <!-- 圆角按钮 -->
        <div class="card">
          <h3 class="card-title">圆角按钮</h3>
          <div class="button-group">
            <button class="btn btn-primary btn-rounded">圆角按钮</button>
            <button class="btn btn-secondary btn-rounded">圆角按钮</button>
            <button class="btn btn-primary btn-icon">+</button>
          </div>
        </div>
      </section>

      <!-- 表单 -->
      <section class="section">
        <h2 class="section-title">表单组件</h2>

        <div class="card">
          <h3 class="card-title">输入框</h3>
          <div class="form-group">
            <label class="form-label">默认输入框</label>
            <input type="text" class="form-input" placeholder="请输入内容..." v-model="inputValue" />
          </div>
          <div class="form-group">
            <label class="form-label">禁用状态</label>
            <input type="text" class="form-input" placeholder="禁用输入框" disabled />
          </div>
          <div class="form-group">
            <label class="form-label">错误状态</label>
            <input type="text" class="form-input form-input-error" placeholder="请输入正确的内容" />
            <span class="form-error">请输入有效的邮箱地址</span>
          </div>
          <div class="form-group">
            <label class="form-label">成功状态</label>
            <input type="text" class="form-input form-input-success" value="验证通过" />
          </div>
        </div>

        <div class="card">
          <h3 class="card-title">文本域</h3>
          <div class="form-group">
            <label class="form-label">描述信息</label>
            <textarea class="form-textarea" placeholder="请输入详细描述..." rows="4"></textarea>
          </div>
        </div>

        <div class="card">
          <h3 class="card-title">选择框</h3>
          <div class="form-group">
            <label class="form-label">选择社团</label>
            <select class="form-select">
              <option value="">请选择社团</option>
              <option value="1">技术部</option>
              <option value="2">宣传部</option>
              <option value="3">文艺部</option>
            </select>
          </div>
        </div>

        <div class="card">
          <h3 class="card-title">复选框 & 单选框</h3>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" class="form-checkbox" v-model="checkboxValue" />
              <span>同意用户协议</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" class="form-checkbox" checked />
              <span>接收通知消息</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" class="form-checkbox" disabled />
              <span>禁用选项</span>
            </label>
          </div>
          <div class="form-group">
            <label class="radio-label">
              <input type="radio" name="demo" class="form-radio" v-model="radioValue" value="option1" />
              <span>选项一</span>
            </label>
            <label class="radio-label">
              <input type="radio" name="demo" class="form-radio" v-model="radioValue" value="option2" />
              <span>选项二</span>
            </label>
            <label class="radio-label">
              <input type="radio" name="demo" class="form-radio" v-model="radioValue" value="option3" />
              <span>选项三</span>
            </label>
          </div>
        </div>
      </section>

      <!-- 卡片 -->
      <section class="section">
        <h2 class="section-title">卡片组件</h2>
        <div class="card-grid">
          <div class="card card-hover">
            <h3 class="card-title">基础卡片</h3>
            <p class="card-content">这是一个基础卡片组件，带有 hover 效果。可以用于展示社团信息、活动详情等内容。</p>
            <div class="card-footer">
              <button class="btn btn-primary btn-sm">了解更多</button>
            </div>
          </div>

          <div class="card card-hover">
            <div class="card-badge">新</div>
            <h3 class="card-title">带徽章卡片</h3>
            <p class="card-content">卡片可以包含徽章，用于标记新内容、热门活动等。</p>
            <div class="card-footer">
              <button class="btn btn-outline btn-sm">查看详情</button>
            </div>
          </div>

          <div class="card card-hover card-featured">
            <h3 class="card-title">特色卡片</h3>
            <p class="card-content">带有主色边框的特色卡片，用于突出重要内容。</p>
            <div class="card-footer">
              <button class="btn btn-primary btn-sm">立即参与</button>
            </div>
          </div>
        </div>
      </section>

      <!-- 徽章和标签 -->
      <section class="section">
        <h2 class="section-title">徽章 & 标签</h2>
        <div class="card">
          <h3 class="card-title">徽章</h3>
          <div class="badge-group">
            <span class="badge badge-primary">主要</span>
            <span class="badge badge-secondary">次要</span>
            <span class="badge badge-accent">强调</span>
            <span class="badge badge-success">成功</span>
            <span class="badge badge-warning">警告</span>
            <span class="badge badge-error">错误</span>
            <span class="badge badge-info">信息</span>
          </div>
        </div>

        <div class="card">
          <h3 class="card-title">标签</h3>
          <div class="tag-group">
            <span class="tag">技术部</span>
            <span class="tag">宣传部</span>
            <span class="tag">文艺部</span>
            <span class="tag tag-closable">
              可关闭
              <button class="tag-close">&times;</button>
            </span>
          </div>
        </div>

        <div class="card">
          <h3 class="card-title">圆点徽章</h3>
          <div class="badge-group">
            <span class="dot dot-success"></span>
            <span class="dot dot-warning"></span>
            <span class="dot dot-error"></span>
            <span class="dot dot-info"></span>
          </div>
        </div>
      </section>

      <!-- 提示框 -->
      <section class="section">
        <h2 class="section-title">提示框</h2>
        <div class="alert-stack">
          <div class="alert alert-success">
            <strong>成功！</strong> 您的操作已成功完成。
          </div>
          <div class="alert alert-warning">
            <strong>警告！</strong> 请注意检查您的输入内容。
          </div>
          <div class="alert alert-error">
            <strong>错误！</strong> 操作失败，请稍后重试。
          </div>
          <div class="alert alert-info">
            <strong>提示：</strong> 您可以在个人中心修改这些设置。
          </div>
        </div>
      </section>

      <!-- 阴影展示 -->
      <section class="section">
        <h2 class="section-title">阴影系统</h2>
        <div class="shadow-grid">
          <div class="shadow-demo shadow-sm">
            <span>shadow-sm</span>
          </div>
          <div class="shadow-demo shadow-md">
            <span>shadow-md</span>
          </div>
          <div class="shadow-demo shadow-lg">
            <span>shadow-lg</span>
          </div>
          <div class="shadow-demo shadow-xl">
            <span>shadow-xl</span>
          </div>
        </div>
      </section>

      <!-- 间距展示 -->
      <section class="section">
        <h2 class="section-title">间距系统</h2>
        <div class="card">
          <div class="spacing-demo">
            <div class="spacing-item" style="width: var(--spacing-xs)"><span>xs (4px)</span></div>
            <div class="spacing-item" style="width: var(--spacing-sm)"><span>sm (8px)</span></div>
            <div class="spacing-item" style="width: var(--spacing-md)"><span>md (16px)</span></div>
            <div class="spacing-item" style="width: var(--spacing-lg)"><span>lg (24px)</span></div>
            <div class="spacing-item" style="width: var(--spacing-xl)"><span>xl (32px)</span></div>
            <div class="spacing-item" style="width: var(--spacing-2xl)"><span>2xl (48px)</span></div>
          </div>
        </div>
      </section>

      <!-- 圆角展示 -->
      <section class="section">
        <h2 class="section-title">圆角系统</h2>
        <div class="radius-grid">
          <div class="radius-demo" style="border-radius: var(--radius-sm)">
            <span>sm (4px)</span>
          </div>
          <div class="radius-demo" style="border-radius: var(--radius-md)">
            <span>md (8px)</span>
          </div>
          <div class="radius-demo" style="border-radius: var(--radius-lg)">
            <span>lg (12px)</span>
          </div>
          <div class="radius-demo" style="border-radius: var(--radius-xl)">
            <span>xl (16px)</span>
          </div>
          <div class="radius-demo radius-demo-circle" style="border-radius: var(--radius-full)">
            <span>full</span>
          </div>
        </div>
      </section>
    </main>

    <!-- 页脚 -->
    <footer class="footer">
      <p>XMYZ Club Design System &copy; 2024 厦门一中学生社区</p>
    </footer>
  </div>
</template>

<style scoped>
.design-system {
  min-height: 100vh;
  background-color: var(--color-bg);
  color: var(--color-text);
}

/* Header */
.header {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  color: white;
  padding: var(--spacing-2xl) var(--spacing-lg);
  text-align: center;
}

.header-content {
  max-width: 800px;
  margin: 0 auto;
}

.title {
  font-size: var(--text-4xl);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-sm);
}

.subtitle {
  font-size: var(--text-lg);
  opacity: 0.9;
  margin-bottom: var(--spacing-lg);
}

/* Main */
.main {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing-2xl) var(--spacing-lg);
}

/* Section */
.section {
  margin-bottom: var(--spacing-2xl);
}

.section-title {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-lg);
  padding-bottom: var(--spacing-sm);
  border-bottom: 2px solid var(--color-primary);
  display: inline-block;
}

/* Color System */
.color-group {
  margin-bottom: var(--spacing-xl);
}

.group-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-md);
  color: var(--color-text-secondary);
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--spacing-md);
}

.color-card {
  background: var(--color-card);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-border);
}

.color-preview {
  height: 80px;
  border: 1px solid var(--color-border);
}

.color-info {
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.color-name {
  font-weight: var(--font-semibold);
}

.color-value,
.color-var {
  font-family: var(--font-family-mono);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

/* Typography */
.typography-demo {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.demo-h1 {
  font-size: var(--text-4xl);
  font-weight: var(--font-bold);
  line-height: var(--leading-tight);
}

.demo-h2 {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  line-height: var(--leading-tight);
}

.demo-h3 {
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
}

.demo-h4 {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
}

.demo-body {
  font-size: var(--text-base);
  line-height: var(--leading-relaxed);
}

.demo-secondary {
  font-size: var(--text-base);
  color: var(--color-text-secondary);
}

.demo-small {
  font-size: var(--text-sm);
  color: var(--color-text-placeholder);
}

/* Card */
.card {
  background: var(--color-card);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-border);
  margin-bottom: var(--spacing-md);
  position: relative;
}

.card-hover {
  transition: transform var(--transition-normal), box-shadow var(--transition-normal);
}

.card-hover:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.card-featured {
  border-left: 4px solid var(--color-primary);
}

.card-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-md);
}

.card-content {
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-md);
  line-height: var(--leading-relaxed);
}

.card-footer {
  display: flex;
  gap: var(--spacing-sm);
}

.card-badge {
  position: absolute;
  top: var(--spacing-md);
  right: var(--spacing-md);
  background: var(--color-primary);
  color: white;
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--spacing-lg);
}

/* Buttons */
.button-group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  align-items: flex-start;
}

.button-group-align {
  align-items: center;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  border-radius: var(--radius-md);
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
  text-decoration: none;
  font-family: inherit;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-light);
}

.btn-primary:active:not(:disabled) {
  background: var(--color-primary-dark);
}

.btn-secondary {
  background: var(--color-secondary);
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-secondary-light);
}

.btn-outline {
  background: transparent;
  color: var(--color-primary);
  border: 2px solid var(--color-primary);
}

.btn-outline:hover:not(:disabled) {
  background: var(--color-primary-bg);
}

.btn-ghost {
  background: transparent;
  color: var(--color-text);
}

.btn-ghost:hover:not(:disabled) {
  background: var(--color-border);
}

.btn-link {
  background: transparent;
  color: var(--color-primary);
  padding: 0;
}

.btn-link:hover:not(:disabled) {
  text-decoration: underline;
}

.btn-success {
  background: var(--color-success);
  color: white;
}

.btn-warning {
  background: var(--color-warning);
  color: white;
}

.btn-error {
  background: var(--color-error);
  color: white;
}

.btn-info {
  background: var(--color-info);
  color: white;
}

.btn-sm {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--text-sm);
}

.btn-lg {
  padding: var(--spacing-md) var(--spacing-xl);
  font-size: var(--text-lg);
}

.btn-rounded {
  border-radius: var(--radius-full);
}

.btn-icon {
  width: 40px;
  height: 40px;
  padding: 0;
  border-radius: var(--radius-full);
  font-size: var(--text-xl);
}

/* Form */
.form-group {
  margin-bottom: var(--spacing-md);
}

.form-label {
  display: block;
  font-weight: var(--font-medium);
  margin-bottom: var(--spacing-xs);
  color: var(--color-text);
}

.form-input,
.form-textarea,
.form-select {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-base);
  font-family: inherit;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-card);
  color: var(--color-text);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.form-input:focus,
.form-textarea:focus,
.form-select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-bg);
}

.form-input::placeholder,
.form-textarea::placeholder {
  color: var(--color-text-placeholder);
}

.form-input:disabled,
.form-textarea:disabled,
.form-select:disabled {
  background: var(--color-bg);
  cursor: not-allowed;
  opacity: 0.7;
}

.form-input-error {
  border-color: var(--color-error);
}

.form-input-error:focus {
  box-shadow: 0 0 0 3px var(--color-error-bg);
}

.form-input-success {
  border-color: var(--color-success);
}

.form-input-success:focus {
  box-shadow: 0 0 0 3px var(--color-success-bg);
}

.form-error {
  display: block;
  color: var(--color-error);
  font-size: var(--text-sm);
  margin-top: var(--spacing-xs);
}

.checkbox-label,
.radio-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  cursor: pointer;
  margin-bottom: var(--spacing-sm);
}

.form-checkbox,
.form-radio {
  width: 18px;
  height: 18px;
  accent-color: var(--color-primary);
  cursor: pointer;
}

/* Badges */
.badge-group,
.tag-group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  align-items: center;
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  border-radius: var(--radius-full);
  text-transform: uppercase;
}

.badge-primary {
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

.badge-secondary {
  background: rgba(6, 182, 212, 0.1);
  color: var(--color-secondary);
}

.badge-accent {
  background: rgba(245, 158, 11, 0.1);
  color: var(--color-accent);
}

.badge-success {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.badge-warning {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.badge-error {
  background: var(--color-error-bg);
  color: var(--color-error);
}

.badge-info {
  background: var(--color-info-bg);
  color: var(--color-info);
}

/* Tags */
.tag {
  display: inline-flex;
  align-items: center;
  padding: var(--spacing-xs) var(--spacing-md);
  font-size: var(--text-sm);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
}

.tag-closable {
  padding-right: var(--spacing-xs);
}

.tag-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  margin-left: var(--spacing-xs);
  background: none;
  border: none;
  border-radius: var(--radius-full);
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: var(--text-base);
}

.tag-close:hover {
  background: var(--color-border);
  color: var(--color-text);
}

/* Dots */
.dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: var(--radius-full);
}

.dot-success {
  background: var(--color-success);
}

.dot-warning {
  background: var(--color-warning);
}

.dot-error {
  background: var(--color-error);
}

.dot-info {
  background: var(--color-info);
}

/* Alerts */
.alert-stack {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.alert {
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: var(--radius-md);
  border-left: 4px solid;
}

.alert-success {
  background: var(--color-success-bg);
  border-color: var(--color-success);
  color: var(--color-success);
}

.alert-warning {
  background: var(--color-warning-bg);
  border-color: var(--color-warning);
  color: #92400e;
}

.alert-error {
  background: var(--color-error-bg);
  border-color: var(--color-error);
  color: var(--color-error);
}

.alert-info {
  background: var(--color-info-bg);
  border-color: var(--color-info);
  color: var(--color-info);
}

/* Shadows */
.shadow-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: var(--spacing-xl);
}

.shadow-demo {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100px;
  background: var(--color-card);
  border-radius: var(--radius-lg);
  font-family: var(--font-family-mono);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.shadow-sm {
  box-shadow: var(--shadow-sm);
}

.shadow-md {
  box-shadow: var(--shadow-md);
}

.shadow-lg {
  box-shadow: var(--shadow-lg);
}

.shadow-xl {
  box-shadow: var(--shadow-xl);
}

/* Spacing */
.spacing-demo {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.spacing-item {
  height: 40px;
  background: var(--color-primary);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  position: relative;
}

.spacing-item span {
  position: absolute;
  left: calc(100% + var(--spacing-md));
  white-space: nowrap;
  font-family: var(--font-family-mono);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

/* Radius */
.radius-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: var(--spacing-lg);
}

.radius-demo {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100px;
  background: var(--color-primary);
  color: white;
  font-family: var(--font-family-mono);
  font-size: var(--text-sm);
}

.radius-demo-circle {
  width: 100px;
  height: 100px;
}

/* Footer */
.footer {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--color-text-secondary);
  border-top: 1px solid var(--color-border);
  margin-top: var(--spacing-2xl);
}
</style>
