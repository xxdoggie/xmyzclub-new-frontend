<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/composables/useToast'
import {
  getCampaignDetail,
  getReviewSubmissions,
  reviewSubmissions,
  deleteSubmissions,
} from '@/api/campaign'
import type { Campaign, SubmissionGroup, Submission } from '@/types/campaign'
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb.vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const toast = useToast()

// ==================== 状态 ====================
const campaignId = computed(() => Number(route.params.id))
const isLoading = ref(true)
const campaign = ref<Campaign | null>(null)
const submissionGroups = ref<SubmissionGroup[]>([])

// 选中状态
const selectedSubmissions = ref<Set<number>>(new Set())

// 批量操作
const isProcessing = ref(false)

// 展开的音乐卡片
const expandedMusicIds = ref<Set<number>>(new Set())

// 审核确认弹窗
const showReviewConfirm = ref(false)
const reviewAction = ref<'approved' | 'rejected'>('approved')
const reviewNote = ref('')

// 删除确认弹窗
const showDeleteConfirm = ref(false)

// ==================== 辅助函数 ====================

const reviewStatusLabels: Record<string, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已拒绝',
}

const reviewStatusClasses: Record<string, string> = {
  pending: 'review-pending',
  approved: 'review-approved',
  rejected: 'review-rejected',
}

function getReviewStatusLabel(status: string): string {
  return reviewStatusLabels[status] || status
}

function getReviewStatusClass(status: string): string {
  return reviewStatusClasses[status] || ''
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}

// ==================== 数据加载 ====================

async function loadData() {
  isLoading.value = true
  try {
    const [campaignRes, submissionsRes] = await Promise.all([
      getCampaignDetail(campaignId.value),
      getReviewSubmissions(campaignId.value),
    ])

    if (campaignRes.data.code === 200) {
      campaign.value = campaignRes.data.data
    } else {
      toast.error(campaignRes.data.message || '获取活动详情失败')
      return
    }

    if (submissionsRes.data.code === 200) {
      submissionGroups.value = submissionsRes.data.data
    } else {
      toast.error(submissionsRes.data.message || '获取投稿列表失败')
    }
  } catch (error) {
    toast.error('加载数据失败')
  } finally {
    isLoading.value = false
  }
}

// ==================== 展开/收起 ====================

function toggleMusicExpand(musicId: number) {
  if (expandedMusicIds.value.has(musicId)) {
    expandedMusicIds.value.delete(musicId)
  } else {
    expandedMusicIds.value.add(musicId)
  }
}

function isMusicExpanded(musicId: number): boolean {
  return expandedMusicIds.value.has(musicId)
}

// ==================== 选择操作 ====================

function toggleSubmissionSelection(submissionId: number) {
  if (selectedSubmissions.value.has(submissionId)) {
    selectedSubmissions.value.delete(submissionId)
  } else {
    selectedSubmissions.value.add(submissionId)
  }
}

function isSubmissionSelected(submissionId: number): boolean {
  return selectedSubmissions.value.has(submissionId)
}

function selectAllInGroup(group: SubmissionGroup) {
  const pendingSubmissions = group.submissions.filter(s => s.reviewStatus === 'pending')
  pendingSubmissions.forEach(s => selectedSubmissions.value.add(s.id))
}

function deselectAllInGroup(group: SubmissionGroup) {
  group.submissions.forEach(s => selectedSubmissions.value.delete(s.id))
}

function selectAll() {
  submissionGroups.value.forEach(group => {
    group.submissions.filter(s => s.reviewStatus === 'pending').forEach(s => selectedSubmissions.value.add(s.id))
  })
}

function deselectAll() {
  selectedSubmissions.value.clear()
}

const selectedCount = computed(() => selectedSubmissions.value.size)

// ==================== 审核操作 ====================

function openReviewConfirm(action: 'approved' | 'rejected') {
  if (selectedCount.value === 0) {
    toast.warning('请先选择要审核的投稿')
    return
  }
  reviewAction.value = action
  reviewNote.value = ''
  showReviewConfirm.value = true
}

async function confirmReview() {
  if (selectedCount.value === 0) return

  isProcessing.value = true
  try {
    const res = await reviewSubmissions({
      submissionIds: Array.from(selectedSubmissions.value),
      action: reviewAction.value,
      note: reviewNote.value || undefined,
    })

    if (res.data.code === 200) {
      toast.success(reviewAction.value === 'approved' ? '已批准选中投稿' : '已拒绝选中投稿')
      showReviewConfirm.value = false
      selectedSubmissions.value.clear()
      await loadData()
    } else {
      toast.error(res.data.message || '审核操作失败')
    }
  } catch (error) {
    toast.error('审核操作失败')
  } finally {
    isProcessing.value = false
  }
}

function cancelReview() {
  showReviewConfirm.value = false
}

// ==================== 删除操作 ====================

function openDeleteConfirm() {
  if (selectedCount.value === 0) {
    toast.warning('请先选择要删除的投稿')
    return
  }
  showDeleteConfirm.value = true
}

async function confirmDelete() {
  if (selectedCount.value === 0) return

  isProcessing.value = true
  try {
    const res = await deleteSubmissions({
      submissionIds: Array.from(selectedSubmissions.value),
    })

    if (res.data.code === 200) {
      toast.success('已删除选中投稿')
      showDeleteConfirm.value = false
      selectedSubmissions.value.clear()
      await loadData()
    } else {
      toast.error(res.data.message || '删除失败')
    }
  } catch (error) {
    toast.error('删除失败')
  } finally {
    isProcessing.value = false
  }
}

function cancelDelete() {
  showDeleteConfirm.value = false
}

// ==================== 生命周期 ====================

onMounted(() => {
  if (!userStore.isLoggedIn || !userStore.canManageCampaigns) {
    toast.error('无权访问此页面')
    router.push('/')
    return
  }
  loadData()
})
</script>

<template>
  <div class="page-container">
    <PageHeader :back-to="`/admin/campaigns`" />

    <main class="page-content">
      <div class="content-container">
        <!-- 桌面端面包屑 -->
        <div class="breadcrumb-wrapper">
          <PageBreadcrumb />
        </div>

        <!-- 页面标题 -->
        <div class="page-header-section">
          <div class="header-main">
            <div class="header-text">
              <h1 class="page-title">审核投稿</h1>
              <p class="page-subtitle" v-if="campaign">{{ campaign.title }}</p>
            </div>
          </div>
        </div>

        <!-- 加载状态 -->
        <div v-if="isLoading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>

        <template v-else>
          <!-- 操作栏 -->
          <div class="action-bar">
            <div class="selection-info">
              <span v-if="selectedCount > 0">已选择 {{ selectedCount }} 条</span>
              <button v-if="selectedCount > 0" class="text-btn" @click="deselectAll">取消全选</button>
              <button v-else class="text-btn" @click="selectAll">全选待审核</button>
            </div>
            <div class="action-buttons">
              <button
                class="action-btn approve"
                :disabled="selectedCount === 0 || isProcessing"
                @click="openReviewConfirm('approved')"
              >
                批量通过
              </button>
              <button
                class="action-btn reject"
                :disabled="selectedCount === 0 || isProcessing"
                @click="openReviewConfirm('rejected')"
              >
                批量拒绝
              </button>
              <button
                class="action-btn delete"
                :disabled="selectedCount === 0 || isProcessing"
                @click="openDeleteConfirm"
              >
                批量删除
              </button>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-if="submissionGroups.length === 0" class="empty-container">
            <div class="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
              </svg>
            </div>
            <h2>暂无投稿</h2>
            <p>该活动还没有收到任何投稿</p>
          </div>

          <!-- 投稿分组列表 -->
          <div v-else class="submission-groups">
            <div
              v-for="group in submissionGroups"
              :key="group.music.id"
              class="music-group"
            >
              <!-- 音乐卡片头部 -->
              <div class="music-header" @click="toggleMusicExpand(group.music.id)">
                <div class="music-cover">
                  <img
                    v-if="group.music.coverImage"
                    :src="group.music.coverImage"
                    :alt="group.music.name"
                  />
                  <div v-else class="cover-placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M9 18V5l12-2v13"></path>
                      <circle cx="6" cy="18" r="3"></circle>
                      <circle cx="18" cy="16" r="3"></circle>
                    </svg>
                  </div>
                </div>
                <div class="music-info">
                  <h3 class="music-name">{{ group.music.name }}</h3>
                  <p class="music-artist">{{ group.music.artist }}</p>
                  <div class="music-meta">
                    <span class="meta-item">{{ group.music.source }}</span>
                    <span class="meta-divider">|</span>
                    <span class="meta-item">{{ formatDuration(group.music.duration) }}</span>
                    <span class="meta-divider">|</span>
                    <span class="meta-item">{{ group.count }} 人投稿</span>
                  </div>
                </div>
                <div class="expand-icon" :class="{ expanded: isMusicExpanded(group.music.id) }">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
              </div>

              <!-- 投稿列表 -->
              <Transition name="expand">
                <div v-if="isMusicExpanded(group.music.id)" class="submissions-list">
                  <div class="submissions-header">
                    <button class="text-btn-sm" @click.stop="selectAllInGroup(group)">全选</button>
                    <button class="text-btn-sm" @click.stop="deselectAllInGroup(group)">取消</button>
                  </div>
                  <div
                    v-for="submission in group.submissions"
                    :key="submission.id"
                    class="submission-item"
                    :class="{ selected: isSubmissionSelected(submission.id) }"
                    @click="toggleSubmissionSelection(submission.id)"
                  >
                    <div class="submission-checkbox">
                      <div class="checkbox" :class="{ checked: isSubmissionSelected(submission.id) }">
                        <svg v-if="isSubmissionSelected(submission.id)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                    </div>
                    <div class="submission-info">
                      <div class="submission-user">
                        <span class="user-name">{{ submission.user.nickname }}</span>
                        <span class="review-status" :class="getReviewStatusClass(submission.reviewStatus)">
                          {{ getReviewStatusLabel(submission.reviewStatus) }}
                        </span>
                      </div>
                      <p v-if="submission.message" class="submission-message">{{ submission.message }}</p>
                      <div class="submission-meta">
                        <span class="meta-item">{{ formatDate(submission.createdAt) }}</span>
                        <template v-if="submission.reviewNote">
                          <span class="meta-divider">|</span>
                          <span class="meta-item review-note">备注: {{ submission.reviewNote }}</span>
                        </template>
                      </div>
                    </div>
                  </div>
                </div>
              </Transition>
            </div>
          </div>
        </template>
      </div>
    </main>

    <PageFooter />

    <!-- ==================== 审核确认 Modal ==================== -->
    <Transition name="modal-fade">
      <div v-if="showReviewConfirm" class="modal-overlay" @click.self="cancelReview">
        <Transition name="modal-scale" appear>
          <div v-if="showReviewConfirm" class="modal-content" @click.stop>
            <h3 class="modal-title">{{ reviewAction === 'approved' ? '批准投稿' : '拒绝投稿' }}</h3>
            <p class="modal-desc">
              确定要{{ reviewAction === 'approved' ? '批准' : '拒绝' }}选中的 {{ selectedCount }} 条投稿吗？
            </p>
            <div class="form-group">
              <label class="form-label">审核备注（可选）</label>
              <textarea
                v-model="reviewNote"
                class="form-textarea"
                placeholder="可填写审核备注..."
                rows="2"
              ></textarea>
            </div>
            <div class="modal-actions">
              <button class="modal-btn cancel" @click="cancelReview" :disabled="isProcessing">取消</button>
              <button
                class="modal-btn confirm"
                :class="{ danger: reviewAction === 'rejected' }"
                @click="confirmReview"
                :disabled="isProcessing"
              >
                {{ isProcessing ? '处理中...' : '确定' }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>

    <!-- ==================== 删除确认 Modal ==================== -->
    <Transition name="modal-fade">
      <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="cancelDelete">
        <Transition name="modal-scale" appear>
          <div v-if="showDeleteConfirm" class="modal-content" @click.stop>
            <h3 class="modal-title">确认删除</h3>
            <p class="modal-desc">
              确定要删除选中的 {{ selectedCount }} 条投稿吗？此操作不可撤销。
            </p>
            <div class="modal-actions">
              <button class="modal-btn cancel" @click="cancelDelete" :disabled="isProcessing">取消</button>
              <button class="modal-btn confirm danger" @click="confirmDelete" :disabled="isProcessing">
                {{ isProcessing ? '删除中...' : '确认删除' }}
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
  max-width: 900px;
  margin: 0 auto;
}

/* ===== Breadcrumb ===== */
.breadcrumb-wrapper {
  display: none;
  margin-bottom: var(--spacing-lg);
}

/* ===== Page Header ===== */
.page-header-section {
  margin-bottom: var(--spacing-md);
}

.header-main {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.header-text {
  display: none;
}

.page-title {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-xs);
}

.page-subtitle {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
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

/* ===== Empty ===== */
.empty-container {
  text-align: center;
  padding: var(--spacing-2xl) var(--spacing-md);
}

.empty-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto var(--spacing-md);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-border);
  color: var(--color-text-secondary);
  border-radius: var(--radius-lg);
}

.empty-icon svg {
  width: 32px;
  height: 32px;
}

.empty-container h2 {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-xs);
}

.empty-container p {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

/* ===== Action Bar ===== */
.action-bar {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  margin-bottom: var(--spacing-md);
}

.selection-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.text-btn {
  background: none;
  border: none;
  color: var(--color-primary);
  font-size: var(--text-sm);
  cursor: pointer;
  padding: 0;
}

.text-btn:hover {
  text-decoration: underline;
}

.text-btn-sm {
  background: none;
  border: none;
  color: var(--color-primary);
  font-size: var(--text-xs);
  cursor: pointer;
  padding: 0;
}

.text-btn-sm:hover {
  text-decoration: underline;
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.action-btn {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn.approve {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.action-btn.approve:hover:not(:disabled) {
  background: var(--color-success);
  color: white;
}

.action-btn.reject {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.action-btn.reject:hover:not(:disabled) {
  background: var(--color-warning);
  color: white;
}

.action-btn.delete {
  background: var(--color-error-bg);
  color: var(--color-error);
}

.action-btn.delete:hover:not(:disabled) {
  background: var(--color-error);
  color: white;
}

/* ===== Music Group ===== */
.submission-groups {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.music-group {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.music-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.music-header:hover {
  background: var(--color-bg);
}

.music-cover {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-md);
  overflow: hidden;
  flex-shrink: 0;
}

.music-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-border);
  color: var(--color-text-secondary);
}

.cover-placeholder svg {
  width: 24px;
  height: 24px;
}

.music-info {
  flex: 1;
  min-width: 0;
}

.music-name {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.music-artist {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  margin-bottom: 4px;
}

.music-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
}

.meta-divider {
  color: var(--color-border);
}

.expand-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  transition: transform 0.2s ease;
}

.expand-icon.expanded {
  transform: rotate(180deg);
}

.expand-icon svg {
  width: 16px;
  height: 16px;
}

/* ===== Submissions List ===== */
.submissions-list {
  border-top: 1px solid var(--color-border);
  padding: var(--spacing-sm);
  background: var(--color-bg);
}

.submissions-header {
  display: flex;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
}

.submission-item {
  display: flex;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-xs);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.submission-item:last-child {
  margin-bottom: 0;
}

.submission-item:hover {
  border-color: var(--color-primary);
}

.submission-item.selected {
  background: var(--color-primary-bg);
  border-color: var(--color-primary);
}

.submission-checkbox {
  flex-shrink: 0;
}

.checkbox {
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.checkbox.checked {
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.checkbox svg {
  width: 12px;
  height: 12px;
  color: white;
}

.submission-info {
  flex: 1;
  min-width: 0;
}

.submission-user {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: 4px;
}

.user-name {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.review-status {
  font-size: 10px;
  font-weight: var(--font-semibold);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}

.review-status.review-pending {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.review-status.review-approved {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.review-status.review-rejected {
  background: var(--color-error-bg);
  color: var(--color-error);
}

.submission-message {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.submission-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
}

.review-note {
  color: var(--color-info);
}

/* ===== Expand Animation ===== */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

/* ===== Modal ===== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--spacing-md);
}

.modal-content {
  background: var(--color-card);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  max-width: 400px;
  width: 100%;
}

.modal-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-sm);
}

.modal-desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-md);
}

.form-group {
  margin-bottom: var(--spacing-md);
}

.form-label {
  display: block;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  margin-bottom: var(--spacing-xs);
}

.form-textarea {
  width: 100%;
  padding: var(--spacing-sm);
  font-size: var(--text-sm);
  color: var(--color-text);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  resize: vertical;
  min-height: 60px;
}

.form-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
}

.modal-actions {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: flex-end;
}

.modal-btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.modal-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.modal-btn.cancel {
  background: var(--color-border);
  color: var(--color-text);
}

.modal-btn.cancel:hover:not(:disabled) {
  background: var(--color-text-placeholder);
}

.modal-btn.confirm {
  background: var(--color-primary);
  color: white;
}

.modal-btn.confirm:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.modal-btn.confirm.danger {
  background: var(--color-error);
}

.modal-btn.confirm.danger:hover:not(:disabled) {
  opacity: 0.9;
}

/* ===== Desktop ===== */
@media (min-width: 768px) {
  .action-bar {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
}

@media (min-width: 1024px) {
  .breadcrumb-wrapper {
    display: block;
  }

  .page-content {
    padding: var(--spacing-xl);
  }

  .header-text {
    display: block;
  }

  .page-title {
    font-size: var(--text-2xl);
  }

  .music-name {
    font-size: var(--text-base);
  }

  .action-btn {
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: var(--text-sm);
  }
}

/* ===== Modal Animations ===== */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-scale-enter-active,
.modal-scale-leave-active {
  transition: all 0.2s ease;
}

.modal-scale-enter-from,
.modal-scale-leave-to {
  opacity: 0;
  transform: scale(0.9);
}
</style>
