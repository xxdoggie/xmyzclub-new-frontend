/**
 * 宿舍管理相关类型定义
 */

// ==================== 校区 (Campus) ====================

/**
 * 校区信息
 */
export interface Campus {
  id: number
  name: string
  code: string
  status: number // 1=启用, 0=禁用
  createdAt: string
  updatedAt: string
}

/**
 * 创建校区请求
 */
export interface CreateCampusRequest {
  name: string
  code: string
}

/**
 * 更新校区请求
 */
export interface UpdateCampusRequest {
  name?: string
  code?: string
  status?: number
}

// ==================== 宿舍楼 (Building) ====================

/**
 * 宿舍楼信息
 */
export interface Building {
  id: number
  campusId: number
  name: string
  code: string
  status: number // 1=启用, 0=禁用
  campus: Campus | null
  createdAt: string
  updatedAt: string
}

/**
 * 创建宿舍楼请求
 */
export interface CreateBuildingRequest {
  campusId: number
  name: string
  code: string
}

/**
 * 更新宿舍楼请求
 */
export interface UpdateBuildingRequest {
  campusId?: number
  name?: string
  code?: string
  status?: number
}

/**
 * 宿舍楼-时段关联请求
 */
export interface BuildingTimePeriodRequest {
  buildingId: number
  timePeriodId: number
}

// ==================== 铃声时段 (TimePeriod) ====================

/**
 * 铃声时段信息
 */
export interface TimePeriod {
  id: number
  name: string
  code: string
  description: string
  sortOrder: number
  status: number // 1=启用, 0=禁用
  createdAt: string
  updatedAt: string
}

/**
 * 创建铃声时段请求
 */
export interface CreateTimePeriodRequest {
  name: string
  code: string
  description?: string
  sortOrder?: number
}

/**
 * 更新铃声时段请求
 */
export interface UpdateTimePeriodRequest {
  name?: string
  code?: string
  description?: string
  sortOrder?: number
  status?: number
}

// ==================== 通用类型 ====================

/**
 * 状态枚举
 */
export type EntityStatus = 0 | 1

/**
 * 状态信息
 */
export interface StatusInfo {
  label: string
  class: string
}

/**
 * 获取状态信息的辅助函数类型
 */
export function getStatusInfo(status: number): StatusInfo {
  return status === 1
    ? { label: '启用', class: 'status-enabled' }
    : { label: '禁用', class: 'status-disabled' }
}
