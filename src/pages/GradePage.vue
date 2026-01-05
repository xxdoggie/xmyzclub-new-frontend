<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/composables/useToast'
import {
  getGradeBindingStatus,
  bindGrade,
  unbindGrade,
  getExamList,
} from '@/api/grade'
import { getExamTypeName } from '@/types/grade'
import type { GradeBindingStatus, ExamListItem } from '@/types/grade'
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb.vue'

const router = useRouter()
const userStore = useUserStore()
const toast = useToast()

// 状态
const isLoading = ref(true)
const bindingStatus = ref<GradeBindingStatus | null>(null)
const examList = ref<ExamListItem[]>([])
const currentPage = ref(1)
const totalCount = ref(0)
const pageSize = 10
const isLoadingMore = ref(false)

// 绑定表单
const bindForm = ref({
  account: '',
  password: '',
  roleType: 1, // 默认学生
})
const isBinding = ref(false)
const bindErrorMessage = ref('')

// 解绑确认
const showUnbindConfirm = ref(false)
const isUnbinding = ref(false)

// 加载绑定状态
async function loadBindingStatus() {
  try {
    const res = await getGradeBindingStatus()
    if (res.data.code === 200) {
      bindingStatus.value = res.data.data
      if (bindingStatus.value?.bound) {
        await loadExamList()
      }
    } else {
      toast.error(res.data.message || '获取绑定状态失败')
    }
  } catch {
    toast.error('网络错误，请稍后重试')
  } finally {
    isLoading.value = false
  }
}

// 加载考试列表
async function loadExamList(loadMore = false) {
  if (loadMore) {
    isLoadingMore.value = true
  }
  try {
    const page = loadMore ? currentPage.value + 1 : 1
    const res = await getExamList(page, pageSize)
    if (res.data.code === 200) {
      if (loadMore) {
        examList.value = [...examList.value, ...res.data.data.list]
        currentPage.value = page
      } else {
        examList.value = res.data.data.list
        currentPage.value = 1
      }
      totalCount.value = res.data.data.totalCount
    } else {
      toast.error(res.data.message || '获取考试列表失败')
    }
  } catch {
    toast.error('网络错误，请稍后重试')
  } finally {
    isLoadingMore.value = false
  }
}

// 绑定好分数
async function handleBind() {
  if (!bindForm.value.account.trim()) {
    bindErrorMessage.value = '请输入账号'
    return
  }
  if (!bindForm.value.password.trim()) {
    bindErrorMessage.value = '请输入密码'
    return
  }

  isBinding.value = true
  bindErrorMessage.value = ''

  try {
    const res = await bindGrade({
      account: bindForm.value.account.trim(),
      password: bindForm.value.password,
      roleType: bindForm.value.roleType,
    })
    if (res.data.code === 200) {
      toast.success('绑定成功')
      bindingStatus.value = res.data.data
      await loadExamList()
    } else {
      bindErrorMessage.value = res.data.message || '绑定失败'
    }
  } catch {
    bindErrorMessage.value = '网络错误，请稍后重试'
  } finally {
    isBinding.value = false
  }
}

// 打开解绑确认
function openUnbindConfirm() {
  showUnbindConfirm.value = true
}

// 确认解绑
async function confirmUnbind() {
  isUnbinding.value = true
  try {
    const res = await unbindGrade()
    if (res.data.code === 200) {
      toast.success('解绑成功')
      bindingStatus.value = { bound: false, account: null, name: null, studentId: null, roleType: null, bindTime: null }
      examList.value = []
      showUnbindConfirm.value = false
      // 重置表单
      bindForm.value = { account: '', password: '', roleType: 1 }
    } else {
      toast.error(res.data.message || '解绑失败')
    }
  } catch {
    toast.error('网络错误，请稍后重试')
  } finally {
    isUnbinding.value = false
  }
}

// 取消解绑
function cancelUnbind() {
  showUnbindConfirm.value = false
}

// 查看考试详情
function viewExamDetail(examId: number) {
  router.push(`/grade/${examId}`)
}

// 格式化时间
function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// 计算得分率
function getScoreRate(score: number, manfen: number): number {
  return Math.round((score / manfen) * 100)
}

// 是否有更多数据
function hasMore(): boolean {
  return examList.value.length < totalCount.value
}

// 监听登录状态
watch(
  () => userStore.isLoggedIn,
  (isLoggedIn) => {
    if (isLoggedIn) {
      loadBindingStatus()
    }
  }
)

onMounted(() => {
  if (!userStore.isLoggedIn) {
    userStore.openLoginModal('请先登录以查看成绩')
    router.push('/')
    return
  }
  loadBindingStatus()
})
</script>

<template>
  <div class="page-container">
    <PageHeader back-to="/" />

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
          <!-- 页面标题 -->
          <div class="page-header-section">
            <h1 class="page-title">分数查询</h1>
            <p class="page-desc">查看你的好分数考试成绩</p>
          </div>

          <!-- 未绑定状态：显示绑定表单 -->
          <section v-if="!bindingStatus?.bound" class="bind-section">
            <div class="bind-card">
              <div class="bind-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <line x1="19" y1="8" x2="19" y2="14"></line>
                  <line x1="22" y1="11" x2="16" y2="11"></line>
                </svg>
              </div>
              <h2 class="bind-title">绑定好分数账号</h2>
              <p class="bind-desc">绑定后可以查看你的考试成绩和排名</p>

              <!-- 错误提示 -->
              <div v-if="bindErrorMessage" class="bind-error">
                {{ bindErrorMessage }}
              </div>

              <!-- 绑定表单 -->
              <form class="bind-form" @submit.prevent="handleBind">
                <div class="form-group">
                  <label class="form-label">账号（手机号）</label>
                  <input
                    v-model="bindForm.account"
                    type="text"
                    class="form-input"
                    placeholder="请输入好分数账号"
                    :disabled="isBinding"
                  />
                </div>

                <div class="form-group">
                  <label class="form-label">密码</label>
                  <input
                    v-model="bindForm.password"
                    type="password"
                    class="form-input"
                    placeholder="请输入好分数密码"
                    :disabled="isBinding"
                  />
                </div>

                <div class="form-group">
                  <label class="form-label">角色</label>
                  <div class="role-options">
                    <button
                      type="button"
                      class="role-btn"
                      :class="{ active: bindForm.roleType === 1 }"
                      :disabled="isBinding"
                      @click="bindForm.roleType = 1"
                    >
                      学生
                    </button>
                    <button
                      type="button"
                      class="role-btn"
                      :class="{ active: bindForm.roleType === 2 }"
                      :disabled="isBinding"
                      @click="bindForm.roleType = 2"
                    >
                      家长
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  class="bind-submit-btn"
                  :disabled="isBinding"
                >
                  {{ isBinding ? '绑定中...' : '绑定账号' }}
                </button>
              </form>
            </div>
          </section>

          <!-- 已绑定状态：显示账号信息和考试列表 -->
          <template v-else>
            <!-- 绑定信息卡片 -->
            <section class="binding-info-section">
              <div class="binding-info-card">
                <div class="binding-info-left">
                  <div class="binding-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                  </div>
                  <div class="binding-text">
                    <span class="binding-label">已绑定账号</span>
                    <span class="binding-account">{{ bindingStatus.account }}</span>
                  </div>
                </div>
                <button class="unbind-btn" @click="openUnbindConfirm">
                  解绑
                </button>
              </div>
            </section>

            <!-- 考试列表 -->
            <section class="exam-list-section">
              <h2 class="section-title">考试记录</h2>

              <div v-if="examList.length === 0" class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"></path>
                  <rect x="9" y="3" width="6" height="4" rx="1"></rect>
                  <line x1="9" y1="12" x2="15" y2="12"></line>
                  <line x1="9" y1="16" x2="13" y2="16"></line>
                </svg>
                <p>暂无考试记录</p>
              </div>

              <div v-else class="exam-list">
                <div
                  v-for="exam in examList"
                  :key="exam.examId"
                  class="exam-card"
                  @click="viewExamDetail(exam.examId)"
                >
                  <div class="exam-main">
                    <div class="exam-header">
                      <h3 class="exam-name">{{ exam.name }}</h3>
                      <span class="exam-type">{{ getExamTypeName(exam.type) }}</span>
                    </div>
                    <div class="exam-time">{{ formatTime(exam.time) }}</div>
                  </div>

                  <div class="exam-stats">
                    <div class="stat-item score">
                      <span class="stat-value">{{ exam.score }}</span>
                      <span class="stat-label">/ {{ exam.manfen }}</span>
                    </div>
                    <div class="stat-divider"></div>
                    <div class="stat-item">
                      <span class="stat-value">{{ exam.classRank }}</span>
                      <span class="stat-label">班级名次</span>
                    </div>
                    <div class="stat-divider"></div>
                    <div class="stat-item">
                      <span class="stat-value">{{ exam.gradeRank }}</span>
                      <span class="stat-label">年级名次</span>
                    </div>
                  </div>

                  <div class="exam-progress">
                    <div
                      class="progress-bar"
                      :style="{ width: getScoreRate(exam.score, exam.manfen) + '%' }"
                    ></div>
                  </div>

                  <svg class="exam-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </div>

                <!-- 加载更多 -->
                <button
                  v-if="hasMore()"
                  class="load-more-btn"
                  :disabled="isLoadingMore"
                  @click="loadExamList(true)"
                >
                  {{ isLoadingMore ? '加载中...' : `加载更多 (${totalCount - examList.length}条)` }}
                </button>
              </div>
            </section>
          </template>
        </template>
      </div>
    </main>

    <PageFooter />

    <!-- 解绑确认弹窗 -->
    <Transition name="modal-fade">
      <div v-if="showUnbindConfirm" class="modal-overlay" @click="cancelUnbind">
        <Transition name="modal-scale">
          <div v-if="showUnbindConfirm" class="modal-content" @click.stop>
            <h3 class="modal-title">确认解绑</h3>
            <p class="modal-message">
              确定要解绑好分数账号吗？解绑后需要重新绑定才能查看成绩。
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
.page-container {
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--color-bg);
  color: var(--color-text);
  display: flex;
  flex-direction: column;
}

.page-content {
  flex: 1;
  padding: var(--spacing-sm);
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

/* ===== Page Header ===== */
.page-header-section {
  display: none;
  margin-bottom: var(--spacing-lg);
}

.page-title {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-xs);
}

.page-desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

/* ===== Bind Section ===== */
.bind-section {
  margin-bottom: var(--spacing-lg);
}

.bind-card {
  background: var(--color-card);
  border-radius: var(--radius-xl);
  padding: var(--spacing-xl);
  text-align: center;
}

.bind-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto var(--spacing-md);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary-bg);
  color: var(--color-primary);
  border-radius: var(--radius-full);
}

.bind-icon svg {
  width: 32px;
  height: 32px;
}

.bind-title {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-xs);
}

.bind-desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-lg);
}

.bind-error {
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-error-bg);
  color: var(--color-error);
  font-size: var(--text-sm);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-md);
  text-align: left;
}

.bind-form {
  text-align: left;
  max-width: 360px;
  margin: 0 auto;
}

.form-group {
  margin-bottom: var(--spacing-md);
}

.form-label {
  display: block;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text);
  margin-bottom: var(--spacing-xs);
}

.form-input {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-base);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
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

.role-options {
  display: flex;
  gap: var(--spacing-sm);
}

.role-btn {
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

.role-btn:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.role-btn.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #ffffff;
}

.role-btn.active:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: #ffffff;
}

.role-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.bind-submit-btn {
  width: 100%;
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

/* ===== Binding Info Section ===== */
.binding-info-section {
  margin-bottom: var(--spacing-lg);
}

.binding-info-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md);
  background: var(--color-card);
  border-radius: var(--radius-lg);
}

.binding-info-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.binding-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-success-bg);
  color: var(--color-success);
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.binding-icon svg {
  width: 20px;
  height: 20px;
}

.binding-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.binding-label {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.binding-account {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.unbind-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.unbind-btn:hover {
  border-color: var(--color-error);
  color: var(--color-error);
  background: rgba(239, 68, 68, 0.1);
}

/* ===== Exam List Section ===== */
.exam-list-section {
  margin-bottom: var(--spacing-lg);
}

.section-title {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: var(--spacing-md);
  padding: 0 var(--spacing-xs);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-2xl);
  background: var(--color-card);
  border-radius: var(--radius-lg);
  color: var(--color-text-secondary);
}

.empty-state svg {
  width: 48px;
  height: 48px;
  margin-bottom: var(--spacing-sm);
  opacity: 0.5;
}

.empty-state p {
  font-size: var(--text-sm);
}

.exam-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.exam-card {
  position: relative;
  background: var(--color-card);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  overflow: hidden;
}

.exam-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.exam-card:active {
  transform: scale(0.98);
}

.exam-main {
  margin-bottom: var(--spacing-sm);
}

.exam-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: 4px;
}

.exam-name {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.exam-type {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-primary);
  background: var(--color-primary-bg);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.exam-time {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.exam-stats {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-sm);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 60px;
}

.stat-item.score {
  flex-direction: row;
  gap: 2px;
  align-items: baseline;
}

.stat-value {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  color: var(--color-text);
}

.stat-item.score .stat-value {
  font-size: var(--text-xl);
  color: var(--color-primary);
}

.stat-label {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.stat-divider {
  width: 1px;
  height: 24px;
  background: var(--color-border);
}

.exam-progress {
  height: 4px;
  background: var(--color-border);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
  border-radius: var(--radius-full);
  transition: width var(--transition-normal);
}

.exam-arrow {
  position: absolute;
  right: var(--spacing-md);
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  color: var(--color-text-placeholder);
}

/* ===== Load More ===== */
.load-more-btn {
  display: block;
  width: 100%;
  padding: var(--spacing-sm);
  font-size: var(--text-sm);
  color: var(--color-primary);
  background: var(--color-primary-bg);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  margin-top: var(--spacing-sm);
}

.load-more-btn:hover:not(:disabled) {
  background: var(--color-primary);
  color: white;
}

.load-more-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
  line-height: 1.5;
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

/* ===== Desktop ===== */
@media (min-width: 1024px) {
  .breadcrumb-wrapper {
    display: block;
  }

  .page-header-section {
    display: block;
  }

  .page-content {
    padding: var(--spacing-xl);
  }

  .content-container {
    max-width: 900px;
  }

  .page-title {
    font-size: var(--text-2xl);
  }

  .bind-card {
    padding: var(--spacing-2xl);
  }

  .exam-card {
    padding: var(--spacing-lg);
  }

  .exam-stats {
    gap: var(--spacing-xl);
  }
}
</style>
