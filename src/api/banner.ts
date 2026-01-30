import api, { type ApiResponse } from './index'

/**
 * 轮播图数据结构
 */
export interface Banner {
  id: number
  title: string
  description: string
  imageUrl: string
  linkUrl: string
  linkType: 'none' | 'internal' | 'external'
  position: string
  sortOrder: number
  status: number
  startTime: string | null
  endTime: string | null
  createdBy: number
  createdAt: string
  updatedAt: string
}

/**
 * 获取轮播图列表参数
 */
export interface GetBannersParams {
  position?: string
}

/**
 * 获取轮播图列表
 * @param params 查询参数
 * @returns 轮播图列表
 */
export async function getBanners(params?: GetBannersParams): Promise<Banner[]> {
  const response = await api.get<ApiResponse<Banner[]>>('/banners', {
    params: {
      position: params?.position || 'home',
    },
  })
  return response.data.data
}

// ==================== 管理端接口 ====================

/**
 * 管理端获取轮播图列表参数
 */
export interface AdminGetBannersParams {
  position?: string
  status?: number // 0=禁用，1=启用
}

/**
 * 创建/更新轮播图请求体
 */
export interface BannerRequest {
  title?: string
  description?: string
  imageUrl?: string
  linkUrl?: string
  linkType?: 'none' | 'internal' | 'external'
  position?: string
  sortOrder?: number
  status?: number
  startTime?: string | null
  endTime?: string | null
}

/**
 * 创建轮播图请求体（必填字段）
 */
export interface CreateBannerRequest {
  title: string
  description?: string
  imageUrl: string
  linkUrl?: string
  linkType?: 'none' | 'internal' | 'external'
  position?: string
  sortOrder?: number
  startTime?: string | null
  endTime?: string | null
}

/**
 * 管理端 - 获取所有轮播图
 */
export async function adminGetBanners(params?: AdminGetBannersParams): Promise<Banner[]> {
  const response = await api.get<ApiResponse<Banner[]>>('/admin/banners', { params })
  return response.data.data
}

/**
 * 管理端 - 获取轮播图详情
 */
export async function adminGetBanner(id: number): Promise<Banner> {
  const response = await api.get<ApiResponse<Banner>>(`/admin/banners/${id}`)
  return response.data.data
}

/**
 * 管理端 - 创建轮播图
 */
export async function adminCreateBanner(data: CreateBannerRequest): Promise<Banner> {
  const response = await api.post<ApiResponse<Banner>>('/admin/banners', data)
  return response.data.data
}

/**
 * 管理端 - 更新轮播图
 */
export async function adminUpdateBanner(id: number, data: BannerRequest): Promise<Banner> {
  const response = await api.put<ApiResponse<Banner>>(`/admin/banners/${id}`, data)
  return response.data.data
}

/**
 * 管理端 - 删除轮播图
 */
export async function adminDeleteBanner(id: number): Promise<void> {
  await api.delete<ApiResponse<null>>(`/admin/banners/${id}`)
}

/**
 * 管理端 - 切换启用/禁用状态
 */
export async function adminToggleBannerStatus(id: number): Promise<Banner> {
  const response = await api.post<ApiResponse<Banner>>(`/admin/banners/${id}/toggle-status`)
  return response.data.data
}

/**
 * 管理端 - 批量更新排序
 * @param ids 按顺序排列的轮播图ID数组
 */
export async function adminUpdateBannerSort(ids: number[]): Promise<void> {
  await api.post<ApiResponse<null>>('/admin/banners/sort', ids)
}
