<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const userStore = useUserStore()
const toast = useToast()

// 加载状态
const isLoading = ref(true)
const isSaving = ref(false)

// 编辑模式
const isEditing = ref(false)

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

// 返回首页
function goBack() {
  router.push('/')
}
</script>

<template>
  <div class="profile-page">
    <!-- Header -->
    <header class="page-header">
      <button class="back-btn" @click="goBack">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
      <h1 class="page-title">个人中心</h1>
      <div class="header-spacer"></div>
    </header>

    <!-- Content -->
    <main class="page-content">
      <!-- 加载状态 -->
      <div v-if="isLoading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>加载中...</p>
      </div>

      <template v-else>
        <!-- 用户信息卡片 -->
        <section class="profile-section">
          <div class="section-header">
            <h2 class="section-title">个人资料</h2>
            <button v-if="!isEditing" class="edit-btn" @click="startEdit">编辑</button>
            <div v-else class="edit-actions">
              <button class="cancel-btn" @click="cancelEdit" :disabled="isSaving">取消</button>
              <button class="save-btn" @click="saveEdit" :disabled="isSaving">
                {{ isSaving ? '保存中...' : '保存' }}
              </button>
            </div>
          </div>

          <div class="profile-card">
            <!-- 头像 -->
            <div class="avatar-section">
              <div class="avatar large">
                {{ userStore.profile?.nickname?.charAt(0) || 'U' }}
              </div>
            </div>

            <!-- 信息列表 -->
            <div class="info-list">
              <!-- 用户名 -->
              <div class="info-item">
                <span class="info-label">用户名</span>
                <span class="info-value">{{ userStore.profile?.username }}</span>
              </div>

              <!-- 昵称 -->
              <div class="info-item">
                <span class="info-label">昵称</span>
                <template v-if="isEditing">
                  <input
                    v-model="editForm.nickname"
                    type="text"
                    class="info-input"
                    placeholder="请输入昵称"
                    maxlength="20"
                  />
                </template>
                <span v-else class="info-value">{{ userStore.profile?.nickname }}</span>
              </div>

              <!-- 性别 -->
              <div class="info-item">
                <span class="info-label">性别</span>
                <template v-if="isEditing">
                  <select v-model="editForm.gender" class="info-select">
                    <option v-for="opt in genderOptions" :key="opt.value" :value="opt.value">
                      {{ opt.label }}
                    </option>
                  </select>
                </template>
                <span v-else class="info-value">{{ genderText }}</span>
              </div>

              <!-- 生日 -->
              <div class="info-item">
                <span class="info-label">生日</span>
                <template v-if="isEditing">
                  <input v-model="editForm.birthdate" type="date" class="info-input" />
                </template>
                <span v-else class="info-value">{{
                  userStore.profile?.birthdate || '未设置'
                }}</span>
              </div>

              <!-- 签名 -->
              <div class="info-item signature-item">
                <span class="info-label">签名</span>
                <template v-if="isEditing">
                  <textarea
                    v-model="editForm.signature"
                    class="info-textarea"
                    placeholder="写点什么介绍自己..."
                    maxlength="100"
                    rows="2"
                  ></textarea>
                </template>
                <span v-else class="info-value signature">{{
                  userStore.profile?.signature || '这个人很懒，什么都没写~'
                }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- 校园网绑定 -->
        <section class="profile-section">
          <div class="section-header">
            <h2 class="section-title">校园网绑定</h2>
          </div>

          <div class="binding-card">
            <div class="binding-icon campus">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
              </svg>
            </div>
            <div class="binding-info">
              <h3 class="binding-title">校园网账号</h3>
              <p class="binding-status" v-if="userStore.campusBinding?.isBound">
                已绑定：{{ userStore.campusBinding?.name }}
                <span class="binding-detail">{{ userStore.campusBinding?.classAlias }}</span>
              </p>
              <p class="binding-status unbound" v-else>未绑定</p>
            </div>
            <button class="binding-action" v-if="!userStore.campusBinding?.isBound">绑定</button>
            <button class="binding-action unbind" v-else>解绑</button>
          </div>
        </section>

        <!-- QQ 绑定 -->
        <section class="profile-section">
          <div class="section-header">
            <h2 class="section-title">QQ 绑定</h2>
          </div>

          <div class="binding-card">
            <div class="binding-icon qq">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 14.19c-.18.3-.64.41-.99.22-.35-.19-.46-.64-.28-.94.07-.12.18-.28.18-.28s-.5.16-.88.16c-.37 0-.87-.16-.87-.16s.1.16.17.28c.18.3.07.75-.28.94-.35.19-.81.08-.99-.22-.37-.62-.56-1.33-.56-2.05 0-.64.13-1.27.36-1.86-.43-.29-.73-.79-.73-1.35 0-.9.73-1.63 1.63-1.63.36 0 .7.12.97.32.54-.17 1.1-.26 1.68-.26s1.14.09 1.68.26c.27-.2.61-.32.97-.32.9 0 1.63.73 1.63 1.63 0 .56-.3 1.06-.73 1.35.23.59.36 1.22.36 1.86 0 .72-.19 1.43-.56 2.05z"
                />
              </svg>
            </div>
            <div class="binding-info">
              <h3 class="binding-title">QQ 账号</h3>
              <p class="binding-status" v-if="userStore.qqBinding?.isBound">
                已绑定：{{ userStore.qqBinding?.nickname }}
              </p>
              <p class="binding-status unbound" v-else>未绑定</p>
            </div>
            <button class="binding-action" v-if="!userStore.qqBinding?.isBound">绑定</button>
            <button class="binding-action unbind" v-else>解绑</button>
          </div>
        </section>

        <!-- 账号安全 -->
        <section class="profile-section">
          <div class="section-header">
            <h2 class="section-title">账号安全</h2>
          </div>

          <div class="action-list">
            <button class="action-item">
              <span class="action-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </span>
              <span class="action-text">修改密码</span>
              <svg class="action-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        </section>
      </template>
    </main>
  </div>
</template>

<style scoped>
.profile-page {
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--color-bg);
  color: var(--color-text);
}

/* Header */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-card);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 100;
}

.back-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  color: var(--color-text);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.back-btn:hover {
  background: var(--color-border);
}

.back-btn svg {
  width: 24px;
  height: 24px;
}

.page-title {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
}

.header-spacer {
  width: 40px;
}

/* Content */
.page-content {
  max-width: 600px;
  margin: 0 auto;
  padding: var(--spacing-md);
}

/* Loading */
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

/* Sections */
.profile-section {
  margin-bottom: var(--spacing-lg);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-sm);
}

.section-title {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-text-secondary);
}

.edit-btn,
.cancel-btn,
.save-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  font-size: var(--text-sm);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.edit-btn {
  background: transparent;
  border: 1px solid var(--color-primary);
  color: var(--color-primary);
}

.edit-btn:hover {
  background: var(--color-primary-bg);
}

.edit-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.cancel-btn {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
}

.cancel-btn:hover:not(:disabled) {
  background: var(--color-border);
}

.save-btn {
  background: var(--color-primary);
  border: none;
  color: white;
}

.save-btn:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.save-btn:disabled,
.cancel-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Profile Card */
.profile-card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
}

.avatar-section {
  display: flex;
  justify-content: center;
  margin-bottom: var(--spacing-lg);
}

.avatar {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.info-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) 0;
  border-bottom: 1px solid var(--color-border);
}

.info-item:last-child {
  border-bottom: none;
}

.signature-item {
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-sm);
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
  text-align: left;
  font-style: italic;
  color: var(--color-text-secondary);
}

.info-input,
.info-select,
.info-textarea {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--text-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  color: var(--color-text);
  outline: none;
  transition: border-color var(--transition-fast);
}

.info-input:focus,
.info-select:focus,
.info-textarea:focus {
  border-color: var(--color-primary);
}

.info-input {
  width: 150px;
  text-align: right;
}

.info-select {
  width: 100px;
}

.info-textarea {
  width: 100%;
  resize: none;
}

/* Binding Card */
.binding-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
}

.binding-icon {
  width: 48px;
  height: 48px;
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
  width: 24px;
  height: 24px;
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

.binding-status {
  font-size: var(--text-xs);
  color: var(--color-success);
}

.binding-status.unbound {
  color: var(--color-text-secondary);
}

.binding-detail {
  display: block;
  color: var(--color-text-secondary);
  margin-top: 2px;
}

.binding-action {
  padding: var(--spacing-xs) var(--spacing-md);
  font-size: var(--text-sm);
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.binding-action:hover {
  background: var(--color-primary-dark);
}

.binding-action.unbind {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
}

.binding-action.unbind:hover {
  border-color: var(--color-error);
  color: var(--color-error);
  background: rgba(239, 68, 68, 0.1);
}

/* Action List */
.action-list {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.action-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  width: 100%;
  padding: var(--spacing-md);
  background: transparent;
  border: none;
  color: var(--color-text);
  font-size: var(--text-sm);
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

.action-text {
  flex: 1;
}

.action-arrow {
  width: 16px;
  height: 16px;
  color: var(--color-text-placeholder);
}
</style>
