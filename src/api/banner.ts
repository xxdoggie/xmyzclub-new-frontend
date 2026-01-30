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
