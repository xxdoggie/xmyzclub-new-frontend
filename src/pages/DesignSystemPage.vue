<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'

const isDark = ref(document.documentElement.classList.contains('dark'))
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

// ===== 分段控制器 - 带滑动动画 =====
const segmentTabs = [
  { key: 'home', label: '首页' },
  { key: 'activity', label: '活动' },
  { key: 'mine', label: '我的' },
]
const segmentRef = ref<HTMLElement | null>(null)
const sliderStyle = ref({ left: '0px', width: '0px' })

function updateSliderPosition() {
  nextTick(() => {
    if (!segmentRef.value) return
    const activeBtn = segmentRef.value.querySelector('.segment-btn.active') as HTMLElement
    if (activeBtn) {
      sliderStyle.value = {
        left: `${activeBtn.offsetLeft}px`,
        width: `${activeBtn.offsetWidth}px`,
      }
    }
  })
}

function setActiveTab(key: string) {
  activeTab.value = key
  updateSliderPosition()
}

onMounted(() => {
  updateSliderPosition()
  window.addEventListener('resize', updateSliderPosition)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateSliderPosition)
})

// ===== Modal 模态框 =====
const showModal = ref(false)
const showModalConfirm = ref(false)

// ===== Toast 消息提示 =====
interface ToastItem {
  id: number
  message: string
  type: 'success' | 'warning' | 'error' | 'info'
}
const toasts = ref<ToastItem[]>([])
let toastId = 0

function showToast(message: string, type: ToastItem['type'] = 'info') {
  const id = ++toastId
  toasts.value.push({ id, message, type })
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }, 3000)
}

// ===== Drawer 抽屉 =====
const showDrawer = ref(false)
const drawerPosition = ref<'left' | 'right' | 'bottom'>('right')

function openDrawer(position: 'left' | 'right' | 'bottom') {
  drawerPosition.value = position
  showDrawer.value = true
}

// ===== Loading 加载 =====
const showLoading = ref(false)

function simulateLoading() {
  showLoading.value = true
  setTimeout(() => {
    showLoading.value = false
  }, 2000)
}

// ===== Progress 进度条 =====
const progressValue = ref(65)

// ===== Tabs 标签页 =====
const tabsValue = ref('tab1')
const tabsList = [
  { key: 'tab1', label: '全部活动' },
  { key: 'tab2', label: '进行中' },
  { key: 'tab3', label: '已结束' },
]

// ===== Collapse 折叠面板 =====
const expandedPanels = ref<string[]>(['panel1'])

function togglePanel(key: string) {
  const index = expandedPanels.value.indexOf(key)
  if (index > -1) {
    expandedPanels.value.splice(index, 1)
  } else {
    expandedPanels.value.push(key)
  }
}

// ===== Tooltip & Popover =====
const showPopover = ref(false)

// ===== Steps 步骤条 =====
const currentStep = ref(1)

// ===== Dropdown 下拉菜单 =====
const showDropdownMenu = ref(false)

// ===== Pagination 分页 =====
const currentPage = ref(1)
const totalPages = 10

function goToPage(page: number) {
  if (page >= 1 && page <= totalPages) {
    currentPage.value = page
  }
}

// ===== Slider 滑块 =====
const sliderValue = ref(50)

// ===== Rate 评分 =====
const rateValue = ref(3)
const hoverRate = ref(0)

// ===== ActionSheet 操作菜单 =====
const showActionSheet = ref(false)

// ===== Notification 通知 =====
interface NotificationItem {
  id: number
  title: string
  message: string
  type: 'success' | 'warning' | 'error' | 'info'
}
const notifications = ref<NotificationItem[]>([])
let notificationId = 0

function showNotification(title: string, message: string, type: NotificationItem['type'] = 'info') {
  const id = ++notificationId
  notifications.value.push({ id, title, message, type })
  setTimeout(() => {
    notifications.value = notifications.value.filter(n => n.id !== id)
  }, 5000)
}

function closeNotification(id: number) {
  notifications.value = notifications.value.filter(n => n.id !== id)
}

// ===== Swiper 轮播 =====
const swiperIndex = ref(0)
const swiperItems = ['轮播图 1', '轮播图 2', '轮播图 3']

function nextSlide() {
  swiperIndex.value = (swiperIndex.value + 1) % swiperItems.length
}

function prevSlide() {
  swiperIndex.value = (swiperIndex.value - 1 + swiperItems.length) % swiperItems.length
}

// ===== ImagePreview 图片预览 =====
const showImagePreview = ref(false)

// ===== Table 表格数据 =====
const tableData = [
  { id: 1, name: '张三', department: '技术部', status: '在线' },
  { id: 2, name: '李四', department: '宣传部', status: '忙碌' },
  { id: 3, name: '王五', department: '文艺部', status: '离线' },
]
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
          <h3 class="card-title">分段控制器（带滑动动画）</h3>
          <div class="segment-control" ref="segmentRef">
            <div class="segment-slider" :style="sliderStyle"></div>
            <button
              v-for="tab in segmentTabs"
              :key="tab.key"
              class="segment-btn"
              :class="{ active: activeTab === tab.key }"
              @click="setActiveTab(tab.key)"
            >{{ tab.label }}</button>
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

      <!-- ==================== 反馈组件 ==================== -->

      <!-- Modal 模态框 -->
      <section class="section">
        <h2 class="section-title">模态框 Modal</h2>
        <div class="card">
          <h3 class="card-title">基础模态框</h3>
          <div class="button-group">
            <button class="btn btn-primary btn-touch" @click="showModal = true">打开模态框</button>
            <button class="btn btn-secondary btn-touch" @click="showModalConfirm = true">确认对话框</button>
          </div>
        </div>
      </section>

      <!-- Toast 消息提示 -->
      <section class="section">
        <h2 class="section-title">消息提示 Toast</h2>
        <div class="card">
          <h3 class="card-title">不同类型的消息</h3>
          <div class="button-grid">
            <button class="btn btn-success btn-touch" @click="showToast('操作成功！', 'success')">成功</button>
            <button class="btn btn-warning btn-touch" @click="showToast('请注意检查', 'warning')">警告</button>
            <button class="btn btn-error btn-touch" @click="showToast('操作失败', 'error')">错误</button>
            <button class="btn btn-info btn-touch" @click="showToast('这是一条提示信息', 'info')">信息</button>
          </div>
        </div>
      </section>

      <!-- Notification 通知 -->
      <section class="section">
        <h2 class="section-title">通知 Notification</h2>
        <div class="card">
          <h3 class="card-title">带标题的通知</h3>
          <div class="button-grid">
            <button class="btn btn-success btn-touch" @click="showNotification('成功', '您的操作已完成', 'success')">成功通知</button>
            <button class="btn btn-error btn-touch" @click="showNotification('错误', '网络连接失败', 'error')">错误通知</button>
          </div>
        </div>
      </section>

      <!-- Loading 加载 -->
      <section class="section">
        <h2 class="section-title">加载 Loading</h2>
        <div class="card">
          <h3 class="card-title">加载状态</h3>
          <div class="loading-demos">
            <div class="loading-demo-item">
              <div class="loading-spinner"></div>
              <span>加载中</span>
            </div>
            <div class="loading-demo-item">
              <div class="loading-dots">
                <span></span><span></span><span></span>
              </div>
              <span>加载中</span>
            </div>
          </div>
          <button class="btn btn-primary btn-touch btn-block" @click="simulateLoading">模拟全屏加载</button>
        </div>
      </section>

      <!-- Drawer 抽屉 -->
      <section class="section">
        <h2 class="section-title">抽屉 Drawer</h2>
        <div class="card">
          <h3 class="card-title">不同方向的抽屉</h3>
          <div class="button-group">
            <button class="btn btn-outline btn-touch" @click="openDrawer('left')">左侧抽屉</button>
            <button class="btn btn-outline btn-touch" @click="openDrawer('right')">右侧抽屉</button>
            <button class="btn btn-outline btn-touch" @click="openDrawer('bottom')">底部抽屉</button>
          </div>
        </div>
      </section>

      <!-- ActionSheet 操作菜单 -->
      <section class="section">
        <h2 class="section-title">操作菜单 ActionSheet</h2>
        <div class="card">
          <button class="btn btn-primary btn-touch btn-block" @click="showActionSheet = true">打开操作菜单</button>
        </div>
      </section>

      <!-- ==================== 数据展示 ==================== -->

      <!-- Progress 进度条 -->
      <section class="section">
        <h2 class="section-title">进度条 Progress</h2>
        <div class="card">
          <h3 class="card-title">线形进度条</h3>
          <div class="progress-demos">
            <div class="progress-item">
              <div class="progress-bar">
                <div class="progress-bar-inner" :style="{ width: progressValue + '%' }"></div>
              </div>
              <span class="progress-text">{{ progressValue }}%</span>
            </div>
            <div class="progress-item">
              <div class="progress-bar progress-bar-success">
                <div class="progress-bar-inner" style="width: 100%"></div>
              </div>
              <span class="progress-text">完成</span>
            </div>
            <div class="progress-item">
              <div class="progress-bar progress-bar-striped">
                <div class="progress-bar-inner" style="width: 45%"></div>
              </div>
              <span class="progress-text">45%</span>
            </div>
          </div>
          <div class="progress-controls">
            <button class="btn btn-sm btn-outline" @click="progressValue = Math.max(0, progressValue - 10)">-10%</button>
            <button class="btn btn-sm btn-outline" @click="progressValue = Math.min(100, progressValue + 10)">+10%</button>
          </div>
        </div>

        <div class="card">
          <h3 class="card-title">环形进度条</h3>
          <div class="progress-circle-demos">
            <div class="progress-circle" :style="{ '--progress': progressValue }">
              <svg viewBox="0 0 100 100">
                <circle class="progress-circle-bg" cx="50" cy="50" r="45"></circle>
                <circle class="progress-circle-bar" cx="50" cy="50" r="45"></circle>
              </svg>
              <span class="progress-circle-text">{{ progressValue }}%</span>
            </div>
            <div class="progress-circle progress-circle-success" style="--progress: 100">
              <svg viewBox="0 0 100 100">
                <circle class="progress-circle-bg" cx="50" cy="50" r="45"></circle>
                <circle class="progress-circle-bar" cx="50" cy="50" r="45"></circle>
              </svg>
              <span class="progress-circle-text">✓</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Skeleton 骨架屏 -->
      <section class="section">
        <h2 class="section-title">骨架屏 Skeleton</h2>
        <div class="card">
          <div class="skeleton-demo">
            <div class="skeleton-avatar"></div>
            <div class="skeleton-content">
              <div class="skeleton-title"></div>
              <div class="skeleton-text"></div>
              <div class="skeleton-text skeleton-text-short"></div>
            </div>
          </div>
          <div class="skeleton-demo">
            <div class="skeleton-image"></div>
          </div>
          <div class="skeleton-demo">
            <div class="skeleton-paragraph">
              <div class="skeleton-line"></div>
              <div class="skeleton-line"></div>
              <div class="skeleton-line skeleton-line-short"></div>
            </div>
          </div>
        </div>
      </section>

      <!-- Tabs 标签页 -->
      <section class="section">
        <h2 class="section-title">标签页 Tabs</h2>
        <div class="card">
          <div class="tabs">
            <div class="tabs-nav">
              <button
                v-for="tab in tabsList"
                :key="tab.key"
                class="tabs-nav-item"
                :class="{ active: tabsValue === tab.key }"
                @click="tabsValue = tab.key"
              >{{ tab.label }}</button>
            </div>
            <div class="tabs-content">
              <div v-if="tabsValue === 'tab1'" class="tabs-pane">
                <p>这里显示全部活动的内容。包括进行中和已结束的所有活动列表。</p>
              </div>
              <div v-if="tabsValue === 'tab2'" class="tabs-pane">
                <p>这里显示正在进行中的活动，可以立即报名参与。</p>
              </div>
              <div v-if="tabsValue === 'tab3'" class="tabs-pane">
                <p>这里显示已经结束的活动，可以查看活动回顾。</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Collapse 折叠面板 -->
      <section class="section">
        <h2 class="section-title">折叠面板 Collapse</h2>
        <div class="collapse-list">
          <div class="collapse-item" :class="{ expanded: expandedPanels.includes('panel1') }">
            <div class="collapse-header" @click="togglePanel('panel1')">
              <span>什么是学生社区？</span>
              <span class="collapse-arrow"></span>
            </div>
            <div class="collapse-content">
              <div class="collapse-body">
                学生社区是厦门一中为全校学生打造的综合性在线平台，提供社团管理、活动报名、信息发布等功能。
              </div>
            </div>
          </div>
          <div class="collapse-item" :class="{ expanded: expandedPanels.includes('panel2') }">
            <div class="collapse-header" @click="togglePanel('panel2')">
              <span>如何加入社团？</span>
              <span class="collapse-arrow"></span>
            </div>
            <div class="collapse-content">
              <div class="collapse-body">
                在社团列表页面找到感兴趣的社团，点击"申请加入"按钮，填写申请表后等待社团负责人审核即可。
              </div>
            </div>
          </div>
          <div class="collapse-item" :class="{ expanded: expandedPanels.includes('panel3') }">
            <div class="collapse-header" @click="togglePanel('panel3')">
              <span>如何发起活动？</span>
              <span class="collapse-arrow"></span>
            </div>
            <div class="collapse-content">
              <div class="collapse-body">
                社团管理员可以在社团管理页面创建新活动，填写活动详情后提交审核，通过后即可发布。
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Empty 空状态 -->
      <section class="section">
        <h2 class="section-title">空状态 Empty</h2>
        <div class="card">
          <div class="empty">
            <div class="empty-image">
              <svg viewBox="0 0 64 64" fill="none">
                <circle cx="32" cy="32" r="30" stroke="currentColor" stroke-width="2" opacity="0.2"/>
                <path d="M20 28h24M20 36h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
              </svg>
            </div>
            <p class="empty-text">暂无数据</p>
            <p class="empty-desc">当前没有任何内容可显示</p>
            <button class="btn btn-primary btn-sm">立即创建</button>
          </div>
        </div>
      </section>

      <!-- Avatar 头像 -->
      <section class="section">
        <h2 class="section-title">头像 Avatar</h2>
        <div class="card">
          <h3 class="card-title">头像尺寸</h3>
          <div class="avatar-group">
            <div class="avatar avatar-xs">小</div>
            <div class="avatar avatar-sm">中</div>
            <div class="avatar">默</div>
            <div class="avatar avatar-lg">大</div>
            <div class="avatar avatar-xl">特</div>
          </div>
        </div>
        <div class="card">
          <h3 class="card-title">头像形状</h3>
          <div class="avatar-group">
            <div class="avatar">圆</div>
            <div class="avatar avatar-square">方</div>
          </div>
        </div>
        <div class="card">
          <h3 class="card-title">头像组</h3>
          <div class="avatar-stack">
            <div class="avatar">A</div>
            <div class="avatar">B</div>
            <div class="avatar">C</div>
            <div class="avatar avatar-more">+5</div>
          </div>
        </div>
      </section>

      <!-- Tooltip 工具提示 -->
      <section class="section">
        <h2 class="section-title">工具提示 Tooltip</h2>
        <div class="card">
          <div class="tooltip-demos">
            <div class="tooltip-wrapper">
              <button class="btn btn-outline btn-touch">上方提示</button>
              <div class="tooltip tooltip-top">这是提示内容</div>
            </div>
            <div class="tooltip-wrapper">
              <button class="btn btn-outline btn-touch">下方提示</button>
              <div class="tooltip tooltip-bottom">这是提示内容</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Popover 气泡卡片 -->
      <section class="section">
        <h2 class="section-title">气泡卡片 Popover</h2>
        <div class="card">
          <div class="popover-wrapper">
            <button class="btn btn-primary btn-touch" @click="showPopover = !showPopover">
              点击弹出
            </button>
            <Transition name="popover">
              <div v-if="showPopover" class="popover">
                <div class="popover-title">这是标题</div>
                <div class="popover-content">这是气泡卡片的内容，可以包含任何元素。</div>
                <div class="popover-footer">
                  <button class="btn btn-sm btn-ghost" @click="showPopover = false">取消</button>
                  <button class="btn btn-sm btn-primary" @click="showPopover = false">确定</button>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </section>

      <!-- Table 表格 -->
      <section class="section">
        <h2 class="section-title">表格 Table</h2>
        <div class="card table-card">
          <div class="table-wrapper">
            <table class="table">
              <thead>
                <tr>
                  <th>姓名</th>
                  <th>部门</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in tableData" :key="row.id">
                  <td>{{ row.name }}</td>
                  <td>{{ row.department }}</td>
                  <td>
                    <span class="status" :class="{
                      'status-online': row.status === '在线',
                      'status-busy': row.status === '忙碌',
                      'status-offline': row.status === '离线'
                    }">
                      <span class="status-dot"></span>
                      {{ row.status }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- ==================== 导航组件 ==================== -->

      <!-- Breadcrumb 面包屑 -->
      <section class="section">
        <h2 class="section-title">面包屑 Breadcrumb</h2>
        <div class="card">
          <nav class="breadcrumb">
            <a href="#" class="breadcrumb-item">首页</a>
            <span class="breadcrumb-separator">/</span>
            <a href="#" class="breadcrumb-item">社团列表</a>
            <span class="breadcrumb-separator">/</span>
            <span class="breadcrumb-item breadcrumb-current">技术部</span>
          </nav>
        </div>
      </section>

      <!-- Steps 步骤条 -->
      <section class="section">
        <h2 class="section-title">步骤条 Steps</h2>
        <div class="card">
          <div class="steps">
            <div class="step" :class="{ active: currentStep >= 1, completed: currentStep > 1 }">
              <div class="step-icon">{{ currentStep > 1 ? '✓' : '1' }}</div>
              <div class="step-content">
                <div class="step-title">填写信息</div>
              </div>
            </div>
            <div class="step-line" :class="{ active: currentStep > 1 }"></div>
            <div class="step" :class="{ active: currentStep >= 2, completed: currentStep > 2 }">
              <div class="step-icon">{{ currentStep > 2 ? '✓' : '2' }}</div>
              <div class="step-content">
                <div class="step-title">审核中</div>
              </div>
            </div>
            <div class="step-line" :class="{ active: currentStep > 2 }"></div>
            <div class="step" :class="{ active: currentStep >= 3 }">
              <div class="step-icon">3</div>
              <div class="step-content">
                <div class="step-title">完成</div>
              </div>
            </div>
          </div>
          <div class="steps-controls">
            <button class="btn btn-outline btn-sm" @click="currentStep = Math.max(1, currentStep - 1)" :disabled="currentStep <= 1">上一步</button>
            <button class="btn btn-primary btn-sm" @click="currentStep = Math.min(3, currentStep + 1)" :disabled="currentStep >= 3">下一步</button>
          </div>
        </div>
      </section>

      <!-- Dropdown 下拉菜单 -->
      <section class="section">
        <h2 class="section-title">下拉菜单 Dropdown</h2>
        <div class="card">
          <div class="dropdown" @click.stop>
            <button class="btn btn-outline btn-touch" @click="showDropdownMenu = !showDropdownMenu">
              更多操作
              <span class="dropdown-arrow" :class="{ open: showDropdownMenu }"></span>
            </button>
            <Transition name="dropdown">
              <div v-if="showDropdownMenu" class="dropdown-menu">
                <button class="dropdown-item" @click="showDropdownMenu = false">编辑</button>
                <button class="dropdown-item" @click="showDropdownMenu = false">复制</button>
                <button class="dropdown-item" @click="showDropdownMenu = false">分享</button>
                <div class="dropdown-divider"></div>
                <button class="dropdown-item dropdown-item-danger" @click="showDropdownMenu = false">删除</button>
              </div>
            </Transition>
          </div>
        </div>
      </section>

      <!-- Pagination 分页 -->
      <section class="section">
        <h2 class="section-title">分页 Pagination</h2>
        <div class="card">
          <div class="pagination">
            <button class="pagination-btn" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">
              <span class="pagination-arrow pagination-arrow-left"></span>
            </button>
            <button
              v-for="page in 5"
              :key="page"
              class="pagination-btn"
              :class="{ active: currentPage === page }"
              @click="goToPage(page)"
            >{{ page }}</button>
            <span class="pagination-ellipsis">...</span>
            <button class="pagination-btn" :class="{ active: currentPage === totalPages }" @click="goToPage(totalPages)">{{ totalPages }}</button>
            <button class="pagination-btn" :disabled="currentPage >= totalPages" @click="goToPage(currentPage + 1)">
              <span class="pagination-arrow pagination-arrow-right"></span>
            </button>
          </div>
          <p class="pagination-info">第 {{ currentPage }} 页，共 {{ totalPages }} 页</p>
        </div>
      </section>

      <!-- ==================== 表单增强 ==================== -->

      <!-- Slider 滑块 -->
      <section class="section">
        <h2 class="section-title">滑块 Slider</h2>
        <div class="card">
          <div class="slider-demo">
            <input
              type="range"
              class="slider"
              v-model.number="sliderValue"
              min="0"
              max="100"
            />
            <span class="slider-value">{{ sliderValue }}</span>
          </div>
        </div>
      </section>

      <!-- Rate 评分 -->
      <section class="section">
        <h2 class="section-title">评分 Rate</h2>
        <div class="card">
          <div class="rate">
            <button
              v-for="i in 5"
              :key="i"
              class="rate-star"
              :class="{ active: i <= (hoverRate || rateValue), hover: i <= hoverRate }"
              @click="rateValue = i"
              @mouseenter="hoverRate = i"
              @mouseleave="hoverRate = 0"
            >★</button>
          </div>
          <p class="rate-text">当前评分: {{ rateValue }} 分</p>
        </div>
      </section>

      <!-- Swiper 轮播 -->
      <section class="section">
        <h2 class="section-title">轮播 Swiper</h2>
        <div class="card swiper-card">
          <div class="swiper">
            <div class="swiper-track" :style="{ transform: `translateX(-${swiperIndex * 100}%)` }">
              <div v-for="(item, index) in swiperItems" :key="index" class="swiper-slide">
                {{ item }}
              </div>
            </div>
            <button class="swiper-btn swiper-btn-prev" @click="prevSlide">‹</button>
            <button class="swiper-btn swiper-btn-next" @click="nextSlide">›</button>
            <div class="swiper-dots">
              <button
                v-for="(_item, index) in swiperItems"
                :key="index"
                class="swiper-dot"
                :class="{ active: swiperIndex === index }"
                @click="swiperIndex = index"
              ></button>
            </div>
          </div>
        </div>
      </section>

      <!-- ImagePreview 图片预览 -->
      <section class="section">
        <h2 class="section-title">图片预览 ImagePreview</h2>
        <div class="card">
          <div class="image-grid">
            <div class="image-item" @click="showImagePreview = true">
              <div class="image-placeholder">点击预览</div>
            </div>
            <div class="image-item">
              <div class="image-placeholder">图片 2</div>
            </div>
            <div class="image-item">
              <div class="image-placeholder">图片 3</div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- 页脚 -->
    <footer class="footer">
      <p>XMYZ Club Design System</p>
      <p class="footer-sub">&copy; 2024 厦门一中学生社区</p>
    </footer>

    <!-- ==================== 全局覆盖层组件 ==================== -->

    <!-- Toast 消息容器 -->
    <Teleport to="body">
      <div class="toast-container">
        <TransitionGroup name="toast">
          <div
            v-for="toast in toasts"
            :key="toast.id"
            class="toast"
            :class="'toast-' + toast.type"
          >
            <span class="toast-icon">
              {{ toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : toast.type === 'warning' ? '!' : 'i' }}
            </span>
            <span class="toast-message">{{ toast.message }}</span>
          </div>
        </TransitionGroup>
      </div>
    </Teleport>

    <!-- Notification 通知容器 -->
    <Teleport to="body">
      <div class="notification-container">
        <TransitionGroup name="notification">
          <div
            v-for="notification in notifications"
            :key="notification.id"
            class="notification"
            :class="'notification-' + notification.type"
          >
            <div class="notification-icon">
              {{ notification.type === 'success' ? '✓' : notification.type === 'error' ? '✕' : notification.type === 'warning' ? '!' : 'i' }}
            </div>
            <div class="notification-content">
              <div class="notification-title">{{ notification.title }}</div>
              <div class="notification-message">{{ notification.message }}</div>
            </div>
            <button class="notification-close" @click="closeNotification(notification.id)">&times;</button>
          </div>
        </TransitionGroup>
      </div>
    </Teleport>

    <!-- Modal 基础模态框 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
          <div class="modal">
            <div class="modal-header">
              <h3 class="modal-title">模态框标题</h3>
              <button class="modal-close" @click="showModal = false">&times;</button>
            </div>
            <div class="modal-body">
              <p>这是一个基础的模态框组件，可以用于显示重要信息、表单或其他内容。</p>
              <p>点击遮罩层或关闭按钮可以关闭模态框。</p>
            </div>
            <div class="modal-footer">
              <button class="btn btn-ghost btn-touch" @click="showModal = false">取消</button>
              <button class="btn btn-primary btn-touch" @click="showModal = false">确定</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Modal 确认对话框 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showModalConfirm" class="modal-overlay" @click.self="showModalConfirm = false">
          <div class="modal modal-confirm">
            <div class="modal-confirm-icon modal-confirm-warning">!</div>
            <h3 class="modal-confirm-title">确认操作</h3>
            <p class="modal-confirm-message">您确定要执行此操作吗？此操作无法撤销。</p>
            <div class="modal-confirm-actions">
              <button class="btn btn-ghost btn-touch btn-block" @click="showModalConfirm = false">取消</button>
              <button class="btn btn-primary btn-touch btn-block" @click="showModalConfirm = false; showToast('操作已确认', 'success')">确定</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Drawer 抽屉 -->
    <Teleport to="body">
      <Transition name="drawer-overlay">
        <div v-if="showDrawer" class="drawer-overlay" @click="showDrawer = false"></div>
      </Transition>
      <Transition :name="'drawer-' + drawerPosition">
        <div v-if="showDrawer" class="drawer" :class="'drawer-' + drawerPosition">
          <div class="drawer-header">
            <h3 class="drawer-title">{{ drawerPosition === 'left' ? '左侧' : drawerPosition === 'right' ? '右侧' : '底部' }}抽屉</h3>
            <button class="drawer-close" @click="showDrawer = false">&times;</button>
          </div>
          <div class="drawer-body">
            <p>这是抽屉组件的内容区域。</p>
            <p>可以放置导航菜单、表单或其他内容。</p>
            <div class="drawer-menu">
              <div class="drawer-menu-item">个人资料</div>
              <div class="drawer-menu-item">我的社团</div>
              <div class="drawer-menu-item">消息通知</div>
              <div class="drawer-menu-item">设置</div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ActionSheet 操作菜单 -->
    <Teleport to="body">
      <Transition name="actionsheet-overlay">
        <div v-if="showActionSheet" class="actionsheet-overlay" @click="showActionSheet = false"></div>
      </Transition>
      <Transition name="actionsheet">
        <div v-if="showActionSheet" class="actionsheet">
          <div class="actionsheet-content">
            <button class="actionsheet-item" @click="showActionSheet = false; showToast('已保存到相册', 'success')">保存到相册</button>
            <button class="actionsheet-item" @click="showActionSheet = false">分享给朋友</button>
            <button class="actionsheet-item" @click="showActionSheet = false">复制链接</button>
            <button class="actionsheet-item actionsheet-item-danger" @click="showActionSheet = false">举报</button>
          </div>
          <button class="actionsheet-cancel" @click="showActionSheet = false">取消</button>
        </div>
      </Transition>
    </Teleport>

    <!-- Loading 全屏加载 -->
    <Teleport to="body">
      <Transition name="loading">
        <div v-if="showLoading" class="loading-overlay">
          <div class="loading-content">
            <div class="loading-spinner loading-spinner-lg"></div>
            <p class="loading-text">加载中...</p>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ImagePreview 图片预览 -->
    <Teleport to="body">
      <Transition name="imagepreview">
        <div v-if="showImagePreview" class="imagepreview-overlay" @click="showImagePreview = false">
          <div class="imagepreview-content">
            <div class="imagepreview-placeholder">
              <span>图片预览区域</span>
              <span>点击任意位置关闭</span>
            </div>
          </div>
          <button class="imagepreview-close" @click="showImagePreview = false">&times;</button>
        </div>
      </Transition>
    </Teleport>

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

/* ===== Segment Control 分段控制器（带滑动动画）===== */
.segment-control {
  position: relative;
  display: flex;
  background: var(--color-bg);
  border-radius: var(--radius-md);
  padding: 4px;
}

.segment-slider {
  position: absolute;
  top: 4px;
  height: calc(100% - 8px);
  background: var(--color-card);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-sm);
  transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 0;
}

.segment-btn {
  position: relative;
  z-index: 1;
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
  transition: color var(--transition-fast);
  -webkit-tap-highlight-color: transparent;
}

.segment-btn.active {
  color: var(--color-primary);
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

/* ==================== 新增组件样式 ==================== */

/* ===== Modal 模态框 ===== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-md);
  z-index: 2000;
  backdrop-filter: blur(4px);
}

.modal {
  background: var(--color-card);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 400px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: var(--shadow-xl);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
}

.modal-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
}

.modal-close {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--text-xl);
  cursor: pointer;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--transition-fast);
}

.modal-close:active {
  background: var(--color-bg);
}

.modal-body {
  padding: var(--spacing-md);
  line-height: var(--leading-relaxed);
  color: var(--color-text-secondary);
}

.modal-body p {
  margin-bottom: var(--spacing-sm);
}

.modal-footer {
  display: flex;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  border-top: 1px solid var(--color-border);
  justify-content: flex-end;
}

/* Modal 确认对话框 */
.modal-confirm {
  text-align: center;
  padding: var(--spacing-lg);
}

.modal-confirm-icon {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--spacing-md);
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
}

.modal-confirm-warning {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.modal-confirm-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-sm);
}

.modal-confirm-message {
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-lg);
}

.modal-confirm-actions {
  display: flex;
  gap: var(--spacing-sm);
}

/* Modal 动画 */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active .modal,
.modal-leave-active .modal {
  transition: transform 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal {
  transform: scale(0.9) translateY(20px);
}

.modal-leave-to .modal {
  transform: scale(0.95) translateY(10px);
}

/* ===== Toast 消息提示 ===== */
.toast-container {
  position: fixed;
  top: calc(env(safe-area-inset-top, 0px) + var(--spacing-md));
  left: 50%;
  transform: translateX(-50%);
  z-index: 3000;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-card);
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-lg);
  pointer-events: auto;
  min-width: 120px;
  max-width: 300px;
}

.toast-icon {
  width: 24px;
  height: 24px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  flex-shrink: 0;
}

.toast-message {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.toast-success .toast-icon { background: var(--color-success); color: white; }
.toast-warning .toast-icon { background: var(--color-warning); color: white; }
.toast-error .toast-icon { background: var(--color-error); color: white; }
.toast-info .toast-icon { background: var(--color-info); color: white; }

/* Toast 动画 */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(-20px) scale(0.9);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.9);
}

/* ===== Notification 通知 ===== */
.notification-container {
  position: fixed;
  top: calc(env(safe-area-inset-top, 0px) + var(--spacing-md));
  right: var(--spacing-md);
  z-index: 3000;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  max-width: 360px;
  width: 100%;
}

.notification {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background: var(--color-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  border-left: 4px solid var(--color-info);
}

.notification-success { border-left-color: var(--color-success); }
.notification-warning { border-left-color: var(--color-warning); }
.notification-error { border-left-color: var(--color-error); }

.notification-icon {
  width: 24px;
  height: 24px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  flex-shrink: 0;
  background: var(--color-info);
  color: white;
}

.notification-success .notification-icon { background: var(--color-success); }
.notification-warning .notification-icon { background: var(--color-warning); }
.notification-error .notification-icon { background: var(--color-error); }

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-title {
  font-weight: var(--font-semibold);
  margin-bottom: 2px;
}

.notification-message {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.notification-close {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--text-lg);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* Notification 动画 */
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

/* ===== Drawer 抽屉 ===== */
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1999;
}

.drawer {
  position: fixed;
  background: var(--color-card);
  z-index: 2000;
  display: flex;
  flex-direction: column;
}

.drawer-left {
  top: 0;
  left: 0;
  bottom: 0;
  width: 280px;
  max-width: 80vw;
}

.drawer-right {
  top: 0;
  right: 0;
  bottom: 0;
  width: 280px;
  max-width: 80vw;
}

.drawer-bottom {
  left: 0;
  right: 0;
  bottom: 0;
  max-height: 80vh;
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
}

.drawer-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
}

.drawer-close {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--text-xl);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.drawer-body {
  flex: 1;
  padding: var(--spacing-md);
  overflow-y: auto;
}

.drawer-menu {
  margin-top: var(--spacing-md);
}

.drawer-menu-item {
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.drawer-menu-item:active {
  background: var(--color-bg);
}

/* Drawer 动画 */
.drawer-overlay-enter-active,
.drawer-overlay-leave-active {
  transition: opacity 0.3s ease;
}

.drawer-overlay-enter-from,
.drawer-overlay-leave-to {
  opacity: 0;
}

.drawer-left-enter-active,
.drawer-left-leave-active,
.drawer-right-enter-active,
.drawer-right-leave-active,
.drawer-bottom-enter-active,
.drawer-bottom-leave-active {
  transition: transform 0.3s ease;
}

.drawer-left-enter-from,
.drawer-left-leave-to {
  transform: translateX(-100%);
}

.drawer-right-enter-from,
.drawer-right-leave-to {
  transform: translateX(100%);
}

.drawer-bottom-enter-from,
.drawer-bottom-leave-to {
  transform: translateY(100%);
}

/* ===== ActionSheet 操作菜单 ===== */
.actionsheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1999;
}

.actionsheet {
  position: fixed;
  left: var(--spacing-sm);
  right: var(--spacing-sm);
  bottom: calc(env(safe-area-inset-bottom, 0px) + var(--spacing-sm));
  z-index: 2000;
}

.actionsheet-content {
  background: var(--color-card);
  border-radius: var(--radius-lg);
  overflow: hidden;
  margin-bottom: var(--spacing-sm);
}

.actionsheet-item {
  display: block;
  width: 100%;
  padding: var(--spacing-md);
  min-height: 56px;
  border: none;
  background: transparent;
  color: var(--color-text);
  font-size: var(--text-base);
  text-align: center;
  cursor: pointer;
  transition: background var(--transition-fast);
  border-bottom: 1px solid var(--color-border);
}

.actionsheet-item:last-child {
  border-bottom: none;
}

.actionsheet-item:active {
  background: var(--color-bg);
}

.actionsheet-item-danger {
  color: var(--color-error);
}

.actionsheet-cancel {
  display: block;
  width: 100%;
  padding: var(--spacing-md);
  min-height: 56px;
  border: none;
  background: var(--color-card);
  color: var(--color-text);
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  text-align: center;
  cursor: pointer;
  border-radius: var(--radius-lg);
  transition: background var(--transition-fast);
}

.actionsheet-cancel:active {
  background: var(--color-bg);
}

/* ActionSheet 动画 */
.actionsheet-overlay-enter-active,
.actionsheet-overlay-leave-active {
  transition: opacity 0.3s ease;
}

.actionsheet-overlay-enter-from,
.actionsheet-overlay-leave-to {
  opacity: 0;
}

.actionsheet-enter-active,
.actionsheet-leave-active {
  transition: transform 0.3s ease;
}

.actionsheet-enter-from,
.actionsheet-leave-to {
  transform: translateY(100%);
}

/* ===== Loading 加载 ===== */
.loading-demos {
  display: flex;
  justify-content: center;
  gap: var(--spacing-xl);
  margin-bottom: var(--spacing-md);
}

.loading-demo-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: var(--radius-full);
  animation: spin 0.8s linear infinite;
}

.loading-spinner-lg {
  width: 40px;
  height: 40px;
  border-width: 4px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-dots {
  display: flex;
  gap: 6px;
}

.loading-dots span {
  width: 8px;
  height: 8px;
  background: var(--color-primary);
  border-radius: var(--radius-full);
  animation: bounce 1.4s ease-in-out infinite;
}

.loading-dots span:nth-child(1) { animation-delay: 0s; }
.loading-dots span:nth-child(2) { animation-delay: 0.16s; }
.loading-dots span:nth-child(3) { animation-delay: 0.32s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}

.loading-overlay {
  position: fixed;
  inset: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
}

.dark .loading-overlay {
  background: rgba(17, 24, 39, 0.9);
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
}

.loading-text {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

/* Loading 动画 */
.loading-enter-active,
.loading-leave-active {
  transition: opacity 0.3s ease;
}

.loading-enter-from,
.loading-leave-to {
  opacity: 0;
}

/* ===== Progress 进度条 ===== */
.progress-demos {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.progress-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: var(--color-bg);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-bar-inner {
  height: 100%;
  background: var(--color-primary);
  border-radius: var(--radius-full);
  transition: width 0.3s ease;
}

.progress-bar-success .progress-bar-inner {
  background: var(--color-success);
}

.progress-bar-striped .progress-bar-inner {
  background: linear-gradient(
    45deg,
    var(--color-primary) 25%,
    var(--color-primary-light) 25%,
    var(--color-primary-light) 50%,
    var(--color-primary) 50%,
    var(--color-primary) 75%,
    var(--color-primary-light) 75%
  );
  background-size: 20px 20px;
  animation: progress-stripes 1s linear infinite;
}

@keyframes progress-stripes {
  from { background-position: 20px 0; }
  to { background-position: 0 0; }
}

.progress-text {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  min-width: 45px;
  text-align: right;
}

.progress-controls {
  display: flex;
  justify-content: center;
  gap: var(--spacing-sm);
}

/* 环形进度条 */
.progress-circle-demos {
  display: flex;
  justify-content: center;
  gap: var(--spacing-xl);
}

.progress-circle {
  position: relative;
  width: 80px;
  height: 80px;
}

.progress-circle svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.progress-circle-bg {
  fill: none;
  stroke: var(--color-bg);
  stroke-width: 8;
}

.progress-circle-bar {
  fill: none;
  stroke: var(--color-primary);
  stroke-width: 8;
  stroke-linecap: round;
  stroke-dasharray: 283;
  stroke-dashoffset: calc(283 - (283 * var(--progress, 0)) / 100);
  transition: stroke-dashoffset 0.3s ease;
}

.progress-circle-success .progress-circle-bar {
  stroke: var(--color-success);
}

.progress-circle-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
}

/* ===== Skeleton 骨架屏 ===== */
.skeleton-demo {
  margin-bottom: var(--spacing-md);
}

.skeleton-demo:last-child {
  margin-bottom: 0;
}

.skeleton-avatar {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-full);
  background: linear-gradient(90deg, var(--color-bg) 25%, var(--color-border) 50%, var(--color-bg) 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite;
  float: left;
  margin-right: var(--spacing-sm);
}

.skeleton-content {
  overflow: hidden;
}

.skeleton-title {
  height: 16px;
  width: 40%;
  background: linear-gradient(90deg, var(--color-bg) 25%, var(--color-border) 50%, var(--color-bg) 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite;
  border-radius: var(--radius-sm);
  margin-bottom: var(--spacing-xs);
}

.skeleton-text {
  height: 14px;
  width: 100%;
  background: linear-gradient(90deg, var(--color-bg) 25%, var(--color-border) 50%, var(--color-bg) 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite;
  border-radius: var(--radius-sm);
  margin-bottom: var(--spacing-xs);
}

.skeleton-text-short {
  width: 70%;
}

.skeleton-image {
  height: 120px;
  background: linear-gradient(90deg, var(--color-bg) 25%, var(--color-border) 50%, var(--color-bg) 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite;
  border-radius: var(--radius-md);
}

.skeleton-paragraph {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.skeleton-line {
  height: 14px;
  background: linear-gradient(90deg, var(--color-bg) 25%, var(--color-border) 50%, var(--color-bg) 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite;
  border-radius: var(--radius-sm);
}

.skeleton-line-short {
  width: 60%;
}

@keyframes skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ===== Tabs 标签页 ===== */
.tabs {
  display: flex;
  flex-direction: column;
}

.tabs-nav {
  display: flex;
  border-bottom: 1px solid var(--color-border);
  margin: 0 calc(-1 * var(--spacing-md));
  padding: 0 var(--spacing-md);
}

.tabs-nav-item {
  padding: var(--spacing-sm) var(--spacing-md);
  min-height: 44px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  cursor: pointer;
  position: relative;
  transition: color var(--transition-fast);
}

.tabs-nav-item.active {
  color: var(--color-primary);
}

.tabs-nav-item.active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  background: var(--color-primary);
}

.tabs-content {
  padding: var(--spacing-md) 0;
}

.tabs-pane {
  color: var(--color-text-secondary);
  line-height: var(--leading-relaxed);
}

/* ===== Collapse 折叠面板 ===== */
.collapse-list {
  background: var(--color-card);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-border);
}

.collapse-item {
  border-bottom: 1px solid var(--color-border);
}

.collapse-item:last-child {
  border-bottom: none;
}

.collapse-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md);
  min-height: 56px;
  cursor: pointer;
  font-weight: var(--font-medium);
  transition: background var(--transition-fast);
  -webkit-tap-highlight-color: transparent;
}

.collapse-header:active {
  background: var(--color-bg);
}

.collapse-arrow {
  width: 8px;
  height: 8px;
  border-right: 2px solid var(--color-text-secondary);
  border-bottom: 2px solid var(--color-text-secondary);
  transform: rotate(-45deg);
  transition: transform var(--transition-fast);
}

.collapse-item.expanded .collapse-arrow {
  transform: rotate(45deg);
}

.collapse-content {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
}

.collapse-item.expanded .collapse-content {
  max-height: 200px;
}

.collapse-body {
  padding: 0 var(--spacing-md) var(--spacing-md);
  color: var(--color-text-secondary);
  line-height: var(--leading-relaxed);
}

/* ===== Empty 空状态 ===== */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--spacing-xl);
  text-align: center;
}

.empty-image {
  width: 80px;
  height: 80px;
  color: var(--color-text-placeholder);
  margin-bottom: var(--spacing-md);
}

.empty-image svg {
  width: 100%;
  height: 100%;
}

.empty-text {
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  color: var(--color-text);
  margin-bottom: var(--spacing-xs);
}

.empty-desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-md);
}

/* ===== Avatar 头像 ===== */
.avatar-group {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-semibold);
  font-size: var(--text-sm);
}

.avatar-xs { width: 24px; height: 24px; font-size: var(--text-xs); }
.avatar-sm { width: 32px; height: 32px; font-size: var(--text-xs); }
.avatar-lg { width: 48px; height: 48px; font-size: var(--text-base); }
.avatar-xl { width: 64px; height: 64px; font-size: var(--text-lg); }

.avatar-square {
  border-radius: var(--radius-md);
}

.avatar-stack {
  display: flex;
}

.avatar-stack .avatar {
  border: 2px solid var(--color-card);
  margin-left: -8px;
}

.avatar-stack .avatar:first-child {
  margin-left: 0;
}

.avatar-more {
  background: var(--color-bg);
  color: var(--color-text-secondary);
  font-size: var(--text-xs);
}

/* ===== Tooltip 工具提示 ===== */
.tooltip-demos {
  display: flex;
  justify-content: center;
  gap: var(--spacing-lg);
}

.tooltip-wrapper {
  position: relative;
  display: inline-block;
}

.tooltip {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--color-text);
  color: var(--color-card);
  font-size: var(--text-xs);
  border-radius: var(--radius-sm);
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--transition-fast), transform var(--transition-fast);
  z-index: 100;
}

.tooltip-top {
  bottom: calc(100% + 8px);
}

.tooltip-bottom {
  top: calc(100% + 8px);
}

.tooltip::after {
  content: '';
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
}

.tooltip-top::after {
  top: 100%;
  border-top-color: var(--color-text);
}

.tooltip-bottom::after {
  bottom: 100%;
  border-bottom-color: var(--color-text);
}

.tooltip-wrapper:hover .tooltip {
  opacity: 1;
}

.tooltip-wrapper:hover .tooltip-top {
  transform: translateX(-50%) translateY(-4px);
}

.tooltip-wrapper:hover .tooltip-bottom {
  transform: translateX(-50%) translateY(4px);
}

/* ===== Popover 气泡卡片 ===== */
.popover-wrapper {
  position: relative;
  display: inline-block;
}

.popover {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  min-width: 200px;
  background: var(--color-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--color-border);
  z-index: 100;
}

.popover-title {
  padding: var(--spacing-sm) var(--spacing-md);
  font-weight: var(--font-semibold);
  border-bottom: 1px solid var(--color-border);
}

.popover-content {
  padding: var(--spacing-md);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.popover-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  border-top: 1px solid var(--color-border);
}

/* Popover 动画 */
.popover-enter-active,
.popover-leave-active {
  transition: all 0.2s ease;
}

.popover-enter-from,
.popover-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* ===== Table 表格 ===== */
.table-card {
  padding: 0;
  overflow: hidden;
}

.table-wrapper {
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.table th,
.table td {
  padding: var(--spacing-md);
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

.table th {
  background: var(--color-bg);
  font-weight: var(--font-semibold);
  white-space: nowrap;
}

.table tbody tr:last-child td {
  border-bottom: none;
}

.table tbody tr:active {
  background: var(--color-bg);
}

/* ===== Breadcrumb 面包屑 ===== */
.breadcrumb {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
  font-size: var(--text-sm);
}

.breadcrumb-item {
  color: var(--color-text-secondary);
  text-decoration: none;
}

.breadcrumb-item:not(.breadcrumb-current):active {
  color: var(--color-primary);
}

.breadcrumb-current {
  color: var(--color-text);
}

.breadcrumb-separator {
  color: var(--color-text-placeholder);
}

/* ===== Steps 步骤条 ===== */
.steps {
  display: flex;
  align-items: flex-start;
  margin-bottom: var(--spacing-lg);
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.step-icon {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  background: var(--color-bg);
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-xs);
  transition: all var(--transition-fast);
}

.step.active .step-icon {
  background: var(--color-primary);
  color: white;
}

.step.completed .step-icon {
  background: var(--color-success);
  color: white;
}

.step-content {
  text-align: center;
}

.step-title {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.step.active .step-title {
  color: var(--color-primary);
  font-weight: var(--font-medium);
}

.step-line {
  flex: 1;
  height: 2px;
  background: var(--color-border);
  margin-top: 16px;
  margin-left: -8px;
  margin-right: -8px;
  transition: background var(--transition-fast);
}

.step-line.active {
  background: var(--color-success);
}

.steps-controls {
  display: flex;
  justify-content: center;
  gap: var(--spacing-sm);
}

/* ===== Dropdown 下拉菜单 ===== */
.dropdown {
  position: relative;
  display: inline-block;
}

.dropdown-arrow {
  display: inline-block;
  width: 0;
  height: 0;
  margin-left: var(--spacing-xs);
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 5px solid currentColor;
  transition: transform var(--transition-fast);
}

.dropdown-arrow.open {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  min-width: 160px;
  background: var(--color-card);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--color-border);
  overflow: hidden;
  z-index: 100;
}

.dropdown-item {
  display: block;
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  min-height: 44px;
  border: none;
  background: transparent;
  color: var(--color-text);
  font-size: var(--text-sm);
  text-align: left;
  cursor: pointer;
  transition: background var(--transition-fast);
  display: flex;
  align-items: center;
}

.dropdown-item:active {
  background: var(--color-bg);
}

.dropdown-item-danger {
  color: var(--color-error);
}

.dropdown-divider {
  height: 1px;
  background: var(--color-border);
  margin: var(--spacing-xs) 0;
}

/* ===== Pagination 分页 ===== */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-sm);
}

.pagination-btn {
  min-width: 36px;
  height: 36px;
  padding: 0 var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-card);
  color: var(--color-text);
  font-size: var(--text-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-btn:not(:disabled):active {
  background: var(--color-bg);
}

.pagination-btn.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.pagination-arrow {
  width: 8px;
  height: 8px;
  border-right: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
}

.pagination-arrow-left {
  transform: rotate(135deg);
}

.pagination-arrow-right {
  transform: rotate(-45deg);
}

.pagination-ellipsis {
  color: var(--color-text-secondary);
  padding: 0 var(--spacing-xs);
}

.pagination-info {
  text-align: center;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

/* ===== Slider 滑块 ===== */
.slider-demo {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.slider {
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--color-bg);
  border-radius: var(--radius-full);
  outline: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  background: var(--color-primary);
  border-radius: var(--radius-full);
  cursor: pointer;
  box-shadow: var(--shadow-md);
  transition: transform var(--transition-fast);
}

.slider::-webkit-slider-thumb:active {
  transform: scale(1.2);
}

.slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  background: var(--color-primary);
  border-radius: var(--radius-full);
  cursor: pointer;
  border: none;
  box-shadow: var(--shadow-md);
}

.slider-value {
  min-width: 40px;
  text-align: center;
  font-weight: var(--font-semibold);
  color: var(--color-primary);
}

/* ===== Rate 评分 ===== */
.rate {
  display: flex;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-sm);
}

.rate-star {
  font-size: var(--text-2xl);
  color: var(--color-border);
  background: none;
  border: none;
  cursor: pointer;
  transition: color var(--transition-fast), transform var(--transition-fast);
  padding: 0;
}

.rate-star.active {
  color: var(--color-warning);
}

.rate-star.hover {
  transform: scale(1.2);
}

.rate-text {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

/* ===== Swiper 轮播 ===== */
.swiper-card {
  padding: 0;
  overflow: hidden;
}

.swiper {
  position: relative;
  overflow: hidden;
}

.swiper-track {
  display: flex;
  transition: transform 0.3s ease;
}

.swiper-slide {
  flex-shrink: 0;
  width: 100%;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  color: white;
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
}

.swiper-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(255, 255, 255, 0.9);
  color: var(--color-text);
  font-size: var(--text-xl);
  border-radius: var(--radius-full);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-md);
  z-index: 10;
}

.swiper-btn-prev {
  left: var(--spacing-sm);
}

.swiper-btn-next {
  right: var(--spacing-sm);
}

.swiper-dots {
  position: absolute;
  bottom: var(--spacing-sm);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: var(--spacing-xs);
}

.swiper-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.5);
  border: none;
  cursor: pointer;
  padding: 0;
  transition: all var(--transition-fast);
}

.swiper-dot.active {
  background: white;
  width: 20px;
}

/* ===== ImagePreview 图片预览 ===== */
.image-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-sm);
}

.image-item {
  aspect-ratio: 1;
  border-radius: var(--radius-md);
  overflow: hidden;
  cursor: pointer;
}

.image-placeholder {
  width: 100%;
  height: 100%;
  background: var(--color-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.imagepreview-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
}

.imagepreview-content {
  max-width: 90vw;
  max-height: 80vh;
}

.imagepreview-placeholder {
  width: 300px;
  height: 300px;
  background: var(--color-card);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  color: var(--color-text-secondary);
}

.imagepreview-close {
  position: fixed;
  top: calc(env(safe-area-inset-top, 0px) + var(--spacing-md));
  right: var(--spacing-md);
  width: 40px;
  height: 40px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: var(--text-2xl);
  border-radius: var(--radius-full);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ImagePreview 动画 */
.imagepreview-enter-active,
.imagepreview-leave-active {
  transition: opacity 0.3s ease;
}

.imagepreview-enter-from,
.imagepreview-leave-to {
  opacity: 0;
}

/* ===== Desktop 优化 ===== */
@media (min-width: 768px) {
  .tooltip-wrapper:hover .tooltip {
    opacity: 1;
  }

  .dropdown-item:hover {
    background: var(--color-bg);
  }

  .drawer-menu-item:hover {
    background: var(--color-bg);
  }

  .table tbody tr:hover {
    background: var(--color-bg);
  }

  .pagination-btn:not(:disabled):hover {
    background: var(--color-bg);
    border-color: var(--color-primary);
  }
}
</style>
