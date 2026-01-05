<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/composables/useToast'
import {
  getCampuses,
  getBuildings,
  getTimePeriods,
  getBuildingTimePeriods,
  createCampus,
  updateCampus,
  deleteCampus,
  createBuilding,
  updateBuilding,
  deleteBuilding,
  createTimePeriod,
  updateTimePeriod,
  deleteTimePeriod,
  addBuildingTimePeriod,
  removeBuildingTimePeriod,
} from '@/api/dorm'
import type {
  Campus,
  Building,
  TimePeriod,
  CreateCampusRequest,
  UpdateCampusRequest,
  CreateBuildingRequest,
  UpdateBuildingRequest,
  CreateTimePeriodRequest,
  UpdateTimePeriodRequest,
} from '@/types/dorm'
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb.vue'

const router = useRouter()
const userStore = useUserStore()
const toast = useToast()

// ==================== 通用状态 ====================
const isLoading = ref(true)
const activeTab = ref<'campus' | 'building' | 'timePeriod'>('campus')

// Tab 切换动画
const tabOrder = ['campus', 'building', 'timePeriod'] as const
const slideDirection = ref<'left' | 'right' | ''>('')
const isAnimating = ref(false)

// 监听 Tab 切换
watch(activeTab, (newVal, oldVal) => {
  if (!oldVal) return
  const oldIndex = tabOrder.indexOf(oldVal)
  const newIndex = tabOrder.indexOf(newVal)
  slideDirection.value = newIndex > oldIndex ? 'left' : 'right'
  isAnimating.value = true

  nextTick(() => {
    setTimeout(() => {
      isAnimating.value = false
      slideDirection.value = ''
    }, 300)
  })
})

// ==================== 校区管理 ====================
const campuses = ref<Campus[]>([])
const showCampusModal = ref(false)
const campusModalMode = ref<'create' | 'edit'>('create')
const editingCampus = ref<Campus | null>(null)
const campusForm = ref<CreateCampusRequest>({
  name: '',
  code: '',
})
const isSavingCampus = ref(false)

// 删除确认
const showDeleteCampusConfirm = ref(false)
const deleteCampusTarget = ref<Campus | null>(null)
const isDeletingCampus = ref(false)

// ==================== 宿舍楼管理 ====================
const buildings = ref<Building[]>([])
const showBuildingModal = ref(false)
const buildingModalMode = ref<'create' | 'edit'>('create')
const editingBuilding = ref<Building | null>(null)
const buildingForm = ref<CreateBuildingRequest>({
  campusId: 0,
  name: '',
  code: '',
})
const isSavingBuilding = ref(false)

// 删除确认
const showDeleteBuildingConfirm = ref(false)
const deleteBuildingTarget = ref<Building | null>(null)
const isDeletingBuilding = ref(false)

// 时段关联
const showTimePeriodLinkModal = ref(false)
const linkingBuilding = ref<Building | null>(null)
const buildingTimePeriods = ref<TimePeriod[]>([])
const isLoadingBuildingTimePeriods = ref(false)

// ==================== 铃声时段管理 ====================
const timePeriods = ref<TimePeriod[]>([])
const showTimePeriodModal = ref(false)
const timePeriodModalMode = ref<'create' | 'edit'>('create')
const editingTimePeriod = ref<TimePeriod | null>(null)
const timePeriodForm = ref<CreateTimePeriodRequest>({
  name: '',
  code: '',
  description: '',
  sortOrder: 0,
})
const isSavingTimePeriod = ref(false)

// 删除确认
const showDeleteTimePeriodConfirm = ref(false)
const deleteTimePeriodTarget = ref<TimePeriod | null>(null)
const isDeletingTimePeriod = ref(false)

// ==================== 数据加载 ====================

async function loadCampuses() {
  try {
    const res = await getCampuses()
    if (res.data.code === 200) {
      campuses.value = res.data.data
    } else {
      toast.error(res.data.message || '获取校区列表失败')
    }
  } catch (error) {
    toast.error('获取校区列表失败')
  }
}

async function loadBuildings() {
  try {
    const res = await getBuildings()
    if (res.data.code === 200) {
      buildings.value = res.data.data
    } else {
      toast.error(res.data.message || '获取宿舍楼列表失败')
    }
  } catch (error) {
    toast.error('获取宿舍楼列表失败')
  }
}

async function loadTimePeriods() {
  try {
    const res = await getTimePeriods()
    if (res.data.code === 200) {
      timePeriods.value = res.data.data
    } else {
      toast.error(res.data.message || '获取铃声时段列表失败')
    }
  } catch (error) {
    toast.error('获取铃声时段列表失败')
  }
}

async function loadAllData() {
  isLoading.value = true
  try {
    await Promise.all([loadCampuses(), loadBuildings(), loadTimePeriods()])
  } finally {
    isLoading.value = false
  }
}

// ==================== 校区 CRUD ====================

function openCreateCampusModal() {
  campusModalMode.value = 'create'
  editingCampus.value = null
  campusForm.value = { name: '', code: '' }
  showCampusModal.value = true
}

function openEditCampusModal(campus: Campus) {
  campusModalMode.value = 'edit'
  editingCampus.value = campus
  campusForm.value = { name: campus.name, code: campus.code }
  showCampusModal.value = true
}

function closeCampusModal() {
  showCampusModal.value = false
  editingCampus.value = null
}

async function saveCampus() {
  if (!campusForm.value.name.trim() || !campusForm.value.code.trim()) {
    toast.error('请填写完整信息')
    return
  }

  isSavingCampus.value = true
  try {
    if (campusModalMode.value === 'create') {
      const res = await createCampus(campusForm.value)
      if (res.data.code === 200) {
        toast.success('校区创建成功')
        closeCampusModal()
        await loadCampuses()
      } else {
        toast.error(res.data.message || '创建失败')
      }
    } else if (editingCampus.value) {
      const updateData: UpdateCampusRequest = {
        name: campusForm.value.name,
        code: campusForm.value.code,
      }
      const res = await updateCampus(editingCampus.value.id, updateData)
      if (res.data.code === 200) {
        toast.success('校区更新成功')
        closeCampusModal()
        await loadCampuses()
      } else {
        toast.error(res.data.message || '更新失败')
      }
    }
  } catch (error) {
    toast.error(campusModalMode.value === 'create' ? '创建失败' : '更新失败')
  } finally {
    isSavingCampus.value = false
  }
}

async function toggleCampusStatus(campus: Campus) {
  try {
    const res = await updateCampus(campus.id, { status: campus.status === 1 ? 0 : 1 })
    if (res.data.code === 200) {
      toast.success(campus.status === 1 ? '已禁用' : '已启用')
      await loadCampuses()
    } else {
      toast.error(res.data.message || '操作失败')
    }
  } catch (error) {
    toast.error('操作失败')
  }
}

function openDeleteCampusConfirm(campus: Campus) {
  deleteCampusTarget.value = campus
  showDeleteCampusConfirm.value = true
}

async function confirmDeleteCampus() {
  if (!deleteCampusTarget.value) return

  isDeletingCampus.value = true
  try {
    const res = await deleteCampus(deleteCampusTarget.value.id)
    if (res.data.code === 200) {
      toast.success('校区已删除')
      showDeleteCampusConfirm.value = false
      deleteCampusTarget.value = null
      await loadCampuses()
    } else {
      toast.error(res.data.message || '删除失败')
    }
  } catch (error) {
    toast.error('删除失败')
  } finally {
    isDeletingCampus.value = false
  }
}

function cancelDeleteCampus() {
  showDeleteCampusConfirm.value = false
  deleteCampusTarget.value = null
}

// ==================== 宿舍楼 CRUD ====================

function openCreateBuildingModal() {
  const firstCampus = campuses.value[0]
  if (!firstCampus) {
    toast.warning('请先创建校区')
    return
  }
  buildingModalMode.value = 'create'
  editingBuilding.value = null
  buildingForm.value = { campusId: firstCampus.id, name: '', code: '' }
  showBuildingModal.value = true
}

function openEditBuildingModal(building: Building) {
  buildingModalMode.value = 'edit'
  editingBuilding.value = building
  buildingForm.value = { campusId: building.campusId, name: building.name, code: building.code }
  showBuildingModal.value = true
}

function closeBuildingModal() {
  showBuildingModal.value = false
  editingBuilding.value = null
}

async function saveBuilding() {
  if (!buildingForm.value.name.trim() || !buildingForm.value.code.trim()) {
    toast.error('请填写完整信息')
    return
  }

  isSavingBuilding.value = true
  try {
    if (buildingModalMode.value === 'create') {
      const res = await createBuilding(buildingForm.value)
      if (res.data.code === 200) {
        toast.success('宿舍楼创建成功')
        closeBuildingModal()
        await loadBuildings()
      } else {
        toast.error(res.data.message || '创建失败')
      }
    } else if (editingBuilding.value) {
      const updateData: UpdateBuildingRequest = {
        campusId: buildingForm.value.campusId,
        name: buildingForm.value.name,
        code: buildingForm.value.code,
      }
      const res = await updateBuilding(editingBuilding.value.id, updateData)
      if (res.data.code === 200) {
        toast.success('宿舍楼更新成功')
        closeBuildingModal()
        await loadBuildings()
      } else {
        toast.error(res.data.message || '更新失败')
      }
    }
  } catch (error) {
    toast.error(buildingModalMode.value === 'create' ? '创建失败' : '更新失败')
  } finally {
    isSavingBuilding.value = false
  }
}

async function toggleBuildingStatus(building: Building) {
  try {
    const res = await updateBuilding(building.id, { status: building.status === 1 ? 0 : 1 })
    if (res.data.code === 200) {
      toast.success(building.status === 1 ? '已禁用' : '已启用')
      await loadBuildings()
    } else {
      toast.error(res.data.message || '操作失败')
    }
  } catch (error) {
    toast.error('操作失败')
  }
}

function openDeleteBuildingConfirm(building: Building) {
  deleteBuildingTarget.value = building
  showDeleteBuildingConfirm.value = true
}

async function confirmDeleteBuilding() {
  if (!deleteBuildingTarget.value) return

  isDeletingBuilding.value = true
  try {
    const res = await deleteBuilding(deleteBuildingTarget.value.id)
    if (res.data.code === 200) {
      toast.success('宿舍楼已删除')
      showDeleteBuildingConfirm.value = false
      deleteBuildingTarget.value = null
      await loadBuildings()
    } else {
      toast.error(res.data.message || '删除失败')
    }
  } catch (error) {
    toast.error('删除失败')
  } finally {
    isDeletingBuilding.value = false
  }
}

function cancelDeleteBuilding() {
  showDeleteBuildingConfirm.value = false
  deleteBuildingTarget.value = null
}

// ==================== 宿舍楼-时段关联 ====================

async function openTimePeriodLinkModal(building: Building) {
  linkingBuilding.value = building
  isLoadingBuildingTimePeriods.value = true
  showTimePeriodLinkModal.value = true

  try {
    const res = await getBuildingTimePeriods(building.id)
    if (res.data.code === 200) {
      buildingTimePeriods.value = res.data.data
    } else {
      toast.error(res.data.message || '获取时段列表失败')
    }
  } catch (error) {
    toast.error('获取时段列表失败')
  } finally {
    isLoadingBuildingTimePeriods.value = false
  }
}

function closeTimePeriodLinkModal() {
  showTimePeriodLinkModal.value = false
  linkingBuilding.value = null
  buildingTimePeriods.value = []
}

function isTimePeriodLinked(timePeriodId: number): boolean {
  return buildingTimePeriods.value.some((tp) => tp.id === timePeriodId)
}

async function toggleTimePeriodLink(timePeriod: TimePeriod) {
  if (!linkingBuilding.value) return

  const isLinked = isTimePeriodLinked(timePeriod.id)
  try {
    if (isLinked) {
      const res = await removeBuildingTimePeriod({
        buildingId: linkingBuilding.value.id,
        timePeriodId: timePeriod.id,
      })
      if (res.data.code === 200) {
        toast.success('已移除时段')
        buildingTimePeriods.value = buildingTimePeriods.value.filter((tp) => tp.id !== timePeriod.id)
      } else {
        toast.error(res.data.message || '操作失败')
      }
    } else {
      const res = await addBuildingTimePeriod({
        buildingId: linkingBuilding.value.id,
        timePeriodId: timePeriod.id,
      })
      if (res.data.code === 200) {
        toast.success('已添加时段')
        buildingTimePeriods.value.push(timePeriod)
      } else {
        toast.error(res.data.message || '操作失败')
      }
    }
  } catch (error) {
    toast.error('操作失败')
  }
}

// ==================== 铃声时段 CRUD ====================

function openCreateTimePeriodModal() {
  timePeriodModalMode.value = 'create'
  editingTimePeriod.value = null
  timePeriodForm.value = { name: '', code: '', description: '', sortOrder: 0 }
  showTimePeriodModal.value = true
}

function openEditTimePeriodModal(timePeriod: TimePeriod) {
  timePeriodModalMode.value = 'edit'
  editingTimePeriod.value = timePeriod
  timePeriodForm.value = {
    name: timePeriod.name,
    code: timePeriod.code,
    description: timePeriod.description || '',
    sortOrder: timePeriod.sortOrder,
  }
  showTimePeriodModal.value = true
}

function closeTimePeriodModal() {
  showTimePeriodModal.value = false
  editingTimePeriod.value = null
}

async function saveTimePeriod() {
  if (!timePeriodForm.value.name.trim() || !timePeriodForm.value.code.trim()) {
    toast.error('请填写完整信息')
    return
  }

  isSavingTimePeriod.value = true
  try {
    if (timePeriodModalMode.value === 'create') {
      const res = await createTimePeriod(timePeriodForm.value)
      if (res.data.code === 200) {
        toast.success('铃声时段创建成功')
        closeTimePeriodModal()
        await loadTimePeriods()
      } else {
        toast.error(res.data.message || '创建失败')
      }
    } else if (editingTimePeriod.value) {
      const updateData: UpdateTimePeriodRequest = {
        name: timePeriodForm.value.name,
        code: timePeriodForm.value.code,
        description: timePeriodForm.value.description,
        sortOrder: timePeriodForm.value.sortOrder,
      }
      const res = await updateTimePeriod(editingTimePeriod.value.id, updateData)
      if (res.data.code === 200) {
        toast.success('铃声时段更新成功')
        closeTimePeriodModal()
        await loadTimePeriods()
      } else {
        toast.error(res.data.message || '更新失败')
      }
    }
  } catch (error) {
    toast.error(timePeriodModalMode.value === 'create' ? '创建失败' : '更新失败')
  } finally {
    isSavingTimePeriod.value = false
  }
}

async function toggleTimePeriodStatus(timePeriod: TimePeriod) {
  try {
    const res = await updateTimePeriod(timePeriod.id, { status: timePeriod.status === 1 ? 0 : 1 })
    if (res.data.code === 200) {
      toast.success(timePeriod.status === 1 ? '已禁用' : '已启用')
      await loadTimePeriods()
    } else {
      toast.error(res.data.message || '操作失败')
    }
  } catch (error) {
    toast.error('操作失败')
  }
}

function openDeleteTimePeriodConfirm(timePeriod: TimePeriod) {
  deleteTimePeriodTarget.value = timePeriod
  showDeleteTimePeriodConfirm.value = true
}

async function confirmDeleteTimePeriod() {
  if (!deleteTimePeriodTarget.value) return

  isDeletingTimePeriod.value = true
  try {
    const res = await deleteTimePeriod(deleteTimePeriodTarget.value.id)
    if (res.data.code === 200) {
      toast.success('铃声时段已删除')
      showDeleteTimePeriodConfirm.value = false
      deleteTimePeriodTarget.value = null
      await loadTimePeriods()
    } else {
      toast.error(res.data.message || '删除失败')
    }
  } catch (error) {
    toast.error('删除失败')
  } finally {
    isDeletingTimePeriod.value = false
  }
}

function cancelDeleteTimePeriod() {
  showDeleteTimePeriodConfirm.value = false
  deleteTimePeriodTarget.value = null
}

// ==================== 辅助函数 ====================

function getStatusInfo(status: number) {
  return status === 1
    ? { label: '启用', class: 'status-enabled' }
    : { label: '禁用', class: 'status-disabled' }
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function getCampusName(campusId: number): string {
  const campus = campuses.value.find((c) => c.id === campusId)
  return campus?.name || '未知校区'
}

// ==================== 生命周期 ====================

onMounted(() => {
  if (!userStore.isLoggedIn || !userStore.canManageCampaigns) {
    toast.error('无权访问此页面')
    router.push('/')
    return
  }
  loadAllData()
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

        <!-- 页面标题（仅桌面端显示） -->
        <div class="page-header-section">
          <div class="header-main">
            <div class="header-text">
              <h1 class="page-title">宿舍管理</h1>
              <p class="page-subtitle">管理校区、宿舍楼和铃声时段</p>
            </div>
          </div>
        </div>

        <!-- 加载状态 -->
        <div v-if="isLoading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>

        <template v-else>
          <!-- Tab 切换 -->
          <div class="status-tabs">
            <button
              class="status-tab"
              :class="{ active: activeTab === 'campus' }"
              @click="activeTab = 'campus'"
            >
              校区
            </button>
            <button
              class="status-tab"
              :class="{ active: activeTab === 'building' }"
              @click="activeTab = 'building'"
            >
              宿舍楼
            </button>
            <button
              class="status-tab"
              :class="{ active: activeTab === 'timePeriod' }"
              @click="activeTab = 'timePeriod'"
            >
              铃声时段
            </button>
          </div>

          <!-- 内容区域（带动画） -->
          <div
            class="content-slide-wrapper"
            :class="{
              'slide-left': isAnimating && slideDirection === 'left',
              'slide-right': isAnimating && slideDirection === 'right',
            }"
          >
            <!-- ==================== 校区管理 ==================== -->
            <template v-if="activeTab === 'campus'">
              <div class="tab-header">
                <span class="tab-count">共 {{ campuses.length }} 个校区</span>
                <button class="action-button primary" @click="openCreateCampusModal">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  添加校区
                </button>
              </div>

              <!-- 空状态 -->
              <div v-if="campuses.length === 0" class="empty-container">
                <div class="empty-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M3 21h18M3 7v14M21 7v14M6 11h4M6 15h4M14 11h4M14 15h4M12 3l9 4H3l9-4z"></path>
                  </svg>
                </div>
                <h2>暂无校区</h2>
                <p>还没有创建任何校区</p>
                <button class="empty-action-btn" @click="openCreateCampusModal">创建第一个校区</button>
              </div>

              <!-- 校区列表 -->
              <div v-else class="items-list">
                <div v-for="campus in campuses" :key="campus.id" class="item-card">
                  <div class="item-info">
                    <div class="item-header">
                      <h3 class="item-name">{{ campus.name }}</h3>
                      <span class="status-badge" :class="getStatusInfo(campus.status).class">
                        {{ getStatusInfo(campus.status).label }}
                      </span>
                    </div>
                    <div class="item-meta">
                      <span class="meta-item">代码: {{ campus.code }}</span>
                      <span class="meta-divider">·</span>
                      <span class="meta-item">{{ formatDate(campus.createdAt) }}</span>
                    </div>
                  </div>
                  <div class="item-actions">
                    <button
                      class="action-btn toggle"
                      :class="{ 'is-enabled': campus.status === 1 }"
                      @click="toggleCampusStatus(campus)"
                    >
                      {{ campus.status === 1 ? '禁用' : '启用' }}
                    </button>
                    <button class="action-btn edit" @click="openEditCampusModal(campus)">编辑</button>
                    <button class="action-btn delete" @click="openDeleteCampusConfirm(campus)">删除</button>
                  </div>
                </div>
              </div>
            </template>

            <!-- ==================== 宿舍楼管理 ==================== -->
            <template v-if="activeTab === 'building'">
              <div class="tab-header">
                <span class="tab-count">共 {{ buildings.length }} 栋宿舍楼</span>
                <button class="action-button primary" @click="openCreateBuildingModal">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  添加宿舍楼
                </button>
              </div>

              <!-- 空状态 -->
              <div v-if="buildings.length === 0" class="empty-container">
                <div class="empty-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="4" y="2" width="16" height="20" rx="2"></rect>
                    <line x1="9" y1="7" x2="15" y2="7"></line>
                    <line x1="9" y1="11" x2="15" y2="11"></line>
                    <line x1="9" y1="15" x2="15" y2="15"></line>
                  </svg>
                </div>
                <h2>暂无宿舍楼</h2>
                <p>{{ campuses.length === 0 ? '请先创建校区' : '还没有创建任何宿舍楼' }}</p>
                <button
                  v-if="campuses.length > 0"
                  class="empty-action-btn"
                  @click="openCreateBuildingModal"
                >
                  创建第一栋宿舍楼
                </button>
              </div>

              <!-- 宿舍楼列表 -->
              <div v-else class="items-list">
                <div v-for="building in buildings" :key="building.id" class="item-card">
                  <div class="item-info">
                    <div class="item-header">
                      <h3 class="item-name">{{ building.name }}</h3>
                      <span class="status-badge" :class="getStatusInfo(building.status).class">
                        {{ getStatusInfo(building.status).label }}
                      </span>
                    </div>
                    <div class="item-meta">
                      <span class="meta-item">{{ getCampusName(building.campusId) }}</span>
                      <span class="meta-divider">·</span>
                      <span class="meta-item">代码: {{ building.code }}</span>
                      <span class="meta-divider">·</span>
                      <span class="meta-item">{{ formatDate(building.createdAt) }}</span>
                    </div>
                  </div>
                  <div class="item-actions">
                    <button class="action-btn link" @click="openTimePeriodLinkModal(building)">时段</button>
                    <button
                      class="action-btn toggle"
                      :class="{ 'is-enabled': building.status === 1 }"
                      @click="toggleBuildingStatus(building)"
                    >
                      {{ building.status === 1 ? '禁用' : '启用' }}
                    </button>
                    <button class="action-btn edit" @click="openEditBuildingModal(building)">编辑</button>
                    <button class="action-btn delete" @click="openDeleteBuildingConfirm(building)">删除</button>
                  </div>
                </div>
              </div>
            </template>

            <!-- ==================== 铃声时段管理 ==================== -->
            <template v-if="activeTab === 'timePeriod'">
              <div class="tab-header">
                <span class="tab-count">共 {{ timePeriods.length }} 个时段</span>
                <button class="action-button primary" @click="openCreateTimePeriodModal">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  添加时段
                </button>
              </div>

              <!-- 空状态 -->
              <div v-if="timePeriods.length === 0" class="empty-container">
                <div class="empty-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                </div>
                <h2>暂无铃声时段</h2>
                <p>还没有创建任何铃声时段</p>
                <button class="empty-action-btn" @click="openCreateTimePeriodModal">创建第一个时段</button>
              </div>

              <!-- 铃声时段列表 -->
              <div v-else class="items-list">
                <div v-for="timePeriod in timePeriods" :key="timePeriod.id" class="item-card">
                  <div class="item-info">
                    <div class="item-header">
                      <h3 class="item-name">{{ timePeriod.name }}</h3>
                      <span class="status-badge" :class="getStatusInfo(timePeriod.status).class">
                        {{ getStatusInfo(timePeriod.status).label }}
                      </span>
                    </div>
                    <p v-if="timePeriod.description" class="item-desc">{{ timePeriod.description }}</p>
                    <div class="item-meta">
                      <span class="meta-item">代码: {{ timePeriod.code }}</span>
                      <span class="meta-divider">·</span>
                      <span class="meta-item">排序: {{ timePeriod.sortOrder }}</span>
                      <span class="meta-divider">·</span>
                      <span class="meta-item">{{ formatDate(timePeriod.createdAt) }}</span>
                    </div>
                  </div>
                  <div class="item-actions">
                    <button
                      class="action-btn toggle"
                      :class="{ 'is-enabled': timePeriod.status === 1 }"
                      @click="toggleTimePeriodStatus(timePeriod)"
                    >
                      {{ timePeriod.status === 1 ? '禁用' : '启用' }}
                    </button>
                    <button class="action-btn edit" @click="openEditTimePeriodModal(timePeriod)">编辑</button>
                    <button class="action-btn delete" @click="openDeleteTimePeriodConfirm(timePeriod)">删除</button>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </template>
      </div>
    </main>

    <PageFooter />

    <!-- ==================== 校区 Modal ==================== -->
    <Transition name="modal-fade">
      <div v-if="showCampusModal" class="modal-overlay" @click.self="closeCampusModal">
        <Transition name="modal-scale" appear>
          <div v-if="showCampusModal" class="modal-content" @click.stop>
            <h3 class="modal-title">{{ campusModalMode === 'create' ? '添加校区' : '编辑校区' }}</h3>
            <div class="form-group">
              <label class="form-label">校区名称</label>
              <input
                v-model="campusForm.name"
                type="text"
                class="form-input"
                placeholder="例如：南校区"
                maxlength="50"
              />
            </div>
            <div class="form-group">
              <label class="form-label">校区代码</label>
              <input
                v-model="campusForm.code"
                type="text"
                class="form-input"
                placeholder="例如：SOUTH"
                maxlength="20"
              />
            </div>
            <div class="modal-actions">
              <button class="modal-btn cancel" @click="closeCampusModal" :disabled="isSavingCampus">取消</button>
              <button class="modal-btn confirm" @click="saveCampus" :disabled="isSavingCampus">
                {{ isSavingCampus ? '保存中...' : '保存' }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>

    <!-- ==================== 宿舍楼 Modal ==================== -->
    <Transition name="modal-fade">
      <div v-if="showBuildingModal" class="modal-overlay" @click.self="closeBuildingModal">
        <Transition name="modal-scale" appear>
          <div v-if="showBuildingModal" class="modal-content" @click.stop>
            <h3 class="modal-title">{{ buildingModalMode === 'create' ? '添加宿舍楼' : '编辑宿舍楼' }}</h3>
            <div class="form-group">
              <label class="form-label">所属校区</label>
              <select v-model="buildingForm.campusId" class="form-select">
                <option v-for="campus in campuses" :key="campus.id" :value="campus.id">
                  {{ campus.name }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">宿舍楼名称</label>
              <input
                v-model="buildingForm.name"
                type="text"
                class="form-input"
                placeholder="例如：1号楼"
                maxlength="50"
              />
            </div>
            <div class="form-group">
              <label class="form-label">宿舍楼代码</label>
              <input
                v-model="buildingForm.code"
                type="text"
                class="form-input"
                placeholder="例如：B1"
                maxlength="20"
              />
            </div>
            <div class="modal-actions">
              <button class="modal-btn cancel" @click="closeBuildingModal" :disabled="isSavingBuilding">取消</button>
              <button class="modal-btn confirm" @click="saveBuilding" :disabled="isSavingBuilding">
                {{ isSavingBuilding ? '保存中...' : '保存' }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>

    <!-- ==================== 铃声时段 Modal ==================== -->
    <Transition name="modal-fade">
      <div v-if="showTimePeriodModal" class="modal-overlay" @click.self="closeTimePeriodModal">
        <Transition name="modal-scale" appear>
          <div v-if="showTimePeriodModal" class="modal-content" @click.stop>
            <h3 class="modal-title">{{ timePeriodModalMode === 'create' ? '添加铃声时段' : '编辑铃声时段' }}</h3>
            <div class="form-group">
              <label class="form-label">时段名称</label>
              <input
                v-model="timePeriodForm.name"
                type="text"
                class="form-input"
                placeholder="例如：起床铃"
                maxlength="50"
              />
            </div>
            <div class="form-group">
              <label class="form-label">时段代码</label>
              <input
                v-model="timePeriodForm.code"
                type="text"
                class="form-input"
                placeholder="例如：WAKE_UP"
                maxlength="20"
              />
            </div>
            <div class="form-group">
              <label class="form-label">时段描述</label>
              <textarea
                v-model="timePeriodForm.description"
                class="form-textarea"
                placeholder="例如：早上起床铃声"
                maxlength="200"
                rows="3"
              ></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">排序顺序</label>
              <input
                v-model.number="timePeriodForm.sortOrder"
                type="number"
                class="form-input"
                placeholder="数值越小越靠前"
              />
            </div>
            <div class="modal-actions">
              <button class="modal-btn cancel" @click="closeTimePeriodModal" :disabled="isSavingTimePeriod">取消</button>
              <button class="modal-btn confirm" @click="saveTimePeriod" :disabled="isSavingTimePeriod">
                {{ isSavingTimePeriod ? '保存中...' : '保存' }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>

    <!-- ==================== 时段关联 Modal ==================== -->
    <Transition name="modal-fade">
      <div v-if="showTimePeriodLinkModal" class="modal-overlay" @click.self="closeTimePeriodLinkModal">
        <Transition name="modal-scale" appear>
          <div v-if="showTimePeriodLinkModal" class="modal-content modal-lg" @click.stop>
            <h3 class="modal-title">管理铃声时段 - {{ linkingBuilding?.name }}</h3>
            <p class="modal-subtitle">选择该宿舍楼适用的铃声时段</p>

            <div v-if="isLoadingBuildingTimePeriods" class="modal-loading">
              <div class="loading-spinner"></div>
              <p>加载中...</p>
            </div>

            <div v-else class="time-period-list">
              <div
                v-for="tp in timePeriods"
                :key="tp.id"
                class="time-period-item"
                :class="{ 'is-linked': isTimePeriodLinked(tp.id) }"
                @click="toggleTimePeriodLink(tp)"
              >
                <div class="tp-info">
                  <span class="tp-name">{{ tp.name }}</span>
                  <span class="tp-code">{{ tp.code }}</span>
                </div>
                <div class="tp-check">
                  <svg v-if="isTimePeriodLinked(tp.id)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
              </div>
            </div>

            <div class="modal-actions">
              <button class="modal-btn cancel" @click="closeTimePeriodLinkModal">完成</button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>

    <!-- ==================== 删除确认 Modals ==================== -->
    <!-- 校区删除确认 -->
    <Transition name="modal-fade">
      <div v-if="showDeleteCampusConfirm" class="modal-overlay" @click.self="cancelDeleteCampus">
        <Transition name="modal-scale" appear>
          <div v-if="showDeleteCampusConfirm" class="modal-content" @click.stop>
            <h3 class="modal-title">确认删除</h3>
            <p class="modal-desc">
              确定要删除校区"{{ deleteCampusTarget?.name }}"吗？此操作不可撤销。
            </p>
            <div class="modal-actions">
              <button class="modal-btn cancel" @click="cancelDeleteCampus" :disabled="isDeletingCampus">取消</button>
              <button class="modal-btn confirm danger" @click="confirmDeleteCampus" :disabled="isDeletingCampus">
                {{ isDeletingCampus ? '删除中...' : '确认删除' }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>

    <!-- 宿舍楼删除确认 -->
    <Transition name="modal-fade">
      <div v-if="showDeleteBuildingConfirm" class="modal-overlay" @click.self="cancelDeleteBuilding">
        <Transition name="modal-scale" appear>
          <div v-if="showDeleteBuildingConfirm" class="modal-content" @click.stop>
            <h3 class="modal-title">确认删除</h3>
            <p class="modal-desc">
              确定要删除宿舍楼"{{ deleteBuildingTarget?.name }}"吗？此操作不可撤销。
            </p>
            <div class="modal-actions">
              <button class="modal-btn cancel" @click="cancelDeleteBuilding" :disabled="isDeletingBuilding">取消</button>
              <button class="modal-btn confirm danger" @click="confirmDeleteBuilding" :disabled="isDeletingBuilding">
                {{ isDeletingBuilding ? '删除中...' : '确认删除' }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>

    <!-- 铃声时段删除确认 -->
    <Transition name="modal-fade">
      <div v-if="showDeleteTimePeriodConfirm" class="modal-overlay" @click.self="cancelDeleteTimePeriod">
        <Transition name="modal-scale" appear>
          <div v-if="showDeleteTimePeriodConfirm" class="modal-content" @click.stop>
            <h3 class="modal-title">确认删除</h3>
            <p class="modal-desc">
              确定要删除铃声时段"{{ deleteTimePeriodTarget?.name }}"吗？此操作不可撤销。
            </p>
            <div class="modal-actions">
              <button class="modal-btn cancel" @click="cancelDeleteTimePeriod" :disabled="isDeletingTimePeriod">取消</button>
              <button class="modal-btn confirm danger" @click="confirmDeleteTimePeriod" :disabled="isDeletingTimePeriod">
                {{ isDeletingTimePeriod ? '删除中...' : '确认删除' }}
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

/* ===== Status Tabs ===== */
.status-tabs {
  position: relative;
  display: flex;
  gap: 2px;
  margin-bottom: var(--spacing-md);
  padding: 3px;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.status-tabs::-webkit-scrollbar {
  display: none;
}

.status-tab {
  flex: 1;
  min-width: 80px;
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: color 0.2s ease, background-color 0.3s ease, transform 0.2s ease;
  text-align: center;
  white-space: nowrap;
}

.status-tab:hover {
  color: var(--color-text);
}

.status-tab:active {
  transform: scale(0.95);
}

.status-tab.active {
  color: var(--color-primary);
  background: var(--color-primary-bg);
}

/* ===== Content Slide Animation ===== */
.content-slide-wrapper {
  animation-fill-mode: both;
}

.content-slide-wrapper.slide-left {
  animation: slideInFromRight 0.3s ease;
}

.content-slide-wrapper.slide-right {
  animation: slideInFromLeft 0.3s ease;
}

@keyframes slideInFromRight {
  from {
    opacity: 0;
    transform: translateX(30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideInFromLeft {
  from {
    opacity: 0;
    transform: translateX(-30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* ===== Tab Header ===== */
.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.tab-count {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.action-button {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.action-button svg {
  width: 14px;
  height: 14px;
}

.action-button.primary {
  background: var(--color-primary);
  color: white;
}

.action-button.primary:hover {
  background: var(--color-primary-dark);
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
  margin-bottom: var(--spacing-md);
}

.empty-action-btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: white;
  background: var(--color-primary);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.empty-action-btn:hover {
  background: var(--color-primary-dark);
}

/* ===== Items List ===== */
.items-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.item-card {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast);
}

.item-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: 4px;
  flex-wrap: wrap;
}

.item-name {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-desc {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-badge {
  font-size: 10px;
  font-weight: var(--font-semibold);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.status-badge.status-enabled {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.status-badge.status-disabled {
  background: var(--color-border);
  color: var(--color-text-tertiary);
}

.item-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
  flex-wrap: wrap;
}

.meta-divider {
  color: var(--color-border);
}

.item-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  flex-wrap: wrap;
}

.action-btn {
  padding: 4px 10px;
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.action-btn.toggle {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.action-btn.toggle:hover {
  background: var(--color-warning);
  color: white;
}

.action-btn.toggle.is-enabled {
  background: var(--color-border);
  color: var(--color-text-secondary);
}

.action-btn.toggle.is-enabled:hover {
  background: var(--color-text-secondary);
  color: white;
}

.action-btn.link {
  background: var(--color-info-bg);
  color: var(--color-info);
}

.action-btn.link:hover {
  background: var(--color-info);
  color: white;
}

.action-btn.edit {
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

.action-btn.edit:hover {
  background: var(--color-primary);
  color: white;
}

.action-btn.delete {
  background: var(--color-error-bg);
  color: var(--color-error);
}

.action-btn.delete:hover {
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
  max-height: 80vh;
  overflow-y: auto;
}

.modal-content.modal-lg {
  max-width: 500px;
}

.modal-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-sm);
}

.modal-subtitle {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-md);
}

.modal-desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-lg);
}

.modal-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--spacing-lg);
  color: var(--color-text-secondary);
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

/* ===== Form ===== */
.form-group {
  margin-bottom: var(--spacing-md);
}

.form-label {
  display: block;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  margin-bottom: var(--spacing-xs);
  color: var(--color-text);
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  color: var(--color-text);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-bg);
}

.form-input::placeholder,
.form-textarea::placeholder {
  color: var(--color-text-placeholder);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

/* ===== Time Period Link ===== */
.time-period-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-md);
}

.time-period-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.time-period-item:hover {
  border-color: var(--color-primary);
}

.time-period-item.is-linked {
  background: var(--color-primary-bg);
  border-color: var(--color-primary);
}

.tp-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tp-name {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.tp-code {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.tp-check {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
}

.tp-check svg {
  width: 16px;
  height: 16px;
}

/* ===== Desktop ===== */
@media (min-width: 768px) {
  .item-card {
    flex-direction: row;
    align-items: center;
  }

  .item-actions {
    flex-shrink: 0;
  }
}

@media (min-width: 1024px) {
  .breadcrumb-wrapper {
    display: block;
  }

  .page-content {
    padding: var(--spacing-xl);
  }

  .page-header-section {
    margin-bottom: var(--spacing-lg);
  }

  .header-main {
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-start;
  }

  .header-text {
    display: block;
  }

  .page-title {
    font-size: var(--text-2xl);
  }

  .page-subtitle {
    font-size: var(--text-base);
  }

  .status-tab {
    font-size: var(--text-sm);
    padding: var(--spacing-sm) var(--spacing-md);
  }

  .action-button {
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: var(--text-sm);
  }

  .action-button svg {
    width: 16px;
    height: 16px;
  }

  .item-name {
    font-size: var(--text-base);
  }

  .item-desc {
    font-size: var(--text-sm);
  }

  .item-meta {
    font-size: var(--text-sm);
  }

  .status-badge {
    font-size: var(--text-xs);
    padding: 3px 8px;
  }

  .action-btn {
    padding: 6px 14px;
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
