<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/composables/useToast'
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb.vue'

const userStore = useUserStore()
const toast = useToast()

// 加载状态
const isLoading = ref(true)
const isSaving = ref(false)

// 编辑模式
const isEditing = ref(false)

// 解绑确认弹窗
const showUnbindConfirm = ref(false)
const unbindType = ref<'campus' | 'qq'>('campus')
const isUnbinding = ref(false)

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

// 绑定校园网
function handleBindCampus() {
  toast.info('校园网绑定功能开发中...')
}

// 绑定 QQ
async function handleBindQQ() {
  try {
    const res = await userStore.getQQBindAuthorizeUrl()
    if (res.code === 200 && res.data?.authorizeUrl) {
      window.location.href = res.data.authorizeUrl
    } else {
      toast.error(res.message || '获取授权链接失败')
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
  padding: var(--spacing-md);
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  color: white;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-nickname {
  font-size: var(--text-base);
  font-weight: var(--font-bold);
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
</style>
