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
      <div class="header-container">
        <button class="back-btn" @click="goBack">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <h1 class="page-title">个人中心</h1>
        <div class="header-spacer"></div>
      </div>
    </header>

    <!-- Content -->
    <main class="page-content">
      <div class="content-container">
        <!-- 加载状态 -->
        <div v-if="isLoading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>

        <template v-else>
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
              <!-- 用户欢迎区 -->
              <div class="user-welcome">
                <div class="welcome-text">
                  <h3 class="welcome-name">{{ userStore.profile?.nickname || userStore.profile?.username }}</h3>
                  <p class="welcome-username">@{{ userStore.profile?.username }}</p>
                </div>
              </div>

              <!-- 信息列表 - 查看模式 -->
              <div v-if="!isEditing" class="info-grid">
                <div class="info-item">
                  <span class="info-label">昵称</span>
                  <span class="info-value">{{ userStore.profile?.nickname || '未设置' }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">性别</span>
                  <span class="info-value">{{ genderText }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">生日</span>
                  <span class="info-value">{{ userStore.profile?.birthdate || '未设置' }}</span>
                </div>
                <div class="info-item full-width">
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

            <div class="card binding-list">
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
                <button class="binding-btn" :class="{ unbind: userStore.campusBinding?.isBound }">
                  {{ userStore.campusBinding?.isBound ? '解绑' : '绑定' }}
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
                <button class="binding-btn" :class="{ unbind: userStore.qqBinding?.isBound }">
                  {{ userStore.qqBinding?.isBound ? '解绑' : '绑定' }}
                </button>
              </div>
            </div>
          </section>

          <!-- 安全设置 -->
          <section class="section">
            <div class="section-header">
              <h2 class="section-title">安全设置</h2>
            </div>

            <div class="card action-list">
              <button class="action-item">
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

          <!-- 底部间距 -->
          <div class="bottom-spacer"></div>
        </template>
      </div>
    </main>
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

/* ===== Header ===== */
.page-header {
  background: var(--color-card);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-container {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
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

/* ===== Content ===== */
.page-content {
  flex: 1;
  padding: var(--spacing-md);
}

.content-container {
  max-width: 800px;
  margin: 0 auto;
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
  font-size: var(--text-sm);
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

/* ===== User Welcome ===== */
.user-welcome {
  padding: var(--spacing-lg);
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  color: white;
}

.welcome-text {
  text-align: center;
}

.welcome-name {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-xs);
}

.welcome-username {
  font-size: var(--text-sm);
  opacity: 0.85;
}

/* ===== Info Grid ===== */
.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1px;
  background: var(--color-border);
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  padding: var(--spacing-md);
  background: var(--color-card);
}

.info-item.full-width {
  grid-column: 1 / -1;
}

.info-label {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  font-weight: var(--font-medium);
}

.info-value {
  font-size: var(--text-sm);
  color: var(--color-text);
}

.info-value.signature {
  font-style: italic;
  color: var(--color-text-secondary);
}

/* ===== Edit Form ===== */
.edit-form {
  padding: var(--spacing-lg);
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
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  color: var(--color-text);
  outline: none;
  transition: all var(--transition-fast);
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

/* ===== Binding List ===== */
.binding-list {
  padding: 0;
}

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
  width: 44px;
  height: 44px;
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
  width: 22px;
  height: 22px;
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

/* ===== Action List ===== */
.action-list {
  padding: 0;
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
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-border);
  border-radius: var(--radius-md);
  flex-shrink: 0;
}

.action-icon svg {
  width: 20px;
  height: 20px;
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
  height: calc(var(--spacing-xl) + env(safe-area-inset-bottom, 0px));
}

/* ===== Responsive - Desktop ===== */
@media (min-width: 640px) {
  .header-container {
    padding: var(--spacing-md) var(--spacing-xl);
  }

  .page-content {
    padding: var(--spacing-xl);
  }

  .user-welcome {
    padding: var(--spacing-xl);
  }

  .welcome-name {
    font-size: var(--text-2xl);
  }

  .info-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .info-item.full-width {
    grid-column: 1 / -1;
  }

  .binding-item {
    padding: var(--spacing-lg);
  }

  .action-item {
    padding: var(--spacing-lg);
  }
}

@media (min-width: 1024px) {
  .header-container,
  .content-container {
    max-width: 900px;
  }

  .section {
    margin-bottom: var(--spacing-xl);
  }
}
</style>
