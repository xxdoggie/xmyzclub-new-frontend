import api, { type ApiResponse } from './index'
import type {
  Moment,
  MomentDetail,
  GetMomentsParams,
  MomentsResponse,
  RejectMomentRequest,
  BatchMomentActionRequest,
} from '@/types/moment'

// ==================== 管理端接口 ====================

/**
 * 获取瞬间列表（分页）
 */
export async function adminGetMoments(params?: GetMomentsParams): Promise<MomentsResponse> {
  const response = await api.get<ApiResponse<MomentsResponse>>('/admin/museum/moments', { params })
  return response.data.data
}

/**
 * 获取瞬间详情
 */
export async function adminGetMoment(id: number): Promise<MomentDetail> {
  const response = await api.get<ApiResponse<MomentDetail>>(`/admin/museum/moments/${id}`)
  return response.data.data
}

/**
 * 审核通过
 */
export async function adminApproveMoment(id: number): Promise<void> {
  await api.post<ApiResponse<null>>(`/admin/museum/moments/${id}/approve`)
}

/**
 * 审核拒绝
 */
export async function adminRejectMoment(id: number, data: RejectMomentRequest): Promise<void> {
  await api.post<ApiResponse<null>>(`/admin/museum/moments/${id}/reject`, data)
}

/**
 * 下架瞬间
 */
export async function adminTakedownMoment(id: number, data: RejectMomentRequest): Promise<void> {
  await api.post<ApiResponse<null>>(`/admin/museum/moments/${id}/takedown`, data)
}

/**
 * 删除瞬间
 */
export async function adminDeleteMoment(id: number): Promise<void> {
  await api.delete<ApiResponse<null>>(`/admin/museum/moments/${id}`)
}

/**
 * 批量操作
 */
export async function adminBatchMomentAction(data: BatchMomentActionRequest): Promise<void> {
  await api.post<ApiResponse<null>>('/admin/museum/moments/batch', data)
}
