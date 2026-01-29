<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/composables/useToast'
import {
  getAdminCollectionDetail,
  getAdminCollectionItems,
  getAdminRatingItems,
  addCollectionItem,
  removeCollectionItem,
  updateCollectionItemSort,
} from '@/api/rating'
import type {
  AdminCollection,
  AdminCollectionItem,
  AdminRatingItem,
} from '@/types/rating'
import { getAdminBreadcrumbParts, getAdminBreadcrumbPath } from '@/types/rating'
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb.vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const toast = useToast()

// 合集ID
const collectionId = computed(() => Number(route.params.collectionId))

// 加载状态
const isLoading = ref(true)
const isLoadingItems = ref(true)

// 合集信息
const collection = ref<AdminCollection | null>(null)

// 合集内的项目列表
const collectionItems = ref<AdminCollectionItem[]>([])
const itemsTotal = ref(0)
const itemsPage = ref(1)
const itemsPageSize = ref(50)

// 添加项目模态框
const showAddModal = ref(false)
const searchKeyword = ref('')
const searchResults = ref<AdminRatingItem[]>([])
const isSearching = ref(false)
const selectedItemId = ref<number | null>(null)
const isAdding = ref(false)

// 编辑排序模态框
const showSortModal = ref(false)
const editingSortItem = ref<AdminCollectionItem | null>(null)
const newSortOrder = ref(0)
const isSavingSort = ref(false)

// 移除确认
const showRemoveConfirm = ref(false)
const removeTarget = ref<AdminCollectionItem | null>(null)
const isRemoving = ref(false)

// 加载合集信息
async function loadCollection() {
  try {
    const res = await getAdminCollectionDetail(collectionId.value)
    if (res.data.code === 200) {
      collection.value = res.data.data
    } else {
      toast.error('获取合集信息失败')
      router.push('/admin/rating/collections')
    }
  } catch (error) {
    toast.error('获取合集信息失败')
    router.push('/admin/rating/collections')
  }
}

// 加载合集内的项目
async function loadCollectionItems() {
  isLoadingItems.value = true
  try {
    const res = await getAdminCollectionItems(collectionId.value, {
      page: itemsPage.value,
      size: itemsPageSize.value,
    })
    if (res.data.code === 200) {
      collectionItems.value = res.data.data.items
      itemsTotal.value = res.data.data.total
    } else {
      toast.error(res.data.message || '获取项目列表失败')
    }
  } catch (error) {
    toast.error('获取项目列表失败')
  } finally {
    isLoadingItems.value = false
  }
}

// 加载所有数据
async function loadAllData() {
  isLoading.value = true
  try {
    await loadCollection()
    await loadCollectionItems()
  } finally {
    isLoading.value = false
  }
}

// 搜索评分项目
async function searchRatingItems() {
  if (!searchKeyword.value.trim()) {
    searchResults.value = []
    return
  }

  isSearching.value = true
  try {
    const res = await getAdminRatingItems({
      keyword: searchKeyword.value,
      size: 20,
      status: 1, // 只搜索启用的
    })
    if (res.data.code === 200) {
      // 过滤掉已经在合集中的项目
      const existingIds = new Set(collectionItems.value.map(item => item.ratingItemId))
      searchResults.value = res.data.data.items.filter(item => !existingIds.has(item.id))
    }
  } catch (error) {
    toast.error('搜索失败')
  } finally {
    isSearching.value = false
  }
}

// 打开添加模态框
function openAddModal() {
  showAddModal.value = true
  searchKeyword.value = ''
  searchResults.value = []
  selectedItemId.value = null
}

// 关闭添加模态框
function closeAddModal() {
  showAddModal.value = false
  searchKeyword.value = ''
  searchResults.value = []
  selectedItemId.value = null
}

// 选择要添加的项目
function selectItem(item: AdminRatingItem) {
  selectedItemId.value = item.id
}

// 确认添加项目
async function confirmAddItem() {
  if (!selectedItemId.value) {
    toast.error('请选择要添加的项目')
    return
  }

  isAdding.value = true
  try {
    const res = await addCollectionItem(collectionId.value, {
      ratingItemId: selectedItemId.value,
      sortOrder: 0,
    })
    if (res.data.code === 200) {
      toast.success('添加成功')
      closeAddModal()
      await loadCollectionItems()
      await loadCollection()
    } else {
      toast.error(res.data.message || '添加失败')
    }
  } catch (error) {
    toast.error('添加失败')
  } finally {
    isAdding.value = false
  }
}

// 打开排序编辑模态框
function openSortModal(item: AdminCollectionItem) {
  editingSortItem.value = item
  newSortOrder.value = item.sortOrder
  showSortModal.value = true
}

// 关闭排序编辑模态框
function closeSortModal() {
  showSortModal.value = false
  editingSortItem.value = null
  newSortOrder.value = 0
}

// 保存排序
async function saveSortOrder() {
  if (!editingSortItem.value) return

  isSavingSort.value = true
  try {
    const res = await updateCollectionItemSort(
      collectionId.value,
      editingSortItem.value.ratingItemId,
      { sortOrder: newSortOrder.value }
    )
    if (res.data.code === 200) {
      toast.success('排序已更新')
      closeSortModal()
      await loadCollectionItems()
    } else {
      toast.error(res.data.message || '更新失败')
    }
  } catch (error) {
    toast.error('更新失败')
  } finally {
    isSavingSort.value = false
  }
}

// 打开移除确认
function openRemoveConfirm(item: AdminCollectionItem) {
  removeTarget.value = item
  showRemoveConfirm.value = true
}

// 确认移除
async function confirmRemove() {
  if (!removeTarget.value) return

  isRemoving.value = true
  try {
    const res = await removeCollectionItem(collectionId.value, removeTarget.value.ratingItemId)
    if (res.data.code === 200) {
      toast.success('已移除')
      showRemoveConfirm.value = false
      removeTarget.value = null
      await loadCollectionItems()
      await loadCollection()
    } else {
      toast.error(res.data.message || '移除失败')
    }
  } catch (error) {
    toast.error('移除失败')
  } finally {
    isRemoving.value = false
  }
}

// 取消移除
function cancelRemove() {
  showRemoveConfirm.value = false
  removeTarget.value = null
}

// 返回
function goBack() {
  router.push('/admin/rating/collections')
}

// 格式化评分
function formatScore(score: number) {
  return score.toFixed(1)
}

onMounted(() => {
  if (!userStore.isLoggedIn || !userStore.canManageRating) {
    toast.error('无权访问此页面')
    router.push('/')
    return
  }
  loadAllData()
})
</script>

<template>
  <div class="page-container">
    <PageHeader back-to="/admin/rating/collections" />

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

        <template v-else-if="collection">
          <!-- 合集信息卡片 -->
          <div class="collection-info-card">
            <div class="collection-cover" v-if="collection.coverUrl">
              <img :src="collection.coverUrl" :alt="collection.name" />
            </div>
            <div class="collection-details">
              <h1 class="collection-title">{{ collection.name }}</h1>
              <p v-if="collection.description" class="collection-desc">{{ collection.description }}</p>
              <div class="collection-stats">
                <span class="stat-item">{{ collection.itemCount }} 个项目</span>
                <span class="stat-divider">·</span>
                <span class="stat-item">排序权重: {{ collection.sortOrder }}</span>
              </div>
            </div>
            <div class="collection-actions">
              <button class="action-button secondary" @click="goBack">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
                返回
              </button>
              <button class="action-button primary" @click="openAddModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                添加项目
              </button>
            </div>
          </div>

          <!-- 项目列表 -->
          <div class="items-section">
            <h2 class="section-title">合集项目</h2>

            <div v-if="isLoadingItems" class="loading-inline">
              <div class="loading-spinner small"></div>
              加载中...
            </div>

            <div v-else-if="collectionItems.length === 0" class="empty-container">
              <div class="empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              </div>
              <h3>暂无项目</h3>
              <p>点击上方"添加项目"按钮添加评分项目</p>
            </div>

            <div v-else class="items-list">
              <div
                v-for="item in collectionItems"
                :key="item.id"
                class="item-card"
              >
                <!-- 封面图 -->
                <div class="item-cover">
                  <img
                    v-if="item.ratingItemImageUrl"
                    :src="item.ratingItemImageUrl"
                    :alt="item.ratingItemName"
                    class="cover-image"
                  />
                  <div v-else class="cover-placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                  </div>
                </div>

                <!-- 信息 -->
                <div class="item-info">
                  <h3 class="item-name">{{ item.ratingItemName }}</h3>
                  <div class="item-breadcrumb">
                    <span>{{ getAdminBreadcrumbParts(item.breadcrumb).school }}</span>
                    <template v-for="(part, idx) in getAdminBreadcrumbParts(item.breadcrumb).parts" :key="idx">
                      <span class="sep">/</span>
                      <span>{{ part }}</span>
                    </template>
                  </div>
                  <div class="item-meta">
                    <span class="meta-item score">
                      <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                      </svg>
                      {{ formatScore(item.averageScore) }}
                    </span>
                    <span class="meta-divider">·</span>
                    <span class="meta-item">{{ item.ratingCount }} 评分</span>
                    <span class="meta-divider">·</span>
                    <span class="meta-item">排序: {{ item.sortOrder }}</span>
                  </div>
                </div>

                <!-- 操作按钮 -->
                <div class="item-actions">
                  <button class="action-btn sort" @click="openSortModal(item)">
                    排序
                  </button>
                  <button class="action-btn remove" @click="openRemoveConfirm(item)">
                    移除
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </main>

    <PageFooter />

    <!-- 添加项目模态框 -->
    <Transition name="modal-fade">
      <div v-if="showAddModal" class="modal-overlay" @click.self="closeAddModal">
        <Transition name="modal-scale" appear>
          <div v-if="showAddModal" class="modal-content modal-large" @click.stop>
            <h3 class="modal-title">添加评分项目</h3>

            <div class="search-box">
              <input
                v-model="searchKeyword"
                type="text"
                class="search-input"
                placeholder="搜索评分项目名称..."
                @input="searchRatingItems"
              />
              <div v-if="isSearching" class="search-loading">
                <div class="loading-spinner small"></div>
              </div>
            </div>

            <div class="search-results">
              <div v-if="searchResults.length === 0 && searchKeyword" class="empty-search">
                {{ isSearching ? '搜索中...' : '没有找到匹配的项目' }}
              </div>
              <div v-else-if="searchResults.length === 0" class="empty-search">
                输入关键词搜索评分项目
              </div>
              <div
                v-for="item in searchResults"
                :key="item.id"
                class="search-item"
                :class="{ selected: selectedItemId === item.id }"
                @click="selectItem(item)"
              >
                <div class="search-item-cover">
                  <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.name" />
                  <div v-else class="cover-placeholder-sm">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                  </div>
                </div>
                <div class="search-item-info">
                  <div class="search-item-name">{{ item.name }}</div>
                  <div class="search-item-path">
                    {{ getAdminBreadcrumbPath(item.breadcrumb) }}
                  </div>
                </div>
                <div v-if="selectedItemId === item.id" class="check-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
              </div>
            </div>

            <div class="modal-actions">
              <button class="modal-btn cancel" @click="closeAddModal" :disabled="isAdding">
                取消
              </button>
              <button
                class="modal-btn confirm primary"
                @click="confirmAddItem"
                :disabled="isAdding || !selectedItemId"
              >
                {{ isAdding ? '添加中...' : '确认添加' }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>

    <!-- 编辑排序模态框 -->
    <Transition name="modal-fade">
      <div v-if="showSortModal" class="modal-overlay" @click.self="closeSortModal">
        <Transition name="modal-scale" appear>
          <div v-if="showSortModal" class="modal-content" @click.stop>
            <h3 class="modal-title">编辑排序</h3>
            <p class="modal-desc">项目: {{ editingSortItem?.ratingItemName }}</p>
            <div class="form-group">
              <label class="form-label">排序权重</label>
              <input
                v-model.number="newSortOrder"
                type="number"
                class="form-input"
                placeholder="数字越小排序越靠前"
                min="0"
              />
              <p class="form-hint">数字越小排序越靠前</p>
            </div>
            <div class="modal-actions">
              <button class="modal-btn cancel" @click="closeSortModal" :disabled="isSavingSort">
                取消
              </button>
              <button class="modal-btn confirm primary" @click="saveSortOrder" :disabled="isSavingSort">
                {{ isSavingSort ? '保存中...' : '保存' }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>

    <!-- 移除确认弹窗 -->
    <Transition name="modal-fade">
      <div v-if="showRemoveConfirm" class="modal-overlay" @click.self="cancelRemove">
        <Transition name="modal-scale" appear>
          <div v-if="showRemoveConfirm" class="modal-content" @click.stop>
            <h3 class="modal-title">确认移除</h3>
            <p class="modal-desc">
              确定要从合集中移除"{{ removeTarget?.ratingItemName }}"吗？
            </p>
            <p class="modal-warning">注意：这不会删除评分项目本身。</p>
            <div class="modal-actions">
              <button class="modal-btn cancel" @click="cancelRemove" :disabled="isRemoving">
                取消
              </button>
              <button class="modal-btn confirm danger" @click="confirmRemove" :disabled="isRemoving">
                {{ isRemoving ? '移除中...' : '确认移除' }}
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

.loading-spinner.small {
  width: 20px;
  height: 20px;
  border-width: 2px;
  margin-bottom: 0;
  margin-right: var(--spacing-sm);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-inline {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

/* ===== Collection Info Card ===== */
.collection-info-card {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  margin-bottom: var(--spacing-lg);
}

.collection-cover {
  width: 100%;
  max-width: 200px;
  aspect-ratio: 16/9;
  border-radius: var(--radius-md);
  overflow: hidden;
}

.collection-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.collection-details {
  flex: 1;
}

.collection-title {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-xs);
}

.collection-desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-sm);
}

.collection-stats {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--text-sm);
  color: var(--color-text-placeholder);
}

.stat-divider {
  color: var(--color-border);
}

.collection-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.action-button {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.action-button svg {
  width: 16px;
  height: 16px;
}

.action-button.primary {
  background: var(--color-primary);
  color: white;
}

.action-button.primary:hover {
  background: var(--color-primary-dark);
}

.action-button.secondary {
  background: var(--color-card);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.action-button.secondary:hover {
  background: var(--color-border);
}

/* ===== Items Section ===== */
.items-section {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.section-title {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
}

/* ===== Empty ===== */
.empty-container {
  text-align: center;
  padding: var(--spacing-2xl) var(--spacing-md);
}

.empty-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto var(--spacing-md);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-border);
  color: var(--color-text-secondary);
  border-radius: var(--radius-lg);
}

.empty-icon svg {
  width: 24px;
  height: 24px;
}

.empty-container h3 {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-xs);
}

.empty-container p {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

/* ===== Items List ===== */
.items-list {
  display: flex;
  flex-direction: column;
}

.item-card {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
  transition: background var(--transition-fast);
}

.item-card:last-child {
  border-bottom: none;
}

.item-card:hover {
  background: var(--color-bg);
}

.item-cover {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: var(--radius-md);
  overflow: hidden;
}

.cover-image {
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
  color: var(--color-text-placeholder);
}

.cover-placeholder svg {
  width: 20px;
  height: 20px;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-breadcrumb {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  margin-bottom: 4px;
  flex-wrap: wrap;
}

.item-breadcrumb .sep {
  color: var(--color-border);
}

.item-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
}

.meta-item.score {
  display: flex;
  align-items: center;
  gap: 2px;
  color: var(--color-warning);
}

.meta-item.score svg {
  width: 12px;
  height: 12px;
}

.meta-divider {
  color: var(--color-border);
}

.item-actions {
  display: flex;
  gap: var(--spacing-sm);
  flex-shrink: 0;
}

.action-btn {
  padding: 4px 12px;
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.action-btn.sort {
  background: var(--color-border);
  color: var(--color-text-secondary);
}

.action-btn.sort:hover {
  background: var(--color-text-placeholder);
  color: white;
}

.action-btn.remove {
  background: var(--color-error-bg);
  color: var(--color-error);
}

.action-btn.remove:hover {
  background: var(--color-error);
  color: white;
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
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content.modal-large {
  max-width: 500px;
}

.modal-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-md);
}

.modal-desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-sm);
}

.modal-warning {
  font-size: var(--text-xs);
  color: var(--color-warning);
  margin-bottom: var(--spacing-lg);
}

/* ===== Search ===== */
.search-box {
  position: relative;
  margin-bottom: var(--spacing-md);
}

.search-input {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  color: var(--color-text);
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.search-input::placeholder {
  color: var(--color-text-placeholder);
}

.search-loading {
  position: absolute;
  right: var(--spacing-sm);
  top: 50%;
  transform: translateY(-50%);
}

.search-results {
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.empty-search {
  padding: var(--spacing-lg);
  text-align: center;
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.search-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  cursor: pointer;
  transition: background var(--transition-fast);
  border-bottom: 1px solid var(--color-border);
}

.search-item:last-child {
  border-bottom: none;
}

.search-item:hover {
  background: var(--color-bg);
}

.search-item.selected {
  background: var(--color-primary-bg);
}

.search-item-cover {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.search-item-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder-sm {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-border);
  color: var(--color-text-placeholder);
}

.cover-placeholder-sm svg {
  width: 16px;
  height: 16px;
}

.search-item-info {
  flex: 1;
  min-width: 0;
}

.search-item-name {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-item-path {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.check-icon {
  width: 20px;
  height: 20px;
  color: var(--color-primary);
  flex-shrink: 0;
}

.check-icon svg {
  width: 100%;
  height: 100%;
}

/* ===== Form ===== */
.form-group {
  margin-bottom: var(--spacing-md);
}

.form-label {
  display: block;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  margin-bottom: var(--spacing-xs);
}

.form-input {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  color: var(--color-text);
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.form-hint {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
  margin-top: var(--spacing-xs);
}

.modal-actions {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: flex-end;
  margin-top: var(--spacing-lg);
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

.modal-btn.confirm.primary {
  background: var(--color-primary);
  color: white;
}

.modal-btn.confirm.primary:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.modal-btn.confirm.danger {
  background: var(--color-error);
  color: white;
}

.modal-btn.confirm.danger:hover:not(:disabled) {
  opacity: 0.9;
}

/* ===== Modal Transitions ===== */
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

/* ===== Desktop ===== */
@media (min-width: 768px) {
  .collection-info-card {
    flex-direction: row;
    align-items: flex-start;
  }

  .item-card {
    flex-direction: row;
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

  .collection-title {
    font-size: var(--text-xl);
  }

  .item-name {
    font-size: var(--text-base);
  }

  .action-btn {
    padding: 6px 16px;
    font-size: var(--text-sm);
  }
}
</style>
