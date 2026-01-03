<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { getCampusCaptcha, getQQAuthorizeUrl } from '@/api/auth'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

// Tab 切换
type TabType = 'login' | 'register' | 'campus'
const activeTab = ref<TabType>('login')

// 表单数据
const loginForm = ref({
  username: '',
  password: '',
})

const registerForm = ref({
  username: '',
  password: '',
  confirmPassword: '',
})

const campusForm = ref({
  studentId: '',
  password: '',
  captchaCode: '',
  jsessionId: '',
})

// 状态
const loading = ref(false)
const errorMessage = ref('')
const campusCaptchaImage = ref('')
const captchaLoading = ref(false)

// 监听 tab 变化
watch(activeTab, (tab) => {
  errorMessage.value = ''
  if (tab === 'campus') {
    loadCampusCaptcha()
  }
})

// 加载校园网验证码
async function loadCampusCaptcha() {
  captchaLoading.value = true
  try {
    const res = await getCampusCaptcha()
    if (res.data.code === 200) {
      campusCaptchaImage.value = res.data.data.captchaImage
      campusForm.value.jsessionId = res.data.data.jsessionId
      campusForm.value.captchaCode = ''
    } else {
      errorMessage.value = res.data.message || '获取验证码失败'
    }
  } catch {
    errorMessage.value = '网络错误，请稍后重试'
  } finally {
    captchaLoading.value = false
  }
}

// 普通登录
async function handleLogin() {
  const { username, password } = loginForm.value
  if (!username || !password) {
    errorMessage.value = '请填写用户名和密码'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    const result = await userStore.login(username, password)
    if (result.code === 200) {
      handleLoginSuccess()
    } else {
      errorMessage.value = result.message || '登录失败'
    }
  } catch {
    errorMessage.value = '网络错误，请稍后重试'
  } finally {
    loading.value = false
  }
}

// 普通注册
async function handleRegister() {
  const { username, password, confirmPassword } = registerForm.value
  if (!username || !password) {
    errorMessage.value = '请填写用户名和密码'
    return
  }
  if (password !== confirmPassword) {
    errorMessage.value = '两次密码输入不一致'
    return
  }
  if (password.length < 6) {
    errorMessage.value = '密码至少 6 位'
    return
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    errorMessage.value = '用户名只能包含英文字母、数字和下划线'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    const result = await userStore.register(username, password)
    if (result.code === 200) {
      handleLoginSuccess()
    } else {
      errorMessage.value = result.message || '注册失败'
    }
  } catch {
    errorMessage.value = '网络错误，请稍后重试'
  } finally {
    loading.value = false
  }
}

// 校园网登录
async function handleCampusLogin() {
  const { studentId, password, captchaCode, jsessionId } = campusForm.value
  if (!studentId || !password) {
    errorMessage.value = '请填写学号和密码'
    return
  }
  if (!captchaCode) {
    errorMessage.value = '请输入验证码'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    const result = await userStore.loginByCampus(
      studentId,
      password,
      captchaCode,
      jsessionId
    )
    if (result.code === 200) {
      handleLoginSuccess()
    } else {
      errorMessage.value = result.message || '登录失败'
      loadCampusCaptcha()
    }
  } catch {
    errorMessage.value = '网络错误，请稍后重试'
    loadCampusCaptcha()
  } finally {
    loading.value = false
  }
}

// QQ 登录
async function handleQQLogin() {
  loading.value = true
  errorMessage.value = ''

  try {
    const res = await getQQAuthorizeUrl()
    if (res.data.code === 200) {
      window.location.href = res.data.data.authorizeUrl
    } else {
      errorMessage.value = res.data.message || '获取授权链接失败'
    }
  } catch {
    errorMessage.value = '网络错误，请稍后重试'
  } finally {
    loading.value = false
  }
}

// 登录成功
function handleLoginSuccess() {
  const redirect = (route.query.redirect as string) || '/'
  router.push(redirect)
}

// 返回首页
function goHome() {
  router.push('/')
}
</script>

<template>
  <div class="auth-page">
    <!-- 左侧品牌区域 (桌面端显示) -->
    <div class="auth-brand">
      <div class="brand-content">
        <div class="brand-logo">
          <span class="logo-icon">X</span>
        </div>
        <h1 class="brand-title">XMYZ Club</h1>
        <p class="brand-subtitle">厦门一中学生社区</p>
        <p class="brand-desc">连接校园生活，分享精彩时刻</p>
      </div>
      <div class="brand-decoration">
        <div class="decoration-circle decoration-circle-1"></div>
        <div class="decoration-circle decoration-circle-2"></div>
        <div class="decoration-circle decoration-circle-3"></div>
      </div>
    </div>

    <!-- 右侧登录区域 -->
    <div class="auth-form-area">
      <!-- 移动端 Logo -->
      <div class="mobile-brand">
        <div class="brand-logo brand-logo-sm">
          <span class="logo-icon">X</span>
        </div>
        <h1 class="brand-title-sm">XMYZ Club</h1>
      </div>

      <div class="auth-card">
        <h2 class="auth-title">
          {{ activeTab === 'register' ? '创建账号' : '欢迎回来' }}
        </h2>
        <p class="auth-subtitle">
          {{
            activeTab === 'register'
              ? '填写以下信息注册账号'
              : '登录以访问更多功能'
          }}
        </p>

        <!-- Tab 切换 -->
        <div v-if="activeTab !== 'register'" class="auth-tabs">
          <button
            class="auth-tab"
            :class="{ active: activeTab === 'login' }"
            @click="activeTab = 'login'"
          >
            普通登录
          </button>
          <button
            class="auth-tab"
            :class="{ active: activeTab === 'campus' }"
            @click="activeTab = 'campus'"
          >
            校园网登录
          </button>
        </div>

        <!-- 错误提示 -->
        <div v-if="errorMessage" class="auth-error">
          {{ errorMessage }}
        </div>

        <!-- 普通登录表单 -->
        <form
          v-if="activeTab === 'login'"
          class="auth-form"
          @submit.prevent="handleLogin"
        >
          <div class="form-group">
            <label class="form-label">用户名</label>
            <input
              v-model="loginForm.username"
              type="text"
              class="form-input"
              placeholder="请输入用户名"
              :disabled="loading"
            />
          </div>
          <div class="form-group">
            <label class="form-label">密码</label>
            <input
              v-model="loginForm.password"
              type="password"
              class="form-input"
              placeholder="请输入密码"
              :disabled="loading"
            />
          </div>

          <button
            type="submit"
            class="btn btn-primary btn-block btn-lg"
            :disabled="loading"
          >
            {{ loading ? '登录中...' : '登录' }}
          </button>

          <div class="auth-footer">
            <span>没有账号？</span>
            <button
              type="button"
              class="btn-link"
              :disabled="loading"
              @click="activeTab = 'register'"
            >
              立即注册
            </button>
          </div>

          <div class="auth-divider">
            <span>其他登录方式</span>
          </div>

          <div class="auth-social">
            <button
              type="button"
              class="social-btn social-btn-qq"
              :disabled="loading"
              title="QQ登录"
              @click="handleQQLogin"
            >
              <svg viewBox="0 0 24 24" class="social-icon">
                <path
                  fill="currentColor"
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 14.19c-.18.52-.54.96-1.02 1.24-.48.28-1.04.38-1.58.28-.54-.1-1.02-.4-1.36-.84-.18.12-.38.22-.58.28-.4.14-.84.18-1.26.12-.42-.06-.82-.22-1.14-.48-.32-.26-.56-.6-.7-1-.14.08-.28.14-.44.18-.32.1-.66.1-.98.02-.32-.08-.6-.26-.82-.5-.22-.24-.38-.54-.44-.86-.06-.32-.02-.66.12-.96s.36-.56.64-.74c-.1-.22-.16-.46-.18-.7-.02-.24.02-.5.12-.72.1-.22.26-.42.46-.56.2-.14.44-.24.68-.28-.04-.24-.02-.48.06-.72.08-.24.22-.46.4-.64.18-.18.4-.32.64-.4.24-.08.5-.1.74-.06-.02-.26.02-.52.12-.76.1-.24.26-.46.46-.62.2-.16.44-.28.7-.34.26-.06.52-.04.78.04.1-.24.26-.46.46-.62.2-.16.44-.26.7-.3.26-.04.52 0 .76.1s.46.28.62.5c.28-.06.58-.06.86.02.28.08.54.24.74.46.2.22.34.5.4.8.06.3.04.6-.06.88.22.16.4.38.52.62.12.24.18.52.18.8 0 .28-.08.56-.22.8.24.14.44.34.58.58.14.24.22.52.24.8.02.28-.04.56-.16.82-.12.26-.3.48-.54.64.14.26.22.54.22.84 0 .3-.08.58-.24.84z"
                />
              </svg>
              <span>QQ登录</span>
            </button>
          </div>
        </form>

        <!-- 注册表单 -->
        <form
          v-else-if="activeTab === 'register'"
          class="auth-form"
          @submit.prevent="handleRegister"
        >
          <div class="form-group">
            <label class="form-label">用户名</label>
            <input
              v-model="registerForm.username"
              type="text"
              class="form-input"
              placeholder="英文字母、数字、下划线"
              :disabled="loading"
            />
          </div>
          <div class="form-group">
            <label class="form-label">密码</label>
            <input
              v-model="registerForm.password"
              type="password"
              class="form-input"
              placeholder="至少 6 位"
              :disabled="loading"
            />
          </div>
          <div class="form-group">
            <label class="form-label">确认密码</label>
            <input
              v-model="registerForm.confirmPassword"
              type="password"
              class="form-input"
              placeholder="再次输入密码"
              :disabled="loading"
            />
          </div>

          <button
            type="submit"
            class="btn btn-primary btn-block btn-lg"
            :disabled="loading"
          >
            {{ loading ? '注册中...' : '注册' }}
          </button>

          <div class="auth-footer">
            <span>已有账号？</span>
            <button
              type="button"
              class="btn-link"
              :disabled="loading"
              @click="activeTab = 'login'"
            >
              返回登录
            </button>
          </div>
        </form>

        <!-- 校园网登录表单 -->
        <form
          v-else-if="activeTab === 'campus'"
          class="auth-form"
          @submit.prevent="handleCampusLogin"
        >
          <div class="form-group">
            <label class="form-label">学号</label>
            <input
              v-model="campusForm.studentId"
              type="text"
              class="form-input"
              placeholder="请输入学号"
              :disabled="loading"
            />
          </div>
          <div class="form-group">
            <label class="form-label">校园网密码</label>
            <input
              v-model="campusForm.password"
              type="password"
              class="form-input"
              placeholder="请输入校园网密码"
              :disabled="loading"
            />
          </div>
          <div class="form-group">
            <label class="form-label">验证码</label>
            <div class="captcha-row">
              <input
                v-model="campusForm.captchaCode"
                type="text"
                class="form-input captcha-input"
                placeholder="请输入验证码"
                :disabled="loading"
              />
              <div
                class="captcha-image"
                :class="{ 'is-loading': captchaLoading }"
                @click="loadCampusCaptcha"
              >
                <img
                  v-if="campusCaptchaImage && !captchaLoading"
                  :src="campusCaptchaImage"
                  alt="验证码"
                />
                <span v-else-if="captchaLoading" class="captcha-loading"
                  >加载中</span
                >
                <span v-else class="captcha-placeholder">点击获取</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            class="btn btn-primary btn-block btn-lg"
            :disabled="loading"
          >
            {{ loading ? '登录中...' : '登录' }}
          </button>

          <p class="campus-hint">首次使用校园网登录将自动创建账号</p>
        </form>
      </div>

      <!-- 返回首页 -->
      <button class="back-home" @click="goHome">
        <span class="back-arrow">&larr;</span>
        返回首页
      </button>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  background: var(--color-bg);
}

/* ===== 左侧品牌区域 ===== */
.auth-brand {
  display: none;
  flex: 1;
  background: linear-gradient(
    135deg,
    var(--color-primary) 0%,
    var(--color-primary-dark) 100%
  );
  color: white;
  position: relative;
  overflow: hidden;
}

@media (min-width: 1024px) {
  .auth-brand {
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.brand-content {
  text-align: center;
  z-index: 1;
  padding: var(--spacing-xl);
}

.brand-logo {
  width: 100px;
  height: 100px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-xl);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--spacing-lg);
  backdrop-filter: blur(10px);
}

.logo-icon {
  font-size: 48px;
  font-weight: var(--font-bold);
}

.brand-title {
  font-size: var(--text-4xl);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-sm);
}

.brand-subtitle {
  font-size: var(--text-xl);
  opacity: 0.9;
  margin-bottom: var(--spacing-lg);
}

.brand-desc {
  font-size: var(--text-base);
  opacity: 0.8;
  max-width: 300px;
  margin: 0 auto;
  line-height: var(--leading-relaxed);
}

/* 装饰圆圈 */
.brand-decoration {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.decoration-circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
}

.decoration-circle-1 {
  width: 400px;
  height: 400px;
  top: -100px;
  right: -100px;
}

.decoration-circle-2 {
  width: 300px;
  height: 300px;
  bottom: -50px;
  left: -50px;
}

.decoration-circle-3 {
  width: 200px;
  height: 200px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

/* ===== 右侧登录区域 ===== */
.auth-form-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl) var(--spacing-md);
  min-height: 100vh;
}

@media (min-width: 1024px) {
  .auth-form-area {
    max-width: 500px;
    padding: var(--spacing-2xl);
  }
}

/* 移动端 Logo */
.mobile-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: var(--spacing-xl);
}

@media (min-width: 1024px) {
  .mobile-brand {
    display: none;
  }
}

.brand-logo-sm {
  width: 64px;
  height: 64px;
  background: var(--color-primary);
  color: white;
  margin-bottom: var(--spacing-sm);
}

.brand-logo-sm .logo-icon {
  font-size: 32px;
}

.brand-title-sm {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  color: var(--color-text);
}

/* 登录卡片 */
.auth-card {
  width: 100%;
  max-width: 400px;
  background: var(--color-card);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
  box-shadow: var(--shadow-lg);
}

@media (min-width: 1024px) {
  .auth-card {
    padding: var(--spacing-2xl);
  }
}

.auth-title {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-text);
  margin-bottom: var(--spacing-xs);
}

.auth-subtitle {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-lg);
}

/* Tab 切换 */
.auth-tabs {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-lg);
  background: var(--color-bg);
  padding: var(--spacing-xs);
  border-radius: var(--radius-md);
}

.auth-tab {
  flex: 1;
  padding: var(--spacing-sm);
  border: none;
  background: transparent;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.auth-tab.active {
  background: var(--color-card);
  color: var(--color-primary);
  font-weight: var(--font-medium);
  box-shadow: var(--shadow-sm);
}

/* 错误提示 */
.auth-error {
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-error-bg);
  color: var(--color-error);
  font-size: var(--text-sm);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-md);
}

/* 表单 */
.auth-form {
  display: flex;
  flex-direction: column;
}

.form-group {
  margin-bottom: var(--spacing-md);
}

.form-label {
  display: block;
  margin-bottom: var(--spacing-xs);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text);
}

.form-input {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  background: var(--color-bg);
  color: var(--color-text);
  transition: all var(--transition-fast);
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-bg);
}

.form-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-input::placeholder {
  color: var(--color-text-placeholder);
}

/* 验证码 */
.captcha-row {
  display: flex;
  gap: var(--spacing-sm);
}

.captcha-input {
  flex: 1;
}

.captcha-image {
  width: 120px;
  height: 42px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg);
  flex-shrink: 0;
}

.captcha-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.captcha-image.is-loading {
  cursor: wait;
}

.captcha-loading,
.captcha-placeholder {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

/* 按钮 */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-sm) var(--spacing-lg);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.btn-block {
  width: 100%;
}

.btn-lg {
  padding: var(--spacing-md) var(--spacing-lg);
  font-size: var(--text-base);
}

.btn-link {
  background: transparent;
  border: none;
  color: var(--color-primary);
  cursor: pointer;
  font-size: inherit;
  padding: 0;
}

.btn-link:hover:not(:disabled) {
  text-decoration: underline;
}

.btn-link:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 登录底部 */
.auth-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  margin-top: var(--spacing-lg);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

/* 分割线 */
.auth-divider {
  display: flex;
  align-items: center;
  margin: var(--spacing-lg) 0;
  color: var(--color-text-placeholder);
  font-size: var(--text-sm);
}

.auth-divider::before,
.auth-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--color-border);
}

.auth-divider span {
  padding: 0 var(--spacing-md);
}

/* 社交登录 */
.auth-social {
  display: flex;
  justify-content: center;
}

.social-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-lg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: var(--text-sm);
  color: var(--color-text);
}

.social-btn:hover:not(:disabled) {
  border-color: var(--color-primary);
  background: var(--color-primary-bg);
}

.social-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.social-btn-qq {
  color: #12b7f5;
}

.social-btn-qq:hover:not(:disabled) {
  border-color: #12b7f5;
  background: rgba(18, 183, 245, 0.1);
  color: #12b7f5;
}

.social-icon {
  width: 20px;
  height: 20px;
}

/* 校园网提示 */
.campus-hint {
  margin-top: var(--spacing-md);
  text-align: center;
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

/* 返回首页 */
.back-home {
  margin-top: var(--spacing-xl);
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: color var(--transition-fast);
}

.back-home:hover {
  color: var(--color-primary);
}

.back-arrow {
  font-size: var(--text-lg);
}
</style>
