import api from './index'
import type { ApiResponse } from './index'
import type {
  Campaign,
  TimePeriodSubmissions,
  TimePeriodVotingResult,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  StageOperationRequest,
  ReviewSubmissionRequest,
  DeleteSubmissionRequest,
  ProgressResponse,
} from '@/types/campaign'

// ==================== 用户端 API ====================

/**
 * 获取活动列表
 */
export function getCampaigns() {
  return api.get<ApiResponse<Campaign[]>>('/campaigns')
}

/**
 * 获取活动详情
 */
export function getCampaignDetail(id: number) {
  return api.get<ApiResponse<Campaign>>(`/campaigns/${id}`)
}

// ==================== 管理端 API ====================

// ----- 活动管理 -----

/**
 * 获取所有活动列表（管理端，不包含 archived）
 */
export function getAdminCampaigns() {
  return api.get<ApiResponse<Campaign[]>>('/admin/campaigns')
}

/**
 * 创建活动
 */
export function createCampaign(data: CreateCampaignRequest) {
  return api.post<ApiResponse<Campaign>>('/admin/campaigns', data)
}

/**
 * 更新活动
 */
export function updateCampaign(id: number, data: UpdateCampaignRequest) {
  return api.put<ApiResponse<Campaign>>(`/admin/campaigns/${id}`, data)
}

/**
 * 删除活动
 */
export function deleteCampaign(id: number) {
  return api.delete<ApiResponse<null>>(`/admin/campaigns/${id}`)
}

/**
 * 开始活动 - 将活动状态设为 active，并激活第一个阶段
 */
export function activateCampaign(id: number) {
  return api.post<ApiResponse<Campaign>>(`/admin/campaigns/${id}/activate`)
}

/**
 * 关闭活动 - 将活动状态设为 closed
 */
export function closeCampaign(id: number) {
  return api.post<ApiResponse<Campaign>>(`/admin/campaigns/${id}/close`)
}

/**
 * 阶段操作（next/previous/activate）
 */
export function stageOperation(id: number, data: StageOperationRequest) {
  return api.post<ApiResponse<Campaign>>(`/admin/campaigns/${id}/stage-operation`, data)
}

// ----- 审核管理 -----

/**
 * 获取待审核投稿（按时段分组）
 */
export function getReviewSubmissions(campaignId: number) {
  return api.get<ApiResponse<TimePeriodSubmissions[]>>(`/admin/review/campaigns/${campaignId}/submissions`)
}

/**
 * 批量审核投稿
 */
export function reviewSubmissions(data: ReviewSubmissionRequest) {
  return api.post<ApiResponse<null>>('/admin/review/submissions', data)
}

/**
 * 删除投稿
 */
export function deleteSubmissions(data: DeleteSubmissionRequest) {
  return api.delete<ApiResponse<null>>('/admin/review/submissions', { data })
}

// ----- 投票结果 -----

/**
 * 获取投票结果（按时段和宿舍楼分组）
 */
export function getVotingResults(campaignId: number) {
  return api.get<ApiResponse<TimePeriodVotingResult[]>>(`/admin/voting/campaigns/${campaignId}/results`)
}

// ==================== 用户端进度 API ====================

/**
 * 获取投稿进度和限制信息
 */
export function getSubmissionProgress(campaignId: number) {
  return api.get<ApiResponse<ProgressResponse>>(`/submissions/campaigns/${campaignId}/progress`)
}

/**
 * 获取投票进度和限制信息
 */
export function getVotingProgress(campaignId: number) {
  return api.get<ApiResponse<ProgressResponse>>(`/voting/campaigns/${campaignId}/progress`)
}
