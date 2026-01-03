import api from './index'
import type { ApiResponse } from './index'
import type {
  TicketActivityListResponse,
  TicketActivityDetail,
  MyTicketsResponse,
  GrabTicketRequest,
  GrabTicketResponse,
  CreateActivityRequest,
  UpdateActivityRequest,
  CreateSessionRequest,
  UpdateSessionRequest,
  AdminActivitiesResponse,
  ActivitySession,
  ActivityStats,
  ReviewTicketsResponse,
  ReviewTicketRequest,
  BatchReviewRequest,
  BatchReviewResponse,
  VerifyTicketResponse,
  UseTicketResponse,
} from '@/types/ticket'

// ==================== 用户端 API ====================

/**
 * 获取公开活动列表
 */
export function getTicketActivities(page = 1, pageSize = 10) {
  return api.get<ApiResponse<TicketActivityListResponse>>('/ticket-activities', {
    params: { page, pageSize },
  })
}

/**
 * 获取活动详情
 */
export function getTicketActivityDetail(id: number) {
  return api.get<ApiResponse<TicketActivityDetail>>(`/ticket-activities/${id}`)
}

/**
 * 抢票
 */
export function grabTicket(data: GrabTicketRequest) {
  return api.post<ApiResponse<GrabTicketResponse>>('/tickets/grab', data)
}

/**
 * 获取我的所有票据
 */
export function getMyTickets() {
  return api.get<ApiResponse<MyTicketsResponse>>('/tickets/my')
}

/**
 * 获取我在某活动的票据
 */
export function getMyTicketsForActivity(activityId: number) {
  return api.get<ApiResponse<MyTicketsResponse>>(`/tickets/my/activity/${activityId}`)
}

// ==================== 管理端 API ====================
// 基础路径：/api/v2/admin/ticket

/**
 * 管理员 - 获取活动列表
 * GET /activities
 */
export function getAdminActivities(page = 1, pageSize = 10, status?: string) {
  return api.get<ApiResponse<AdminActivitiesResponse>>('/admin/ticket/activities', {
    params: { page, pageSize, status },
  })
}

/**
 * 管理员 - 获取活动详情（用于编辑）
 * GET /activities/{id}
 */
export function getAdminActivityDetail(id: number) {
  return api.get<ApiResponse<TicketActivityDetail>>(`/admin/ticket/activities/${id}`)
}

/**
 * 管理员 - 创建活动
 * POST /activities
 */
export function createActivity(data: CreateActivityRequest) {
  return api.post<ApiResponse<TicketActivityDetail>>('/admin/ticket/activities', data)
}

/**
 * 管理员 - 更新活动
 * PUT /activities/{id}
 */
export function updateActivity(id: number, data: UpdateActivityRequest) {
  return api.put<ApiResponse<TicketActivityDetail>>(`/admin/ticket/activities/${id}`, data)
}

/**
 * 管理员 - 删除活动
 * DELETE /activities/{id}
 */
export function deleteActivity(id: number) {
  return api.delete<ApiResponse<{ message: string }>>(`/admin/ticket/activities/${id}`)
}

/**
 * 管理员 - 获取活动统计
 * GET /activities/{id}/stats
 */
export function getActivityStats(id: number) {
  return api.get<ApiResponse<ActivityStats>>(`/admin/ticket/activities/${id}/stats`)
}

// ==================== 档期管理 ====================

/**
 * 管理员 - 创建档期
 * POST /activities/{activityId}/sessions
 */
export function createSession(activityId: number, data: CreateSessionRequest) {
  return api.post<ApiResponse<ActivitySession>>(`/admin/ticket/activities/${activityId}/sessions`, data)
}

/**
 * 管理员 - 更新档期
 * PUT /sessions/{id}
 */
export function updateSession(id: number, data: UpdateSessionRequest) {
  return api.put<ApiResponse<ActivitySession>>(`/admin/ticket/sessions/${id}`, data)
}

/**
 * 管理员 - 删除档期
 * DELETE /sessions/{id}
 */
export function deleteSession(id: number) {
  return api.delete<ApiResponse<{ message: string }>>(`/admin/ticket/sessions/${id}`)
}

// ==================== 审票管理 ====================

/**
 * 管理员 - 获取审票列表
 * GET /activities/{activityId}/review
 */
export function getReviewTickets(activityId: number, page = 1, pageSize = 10, status?: string) {
  return api.get<ApiResponse<ReviewTicketsResponse>>(`/admin/ticket/activities/${activityId}/review`, {
    params: { page, pageSize, status },
  })
}

/**
 * 管理员 - 审核单个票据
 * POST /tickets/{ticketId}/review
 */
export function reviewTicket(ticketId: number, data: ReviewTicketRequest) {
  return api.post<ApiResponse<{ message: string }>>(`/admin/ticket/tickets/${ticketId}/review`, data)
}

/**
 * 管理员 - 批量审核票据
 * POST /tickets/batch-review
 */
export function batchReviewTickets(data: BatchReviewRequest) {
  return api.post<ApiResponse<BatchReviewResponse>>('/admin/ticket/tickets/batch-review', data)
}

// ==================== 验票管理 ====================

/**
 * 管理员 - 根据票码查询票据
 * GET /verify?code=xxx
 */
export function verifyTicket(code: string) {
  return api.get<ApiResponse<VerifyTicketResponse>>('/admin/ticket/verify', {
    params: { code },
  })
}

/**
 * 管理员 - 核销票据（使用）
 * POST /verify/use
 */
export function useTicket(ticketCode: string) {
  return api.post<ApiResponse<UseTicketResponse>>('/admin/ticket/verify/use', { ticketCode })
}
