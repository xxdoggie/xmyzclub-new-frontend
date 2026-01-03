import api from './index'
import type { ApiResponse } from './index'
import type {
  Campaign,
  CampaignStage,
  SubmissionGroup,
  VotingResultResponse,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  StageOperationRequest,
  ReviewSubmissionRequest,
  DeleteSubmissionRequest,
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
 * 获取所有活动（管理端）
 */
export function getAdminCampaigns() {
  return api.get<ApiResponse<Campaign[]>>('/admin/campaigns')
}

/**
 * 获取活动详情（管理端）
 */
export function getAdminCampaignDetail(id: number) {
  return api.get<ApiResponse<Campaign>>(`/admin/campaigns/${id}`)
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
 * 阶段操作（开始/结束/下一阶段）
 */
export function stageOperation(id: number, data: StageOperationRequest) {
  return api.post<ApiResponse<Campaign>>(`/admin/campaigns/${id}/stage-operation`, data)
}

// ----- 审核管理 -----

/**
 * 获取待审核投稿（按音乐分组）
 */
export function getReviewSubmissions(campaignId: number) {
  return api.get<ApiResponse<SubmissionGroup[]>>(`/admin/review/campaigns/${campaignId}/submissions`)
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
 * 获取投票结果
 */
export function getVotingResults(campaignId: number) {
  return api.get<ApiResponse<VotingResultResponse>>(`/admin/voting/campaigns/${campaignId}/results`)
}
