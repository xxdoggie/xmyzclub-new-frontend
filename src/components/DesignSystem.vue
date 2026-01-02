<script setup lang="ts">
import { ref, computed } from 'vue'

const isDark = ref(false)
const activeTab = ref('home')

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
const switchValue = ref(true)
const switchValue2 = ref(false)

// 自定义下拉框
const clubOptions = [
  { value: '', label: '请选择社团' },
  { value: '1', label: '技术部' },
  { value: '2', label: '宣传部' },
  { value: '3', label: '文艺部' },
  { value: '4', label: '体育部' },
  { value: '5', label: '外联部' },
]
const selectedClub = ref('')
const isDropdownOpen = ref(false)
const selectedClubLabel = computed(() => {
  const option = clubOptions.find(o => o.value === selectedClub.value)
  return option?.label || '请选择社团'
})

function selectOption(value: string) {
  selectedClub.value = value
  isDropdownOpen.value = false
}

function toggleDropdown() {
  isDropdownOpen.value = !isDropdownOpen.value
}

// 点击外部关闭下拉框
function closeDropdown() {
  isDropdownOpen.value = false
}
</script>

<template>
  <div class="design-system">
    <!-- 头部 -->
    <header class="header">
      <div class="header-content">
        <h1 class="title">XMYZ Club</h1>
        <p class="subtitle">设计规范 v1.0</p>
        <button class="btn btn-secondary btn-touch" @click="toggleTheme">
          {{ isDark ? '亮色模式' : '暗色模式' }}
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
          <div class="color-scroll">
            <div v-for="color in primaryColors" :key="color.var" class="color-card">
              <div
                class="color-preview"
                :style="{ backgroundColor: `var(${color.var})` }"
              ></div>
              <div class="color-info">
                <span class="color-name">{{ color.name }}</span>
                <code class="color-value">{{ color.value }}</code>
              </div>
            </div>
          </div>
        </div>

        <!-- 辅助色 -->
        <div class="color-group">
          <h3 class="group-title">辅助色系</h3>
          <div class="color-scroll">
            <div v-for="color in secondaryColors" :key="color.var" class="color-card">
              <div
                class="color-preview"
                :style="{ backgroundColor: `var(${color.var})` }"
              ></div>
              <div class="color-info">
                <span class="color-name">{{ color.name }}</span>
                <code class="color-value">{{ color.value }}</code>
              </div>
            </div>
          </div>
        </div>

        <!-- 中性色 -->
        <div class="color-group">
          <h3 class="group-title">中性色</h3>
          <div class="color-scroll">
            <div v-for="color in neutralColors" :key="color.var" class="color-card">
              <div
                class="color-preview"
                :style="{ backgroundColor: `var(${color.var})` }"
              ></div>
              <div class="color-info">
                <span class="color-name">{{ color.name }}</span>
                <code class="color-value">{{ color.value }}</code>
              </div>
            </div>
          </div>
        </div>

        <!-- 状态色 -->
        <div class="color-group">
          <h3 class="group-title">状态色</h3>
          <div class="color-scroll">
            <div v-for="color in statusColors" :key="color.var" class="color-card">
              <div
                class="color-preview"
                :style="{ backgroundColor: `var(${color.var})` }"
              ></div>
              <div class="color-info">
                <span class="color-name">{{ color.name }}</span>
                <code class="color-value">{{ color.value }}</code>
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
            <h1 class="demo-h1">H1 厦门一中</h1>
            <h2 class="demo-h2">H2 学生社区</h2>
            <h3 class="demo-h3">H3 社团活动公告</h3>
            <h4 class="demo-h4">H4 最新动态</h4>
            <p class="demo-body">正文 - 厦门一中学生社区是一个面向全校学生的综合性平台。</p>
            <p class="demo-secondary">次要文字 - 本平台由学生会技术部维护</p>
            <p class="demo-small">小字 - 更新于 2024年1月</p>
          </div>
        </div>
      </section>

      <!-- 按钮 -->
      <section class="section">
        <h2 class="section-title">按钮组件</h2>

        <!-- 基础按钮 -->
        <div class="card">
          <h3 class="card-title">基础按钮</h3>
          <div class="button-stack">
            <button class="btn btn-primary btn-block btn-touch">主要按钮</button>
            <button class="btn btn-secondary btn-block btn-touch">次要按钮</button>
            <button class="btn btn-outline btn-block btn-touch">描边按钮</button>
          </div>
          <div class="button-group">
            <button class="btn btn-ghost btn-touch">幽灵按钮</button>
            <button class="btn btn-link btn-touch">链接按钮</button>
          </div>
        </div>

        <!-- 状态按钮 -->
        <div class="card">
          <h3 class="card-title">状态按钮</h3>
          <div class="button-grid">
            <button class="btn btn-success btn-touch">成功</button>
            <button class="btn btn-warning btn-touch">警告</button>
            <button class="btn btn-error btn-touch">错误</button>
            <button class="btn btn-info btn-touch">信息</button>
          </div>
        </div>

        <!-- 按钮尺寸 -->
        <div class="card">
          <h3 class="card-title">按钮尺寸</h3>
          <div class="button-stack">
            <button class="btn btn-primary btn-sm btn-block">小按钮 (sm)</button>
            <button class="btn btn-primary btn-block btn-touch">默认按钮</button>
            <button class="btn btn-primary btn-lg btn-block">大按钮 (lg)</button>
          </div>
        </div>

        <!-- 圆角按钮 -->
        <div class="card">
          <h3 class="card-title">特殊按钮</h3>
          <div class="button-group">
            <button class="btn btn-primary btn-rounded btn-touch">圆角按钮</button>
            <button class="btn btn-primary btn-icon btn-touch">+</button>
            <button class="btn btn-secondary btn-icon btn-touch">
              <span class="icon-heart"></span>
            </button>
          </div>
        </div>
      </section>

      <!-- 表单 -->
      <section class="section">
        <h2 class="section-title">表单组件</h2>

        <div class="card">
          <h3 class="card-title">输入框</h3>
          <div class="form-group">
            <label class="form-label">用户名</label>
            <input type="text" class="form-input" placeholder="请输入用户名..." v-model="inputValue" />
          </div>
          <div class="form-group">
            <label class="form-label">密码</label>
            <input type="password" class="form-input" placeholder="请输入密码..." />
          </div>
          <div class="form-group">
            <label class="form-label">错误状态</label>
            <input type="text" class="form-input form-input-error" placeholder="请输入正确的内容" />
            <span class="form-error">请输入有效的邮箱地址</span>
          </div>
        </div>

        <div class="card">
          <h3 class="card-title">文本域</h3>
          <div class="form-group">
            <label class="form-label">活动描述</label>
            <textarea class="form-textarea" placeholder="请输入详细描述..." rows="4"></textarea>
          </div>
        </div>

        <div class="card">
          <h3 class="card-title">选择框</h3>
          <div class="form-group">
            <label class="form-label">选择社团</label>
            <!-- 自定义下拉框 -->
            <div class="custom-select" @click.stop>
              <button
                class="custom-select-trigger"
                :class="{ 'is-open': isDropdownOpen, 'has-value': selectedClub }"
                @click="toggleDropdown"
              >
                <span class="custom-select-value">{{ selectedClubLabel }}</span>
                <span class="custom-select-arrow"></span>
              </button>
              <Transition name="dropdown">
                <div v-if="isDropdownOpen" class="custom-select-dropdown">
                  <div
                    v-for="option in clubOptions"
                    :key="option.value"
                    class="custom-select-option"
                    :class="{ 'is-selected': selectedClub === option.value, 'is-placeholder': !option.value }"
                    @click="selectOption(option.value)"
                  >
                    <span>{{ option.label }}</span>
                    <span v-if="selectedClub === option.value" class="custom-select-check">✓</span>
                  </div>
                </div>
              </Transition>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">多选标签</label>
            <div class="select-tags">
              <span class="select-tag">
                技术部
                <button class="select-tag-remove">&times;</button>
              </span>
              <span class="select-tag">
                宣传部
                <button class="select-tag-remove">&times;</button>
              </span>
              <input type="text" class="select-tags-input" placeholder="添加更多..." />
            </div>
          </div>
        </div>

        <div class="card">
          <h3 class="card-title">开关</h3>
          <div class="toggle-group">
            <!-- 方形开关带文字 -->
            <div class="toggle-item">
              <span class="toggle-label">接收通知</span>
              <button
                class="toggle"
                :class="{ 'toggle-on': switchValue }"
                @click="switchValue = !switchValue"
                role="switch"
                :aria-checked="switchValue"
              >
                <span class="toggle-track">
                  <span class="toggle-text toggle-text-on">开</span>
                  <span class="toggle-text toggle-text-off">关</span>
                </span>
                <span class="toggle-handle"></span>
              </button>
            </div>
            <div class="toggle-item">
              <span class="toggle-label">暗色模式</span>
              <button
                class="toggle"
                :class="{ 'toggle-on': isDark }"
                @click="toggleTheme"
                role="switch"
                :aria-checked="isDark"
              >
                <span class="toggle-track">
                  <span class="toggle-text toggle-text-on">开</span>
                  <span class="toggle-text toggle-text-off">关</span>
                </span>
                <span class="toggle-handle"></span>
              </button>
            </div>
            <div class="toggle-item">
              <span class="toggle-label">自动更新（禁用）</span>
              <button
                class="toggle toggle-disabled"
                disabled
                role="switch"
                aria-checked="false"
              >
                <span class="toggle-track">
                  <span class="toggle-text toggle-text-on">开</span>
                  <span class="toggle-text toggle-text-off">关</span>
                </span>
                <span class="toggle-handle"></span>
              </button>
            </div>
          </div>
        </div>

        <div class="card">
          <h3 class="card-title">开关变体</h3>
          <div class="toggle-group">
            <!-- 小尺寸开关 -->
            <div class="toggle-item">
              <span class="toggle-label">小尺寸开关</span>
              <button
                class="toggle toggle-sm"
                :class="{ 'toggle-on': switchValue2 }"
                @click="switchValue2 = !switchValue2"
                role="switch"
                :aria-checked="switchValue2"
              >
                <span class="toggle-handle"></span>
              </button>
            </div>
            <!-- 带图标的开关 -->
            <div class="toggle-item">
              <span class="toggle-label">带状态色的开关</span>
              <button
                class="toggle toggle-success"
                :class="{ 'toggle-on': switchValue }"
                @click="switchValue = !switchValue"
                role="switch"
                :aria-checked="switchValue"
              >
                <span class="toggle-track">
                  <span class="toggle-text toggle-text-on">✓</span>
                  <span class="toggle-text toggle-text-off">✕</span>
                </span>
                <span class="toggle-handle"></span>
              </button>
            </div>
          </div>
        </div>

        <div class="card">
          <h3 class="card-title">复选框</h3>
          <div class="check-group">
            <label class="checkbox-label">
              <input type="checkbox" class="form-checkbox" v-model="checkboxValue" />
              <span class="checkbox-custom"></span>
              <span class="checkbox-text">同意用户协议</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" class="form-checkbox" checked />
              <span class="checkbox-custom"></span>
              <span class="checkbox-text">接收推送消息</span>
            </label>
            <label class="checkbox-label checkbox-disabled">
              <input type="checkbox" class="form-checkbox" disabled />
              <span class="checkbox-custom"></span>
              <span class="checkbox-text">禁用选项</span>
            </label>
          </div>
        </div>

        <div class="card">
          <h3 class="card-title">单选框</h3>
          <div class="check-group">
            <label class="radio-label">
              <input type="radio" name="demo" class="form-radio" v-model="radioValue" value="option1" />
              <span class="radio-custom"></span>
              <span class="radio-text">选项一</span>
            </label>
            <label class="radio-label">
              <input type="radio" name="demo" class="form-radio" v-model="radioValue" value="option2" />
              <span class="radio-custom"></span>
              <span class="radio-text">选项二</span>
            </label>
            <label class="radio-label">
              <input type="radio" name="demo" class="form-radio" v-model="radioValue" value="option3" />
              <span class="radio-custom"></span>
              <span class="radio-text">选项三</span>
            </label>
          </div>
        </div>
      </section>

      <!-- 卡片 -->
      <section class="section">
        <h2 class="section-title">卡片组件</h2>
        <div class="card-stack">
          <div class="card card-interactive">
            <h3 class="card-title">基础卡片</h3>
            <p class="card-content">这是一个基础卡片组件，点击有反馈效果。可以用于展示社团信息、活动详情等内容。</p>
            <div class="card-footer">
              <button class="btn btn-primary btn-touch btn-block">了解更多</button>
            </div>
          </div>

          <div class="card card-interactive">
            <div class="card-badge">新</div>
            <h3 class="card-title">带徽章卡片</h3>
            <p class="card-content">卡片可以包含徽章，用于标记新内容、热门活动等。</p>
            <div class="card-footer">
              <button class="btn btn-outline btn-touch btn-block">查看详情</button>
            </div>
          </div>

          <div class="card card-interactive card-featured">
            <h3 class="card-title">特色卡片</h3>
            <p class="card-content">带有主色边框的特色卡片，用于突出重要内容。</p>
            <div class="card-footer card-footer-split">
              <button class="btn btn-ghost btn-touch">取消</button>
              <button class="btn btn-primary btn-touch">立即参与</button>
            </div>
          </div>
        </div>
      </section>

      <!-- 列表项 -->
      <section class="section">
        <h2 class="section-title">列表项</h2>
        <div class="list-card">
          <div class="list-item list-item-interactive">
            <div class="list-item-content">
              <div class="list-item-title">社团活动通知</div>
              <div class="list-item-desc">技术部本周六举办编程马拉松</div>
            </div>
            <div class="list-item-arrow"></div>
          </div>
          <div class="list-item list-item-interactive">
            <div class="list-item-avatar">
              <span>李</span>
            </div>
            <div class="list-item-content">
              <div class="list-item-title">李同学</div>
              <div class="list-item-desc">技术部 · 部长</div>
            </div>
            <div class="list-item-action">
              <button class="btn btn-primary btn-sm btn-touch">关注</button>
            </div>
          </div>
          <div class="list-item list-item-interactive">
            <div class="list-item-icon list-item-icon-primary">
              <span>!</span>
            </div>
            <div class="list-item-content">
              <div class="list-item-title">系统消息</div>
              <div class="list-item-desc">您有3条未读消息</div>
            </div>
            <div class="list-item-badge">3</div>
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
            <span class="tag tag-touch">技术部</span>
            <span class="tag tag-touch">宣传部</span>
            <span class="tag tag-touch">文艺部</span>
            <span class="tag tag-closable tag-touch">
              可关闭
              <button class="tag-close">&times;</button>
            </span>
          </div>
        </div>

        <div class="card">
          <h3 class="card-title">状态指示</h3>
          <div class="status-group">
            <span class="status status-online">
              <span class="status-dot"></span>
              在线
            </span>
            <span class="status status-busy">
              <span class="status-dot"></span>
              忙碌
            </span>
            <span class="status status-offline">
              <span class="status-dot"></span>
              离线
            </span>
          </div>
        </div>
      </section>

      <!-- 提示框 -->
      <section class="section">
        <h2 class="section-title">提示框</h2>
        <div class="alert-stack">
          <div class="alert alert-success">
            <div class="alert-icon">&#10003;</div>
            <div class="alert-content">
              <strong>成功！</strong> 您的操作已完成。
            </div>
          </div>
          <div class="alert alert-warning">
            <div class="alert-icon">!</div>
            <div class="alert-content">
              <strong>警告！</strong> 请检查输入内容。
            </div>
          </div>
          <div class="alert alert-error">
            <div class="alert-icon">&times;</div>
            <div class="alert-content">
              <strong>错误！</strong> 操作失败，请重试。
            </div>
          </div>
          <div class="alert alert-info">
            <div class="alert-icon">i</div>
            <div class="alert-content">
              <strong>提示：</strong> 可在个人中心修改设置。
            </div>
          </div>
        </div>
      </section>

      <!-- 移动端专属组件 -->
      <section class="section">
        <h2 class="section-title">移动端组件</h2>

        <div class="card">
          <h3 class="card-title">操作栏示例</h3>
          <div class="action-bar-demo">
            <div class="action-bar">
              <button class="action-bar-btn">
                <span class="action-icon">&#9825;</span>
                <span>收藏</span>
              </button>
              <button class="action-bar-btn">
                <span class="action-icon">&#8635;</span>
                <span>分享</span>
              </button>
              <button class="action-bar-btn action-bar-btn-primary">
                <span class="action-icon">+</span>
                <span>报名</span>
              </button>
            </div>
          </div>
        </div>

        <div class="card">
          <h3 class="card-title">分段控制器</h3>
          <div class="segment-control">
            <button
              class="segment-btn"
              :class="{ active: activeTab === 'home' }"
              @click="activeTab = 'home'"
            >首页</button>
            <button
              class="segment-btn"
              :class="{ active: activeTab === 'activity' }"
              @click="activeTab = 'activity'"
            >活动</button>
            <button
              class="segment-btn"
              :class="{ active: activeTab === 'mine' }"
              @click="activeTab = 'mine'"
            >我的</button>
          </div>
        </div>

        <div class="card">
          <h3 class="card-title">底部安全区域</h3>
          <p class="card-content">在有底部导航的页面，需要考虑 iPhone 等设备的安全区域。</p>
          <code class="code-block">padding-bottom: env(safe-area-inset-bottom);</code>
        </div>
      </section>

      <!-- 阴影展示 -->
      <section class="section">
        <h2 class="section-title">阴影系统</h2>
        <div class="shadow-scroll">
          <div class="shadow-demo shadow-sm">
            <span>sm</span>
          </div>
          <div class="shadow-demo shadow-md">
            <span>md</span>
          </div>
          <div class="shadow-demo shadow-lg">
            <span>lg</span>
          </div>
          <div class="shadow-demo shadow-xl">
            <span>xl</span>
          </div>
        </div>
      </section>

      <!-- 圆角展示 -->
      <section class="section">
        <h2 class="section-title">圆角系统</h2>
        <div class="radius-scroll">
          <div class="radius-demo" style="border-radius: var(--radius-sm)">
            <span>sm</span>
          </div>
          <div class="radius-demo" style="border-radius: var(--radius-md)">
            <span>md</span>
          </div>
          <div class="radius-demo" style="border-radius: var(--radius-lg)">
            <span>lg</span>
          </div>
          <div class="radius-demo" style="border-radius: var(--radius-xl)">
            <span>xl</span>
          </div>
          <div class="radius-demo radius-demo-circle" style="border-radius: var(--radius-full)">
            <span>full</span>
          </div>
        </div>
      </section>
    </main>

    <!-- 页脚 -->
    <footer class="footer">
      <p>XMYZ Club Design System</p>
      <p class="footer-sub">&copy; 2024 厦门一中学生社区</p>
    </footer>

    <!-- 悬浮按钮示例 -->
    <button class="fab" aria-label="添加">
      <span>+</span>
    </button>

    <!-- 底部导航示例 -->
    <nav class="bottom-nav">
      <button
        class="bottom-nav-item"
        :class="{ active: activeTab === 'home' }"
        @click="activeTab = 'home'"
      >
        <span class="bottom-nav-icon">&#8962;</span>
        <span class="bottom-nav-label">首页</span>
      </button>
      <button
        class="bottom-nav-item"
        :class="{ active: activeTab === 'activity' }"
        @click="activeTab = 'activity'"
      >
        <span class="bottom-nav-icon">&#9733;</span>
        <span class="bottom-nav-label">活动</span>
      </button>
      <button
        class="bottom-nav-item"
        :class="{ active: activeTab === 'message' }"
        @click="activeTab = 'message'"
      >
        <span class="bottom-nav-icon">&#9993;</span>
        <span class="bottom-nav-label">消息</span>
      </button>
      <button
        class="bottom-nav-item"
        :class="{ active: activeTab === 'mine' }"
        @click="activeTab = 'mine'"
      >
        <span class="bottom-nav-icon">&#9786;</span>
        <span class="bottom-nav-label">我的</span>
      </button>
    </nav>
  </div>
</template>

<style scoped>
/* ===== 基础设置 - 移动端优先 ===== */
.design-system {
  min-height: 100vh;
  background-color: var(--color-bg);
  color: var(--color-text);
  padding-bottom: calc(60px + env(safe-area-inset-bottom, 0px));
  -webkit-tap-highlight-color: transparent;
}

/* ===== Header ===== */
.header {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  color: white;
  padding: var(--spacing-xl) var(--spacing-md);
  padding-top: calc(var(--spacing-xl) + env(safe-area-inset-top, 0px));
  text-align: center;
}

.header-content {
  max-width: 600px;
  margin: 0 auto;
}

.title {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-xs);
}

.subtitle {
  font-size: var(--text-sm);
  opacity: 0.9;
  margin-bottom: var(--spacing-md);
}

/* ===== Main ===== */
.main {
  padding: var(--spacing-md);
  max-width: 600px;
  margin: 0 auto;
}

/* ===== Section ===== */
.section {
  margin-bottom: var(--spacing-xl);
}

.section-title {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-md);
  padding-bottom: var(--spacing-xs);
  border-bottom: 2px solid var(--color-primary);
  display: inline-block;
}

/* ===== Color System - 水平滚动 ===== */
.color-group {
  margin-bottom: var(--spacing-lg);
}

.group-title {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-sm);
  color: var(--color-text-secondary);
}

.color-scroll {
  display: flex;
  gap: var(--spacing-sm);
  overflow-x: auto;
  padding-bottom: var(--spacing-sm);
  margin: 0 calc(-1 * var(--spacing-md));
  padding-left: var(--spacing-md);
  padding-right: var(--spacing-md);
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
}

.color-scroll::-webkit-scrollbar {
  display: none;
}

.color-card {
  flex-shrink: 0;
  width: 120px;
  background: var(--color-card);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-border);
  scroll-snap-align: start;
}

.color-preview {
  height: 60px;
}

.color-info {
  padding: var(--spacing-sm);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.color-name {
  font-weight: var(--font-semibold);
  font-size: var(--text-sm);
}

.color-value {
  font-family: var(--font-family-mono);
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

/* ===== Typography ===== */
.typography-demo {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.demo-h1 {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  line-height: var(--leading-tight);
}

.demo-h2 {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  line-height: var(--leading-tight);
}

.demo-h3 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
}

.demo-h4 {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
}

.demo-body {
  font-size: var(--text-base);
  line-height: var(--leading-relaxed);
}

.demo-secondary {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.demo-small {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
}

/* ===== Card ===== */
.card {
  background: var(--color-card);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-border);
  margin-bottom: var(--spacing-md);
  position: relative;
}

.card-stack {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.card-interactive {
  transition: transform var(--transition-fast);
}

.card-interactive:active {
  transform: scale(0.98);
}

.card-featured {
  border-left: 4px solid var(--color-primary);
}

.card-title {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-sm);
}

.card-content {
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-md);
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
}

.card-footer {
  display: flex;
  gap: var(--spacing-sm);
}

.card-footer-split {
  justify-content: space-between;
}

.card-badge {
  position: absolute;
  top: var(--spacing-sm);
  right: var(--spacing-sm);
  background: var(--color-primary);
  color: white;
  padding: 2px var(--spacing-sm);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
}

/* ===== Buttons - 优化触摸 ===== */
.button-group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  align-items: center;
}

.button-stack {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.button-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-sm);
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
  transition: transform var(--transition-fast), opacity var(--transition-fast);
  text-decoration: none;
  font-family: inherit;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  user-select: none;
}

/* 触摸优化：最小 44px 高度 */
.btn-touch {
  min-height: 44px;
  min-width: 44px;
}

.btn:active {
  transform: scale(0.96);
  opacity: 0.9;
}

.btn:disabled {
  opacity: 0.5;
  pointer-events: none;
}

.btn-block {
  width: 100%;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-secondary {
  background: var(--color-secondary);
  color: white;
}

.btn-outline {
  background: transparent;
  color: var(--color-primary);
  border: 2px solid var(--color-primary);
}

.btn-ghost {
  background: transparent;
  color: var(--color-text);
}

.btn-ghost:active {
  background: var(--color-border);
}

.btn-link {
  background: transparent;
  color: var(--color-primary);
  padding: var(--spacing-sm);
}

.btn-success { background: var(--color-success); color: white; }
.btn-warning { background: var(--color-warning); color: white; }
.btn-error { background: var(--color-error); color: white; }
.btn-info { background: var(--color-info); color: white; }

.btn-sm {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--text-sm);
  min-height: 36px;
}

.btn-lg {
  padding: var(--spacing-md) var(--spacing-xl);
  font-size: var(--text-lg);
  min-height: 52px;
}

.btn-rounded {
  border-radius: var(--radius-full);
  padding-left: var(--spacing-lg);
  padding-right: var(--spacing-lg);
}

.btn-icon {
  width: 48px;
  height: 48px;
  padding: 0;
  border-radius: var(--radius-full);
  font-size: var(--text-xl);
}

/* ===== Form - 增大触摸区域 ===== */
.form-group {
  margin-bottom: var(--spacing-md);
}

.form-label {
  display: block;
  font-weight: var(--font-medium);
  margin-bottom: var(--spacing-xs);
  color: var(--color-text);
  font-size: var(--text-sm);
}

.form-input,
.form-textarea,
.form-select {
  width: 100%;
  padding: var(--spacing-md);
  font-size: 16px; /* 防止 iOS 缩放 */
  font-family: inherit;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-card);
  color: var(--color-text);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  -webkit-appearance: none;
  appearance: none;
}

.form-input,
.form-select {
  min-height: 48px;
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

.form-input-error {
  border-color: var(--color-error);
}

.form-input-error:focus {
  box-shadow: 0 0 0 3px var(--color-error-bg);
}

.form-error {
  display: block;
  color: var(--color-error);
  font-size: var(--text-sm);
  margin-top: var(--spacing-xs);
}

.form-select {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right var(--spacing-md) center;
  padding-right: var(--spacing-2xl);
}

/* ===== Custom Select 自定义下拉框 ===== */
.custom-select {
  position: relative;
  width: 100%;
}

.custom-select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 48px;
  padding: var(--spacing-md);
  font-size: 16px;
  font-family: inherit;
  text-align: left;
  background: var(--color-card);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-placeholder);
  cursor: pointer;
  transition: all var(--transition-fast);
  -webkit-tap-highlight-color: transparent;
}

.custom-select-trigger.has-value {
  color: var(--color-text);
}

.custom-select-trigger.is-open {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-bg);
}

.custom-select-trigger:active {
  transform: scale(0.99);
}

.custom-select-value {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.custom-select-arrow {
  width: 0;
  height: 0;
  margin-left: var(--spacing-sm);
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid var(--color-text-secondary);
  transition: transform var(--transition-fast);
}

.custom-select-trigger.is-open .custom-select-arrow {
  transform: rotate(180deg);
}

.custom-select-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--color-card);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  z-index: 100;
  max-height: 240px;
  overflow-y: auto;
}

.custom-select-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md);
  min-height: 48px;
  cursor: pointer;
  transition: background var(--transition-fast);
  -webkit-tap-highlight-color: transparent;
}

.custom-select-option:active {
  background: var(--color-bg);
}

.custom-select-option.is-selected {
  color: var(--color-primary);
  font-weight: var(--font-medium);
}

.custom-select-option.is-placeholder {
  color: var(--color-text-secondary);
}

.custom-select-check {
  color: var(--color-primary);
  font-weight: var(--font-bold);
}

/* Dropdown 动画 */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all var(--transition-fast);
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* 多选标签 */
.select-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm);
  min-height: 48px;
  background: var(--color-card);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: border-color var(--transition-fast);
}

.select-tags:focus-within {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-bg);
}

.select-tag {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--color-primary-bg);
  color: var(--color-primary);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.select-tag-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  background: none;
  border: none;
  color: var(--color-primary);
  cursor: pointer;
  font-size: var(--text-base);
  opacity: 0.7;
  transition: opacity var(--transition-fast);
}

.select-tag-remove:active {
  opacity: 1;
}

.select-tags-input {
  flex: 1;
  min-width: 100px;
  border: none;
  background: transparent;
  font-size: 16px;
  font-family: inherit;
  color: var(--color-text);
  outline: none;
}

.select-tags-input::placeholder {
  color: var(--color-text-placeholder);
}

/* ===== Toggle 开关 ===== */
.toggle-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.toggle-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) 0;
  min-height: 52px;
}

.toggle-label {
  font-size: var(--text-base);
  color: var(--color-text);
}

.toggle {
  position: relative;
  width: 60px;
  height: 32px;
  background: var(--color-border);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  padding: 0;
  overflow: hidden;
  -webkit-tap-highlight-color: transparent;
}

.toggle:active {
  transform: scale(0.96);
}

.toggle-on {
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.toggle-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toggle-disabled:active {
  transform: none;
}

.toggle-track {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
}

.toggle-text {
  position: absolute;
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  transition: opacity var(--transition-fast);
}

.toggle-text-on {
  left: 8px;
  color: white;
  opacity: 0;
}

.toggle-text-off {
  right: 8px;
  color: var(--color-text-secondary);
  opacity: 1;
}

.toggle-on .toggle-text-on {
  opacity: 1;
}

.toggle-on .toggle-text-off {
  opacity: 0;
}

.toggle-handle {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 24px;
  height: 24px;
  background: white;
  border-radius: var(--radius-xs);
  box-shadow: var(--shadow-sm);
  transition: transform var(--transition-fast);
}

.toggle-on .toggle-handle {
  transform: translateX(28px);
}

/* 小尺寸开关 */
.toggle-sm {
  width: 44px;
  height: 24px;
}

.toggle-sm .toggle-handle {
  width: 18px;
  height: 18px;
  top: 1px;
  left: 1px;
}

.toggle-sm.toggle-on .toggle-handle {
  transform: translateX(20px);
}

/* 成功色开关 */
.toggle-success.toggle-on {
  background: var(--color-success);
  border-color: var(--color-success);
}

/* ===== Checkbox & Radio - 自定义样式 ===== */
.check-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.checkbox-label,
.radio-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  cursor: pointer;
  padding: var(--spacing-sm) 0;
  min-height: 48px;
  -webkit-tap-highlight-color: transparent;
}

.checkbox-disabled {
  opacity: 0.5;
  pointer-events: none;
}

.form-checkbox,
.form-radio {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.checkbox-custom,
.radio-custom {
  width: 24px;
  height: 24px;
  border: 2px solid var(--color-border);
  background: var(--color-card);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.checkbox-custom {
  border-radius: var(--radius-sm);
}

.radio-custom {
  border-radius: var(--radius-full);
}

.form-checkbox:checked + .checkbox-custom,
.form-radio:checked + .radio-custom {
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.form-checkbox:checked + .checkbox-custom::after {
  content: '✓';
  color: white;
  font-size: 14px;
  font-weight: bold;
}

.form-radio:checked + .radio-custom::after {
  content: '';
  width: 10px;
  height: 10px;
  background: white;
  border-radius: var(--radius-full);
}

.checkbox-text,
.radio-text {
  font-size: var(--text-base);
}

/* ===== List ===== */
.list-card {
  background: var(--color-card);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-border);
}

.list-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
  min-height: 60px;
}

.list-item:last-child {
  border-bottom: none;
}

.list-item-interactive {
  transition: background var(--transition-fast);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.list-item-interactive:active {
  background: var(--color-bg);
}

.list-item-avatar {
  width: 40px;
  height: 40px;
  background: var(--color-primary);
  color: white;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-semibold);
  flex-shrink: 0;
}

.list-item-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-bold);
  flex-shrink: 0;
}

.list-item-icon-primary {
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

.list-item-content {
  flex: 1;
  min-width: 0;
}

.list-item-title {
  font-weight: var(--font-medium);
  font-size: var(--text-base);
  margin-bottom: 2px;
}

.list-item-desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.list-item-arrow {
  width: 8px;
  height: 8px;
  border-right: 2px solid var(--color-text-placeholder);
  border-bottom: 2px solid var(--color-text-placeholder);
  transform: rotate(-45deg);
  flex-shrink: 0;
}

.list-item-badge {
  background: var(--color-error);
  color: white;
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  min-width: 20px;
  text-align: center;
}

.list-item-action {
  flex-shrink: 0;
}

/* ===== Badges ===== */
.badge-group,
.tag-group,
.status-group {
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
}

.badge-primary { background: var(--color-primary-bg); color: var(--color-primary); }
.badge-secondary { background: rgba(6, 182, 212, 0.1); color: var(--color-secondary); }
.badge-accent { background: rgba(245, 158, 11, 0.1); color: var(--color-accent); }
.badge-success { background: var(--color-success-bg); color: var(--color-success); }
.badge-warning { background: var(--color-warning-bg); color: var(--color-warning); }
.badge-error { background: var(--color-error-bg); color: var(--color-error); }
.badge-info { background: var(--color-info-bg); color: var(--color-info); }

/* ===== Tags ===== */
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

.tag-touch {
  min-height: 36px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.tag-touch:active {
  background: var(--color-border);
}

.tag-closable {
  padding-right: var(--spacing-xs);
}

.tag-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-left: var(--spacing-xs);
  background: none;
  border: none;
  border-radius: var(--radius-full);
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: var(--text-lg);
}

.tag-close:active {
  background: var(--color-border);
}

/* ===== Status ===== */
.status {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--text-sm);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
}

.status-online .status-dot { background: var(--color-success); }
.status-busy .status-dot { background: var(--color-warning); }
.status-offline .status-dot { background: var(--color-text-placeholder); }

/* ===== Alerts ===== */
.alert-stack {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.alert {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
}

.alert-icon {
  width: 24px;
  height: 24px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-bold);
  font-size: var(--text-sm);
  flex-shrink: 0;
}

.alert-content {
  flex: 1;
  line-height: var(--leading-relaxed);
}

.alert-success {
  background: var(--color-success-bg);
  color: var(--color-success);
}
.alert-success .alert-icon { background: var(--color-success); color: white; }

.alert-warning {
  background: var(--color-warning-bg);
  color: #92400e;
}
.alert-warning .alert-icon { background: var(--color-warning); color: white; }

.alert-error {
  background: var(--color-error-bg);
  color: var(--color-error);
}
.alert-error .alert-icon { background: var(--color-error); color: white; }

.alert-info {
  background: var(--color-info-bg);
  color: var(--color-info);
}
.alert-info .alert-icon { background: var(--color-info); color: white; }

/* ===== Mobile Components ===== */
.action-bar-demo {
  margin: 0 calc(-1 * var(--spacing-md));
  margin-bottom: calc(-1 * var(--spacing-md));
  margin-top: var(--spacing-sm);
}

.action-bar {
  display: flex;
  border-top: 1px solid var(--color-border);
}

.action-bar-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: var(--spacing-sm);
  min-height: 56px;
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-size: var(--text-xs);
  cursor: pointer;
  transition: background var(--transition-fast);
  -webkit-tap-highlight-color: transparent;
}

.action-bar-btn:active {
  background: var(--color-bg);
}

.action-bar-btn-primary {
  color: var(--color-primary);
}

.action-icon {
  font-size: var(--text-xl);
}

.segment-control {
  display: flex;
  background: var(--color-bg);
  border-radius: var(--radius-md);
  padding: 4px;
}

.segment-btn {
  flex: 1;
  padding: var(--spacing-sm) var(--spacing-md);
  min-height: 40px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  -webkit-tap-highlight-color: transparent;
}

.segment-btn.active {
  background: var(--color-card);
  color: var(--color-primary);
  box-shadow: var(--shadow-sm);
}

.code-block {
  display: block;
  background: var(--color-bg);
  padding: var(--spacing-sm);
  border-radius: var(--radius-sm);
  font-family: var(--font-family-mono);
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  overflow-x: auto;
}

/* ===== Shadow & Radius - 水平滚动 ===== */
.shadow-scroll,
.radius-scroll {
  display: flex;
  gap: var(--spacing-md);
  overflow-x: auto;
  padding-bottom: var(--spacing-sm);
  margin: 0 calc(-1 * var(--spacing-md));
  padding-left: var(--spacing-md);
  padding-right: var(--spacing-md);
  -webkit-overflow-scrolling: touch;
}

.shadow-scroll::-webkit-scrollbar,
.radius-scroll::-webkit-scrollbar {
  display: none;
}

.shadow-demo {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  background: var(--color-card);
  border-radius: var(--radius-lg);
  font-family: var(--font-family-mono);
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.shadow-sm { box-shadow: var(--shadow-sm); }
.shadow-md { box-shadow: var(--shadow-md); }
.shadow-lg { box-shadow: var(--shadow-lg); }
.shadow-xl { box-shadow: var(--shadow-xl); }

.radius-demo {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  background: var(--color-primary);
  color: white;
  font-family: var(--font-family-mono);
  font-size: var(--text-xs);
}

.radius-demo-circle {
  width: 80px;
  height: 80px;
}

/* ===== FAB ===== */
.fab {
  position: fixed;
  right: var(--spacing-md);
  bottom: calc(80px + env(safe-area-inset-bottom, 0px));
  width: 56px;
  height: 56px;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  color: white;
  border: none;
  box-shadow: var(--shadow-lg);
  font-size: var(--text-2xl);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
  -webkit-tap-highlight-color: transparent;
  z-index: 100;
}

.fab:active {
  transform: scale(0.92);
  box-shadow: var(--shadow-md);
}

/* ===== Bottom Navigation ===== */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  background: var(--color-card);
  border-top: 1px solid var(--color-border);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  z-index: 1000;
}

.bottom-nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: var(--spacing-sm) 0;
  min-height: 56px;
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-size: var(--text-xs);
  cursor: pointer;
  transition: color var(--transition-fast);
  -webkit-tap-highlight-color: transparent;
}

.bottom-nav-item.active {
  color: var(--color-primary);
}

.bottom-nav-icon {
  font-size: var(--text-xl);
}

.bottom-nav-label {
  font-weight: var(--font-medium);
}

/* ===== Footer ===== */
.footer {
  text-align: center;
  padding: var(--spacing-xl) var(--spacing-md);
  padding-bottom: calc(var(--spacing-xl) + 60px);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.footer-sub {
  font-size: var(--text-xs);
  margin-top: var(--spacing-xs);
}

/* ===== Desktop Overrides ===== */
@media (min-width: 768px) {
  .header {
    padding: var(--spacing-2xl);
  }

  .title {
    font-size: var(--text-4xl);
  }

  .subtitle {
    font-size: var(--text-lg);
  }

  .main {
    padding: var(--spacing-2xl);
    max-width: 800px;
  }

  .section-title {
    font-size: var(--text-2xl);
  }

  .color-scroll {
    flex-wrap: wrap;
    overflow-x: visible;
    margin: 0;
    padding-left: 0;
    padding-right: 0;
  }

  .color-card {
    width: 160px;
  }

  .card {
    padding: var(--spacing-lg);
  }

  .button-grid {
    grid-template-columns: repeat(4, 1fr);
  }

  .btn-block {
    width: auto;
  }

  .shadow-scroll,
  .radius-scroll {
    flex-wrap: wrap;
    overflow-x: visible;
    margin: 0;
    padding-left: 0;
    padding-right: 0;
  }

  .fab,
  .bottom-nav {
    display: none;
  }

  .design-system {
    padding-bottom: 0;
  }

  .footer {
    padding-bottom: var(--spacing-xl);
  }

  /* Desktop hover effects */
  .btn:hover:not(:disabled) {
    opacity: 0.9;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--color-primary-light);
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--color-secondary-light);
  }

  .card-interactive:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
  }

  .card-interactive:active {
    transform: translateY(-2px);
  }

  .list-item-interactive:hover {
    background: var(--color-bg);
  }
}
</style>
