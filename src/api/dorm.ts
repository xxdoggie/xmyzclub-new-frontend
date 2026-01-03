import api from './index'
import type { ApiResponse } from './index'
import type {
  Campus,
  Building,
  TimePeriod,
  CreateCampusRequest,
  UpdateCampusRequest,
  CreateBuildingRequest,
  UpdateBuildingRequest,
  BuildingTimePeriodRequest,
  CreateTimePeriodRequest,
  UpdateTimePeriodRequest,
} from '@/types/dorm'
import type { Campaign } from '@/types/campaign'

// ==================== 用户端 API ====================

// ----- 校区 -----

/**
 * 获取所有校区
 */
export function getCampuses() {
  return api.get<ApiResponse<Campus[]>>('/campuses')
}

/**
 * 获取校区详情
 */
export function getCampusDetail(id: number) {
  return api.get<ApiResponse<Campus>>(`/campuses/${id}`)
}

/**
 * 获取校区的宿舍楼
 */
export function getCampusBuildings(id: number) {
  return api.get<ApiResponse<Building[]>>(`/campuses/${id}/buildings`)
}

/**
 * 获取校区的活动
 */
export function getCampusCampaigns(id: number) {
  return api.get<ApiResponse<Campaign[]>>(`/campuses/${id}/campaigns`)
}

// ----- 宿舍楼 -----

/**
 * 获取所有宿舍楼
 */
export function getBuildings(campusId?: number) {
  return api.get<ApiResponse<Building[]>>('/buildings', {
    params: campusId ? { campusId } : undefined,
  })
}

/**
 * 获取宿舍楼详情
 */
export function getBuildingDetail(id: number) {
  return api.get<ApiResponse<Building>>(`/buildings/${id}`)
}

/**
 * 获取宿舍楼的铃声时段
 */
export function getBuildingTimePeriods(id: number) {
  return api.get<ApiResponse<TimePeriod[]>>(`/buildings/${id}/time-periods`)
}

// ----- 铃声时段 -----

/**
 * 获取所有铃声时段
 */
export function getTimePeriods() {
  return api.get<ApiResponse<TimePeriod[]>>('/time-periods')
}

/**
 * 获取铃声时段详情
 */
export function getTimePeriodDetail(id: number) {
  return api.get<ApiResponse<TimePeriod>>(`/time-periods/${id}`)
}

// ==================== 管理端 API ====================

// ----- 校区管理 -----

/**
 * 创建校区
 */
export function createCampus(data: CreateCampusRequest) {
  return api.post<ApiResponse<Campus>>('/admin/campuses', data)
}

/**
 * 更新校区
 */
export function updateCampus(id: number, data: UpdateCampusRequest) {
  return api.put<ApiResponse<Campus>>(`/admin/campuses/${id}`, data)
}

/**
 * 删除校区
 */
export function deleteCampus(id: number) {
  return api.delete<ApiResponse<null>>(`/admin/campuses/${id}`)
}

// ----- 宿舍楼管理 -----

/**
 * 创建宿舍楼
 */
export function createBuilding(data: CreateBuildingRequest) {
  return api.post<ApiResponse<Building>>('/admin/buildings', data)
}

/**
 * 更新宿舍楼
 */
export function updateBuilding(id: number, data: UpdateBuildingRequest) {
  return api.put<ApiResponse<Building>>(`/admin/buildings/${id}`, data)
}

/**
 * 删除宿舍楼
 */
export function deleteBuilding(id: number) {
  return api.delete<ApiResponse<null>>(`/admin/buildings/${id}`)
}

/**
 * 为宿舍楼添加铃声时段
 */
export function addBuildingTimePeriod(data: BuildingTimePeriodRequest) {
  return api.post<ApiResponse<null>>('/admin/buildings/time-periods', data)
}

/**
 * 从宿舍楼移除铃声时段
 */
export function removeBuildingTimePeriod(data: BuildingTimePeriodRequest) {
  return api.delete<ApiResponse<null>>('/admin/buildings/time-periods', { data })
}

// ----- 铃声时段管理 -----

/**
 * 创建铃声时段
 */
export function createTimePeriod(data: CreateTimePeriodRequest) {
  return api.post<ApiResponse<TimePeriod>>('/admin/time-periods', data)
}

/**
 * 更新铃声时段
 */
export function updateTimePeriod(id: number, data: UpdateTimePeriodRequest) {
  return api.put<ApiResponse<TimePeriod>>(`/admin/time-periods/${id}`, data)
}

/**
 * 删除铃声时段
 */
export function deleteTimePeriod(id: number) {
  return api.delete<ApiResponse<null>>(`/admin/time-periods/${id}`)
}
