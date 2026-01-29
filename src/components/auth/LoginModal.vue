<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { getCampusCaptcha, getQQAuthorizeUrl } from '@/api/auth'
import { sendSmsCode } from '@/api/sms'

const props = defineProps<{
  show: boolean
  message?: string | null
}>()

const emit = defineEmits<{
  close: []
}>()

const router = useRouter()
const userStore = useUserStore()
const toast = useToast()

// Tab 切换
type TabType = 'login' | 'register' | 'campus' | 'sms'
const activeTab = ref<TabType>('login')
const prevTab = ref<TabType>('login')
const tabDirection = ref<'left' | 'right'>('right')

// Tab 顺序: login(0) < sms(1) < register(2) < campus(3)
const tabOrder: Record<TabType, number> = { login: 0, sms: 1, register: 2, campus: 3 }

function switchTab(newTab: TabType) {
  const oldOrder = tabOrder[activeTab.value]
  const newOrder = tabOrder[newTab]
  tabDirection.value = newOrder > oldOrder ? 'right' : 'left'
  prevTab.value = activeTab.value
  activeTab.value = newTab
}

// 滑块动画
const tabsRef = ref<HTMLElement | null>(null)
const sliderStyle = ref({ left: '0px', width: '0px' })

function updateSliderPosition() {
  nextTick(() => {
    if (!tabsRef.value) return
    const activeBtn = tabsRef.value.querySelector('.login-tab.active') as HTMLElement
    if (activeBtn) {
      sliderStyle.value = {
        left: `${activeBtn.offsetLeft}px`,
        width: `${activeBtn.offsetWidth}px`,
      }
    }
  })
}

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

const smsForm = ref({
  phoneNumber: '',
  code: '',
})

// 状态
const loading = ref(false)
const smsSending = ref(false)
const smsCountdown = ref(0)
let smsCountdownTimer: ReturnType<typeof setInterval> | null = null
const campusCaptchaImage = ref('')
const captchaLoading = ref(false)

// 密码显示切换
const showLoginPassword = ref(false)
const showRegisterPassword = ref(false)
const showRegisterConfirmPassword = ref(false)
const showCampusPassword = ref(false)

// 监听 show 变化
watch(
  () => props.show,
  (show) => {
    if (show) {
      updateSliderPosition()
      if (activeTab.value === 'campus') {
        loadCampusCaptcha()
      }
    }
  }
)

// 监听 tab 变化
watch(activeTab, (tab) => {
  updateSliderPosition()
  if (tab === 'campus' && props.show) {
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
      toast.error(res.data.message || '获取验证码失败')
    }
  } catch {
    toast.error('网络错误，请稍后重试')
  } finally {
    captchaLoading.value = false
  }
}

// 普通登录
async function handleLogin() {
  const { username, password } = loginForm.value
  if (!username || !password) {
    toast.warning('请填写用户名和密码')
    return
  }

  loading.value = true

  try {
    const result = await userStore.login(username, password)
    if (result.code === 200) {
      if (result.data.isNewUser) {
        toast.success('欢迎！建议您前往设置页修改用户名')
      } else {
        toast.success('登录成功')
      }
      handleLoginSuccess()
    } else {
      toast.error(result.message || '登录失败')
    }
  } catch {
    toast.error('网络错误，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 普通注册
async function handleRegister() {
  const { username, password, confirmPassword } = registerForm.value
  if (!username || !password) {
    toast.warning('请填写用户名和密码')
    return
  }
  if (password !== confirmPassword) {
    toast.warning('两次密码输入不一致')
    return
  }
  if (password.length < 6) {
    toast.warning('密码至少 6 位')
    return
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    toast.warning('用户名只能包含英文字母、数字和下划线')
    return
  }

  loading.value = true

  try {
    const result = await userStore.register(username, password)
    if (result.code === 200) {
      toast.success('注册成功')
      handleLoginSuccess()
    } else {
      toast.error(result.message || '注册失败')
    }
  } catch {
    toast.error('网络错误，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 校园网登录
async function handleCampusLogin() {
  const { studentId, password, captchaCode, jsessionId } = campusForm.value
  if (!studentId || !password) {
    toast.warning('请填写学号和密码')
    return
  }
  if (!captchaCode) {
    toast.warning('请输入验证码')
    return
  }

  loading.value = true

  try {
    const result = await userStore.loginByCampus(
      studentId,
      password,
      captchaCode,
      jsessionId
    )
    if (result.code === 200) {
      if (result.data.isNewUser) {
        toast.success('欢迎！建议您前往设置页修改用户名')
      } else {
        toast.success('登录成功')
      }
      handleLoginSuccess()
    } else {
      toast.error(result.message || '登录失败')
      loadCampusCaptcha()
    }
  } catch {
    toast.error('网络错误，请稍后重试')
    loadCampusCaptcha()
  } finally {
    loading.value = false
  }
}

// 发送短信验证码
async function handleSendSmsCode() {
  const { phoneNumber } = smsForm.value
  if (!phoneNumber) {
    toast.warning('请输入手机号')
    return
  }
  if (!/^1[3-9]\d{9}$/.test(phoneNumber)) {
    toast.warning('请输入正确的手机号')
    return
  }

  smsSending.value = true

  try {
    const res = await sendSmsCode(phoneNumber, 'login')
    if (res.data.code === 200) {
      toast.success('验证码已发送')
      // 开始倒计时
      smsCountdown.value = res.data.data.cooldownSeconds || 60
      smsCountdownTimer = setInterval(() => {
        smsCountdown.value--
        if (smsCountdown.value <= 0) {
          if (smsCountdownTimer) {
            clearInterval(smsCountdownTimer)
            smsCountdownTimer = null
          }
        }
      }, 1000)
    } else {
      toast.error(res.data.message || '发送失败')
    }
  } catch {
    toast.error('网络错误，请稍后重试')
  } finally {
    smsSending.value = false
  }
}

// 短信登录
async function handleSmsLogin() {
  const { phoneNumber, code } = smsForm.value
  if (!phoneNumber) {
    toast.warning('请输入手机号')
    return
  }
  if (!/^1[3-9]\d{9}$/.test(phoneNumber)) {
    toast.warning('请输入正确的手机号')
    return
  }
  if (!code) {
    toast.warning('请输入验证码')
    return
  }
  if (!/^\d{6}$/.test(code)) {
    toast.warning('验证码为6位数字')
    return
  }

  loading.value = true

  try {
    const result = await userStore.smsLogin(phoneNumber, code)
    if (result.code === 200) {
      if (result.data.isNewUser) {
        toast.success('欢迎！建议您前往设置页修改用户名')
      } else {
        toast.success('登录成功')
      }
      handleLoginSuccess()
    } else {
      toast.error(result.message || '登录失败')
    }
  } catch {
    toast.error('网络错误，请稍后重试')
  } finally {
    loading.value = false
  }
}

// QQ 登录
async function handleQQLogin() {
  loading.value = true

  try {
    const res = await getQQAuthorizeUrl()
    if (res.data.code === 200) {
      window.location.href = res.data.data.authorizeUrl
    } else {
      toast.error(res.data.message || '获取授权链接失败')
    }
  } catch {
    toast.error('网络错误，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 登录成功处理
function handleLoginSuccess() {
  emit('close')
  const redirect = userStore.consumeRedirectRoute()
  if (redirect) {
    router.push(redirect)
  }
}

// 关闭弹窗
function handleClose() {
  if (!loading.value) {
    emit('close')
  }
}

// 显示消息提示
watch(
  () => props.message,
  (msg) => {
    if (msg) {
      toast.info(msg)
    }
  },
  { immediate: true }
)

onMounted(() => {
  updateSliderPosition()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="modal-overlay" @click.self="handleClose">
        <div class="login-modal">
          <!-- 头部 -->
          <div class="modal-header">
            <h3 class="modal-title">
              {{ activeTab === 'register' ? '注册账号' : '登录' }}
            </h3>
            <button
              class="modal-close"
              :disabled="loading"
              @click="handleClose"
            >
              &times;
            </button>
          </div>

          <!-- Tab 切换 (带滑块动画) -->
          <div v-if="activeTab !== 'register'" ref="tabsRef" class="login-tabs">
            <div class="login-tabs-slider" :style="sliderStyle"></div>
            <button
              class="login-tab"
              :class="{ active: activeTab === 'login' }"
              @click="switchTab('login')"
            >
              密码登录
            </button>
            <button
              class="login-tab"
              :class="{ active: activeTab === 'sms' }"
              @click="switchTab('sms')"
            >
              短信登录
            </button>
            <button
              class="login-tab"
              :class="{ active: activeTab === 'campus' }"
              @click="switchTab('campus')"
            >
              校园网
            </button>
          </div>

          <!-- 表单内容 - 带过渡动画 -->
          <Transition :name="'tab-slide-' + tabDirection" mode="out-in">
          <!-- 普通登录表单 -->
          <div v-if="activeTab === 'login'" key="login" class="modal-body">
            <div class="form-group">
              <label class="form-label">用户名</label>
              <input
                v-model="loginForm.username"
                type="text"
                class="form-input"
                placeholder="请输入用户名"
                :disabled="loading"
                @keyup.enter="handleLogin"
              />
            </div>
            <div class="form-group">
              <label class="form-label">密码</label>
              <div class="password-input-wrapper">
                <input
                  v-model="loginForm.password"
                  :type="showLoginPassword ? 'text' : 'password'"
                  class="form-input"
                  placeholder="请输入密码"
                  :disabled="loading"
                  @keyup.enter="handleLogin"
                />
                <button
                  type="button"
                  class="password-toggle"
                  @click="showLoginPassword = !showLoginPassword"
                  tabindex="-1"
                >
                  <svg v-if="showLoginPassword" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </button>
              </div>
            </div>

            <button
              class="btn btn-primary btn-block btn-touch"
              :disabled="loading"
              @click="handleLogin"
            >
              {{ loading ? '登录中...' : '登录' }}
            </button>

            <div class="login-footer">
              <span class="login-footer-text">没有账号？</span>
              <button
                class="btn btn-link"
                :disabled="loading"
                @click="switchTab('register')"
              >
                立即注册
              </button>
            </div>

            <!-- 第三方登录 -->
            <div class="login-divider">
              <span>其他登录方式</span>
            </div>

            <div class="login-social">
              <button
                class="social-btn social-btn-qq"
                :disabled="loading"
                title="QQ登录"
                @click="handleQQLogin"
              >
                <svg viewBox="0 0 24 24" class="social-icon">
                  <path
                    fill="currentColor"
                    d="M12.003 2c-2.265 0-6.29 1.364-6.29 7.325v1.195S3.55 14.96 3.55 17.474c0 .665.17 1.025.281 1.025.114 0 .902-.484 1.748-2.072 0 0-.18 2.197 1.904 3.967 0 0-1.77.495-1.77 1.182 0 .686 4.078.43 6.29.43 2.213 0 6.29.256 6.29-.43 0-.687-1.77-1.182-1.77-1.182 2.085-1.77 1.905-3.967 1.905-3.967.846 1.588 1.633 2.072 1.746 2.072.111 0 .283-.36.283-1.025 0-2.514-2.166-6.954-2.166-6.954V9.325C18.29 3.364 14.268 2 12.003 2z"
                  />
                </svg>
              </button>
            </div>
          </div>

          <!-- 短信登录表单 -->
          <div v-else-if="activeTab === 'sms'" key="sms" class="modal-body">
            <div class="form-group">
              <label class="form-label">手机号</label>
              <input
                v-model="smsForm.phoneNumber"
                type="tel"
                class="form-input"
                placeholder="请输入手机号"
                maxlength="11"
                :disabled="loading"
              />
            </div>
            <div class="form-group">
              <label class="form-label">验证码</label>
              <div class="sms-code-row">
                <input
                  v-model="smsForm.code"
                  type="text"
                  class="form-input sms-code-input"
                  placeholder="6位验证码"
                  maxlength="6"
                  :disabled="loading"
                  @keyup.enter="handleSmsLogin"
                />
                <button
                  type="button"
                  class="sms-send-btn"
                  :disabled="loading || smsSending || smsCountdown > 0"
                  @click="handleSendSmsCode"
                >
                  {{ smsCountdown > 0 ? `${smsCountdown}s` : (smsSending ? '发送中' : '获取验证码') }}
                </button>
              </div>
            </div>

            <button
              class="btn btn-primary btn-block btn-touch"
              :disabled="loading"
              @click="handleSmsLogin"
            >
              {{ loading ? '登录中...' : '登录' }}
            </button>

            <div class="login-footer">
              <span class="login-footer-text">没有账号？</span>
              <button
                class="btn btn-link"
                :disabled="loading"
                @click="switchTab('register')"
              >
                立即注册
              </button>
            </div>

            <p class="campus-hint">首次使用手机号登录将自动创建账号</p>
          </div>

          <!-- 注册表单 -->
          <div v-else-if="activeTab === 'register'" key="register" class="modal-body">
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
              <div class="password-input-wrapper">
                <input
                  v-model="registerForm.password"
                  :type="showRegisterPassword ? 'text' : 'password'"
                  class="form-input"
                  placeholder="至少 6 位"
                  :disabled="loading"
                />
                <button
                  type="button"
                  class="password-toggle"
                  @click="showRegisterPassword = !showRegisterPassword"
                  tabindex="-1"
                >
                  <svg v-if="showRegisterPassword" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </button>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">确认密码</label>
              <div class="password-input-wrapper">
                <input
                  v-model="registerForm.confirmPassword"
                  :type="showRegisterConfirmPassword ? 'text' : 'password'"
                  class="form-input"
                  placeholder="再次输入密码"
                  :disabled="loading"
                  @keyup.enter="handleRegister"
                />
                <button
                  type="button"
                  class="password-toggle"
                  @click="showRegisterConfirmPassword = !showRegisterConfirmPassword"
                  tabindex="-1"
                >
                  <svg v-if="showRegisterConfirmPassword" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </button>
              </div>
            </div>

            <button
              class="btn btn-primary btn-block btn-touch"
              :disabled="loading"
              @click="handleRegister"
            >
              {{ loading ? '注册中...' : '注册' }}
            </button>

            <div class="login-footer">
              <span class="login-footer-text">已有账号？</span>
              <button
                class="btn btn-link"
                :disabled="loading"
                @click="switchTab('login')"
              >
                返回登录
              </button>
            </div>
          </div>

          <!-- 校园网登录表单 -->
          <div v-else-if="activeTab === 'campus'" key="campus" class="modal-body">
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
              <div class="password-input-wrapper">
                <input
                  v-model="campusForm.password"
                  :type="showCampusPassword ? 'text' : 'password'"
                  class="form-input"
                  placeholder="请输入校园网密码"
                  :disabled="loading"
                />
                <button
                  type="button"
                  class="password-toggle"
                  @click="showCampusPassword = !showCampusPassword"
                  tabindex="-1"
                >
                  <svg v-if="showCampusPassword" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </button>
              </div>
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
                  @keyup.enter="handleCampusLogin"
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

            <!-- 填充空间保持高度一致 -->
            <div class="form-spacer"></div>

            <button
              class="btn btn-primary btn-block btn-touch"
              :disabled="loading"
              @click="handleCampusLogin"
            >
              {{ loading ? '登录中...' : '登录' }}
            </button>

            <p class="campus-hint">首次使用校园网登录将自动创建账号</p>
          </div>
          </Transition>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
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

.login-modal {
  background: var(--color-card);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 400px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: var(--shadow-xl);
  /* 添加高度过渡动画 */
  transition: height var(--transition-normal);
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
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  font-size: var(--text-xl);
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.modal-close:hover {
  background: var(--color-border);
  color: var(--color-text);
}

.modal-close:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Tab 切换 - 带滑块动画 */
.login-tabs {
  display: flex;
  position: relative;
  background: var(--color-bg);
  padding: var(--spacing-xs);
  margin: var(--spacing-md);
  margin-bottom: 0;
  border-radius: var(--radius-md);
}

.login-tabs-slider {
  position: absolute;
  top: var(--spacing-xs);
  bottom: var(--spacing-xs);
  background: var(--color-card);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-normal);
}

.login-tab {
  flex: 1;
  padding: var(--spacing-sm) var(--spacing-md);
  border: none;
  background: transparent;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: color var(--transition-fast);
  position: relative;
  z-index: 1;
}

.login-tab.active {
  color: var(--color-primary);
  font-weight: var(--font-medium);
}

/* 表单 */
.modal-body {
  padding: var(--spacing-md);
  /* 固定最小高度防止切换时模态框跳变 */
  min-height: 340px;
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
  color: var(--color-text-secondary);
}

.form-input {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  background: var(--color-bg);
  color: var(--color-text);
  transition: border-color var(--transition-fast);
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.form-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-input::placeholder {
  color: var(--color-text-placeholder);
}

/* 密码输入框容器 */
.password-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.password-input-wrapper .form-input {
  padding-right: 44px;
}

.password-toggle {
  position: absolute;
  right: 8px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--color-text-placeholder);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.password-toggle:hover {
  color: var(--color-text-secondary);
  background: var(--color-border);
}

.password-toggle svg {
  width: 18px;
  height: 18px;
  transition: opacity 150ms ease, transform 150ms ease;
}

.password-toggle:active svg {
  transform: scale(0.85);
  opacity: 0.7;
}

/* 验证码行 */
.captcha-row {
  display: flex;
  gap: var(--spacing-sm);
}

.captcha-input {
  flex: 1;
}

/* 短信验证码行 */
.sms-code-row {
  display: flex;
  gap: var(--spacing-sm);
}

.sms-code-input {
  flex: 1;
}

.sms-send-btn {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-primary);
  background: var(--color-primary-bg);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
  min-width: 100px;
}

.sms-send-btn:hover:not(:disabled) {
  background: var(--color-primary);
  color: white;
}

.sms-send-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: var(--color-bg);
  border-color: var(--color-border);
  color: var(--color-text-secondary);
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

.btn-touch {
  min-height: 44px;
}

.btn-link {
  background: transparent;
  color: var(--color-primary);
  padding: 0;
  font-size: var(--text-sm);
}

.btn-link:hover:not(:disabled) {
  text-decoration: underline;
}

/* 登录底部 */
.login-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  margin-top: var(--spacing-md);
}

.login-footer-text {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

/* 分割线 */
.login-divider {
  display: flex;
  align-items: center;
  margin: var(--spacing-lg) 0;
  color: var(--color-text-placeholder);
  font-size: var(--text-sm);
}

.login-divider::before,
.login-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--color-border);
}

.login-divider span {
  padding: 0 var(--spacing-md);
}

/* 社交登录 */
.login-social {
  display: flex;
  justify-content: center;
  gap: var(--spacing-md);
}

.social-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
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
}

.social-icon {
  width: 24px;
  height: 24px;
}

/* 校园网提示 */
.campus-hint {
  margin-top: var(--spacing-md);
  text-align: center;
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

/* 表单内容填充 - 确保按钮位置一致 */
.form-spacer {
  flex: 1;
  min-height: var(--spacing-md);
}

/* Tab 切换动画 - 向右滑动 (login -> campus) */
.tab-slide-right-enter-active,
.tab-slide-right-leave-active {
  transition: opacity 200ms ease, transform 200ms ease;
}

.tab-slide-right-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.tab-slide-right-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

/* Tab 切换动画 - 向左滑动 (campus -> login) */
.tab-slide-left-enter-active,
.tab-slide-left-leave-active {
  transition: opacity 200ms ease, transform 200ms ease;
}

.tab-slide-left-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.tab-slide-left-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

/* Modal 动画 */
.modal-enter-active,
.modal-leave-active {
  transition: opacity var(--transition-normal);
}

.modal-enter-active .login-modal,
.modal-leave-active .login-modal {
  transition: transform var(--transition-normal), opacity var(--transition-normal);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .login-modal {
  transform: scale(0.95);
  opacity: 0;
}

.modal-leave-to .login-modal {
  transform: scale(0.95);
  opacity: 0;
}
</style>
