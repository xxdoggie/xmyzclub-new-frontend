<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/composables/useToast'
import { getCampusCaptcha, checkHasPassword, changePassword } from '@/api/user'
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb.vue'
import AvatarUploader from '@/components/ui/AvatarUploader.vue'

const userStore = useUserStore()
const toast = useToast()

// 加载状态
const isLoading = ref(true)
const isSaving = ref(false)

// 编辑模式
const isEditing = ref(false)

// 头像上传弹窗
const showAvatarUploader = ref(false)

// 解绑确认弹窗
const showUnbindConfirm = ref(false)
const unbindType = ref<'campus' | 'qq'>('campus')
const isUnbinding = ref(false)

// 校园网绑定抽屉
const showCampusBindDrawer = ref(false)
const campusBindForm = ref({
  studentId: '',
  password: '',
  captchaCode: '',
  jsessionId: '',
})
const campusCaptchaImage = ref('')
const captchaLoading = ref(false)
const isBinding = ref(false)
const bindErrorMessage = ref('')

// 修改密码抽屉
const showPasswordDrawer = ref(false)
const passwordLoading = ref(false)
const hasPassword = ref(true) // 是否已设置密码
const passwordCheckLoading = ref(false)
const passwordErrorMessage = ref('')
const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})
const showOldPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)

// 编辑表单
const editForm = ref({
  nickname: '',
  gender: 0,
  signature: '',
  birthdate: '',
})

// 性别选项
const genderOptions = [
  { value: 0, label: '保密' },
  { value: 1, label: '男' },
  { value: 2, label: '女' },
]

// 计算性别文本
const genderText = computed(() => {
  const option = genderOptions.find((o) => o.value === userStore.profile?.gender)
  return option?.label || '保密'
})

// 计算头像 URL
const avatarUrl = computed(() => {
  return userStore.profile?.avatarUrl
})

// 打开头像上传弹窗
function openAvatarUploader() {
  showAvatarUploader.value = true
}

// 头像上传成功
function handleAvatarUploaded(newAvatarUrl: string) {
  // 更新 profile 中的头像
  if (userStore.profile) {
    userStore.profile.hasAvatar = true
    userStore.profile.avatarUrl = newAvatarUrl
  }
}

// 加载数据
onMounted(async () => {
  try {
    await Promise.all([
      userStore.fetchProfile(),
      userStore.fetchCampusBinding(),
      userStore.fetchQQBinding(),
    ])
  } catch (error) {
    toast.error('加载数据失败')
  } finally {
    isLoading.value = false
  }
})

// 开始编辑
function startEdit() {
  if (userStore.profile) {
    editForm.value = {
      nickname: userStore.profile.nickname || '',
      gender: userStore.profile.gender || 0,
      signature: userStore.profile.signature || '',
      birthdate: userStore.profile.birthdate || '',
    }
  }
  isEditing.value = true
}

// 取消编辑
function cancelEdit() {
  isEditing.value = false
}

// 保存编辑
async function saveEdit() {
  if (!editForm.value.nickname.trim()) {
    toast.warning('昵称不能为空')
    return
  }

  isSaving.value = true
  try {
    const res = await userStore.updateProfile({
      nickname: editForm.value.nickname.trim(),
      gender: editForm.value.gender,
      signature: editForm.value.signature.trim(),
      birthdate: editForm.value.birthdate || undefined,
    })

    if (res.code === 200) {
      toast.success('保存成功')
      isEditing.value = false
    } else {
      toast.error(res.message || '保存失败')
    }
  } catch (error) {
    toast.error('保存失败')
  } finally {
    isSaving.value = false
  }
}

// 绑定校园网 - 打开抽屉
function handleBindCampus() {
  showCampusBindDrawer.value = true
  bindErrorMessage.value = ''
  campusBindForm.value = {
    studentId: '',
    password: '',
    captchaCode: '',
    jsessionId: '',
  }
  loadCampusCaptcha()
}

// 关闭校园网绑定抽屉
function closeCampusBindDrawer() {
  showCampusBindDrawer.value = false
  bindErrorMessage.value = ''
}

// 加载校园网验证码
async function loadCampusCaptcha() {
  captchaLoading.value = true
  try {
    const res = await getCampusCaptcha()
    if (res.data.code === 200) {
      campusCaptchaImage.value = res.data.data.captchaImage
      campusBindForm.value.jsessionId = res.data.data.jsessionId
      campusBindForm.value.captchaCode = ''
    } else {
      bindErrorMessage.value = res.data.message || '获取验证码失败'
    }
  } catch {
    bindErrorMessage.value = '网络错误，请稍后重试'
  } finally {
    captchaLoading.value = false
  }
}

// 提交校园网绑定
async function submitCampusBind() {
  const { studentId, password, captchaCode, jsessionId } = campusBindForm.value
  if (!studentId || !password) {
    bindErrorMessage.value = '请填写学号和密码'
    return
  }
  if (!captchaCode) {
    bindErrorMessage.value = '请输入验证码'
    return
  }

  isBinding.value = true
  bindErrorMessage.value = ''

  try {
    const result = await userStore.bindCampus(studentId, password, captchaCode, jsessionId)
    if (result.code === 200) {
      toast.success('绑定成功')
      closeCampusBindDrawer()
    } else {
      bindErrorMessage.value = result.message || '绑定失败'
      loadCampusCaptcha()
    }
  } catch {
    bindErrorMessage.value = '网络错误，请稍后重试'
    loadCampusCaptcha()
  } finally {
    isBinding.value = false
  }
}

// 绑定 QQ
async function handleBindQQ() {
  try {
    const res = await userStore.getQQBindAuthorizeUrl()
    if (res.data.code === 200 && res.data.data?.authorizeUrl) {
      window.location.href = res.data.data.authorizeUrl
    } else {
      toast.error(res.data.message || '获取授权链接失败')
    }
  } catch (error) {
    toast.error('获取授权链接失败')
  }
}

// 打开解绑确认
function openUnbindConfirm(type: 'campus' | 'qq') {
  unbindType.value = type
  showUnbindConfirm.value = true
}

// 确认解绑
async function confirmUnbind() {
  isUnbinding.value = true
  try {
    let res
    if (unbindType.value === 'campus') {
      res = await userStore.unbindCampus()
    } else {
      res = await userStore.unbindQQ()
    }

    if (res.code === 200) {
      toast.success('解绑成功')
      showUnbindConfirm.value = false
    } else {
      toast.error(res.message || '解绑失败')
    }
  } catch (error) {
    toast.error('解绑失败')
  } finally {
    isUnbinding.value = false
  }
}

// 取消解绑
function cancelUnbind() {
  showUnbindConfirm.value = false
}

// 打开修改密码抽屉
async function openPasswordDrawer() {
  showPasswordDrawer.value = true
  passwordErrorMessage.value = ''
  passwordForm.value = {
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  }
  showOldPassword.value = false
  showNewPassword.value = false
  showConfirmPassword.value = false

  // 检查是否已设置密码
  passwordCheckLoading.value = true
  try {
    const res = await checkHasPassword()
    if (res.data.code === 200) {
      hasPassword.value = res.data.data
    }
  } catch {
    // 默认需要旧密码
    hasPassword.value = true
  } finally {
    passwordCheckLoading.value = false
  }
}

// 关闭修改密码抽屉
function closePasswordDrawer() {
  showPasswordDrawer.value = false
  passwordErrorMessage.value = ''
}

// 提交修改密码
async function submitChangePassword() {
  const { oldPassword, newPassword, confirmPassword } = passwordForm.value

  // 验证
  if (hasPassword.value && !oldPassword) {
    passwordErrorMessage.value = '请输入旧密码'
    return
  }
  if (!newPassword) {
    passwordErrorMessage.value = '请输入新密码'
    return
  }
  if (newPassword.length < 6 || newPassword.length > 32) {
    passwordErrorMessage.value = '新密码需要 6-32 位'
    return
  }
  if (newPassword !== confirmPassword) {
    passwordErrorMessage.value = '两次密码输入不一致'
    return
  }

  passwordLoading.value = true
  passwordErrorMessage.value = ''

  try {
    const res = await changePassword({
      oldPassword: hasPassword.value ? oldPassword : undefined,
      newPassword,
    })
    if (res.data.code === 200) {
      toast.success('密码修改成功')
      closePasswordDrawer()
    } else {
      passwordErrorMessage.value = res.data.message || '修改失败'
    }
  } catch {
    passwordErrorMessage.value = '网络错误，请稍后重试'
  } finally {
    passwordLoading.value = false
  }
}
</script>

<template>
  <div class="profile-page">
    <!-- 统一页面头部 -->
    <PageHeader back-to="/" />

    <!-- Content -->
    <main class="page-content">
      <div class="content-container">
        <!-- 桌面端面包屑 -->
        <div class="breadcrumb-wrapper">
          <PageBreadcrumb />
        </div>

        <!-- 加载状态 -->
        <div v-if="isLoading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>

        <template v-else>
          <!-- 主要内容 -->
          <div class="profile-main">
            <!-- 用户信息卡片 -->
            <section class="section">
              <div class="section-header">
                <h2 class="section-title">个人资料</h2>
                <button v-if="!isEditing" class="action-btn" @click="startEdit">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                  编辑
                </button>
              </div>

              <div class="card">
                <!-- 用户信息头部 - 紧凑版 -->
                <div class="user-header">
                  <div class="user-avatar-wrapper" @click="openAvatarUploader">
                    <div v-if="avatarUrl" class="user-avatar">
                      <img :src="avatarUrl" alt="头像" />
                      <div class="avatar-edit-overlay">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                          <circle cx="12" cy="13" r="4"></circle>
                        </svg>
                      </div>
                    </div>
                    <div v-else class="user-avatar default upload-hint-avatar">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                        <circle cx="12" cy="13" r="4"></circle>
                      </svg>
                    </div>
                  </div>
                  <div class="user-info">
                    <span class="user-nickname">{{ userStore.profile?.nickname || userStore.profile?.username }}</span>
                    <span class="user-username">@{{ userStore.profile?.username }}</span>
                  </div>
                </div>

                <!-- 信息列表 - 查看模式 -->
                <div v-if="!isEditing" class="info-list">
                  <div class="info-row">
                    <span class="info-label">昵称</span>
                    <span class="info-value">{{ userStore.profile?.nickname || '未设置' }}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">性别</span>
                    <span class="info-value">{{ genderText }}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">生日</span>
                    <span class="info-value">{{ userStore.profile?.birthdate || '未设置' }}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">个性签名</span>
                    <span class="info-value signature">{{ userStore.profile?.signature || '这个人很懒，什么都没写~' }}</span>
                  </div>
                </div>

                <!-- 信息列表 - 编辑模式 -->
                <div v-else class="edit-form">
                  <div class="form-group">
                    <label class="form-label">昵称</label>
                    <input
                      v-model="editForm.nickname"
                      type="text"
                      class="form-input"
                      placeholder="请输入昵称"
                      maxlength="20"
                    />
                  </div>

                  <div class="form-group">
                    <label class="form-label">性别</label>
                    <div class="gender-options">
                      <button
                        v-for="opt in genderOptions"
                        :key="opt.value"
                        class="gender-btn"
                        :class="{ active: editForm.gender === opt.value }"
                        @click="editForm.gender = opt.value"
                      >
                        {{ opt.label }}
                      </button>
                    </div>
                  </div>

                  <div class="form-group">
                    <label class="form-label">生日</label>
                    <input v-model="editForm.birthdate" type="date" class="form-input" />
                  </div>

                  <div class="form-group">
                    <label class="form-label">个性签名</label>
                    <textarea
                      v-model="editForm.signature"
                      class="form-textarea"
                      placeholder="写点什么介绍自己..."
                      maxlength="100"
                      rows="3"
                    ></textarea>
                  </div>

                  <div class="form-actions">
                    <button class="btn btn-outline" @click="cancelEdit" :disabled="isSaving">取消</button>
                    <button class="btn btn-primary" @click="saveEdit" :disabled="isSaving">
                      {{ isSaving ? '保存中...' : '保存' }}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <!-- 账号绑定 -->
            <section class="section">
              <div class="section-header">
                <h2 class="section-title">账号绑定</h2>
              </div>

              <div class="card">
                <!-- 校园网绑定 -->
                <div class="binding-item">
                  <div class="binding-icon campus">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                      <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
                    </svg>
                  </div>
                  <div class="binding-info">
                    <h4 class="binding-title">校园网账号</h4>
                    <p class="binding-desc" v-if="userStore.campusBinding?.isBound">
                      已绑定 · {{ userStore.campusBinding?.name }}
                      <span class="binding-detail" v-if="userStore.campusBinding?.classAlias">{{ userStore.campusBinding?.classAlias }}</span>
                    </p>
                    <p class="binding-desc unbound" v-else>未绑定</p>
                  </div>
                  <button
                    v-if="!userStore.campusBinding?.isBound"
                    class="binding-btn"
                    @click="handleBindCampus"
                  >
                    绑定
                  </button>
                  <button
                    v-else
                    class="binding-btn unbind"
                    @click="openUnbindConfirm('campus')"
                  >
                    解绑
                  </button>
                </div>

                <div class="binding-divider"></div>

                <!-- QQ 绑定 -->
                <div class="binding-item">
                  <div class="binding-icon qq">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.003 2c-2.265 0-6.29 1.364-6.29 7.325v1.195S3.55 14.96 3.55 17.474c0 .665.17 1.025.281 1.025.114 0 .902-.484 1.748-2.072 0 0-.18 2.197 1.904 3.967 0 0-1.77.495-1.77 1.182 0 .686 4.078.43 6.29 0 2.239.425 6.287.687 6.287 0 0-.688-1.768-1.182-1.768-1.182 2.085-1.77 1.905-3.967 1.905-3.967.845 1.588 1.634 2.072 1.746 2.072.111 0 .283-.36.283-1.025 0-2.514-2.166-6.954-2.166-6.954V9.325C18.29 3.364 14.268 2 12.003 2z"/>
                    </svg>
                  </div>
                  <div class="binding-info">
                    <h4 class="binding-title">QQ 账号</h4>
                    <p class="binding-desc" v-if="userStore.qqBinding?.isBound">
                      已绑定 · {{ userStore.qqBinding?.nickname }}
                    </p>
                    <p class="binding-desc unbound" v-else>未绑定</p>
                  </div>
                  <button
                    v-if="!userStore.qqBinding?.isBound"
                    class="binding-btn"
                    @click="handleBindQQ"
                  >
                    绑定
                  </button>
                  <button
                    v-else
                    class="binding-btn unbind"
                    @click="openUnbindConfirm('qq')"
                  >
                    解绑
                  </button>
                </div>
              </div>
            </section>

            <!-- 安全设置 -->
            <section class="section">
              <div class="section-header">
                <h2 class="section-title">安全设置</h2>
              </div>

              <div class="card">
                <button class="action-item" @click="openPasswordDrawer">
                  <div class="action-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                  </div>
                  <div class="action-content">
                    <span class="action-title">修改密码</span>
                    <span class="action-desc">定期更换密码保障账号安全</span>
                  </div>
                  <svg class="action-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
              </div>
            </section>
          </div>

          <!-- 底部间距 -->
          <div class="bottom-spacer"></div>
        </template>
      </div>
    </main>

    <!-- 桌面端底部 -->
    <PageFooter />

    <!-- 解绑确认弹窗 -->
    <Transition name="modal-fade">
      <div v-if="showUnbindConfirm" class="modal-overlay" @click="cancelUnbind">
        <Transition name="modal-scale">
          <div v-if="showUnbindConfirm" class="modal-content" @click.stop>
            <h3 class="modal-title">确认解绑</h3>
            <p class="modal-message">
              确定要解绑{{ unbindType === 'campus' ? '校园网' : 'QQ' }}账号吗？
            </p>
            <div class="modal-actions">
              <button class="modal-btn cancel" @click="cancelUnbind" :disabled="isUnbinding">取消</button>
              <button class="modal-btn confirm" @click="confirmUnbind" :disabled="isUnbinding">
                {{ isUnbinding ? '解绑中...' : '确定' }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>

    <!-- 校园网绑定抽屉 -->
    <Transition name="drawer-fade">
      <div v-if="showCampusBindDrawer" class="drawer-overlay" @click="closeCampusBindDrawer">
        <Transition name="drawer-slide">
          <div v-if="showCampusBindDrawer" class="drawer-content" @click.stop>
            <!-- 抽屉头部 -->
            <div class="drawer-header">
              <h3 class="drawer-title">绑定校园网账号</h3>
              <button class="drawer-close" @click="closeCampusBindDrawer">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <!-- 错误提示 -->
            <div v-if="bindErrorMessage" class="bind-error">
              {{ bindErrorMessage }}
            </div>

            <!-- 绑定表单 -->
            <form class="bind-form" @submit.prevent="submitCampusBind">
              <div class="bind-form-group">
                <label class="bind-form-label">学号</label>
                <input
                  v-model="campusBindForm.studentId"
                  type="text"
                  class="bind-form-input"
                  placeholder="请输入学号"
                  :disabled="isBinding"
                />
              </div>

              <div class="bind-form-group">
                <label class="bind-form-label">校园网密码</label>
                <input
                  v-model="campusBindForm.password"
                  type="password"
                  class="bind-form-input"
                  placeholder="请输入校园网密码"
                  :disabled="isBinding"
                />
              </div>

              <div class="bind-form-group">
                <label class="bind-form-label">验证码</label>
                <div class="captcha-row">
                  <input
                    v-model="campusBindForm.captchaCode"
                    type="text"
                    class="bind-form-input captcha-input"
                    placeholder="请输入验证码"
                    :disabled="isBinding"
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
                    <span v-else-if="captchaLoading" class="captcha-loading">加载中</span>
                    <span v-else class="captcha-placeholder">点击获取</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                class="bind-submit-btn"
                :disabled="isBinding"
              >
                {{ isBinding ? '绑定中...' : '绑定' }}
              </button>
            </form>
          </div>
        </Transition>
      </div>
    </Transition>

    <!-- 修改密码抽屉 -->
    <Transition name="drawer-fade">
      <div v-if="showPasswordDrawer" class="drawer-overlay" @click="closePasswordDrawer">
        <Transition name="drawer-slide">
          <div v-if="showPasswordDrawer" class="drawer-content" @click.stop>
            <!-- 抽屉头部 -->
            <div class="drawer-header">
              <h3 class="drawer-title">修改密码</h3>
              <button class="drawer-close" @click="closePasswordDrawer" :disabled="passwordLoading">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <!-- 加载状态 -->
            <div v-if="passwordCheckLoading" class="password-loading">
              <div class="loading-spinner small"></div>
              <span>加载中...</span>
            </div>

            <template v-else>
              <!-- 错误提示 -->
              <div v-if="passwordErrorMessage" class="bind-error">
                {{ passwordErrorMessage }}
              </div>

              <!-- QQ账号提示 -->
              <div v-if="!hasPassword" class="password-hint">
                您的账号由QQ登录自动创建，尚未设置密码。设置密码后可使用用户名密码登录。
              </div>

              <!-- 密码表单 -->
              <form class="bind-form" @submit.prevent="submitChangePassword">
                <!-- 旧密码 -->
                <div v-if="hasPassword" class="bind-form-group">
                  <label class="bind-form-label">旧密码</label>
                  <div class="password-input-wrapper">
                    <input
                      v-model="passwordForm.oldPassword"
                      :type="showOldPassword ? 'text' : 'password'"
                      class="bind-form-input"
                      placeholder="请输入旧密码"
                      :disabled="passwordLoading"
                    />
                    <button
                      type="button"
                      class="password-toggle"
                      @click="showOldPassword = !showOldPassword"
                      tabindex="-1"
                    >
                      <svg v-if="showOldPassword" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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

                <!-- 新密码 -->
                <div class="bind-form-group">
                  <label class="bind-form-label">新密码</label>
                  <div class="password-input-wrapper">
                    <input
                      v-model="passwordForm.newPassword"
                      :type="showNewPassword ? 'text' : 'password'"
                      class="bind-form-input"
                      placeholder="6-32位密码"
                      :disabled="passwordLoading"
                    />
                    <button
                      type="button"
                      class="password-toggle"
                      @click="showNewPassword = !showNewPassword"
                      tabindex="-1"
                    >
                      <svg v-if="showNewPassword" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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

                <!-- 确认新密码 -->
                <div class="bind-form-group">
                  <label class="bind-form-label">确认新密码</label>
                  <div class="password-input-wrapper">
                    <input
                      v-model="passwordForm.confirmPassword"
                      :type="showConfirmPassword ? 'text' : 'password'"
                      class="bind-form-input"
                      placeholder="再次输入新密码"
                      :disabled="passwordLoading"
                    />
                    <button
                      type="button"
                      class="password-toggle"
                      @click="showConfirmPassword = !showConfirmPassword"
                      tabindex="-1"
                    >
                      <svg v-if="showConfirmPassword" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
                  type="submit"
                  class="bind-submit-btn"
                  :disabled="passwordLoading"
                >
                  {{ passwordLoading ? '提交中...' : '确认修改' }}
                </button>
              </form>
            </template>
          </div>
        </Transition>
      </div>
    </Transition>

    <!-- 头像上传弹窗 -->
    <AvatarUploader
      :show="showAvatarUploader"
      :current-avatar="avatarUrl"
      @close="showAvatarUploader = false"
      @uploaded="handleAvatarUploaded"
    />
  </div>
</template>

<style scoped>
/* ===== Base ===== */
.profile-page {
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--color-bg);
  color: var(--color-text);
  display: flex;
  flex-direction: column;
}

/* ===== Content ===== */
.page-content {
  flex: 1;
  padding: var(--spacing-md) 10px;
}

.content-container {
  max-width: 800px;
  margin: 0 auto;
}

/* ===== Breadcrumb ===== */
.breadcrumb-wrapper {
  display: none;
  margin-bottom: var(--spacing-lg);
}

/* ===== Loading ===== */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-2xl);
  color: var(--color-text-secondary);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: var(--spacing-md);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ===== Sections ===== */
.section {
  margin-bottom: var(--spacing-lg);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-sm);
  padding: 0 var(--spacing-xs);
}

.section-title {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-primary);
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.action-btn:hover {
  background: var(--color-primary-bg);
}

.action-btn svg {
  width: 16px;
  height: 16px;
}

/* ===== Card ===== */
.card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

/* ===== User Header ===== */
.user-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  color: white;
}

.user-avatar-wrapper {
  position: relative;
  cursor: pointer;
  flex-shrink: 0;
}

.user-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  transition: all var(--transition-fast);
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-avatar.default {
  background: rgba(255, 255, 255, 0.15);
}

.user-avatar.upload-hint-avatar svg {
  width: 28px;
  height: 28px;
  color: rgba(255, 255, 255, 0.8);
}

.avatar-edit-overlay {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.avatar-edit-overlay svg {
  width: 24px;
  height: 24px;
  color: white;
}

.user-avatar-wrapper:hover .avatar-edit-overlay {
  opacity: 1;
}

.user-avatar-wrapper:hover .user-avatar {
  border-color: rgba(255, 255, 255, 0.6);
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.user-nickname {
  font-size: var(--text-base);
  font-weight: var(--font-bold);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-username {
  font-size: var(--text-xs);
  opacity: 0.85;
}

/* ===== Info List ===== */
.info-list {
  padding: 0;
}

.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.info-value {
  font-size: var(--text-sm);
  color: var(--color-text);
  text-align: right;
}

.info-value.signature {
  font-style: italic;
  color: var(--color-text-secondary);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ===== Edit Form ===== */
.edit-form {
  padding: var(--spacing-md);
  overflow: hidden;
}

.form-group {
  margin-bottom: var(--spacing-md);
}

.form-group:last-of-type {
  margin-bottom: var(--spacing-lg);
}

.form-label {
  display: block;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xs);
}

.form-input,
.form-textarea {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  color: var(--color-text);
  outline: none;
  transition: all var(--transition-fast);
}

/* 日期输入框特殊处理 - 防止移动端溢出 */
.form-input[type="date"] {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
}

.form-input:focus,
.form-textarea:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-bg);
}

.form-textarea {
  resize: none;
  line-height: var(--leading-relaxed);
}

.gender-options {
  display: flex;
  gap: var(--spacing-sm);
}

.gender-btn {
  flex: 1;
  padding: var(--spacing-sm);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.gender-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.gender-btn.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.form-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.btn {
  flex: 1;
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
}

.btn-outline:hover:not(:disabled) {
  border-color: var(--color-text-secondary);
}

.btn-primary {
  background: var(--color-primary);
  border: none;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

/* ===== Binding Items ===== */
.binding-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
}

.binding-divider {
  height: 1px;
  background: var(--color-border);
  margin: 0 var(--spacing-md);
}

.binding-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-lg);
  flex-shrink: 0;
}

.binding-icon.campus {
  background: rgba(6, 182, 212, 0.1);
  color: var(--color-secondary);
}

.binding-icon.qq {
  background: rgba(18, 183, 245, 0.1);
  color: #12b7f5;
}

.binding-icon svg {
  width: 20px;
  height: 20px;
}

.binding-info {
  flex: 1;
  min-width: 0;
}

.binding-title {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  margin-bottom: 2px;
}

.binding-desc {
  font-size: var(--text-xs);
  color: var(--color-success);
}

.binding-desc.unbound {
  color: var(--color-text-secondary);
}

.binding-detail {
  display: block;
  color: var(--color-text-secondary);
  margin-top: 2px;
}

.binding-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.binding-btn:hover {
  background: var(--color-primary-dark);
}

.binding-btn.unbind {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
}

.binding-btn.unbind:hover {
  border-color: var(--color-error);
  color: var(--color-error);
  background: rgba(239, 68, 68, 0.1);
}

/* ===== Action Items ===== */
.action-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  width: 100%;
  padding: var(--spacing-md);
  background: transparent;
  border: none;
  color: var(--color-text);
  cursor: pointer;
  transition: background var(--transition-fast);
  text-align: left;
}

.action-item:hover {
  background: var(--color-bg);
}

.action-item:not(:last-child) {
  border-bottom: 1px solid var(--color-border);
}

.action-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-border);
  border-radius: var(--radius-md);
  flex-shrink: 0;
}

.action-icon svg {
  width: 18px;
  height: 18px;
}

.action-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.action-title {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.action-desc {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.action-arrow {
  width: 16px;
  height: 16px;
  color: var(--color-text-placeholder);
}

/* ===== Bottom Spacer ===== */
.bottom-spacer {
  height: calc(var(--spacing-lg) + env(safe-area-inset-bottom, 0px));
}

/* ===== Modal ===== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--spacing-md);
}

.modal-content {
  background: var(--color-card);
  border-radius: var(--radius-xl);
  padding: var(--spacing-xl);
  max-width: 320px;
  width: 100%;
  text-align: center;
  box-shadow: var(--shadow-xl);
}

.modal-title {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-sm);
}

.modal-message {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-lg);
}

.modal-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.modal-btn {
  flex: 1;
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.modal-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.modal-btn.cancel {
  background: var(--color-border);
  border: none;
  color: var(--color-text);
}

.modal-btn.cancel:hover:not(:disabled) {
  background: var(--color-text-placeholder);
}

.modal-btn.confirm {
  background: var(--color-error);
  border: none;
  color: white;
}

.modal-btn.confirm:hover:not(:disabled) {
  background: #dc2626;
}

/* Modal Animations */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity var(--transition-normal);
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-scale-enter-active,
.modal-scale-leave-active {
  transition: all var(--transition-normal);
}

.modal-scale-enter-from,
.modal-scale-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

/* ===== Responsive - Desktop ===== */
@media (min-width: 1024px) {
  .breadcrumb-wrapper {
    display: block;
  }

  .page-content {
    padding: var(--spacing-xl);
  }

  .content-container {
    max-width: 900px;
  }

  .section {
    margin-bottom: var(--spacing-xl);
  }

  .user-header {
    padding: var(--spacing-lg);
  }

  .user-nickname {
    font-size: var(--text-lg);
  }

  .info-row {
    padding: var(--spacing-md) var(--spacing-lg);
  }

  .binding-item {
    padding: var(--spacing-lg);
  }

  .action-item {
    padding: var(--spacing-lg);
  }
}

/* ===== 校园网绑定抽屉 ===== */
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
}

.drawer-content {
  background: var(--color-card);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  padding: var(--spacing-lg);
  padding-bottom: calc(var(--spacing-lg) + env(safe-area-inset-bottom, 0px));
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-xl);
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-lg);
}

.drawer-title {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  color: var(--color-text);
}

.drawer-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.drawer-close:hover {
  background: var(--color-bg);
  color: var(--color-text);
}

.drawer-close svg {
  width: 20px;
  height: 20px;
}

/* 绑定错误提示 */
.bind-error {
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-error-bg);
  color: var(--color-error);
  font-size: var(--text-sm);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-md);
}

/* 绑定表单 */
.bind-form {
  display: flex;
  flex-direction: column;
}

.bind-form-group {
  margin-bottom: var(--spacing-md);
}

.bind-form-label {
  display: block;
  margin-bottom: var(--spacing-xs);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text);
}

.bind-form-input {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  background: var(--color-bg);
  color: var(--color-text);
  transition: all var(--transition-fast);
}

.bind-form-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-bg);
}

.bind-form-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.bind-form-input::placeholder {
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

/* 提交按钮 */
.bind-submit-btn {
  margin-top: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.bind-submit-btn:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.bind-submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ===== 密码输入框 ===== */
.password-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.password-input-wrapper .bind-form-input {
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
}

/* 密码加载状态 */
.password-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
  gap: var(--spacing-sm);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.loading-spinner.small {
  width: 24px;
  height: 24px;
  border-width: 2px;
}

/* 密码提示 */
.password-hint {
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-info-bg, rgba(59, 130, 246, 0.1));
  color: var(--color-info, #3b82f6);
  font-size: var(--text-sm);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-md);
  line-height: var(--leading-relaxed);
}

/* Drawer Animations */
.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity var(--transition-normal);
}

.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}

.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: all var(--transition-normal);
}

.drawer-slide-enter-from,
.drawer-slide-leave-to {
  opacity: 0;
  transform: translateY(100%);
}

/* 桌面端抽屉样式调整 */
@media (min-width: 1024px) {
  .drawer-overlay {
    align-items: center;
  }

  .drawer-content {
    border-radius: var(--radius-xl);
    max-height: 80vh;
  }
}
</style>
