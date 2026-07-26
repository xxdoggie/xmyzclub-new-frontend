<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { getCampusCaptcha } from '@/api/auth'
import {
  confirmAdmission,
  getBotStatus,
  getQqProfile,
  getTokenInfo,
  verifyCampus,
  type ConfirmStatus,
  type QqProfile,
} from '@/api/admission'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const token = ref((route.query.token as string) || '')

/** 页面主状态。链接无效／已认证发生在表单出现之前，所以是页面级状态；其余结果都走弹窗 */
type PageState = 'loading' | 'linkError' | 'verified' | 'form'
const pageState = ref<PageState>('loading')
const linkErrorMessage = ref('')
const alreadyVerifiedName = ref('')

/** 链接锁定的 QQ 号；点了「我不小心点击了别人的链接」后解锁 */
const qqLocked = ref(false)
const qqProfile = ref<QqProfile | null>(null)
const avatarFailed = ref(false)

/**
 * 群机器人是否离线。离线时禁言状态改不了，最后一步必定失败，
 * 所以在进门时就拦住——不能让人把校园网密码填完了才撞墙。
 */
const botOffline = ref(false)

const form = ref({
  qqNumber: '',
  campusAccount: '',
  campusPassword: '',
  captchaCode: '',
  jsessionId: '',
})

const captchaImage = ref('')
const captchaLoading = ref(false)
const submitting = ref(false)

/** 弹窗：身份已被别的 QQ 占用 */
const conflict = ref<QqProfile | null>(null)
/** 弹窗：确认姓名，非空即展示 */
const confirmName = ref('')
/** 校园网返回的姓名，抢绑确认后接着用它弹姓名确认 */
const campusName = ref('')
/** 弹窗：点错别人链接的说明 */
const showUnlockNotice = ref(false)
/** 解禁流程进行中，页面保持等待态 */
const finalizing = ref(false)

const pendingSessionId = ref('')
const takeover = ref(false)

/** 最终结果弹窗 */
const doneStatus = ref<ConfirmStatus | ''>('')
const result = ref<{ name: string; qq: QqProfile } | null>(null)

const canSubmit = computed(() =>
  !!form.value.qqNumber &&
  !!form.value.campusAccount &&
  !!form.value.campusPassword &&
  !!form.value.captchaCode &&
  !submitting.value &&
  !botOffline.value
)

/** 步骤指示跟着真实流程走，不是摆设 */
const currentStep = computed(() => {
  if (doneStatus.value) return 4
  if (finalizing.value) return 3
  if (conflict.value || confirmName.value) return 2
  return 1
})

// ==================== 初始化 ====================

onMounted(async () => {
  checkBotStatus()

  if (!token.value) {
    // 没有 token 也允许使用：自己填 QQ 号即可
    qqLocked.value = false
    pageState.value = 'form'
    loadCaptcha()
    return
  }

  try {
    const res = await getTokenInfo(token.value)
    if (res.data.code !== 200) {
      linkErrorMessage.value = res.data.message || '认证链接无效'
      pageState.value = 'linkError'
      return
    }

    const info = res.data.data
    qqProfile.value = info.qq
    form.value.qqNumber = info.qq.qqNumber
    qqLocked.value = true

    if (info.alreadyVerified) {
      alreadyVerifiedName.value = info.verifiedName || ''
      pageState.value = 'verified'
      return
    }

    pageState.value = 'form'
    loadCaptcha()
  } catch {
    linkErrorMessage.value = '网络错误，请稍后重试'
    pageState.value = 'linkError'
  }
})

async function checkBotStatus() {
  try {
    const res = await getBotStatus()
    botOffline.value = res.data.code === 200 && !res.data.data.botOnline
  } catch {
    // 状态查不到就当它在线，别因为一个附属接口挡住整个流程
    botOffline.value = false
  }
}

// ==================== 验证码 ====================

// 用 in-flight promise 去重，避免并发拿到两个 JSESSIONID 互相覆盖
let captchaInFlight: Promise<void> | null = null
function loadCaptcha() {
  if (captchaInFlight) return captchaInFlight
  captchaLoading.value = true
  captchaInFlight = (async () => {
    try {
      const res = await getCampusCaptcha()
      if (res.data.code === 200) {
        captchaImage.value = res.data.data.captchaImage
        form.value.jsessionId = res.data.data.jsessionId
        form.value.captchaCode = ''
      } else {
        toast.error(res.data.message || '获取验证码失败')
      }
    } catch {
      toast.error('网络错误，请稍后重试')
    } finally {
      captchaLoading.value = false
      captchaInFlight = null
    }
  })()
  return captchaInFlight
}

// ==================== 自填 QQ 号时查昵称头像 ====================

let profileTimer: ReturnType<typeof setTimeout> | null = null
watch(
  () => form.value.qqNumber,
  (value) => {
    if (qqLocked.value) return
    if (profileTimer) clearTimeout(profileTimer)
    if (!/^\d{5,11}$/.test(value)) {
      qqProfile.value = null
      return
    }
    profileTimer = setTimeout(async () => {
      try {
        const res = await getQqProfile(value)
        // 输入框可能在请求期间又变了，过期结果直接丢掉
        if (res.data.code === 200 && res.data.data.qqNumber === form.value.qqNumber) {
          avatarFailed.value = false
          qqProfile.value = res.data.data
        }
      } catch {
        qqProfile.value = null
      }
    }, 500)
  }
)

// ==================== 我不小心点了别人的链接 ====================

function unlockQqField() {
  showUnlockNotice.value = false
  qqLocked.value = false
  form.value.qqNumber = ''
  qqProfile.value = null
}

// ==================== 提交校验 ====================

async function handleSubmit() {
  if (!canSubmit.value) return

  submitting.value = true
  try {
    const res = await verifyCampus({
      token: token.value || undefined,
      qqNumber: form.value.qqNumber,
      campusAccount: form.value.campusAccount,
      campusPassword: form.value.campusPassword,
      captchaCode: form.value.captchaCode,
      jsessionId: form.value.jsessionId,
    })

    if (res.data.code !== 200) {
      toast.error(res.data.message || '验证失败')
      // 图形验证码是一次性的，失败后必须换一张
      loadCaptcha()
      return
    }

    const data = res.data.data
    pendingSessionId.value = data.sessionId
    campusName.value = data.name
    takeover.value = false

    if (data.conflict) {
      // 先让用户决定是否抢绑，确认后才弹姓名
      conflict.value = data.conflict
    } else {
      confirmName.value = data.name
    }
  } catch {
    toast.error('网络错误，请稍后重试')
    loadCaptcha()
  } finally {
    submitting.value = false
  }
}

// ==================== 抢绑确认 ====================

function acceptTakeover() {
  takeover.value = true
  conflict.value = null
  confirmName.value = campusName.value
}

function cancelTakeover() {
  conflict.value = null
  pendingSessionId.value = ''
  takeover.value = false
  // 图形验证码已被这次校验消耗掉了，回到表单得换新的
  loadCaptcha()
}

// ==================== 最终确认 + 解禁 ====================

async function handleFinalConfirm() {
  if (!pendingSessionId.value) return

  finalizing.value = true
  confirmName.value = ''

  try {
    const res = await confirmAdmission(pendingSessionId.value, takeover.value)
    if (res.data.code !== 200) {
      toast.error(res.data.message || '验证失败')
      loadCaptcha()
      return
    }

    const data = res.data.data
    avatarFailed.value = false
    result.value = { name: data.name, qq: data.qq }
    doneStatus.value = data.status
  } catch {
    toast.error('网络错误，请稍后重试')
    loadCaptcha()
  } finally {
    finalizing.value = false
    pendingSessionId.value = ''
  }
}

function goHome() {
  router.push('/')
}
</script>

<template>
  <div class="verify-page">
    <div class="container">
      <!-- 步骤指示 -->
      <div v-if="pageState === 'form'" class="steps">
        <div class="step">
          <span class="step-dot" :class="{ on: currentStep >= 1 }">1</span>
          <span class="step-text" :class="{ on: currentStep === 1 }">核验</span>
        </div>
        <span class="step-line"></span>
        <div class="step">
          <span class="step-dot" :class="{ on: currentStep >= 2 }">2</span>
          <span class="step-text" :class="{ on: currentStep === 2 }">确认</span>
        </div>
        <span class="step-line"></span>
        <div class="step">
          <span class="step-dot" :class="{ on: currentStep >= 3 }">3</span>
          <span class="step-text" :class="{ on: currentStep === 3 }">解禁</span>
        </div>
      </div>

      <h1 class="page-title">校园网身份验证</h1>
      <p class="page-sub">厦门一中学生社区 · 新生入群实名认证</p>

      <!-- 机器人离线时提前拦住，别让人填完密码才发现做不了 -->
      <div v-if="botOffline && pageState === 'form'" class="banner">
        群机器人当前离线，暂时无法解除禁言，请稍后再来或联系群管理员。
      </div>

      <!-- 读取链接中 -->
      <div v-if="pageState === 'loading'" class="card state-card">
        <div class="loader-track"></div>
        <p class="state-text">正在读取认证链接……</p>
      </div>

      <!-- 链接无效 / 过期 -->
      <div v-else-if="pageState === 'linkError'" class="card state-card">
        <p class="state-title">{{ linkErrorMessage }}</p>
        <p class="state-text">请返回群聊查看最新的认证链接，或联系群管理员。</p>
      </div>

      <!-- 该 QQ 已认证过 -->
      <div v-else-if="pageState === 'verified'" class="card state-card">
        <p class="state-title">该 QQ 号已完成实名认证</p>
        <p class="state-text">
          {{ alreadyVerifiedName ? `认证姓名：${alreadyVerifiedName}` : '无需重复认证。' }}
        </p>
        <button class="btn-primary" @click="goHome">去学生社区看看</button>
      </div>

      <!-- 主表单 -->
      <form v-else @submit.prevent="handleSubmit">
        <!-- 身份 -->
        <section class="card">
          <h2 class="card-head">你的身份</h2>

          <div class="field">
            <label class="label" for="qq">QQ 号</label>
            <div class="input-wrap">
              <input
                id="qq"
                v-model="form.qqNumber"
                class="input mono"
                :class="{ 'is-locked': qqLocked }"
                type="text"
                inputmode="numeric"
                :readonly="qqLocked"
                placeholder="请输入您的 QQ 号"
              />
              <span v-if="qqLocked" class="input-suffix">本链接专属</span>
            </div>
          </div>

          <!-- 头像昵称：让「填的是谁」和「这是不是我」落在同一个单元里。
               昵称要向 QQ 查、可能取不到；头像是拿号码直接拼的 URL，一定有。
               取不到昵称就只显示号码，不要印一句「未能取得」去吓人。 -->
          <div class="identity">
            <template v-if="qqProfile">
              <img
                v-if="!avatarFailed"
                :src="qqProfile.avatarUrl"
                alt=""
                class="avatar"
                @error="avatarFailed = true"
              />
              <span v-else class="avatar avatar--blank">?</span>
              <span class="identity-meta">
                <span v-if="qqProfile.nickname" class="identity-name">{{ qqProfile.nickname }}</span>
                <span class="identity-qq" :class="{ 'is-primary': !qqProfile.nickname }">
                  {{ qqProfile.qqNumber }}
                </span>
              </span>
              <span v-if="qqProfile.inGroup === false" class="pill pill--warn">不在群内</span>
            </template>
            <template v-else>
              <span class="avatar avatar--blank">?</span>
              <span class="identity-hint">填好 QQ 号后，这里会显示头像和昵称供您核对</span>
            </template>
          </div>

          <button
            v-if="qqLocked"
            type="button"
            class="link-btn"
            @click="showUnlockNotice = true"
          >
            我不小心点击了别人的链接
          </button>
        </section>

        <!-- 校园网 -->
        <section class="card">
          <h2 class="card-head">校园网账号</h2>

          <div class="field">
            <label class="label" for="account">账号</label>
            <input
              id="account"
              v-model="form.campusAccount"
              class="input"
              type="text"
              autocomplete="off"
              placeholder="校园网登录账号"
            />
          </div>

          <div class="field">
            <label class="label" for="pwd">密码</label>
            <input
              id="pwd"
              v-model="form.campusPassword"
              class="input"
              type="password"
              autocomplete="off"
              placeholder="校园网登录密码"
            />
          </div>

          <div class="field">
            <label class="label" for="captcha">图形验证码</label>
            <div class="captcha-row">
              <input
                id="captcha"
                v-model="form.captchaCode"
                class="input"
                type="text"
                placeholder="验证码"
              />
              <button
                type="button"
                class="captcha-box"
                :class="{ 'is-loading': captchaLoading }"
                title="点击刷新"
                @click="loadCaptcha()"
              >
                <img v-if="captchaImage && !captchaLoading" :src="captchaImage" alt="验证码" />
                <span v-else>{{ captchaLoading ? '加载中' : '点击获取' }}</span>
              </button>
            </div>
          </div>

          <button type="submit" class="btn-primary" :disabled="!canSubmit">
            {{ submitting ? '验证中……' : '开始验证' }}
          </button>
        </section>

        <p class="foot">
          账号密码仅用于向学校校园网核验身份，认证成功后将自动解除群内禁言。
        </p>
      </form>
    </div>

    <!-- ══════ 弹窗：点错别人的链接 ══════ -->
    <div v-if="showUnlockNotice" class="mask">
      <div class="modal">
        <h2 class="modal-title">请填写您自己的 QQ 号</h2>
        <p class="modal-body">
          请在 QQ 号一栏输入您的正确 QQ 号，然后重新进行验证。原先那个号不会被解除禁言。
        </p>
        <div class="modal-actions">
          <button class="btn-primary" @click="unlockQqField">好，我来填</button>
        </div>
      </div>
    </div>

    <!-- ══════ 弹窗：身份已被别的 QQ 绑定 ══════ -->
    <div v-if="conflict" class="mask">
      <div class="modal">
        <h2 class="modal-title">该账号已被 QQ 号 {{ conflict.qqNumber }} 绑定</h2>
        <div class="conflict-card">
          <img :src="conflict.avatarUrl" alt="" class="avatar avatar--lg" />
          <span class="identity-meta">
            <span class="identity-name">{{ conflict.nickname || '昵称未能取得' }}</span>
            <span class="identity-qq">{{ conflict.qqNumber }}</span>
          </span>
        </div>
        <p class="modal-body">
          若这不是您的另一个 QQ 号，确认绑定后它会被重新禁言并收到重新验证的通知。
        </p>
        <div class="modal-actions modal-actions--row">
          <button class="btn-ghost" @click="cancelTakeover">取消绑定</button>
          <button class="btn-primary" @click="acceptTakeover">这不是我，确认绑定</button>
        </div>
      </div>
    </div>

    <!-- ══════ 弹窗：确认姓名 ══════ -->
    <div v-if="confirmName" class="mask">
      <div class="modal modal--center">
        <p class="modal-kicker">请确认您的身份</p>
        <p class="modal-name">{{ confirmName }}</p>
        <div class="modal-actions">
          <button class="btn-primary" @click="handleFinalConfirm">这就是我，开启厦一旅程</button>
        </div>
      </div>
    </div>

    <!-- ══════ 弹窗：处理中 ══════ -->
    <div v-if="finalizing" class="mask">
      <div class="modal modal--center">
        <p class="modal-kicker">处理中……</p>
        <div class="loader-track"></div>
        <p class="modal-body">正在核对您的入群状态并解除禁言，请不要关闭本页面。</p>
      </div>
    </div>

    <!-- ══════ 弹窗：验证结果 ══════ -->
    <div v-if="doneStatus" class="mask">
      <!-- 已不在群内 -->
      <div v-if="doneStatus === 'NOT_IN_GROUP'" class="modal">
        <h2 class="modal-title">检测到您已不在群内</h2>
        <div class="conflict-card">
          <img :src="result?.qq.avatarUrl" alt="" class="avatar avatar--lg" />
          <span class="identity-meta">
            <span class="identity-name">{{ result?.qq.nickname || '昵称未能取得' }}</span>
            <span class="identity-qq">{{ result?.qq.qqNumber }}</span>
          </span>
        </div>
        <p class="modal-body">请重新加入群聊后再次进行验证。本次验证未做任何改动。</p>
      </div>

      <!-- 验证成功 -->
      <div v-else class="modal modal--center">
        <span class="check">✓</span>
        <h2 class="modal-title">核验成功</h2>
        <p class="modal-name modal-name--sm">{{ result?.name }}</p>
        <p class="modal-body">
          <template v-if="doneStatus === 'UNMUTE_FAILED'">
            身份已认证通过，但自动解禁未能确认生效，已通知管理员为您手动解除。
          </template>
          <template v-else>
            群内禁言已解除，去群里打个招呼吧。
          </template>
        </p>
        <div class="modal-actions">
          <button class="btn-primary" @click="goHome">去学生社区看看</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
  站内克制方向：直接吃 style.css 的全局设计变量，不另起一套色板，
  这样将来主题一改这页跟着走。只有等宽字体是本页自己定的。
*/
.verify-page {
  --mono: 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace;

  min-height: 100vh;
  background: var(--color-bg);
  color: var(--color-text);
  padding: var(--spacing-lg) var(--spacing-md) var(--spacing-2xl);
}

.container {
  max-width: 420px;
  margin: 0 auto;
}

/* ===== 步骤指示 ===== */
.steps {
  display: flex;
  align-items: center;
  margin-bottom: var(--spacing-lg);
}

.step {
  display: flex;
  align-items: center;
  gap: 7px;
}

.step-dot {
  width: 21px;
  height: 21px;
  flex-shrink: 0;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 600;
  background: var(--color-border);
  color: var(--color-text-placeholder);
  transition: background var(--transition-normal), color var(--transition-normal);
}

.step-dot.on {
  background: var(--color-primary);
  color: #fff;
}

.step-text {
  font-size: 12px;
  color: var(--color-text-placeholder);
  transition: color var(--transition-normal);
}

.step-text.on {
  color: var(--color-text);
  font-weight: 500;
}

.step-line {
  flex: 1;
  height: 1px;
  margin: 0 9px;
  background: var(--color-border);
}

/* ===== 页头 ===== */
.page-title {
  font-size: 19px;
  font-weight: 600;
  margin: 0 0 4px;
}

.page-sub {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 0 0 var(--spacing-lg);
}

.banner {
  padding: 10px 12px;
  margin-bottom: var(--spacing-md);
  border-radius: var(--radius-md);
  background: var(--color-warning-bg);
  color: var(--color-warning);
  font-size: 12.5px;
  line-height: 1.6;
}

/* ===== 卡片 ===== */
.card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.card-head {
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  margin: 0 0 var(--spacing-md);
}

/* ===== 字段 ===== */
.field {
  margin-bottom: 14px;
}

.label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 6px;
}

.input-wrap {
  position: relative;
}

.input {
  width: 100%;
  padding: 10px 12px;
  font-family: inherit;
  font-size: 14px;
  color: var(--color-text);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: border-color var(--transition-fast);
}

.input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.input::placeholder {
  color: var(--color-text-placeholder);
}

.input.mono {
  font-family: var(--mono);
  letter-spacing: 0.02em;
}

/*
  锁定的 QQ 号用 readonly 而不是 disabled：
  灰掉的号码看起来像「失效」，而它其实是「已确认」。
*/
.input.is-locked {
  background: var(--color-bg);
  padding-right: 76px;
  cursor: default;
}

.input-suffix {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 11px;
  color: var(--color-text-placeholder);
  pointer-events: none;
}

/* ===== 身份核对 ===== */
.identity {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--color-bg);
  border-radius: var(--radius-md);
}

.avatar {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: var(--radius-full);
  object-fit: cover;
  background: var(--color-border);
}

.avatar--lg {
  width: 42px;
  height: 42px;
}

.avatar--blank {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: var(--color-text-placeholder);
}

.identity-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.identity-name {
  font-size: 14px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.identity-qq {
  font-family: var(--mono);
  font-size: 12px;
  color: var(--color-text-secondary);
}

/* 昵称取不到时，号码顶上来当主行 */
.identity-qq.is-primary {
  font-size: 14px;
  color: var(--color-text);
}

.identity-hint {
  font-size: 12.5px;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.pill {
  margin-left: auto;
  flex-shrink: 0;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

.pill--warn {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

/* ===== 验证码 ===== */
.captcha-row {
  display: flex;
  gap: var(--spacing-sm);
}

.captcha-row .input {
  flex: 1;
}

.captcha-box {
  width: 100px;
  height: 40px;
  flex-shrink: 0;
  padding: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: var(--color-text-secondary);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
}

.captcha-box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.captcha-box.is-loading {
  opacity: 0.6;
}

/* ===== 按钮 ===== */
.btn-primary,
.btn-ghost {
  width: 100%;
  padding: 12px;
  font-family: inherit;
  font-size: 14.5px;
  font-weight: 500;
  border-radius: var(--radius-md);
  cursor: pointer;
}

.btn-primary {
  margin-top: 6px;
  background: var(--color-primary);
  border: 0;
  color: #fff;
  transition: background var(--transition-fast);
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-ghost {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
}

.link-btn {
  display: block;
  width: 100%;
  margin-top: var(--spacing-sm);
  padding: 4px;
  background: none;
  border: 0;
  font-family: inherit;
  font-size: 12.5px;
  color: var(--color-primary);
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}

.foot {
  font-size: 12px;
  line-height: 1.65;
  color: var(--color-text-secondary);
  margin: 0 2px;
}

/* ===== 页面级状态卡 ===== */
.state-card {
  text-align: center;
  padding: var(--spacing-lg) var(--spacing-md);
}

.state-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 var(--spacing-sm);
}

.state-text {
  font-size: 13px;
  line-height: 1.7;
  color: var(--color-text-secondary);
  margin: 0;
}

.state-card .btn-primary {
  margin-top: var(--spacing-lg);
}

/* ===== 弹窗 ===== */
.mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-md);
  background: rgba(0, 0, 0, 0.45);
}

.modal {
  width: 100%;
  max-width: 380px;
  padding: var(--spacing-lg);
  background: var(--color-card);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
}

.modal--center {
  text-align: center;
}

.modal-title {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.5;
  margin: 0 0 var(--spacing-sm);
}

.modal-kicker {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0 0 var(--spacing-md);
}

.modal-name {
  font-size: 27px;
  font-weight: 600;
  letter-spacing: 0.06em;
  margin: 0 0 var(--spacing-sm);
}

.modal-name--sm {
  font-size: 22px;
}

.modal-body {
  font-size: 13px;
  line-height: 1.7;
  color: var(--color-text-secondary);
  margin: 0;
}

.modal-actions {
  margin-top: var(--spacing-lg);
}

.modal-actions--row {
  display: flex;
  gap: var(--spacing-sm);
}

.modal-actions--row > * {
  flex: 1;
  margin-top: 0;
}

.conflict-card {
  display: flex;
  align-items: center;
  gap: 11px;
  margin: var(--spacing-md) 0;
  padding: 12px;
  background: var(--color-bg);
  border-radius: var(--radius-md);
}

.check {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin: 0 auto var(--spacing-md);
  border-radius: var(--radius-full);
  background: var(--color-success-bg);
  color: var(--color-success);
  font-size: 22px;
  font-weight: 600;
}

/* ===== 等待指示 =====
   一段主色在轨道上往返，不用转圈。 */
.loader-track {
  position: relative;
  height: 3px;
  margin: 0 auto var(--spacing-md);
  max-width: 180px;
  overflow: hidden;
  border-radius: var(--radius-full);
  background: var(--color-border);
}

.loader-track::after {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 34%;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  animation: loader-sweep 1.5s cubic-bezier(0.45, 0, 0.55, 1) infinite;
}

@keyframes loader-sweep {
  0% {
    left: 0;
  }
  50% {
    left: 66%;
  }
  100% {
    left: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .loader-track::after {
    animation: none;
    width: 100%;
    opacity: 0.5;
  }
}
</style>
