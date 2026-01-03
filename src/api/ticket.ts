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
} from '@/types/ticket'

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

// ==================== Admin APIs ====================
// 基础路径：/admin/ticket

/**
 * 管理员 - 获取活动列表
 */
export function getAdminActivities(page = 1, pageSize = 10, status?: string) {
  return api.get<ApiResponse<AdminActivitiesResponse>>('/admin/ticket/activities', {
    params: { page, pageSize, status },
  })
}

/**
 * 管理员 - 获取活动详情
 */
export function getAdminActivityDetail(id: number) {
  return api.get<ApiResponse<TicketActivityDetail>>(`/admin/ticket/activities/${id}`)
}

/**
 * 管理员 - 创建活动
 */
export function createActivity(data: CreateActivityRequest) {
  return api.post<ApiResponse<TicketActivityDetail>>('/admin/ticket/activities', data)
}

/**
 * 管理员 - 更新活动
 */
export function updateActivity(id: number, data: UpdateActivityRequest) {
  return api.put<ApiResponse<TicketActivityDetail>>(`/admin/ticket/activities/${id}`, data)
}

/**
 * 管理员 - 删除活动
 */
export function deleteActivity(id: number) {
  return api.delete<ApiResponse<{ message: string }>>(`/admin/ticket/activities/${id}`)
}

/**
 * 管理员 - 更新活动状态
 */
export function updateActivityStatus(id: number, status: string) {
  return api.patch<ApiResponse<TicketActivityDetail>>(`/admin/ticket/activities/${id}/status`, { status })
}

/**
 * 管理员 - 创建档期
 */
export function createSession(activityId: number, data: CreateSessionRequest) {
  return api.post<ApiResponse<ActivitySession>>(`/admin/ticket/activities/${activityId}/sessions`, data)
}

/**
 * 管理员 - 更新档期
 */
export function updateSession(id: number, data: UpdateSessionRequest) {
  return api.put<ApiResponse<ActivitySession>>(`/admin/ticket/sessions/${id}`, data)
}

/**
 * 管理员 - 删除档期
 */
export function deleteSession(id: number) {
  return api.delete<ApiResponse<{ message: string }>>(`/admin/ticket/sessions/${id}`)
}

/**
 * 管理员 - 审核活动
 */
export function reviewActivity(activityId: number, data: { approved: boolean; reason?: string }) {
  return api.post<ApiResponse<TicketActivityDetail>>(`/admin/ticket/activities/${activityId}/review`, data)
}

/**
 * 管理员 - 审核票据
 */
export function reviewTicket(ticketId: number, data: { approved: boolean; reason?: string }) {
  return api.post<ApiResponse<{ message: string }>>(`/admin/ticket/tickets/${ticketId}/review`, data)
}

/**
 * 管理员 - 批量审核票据
 */
export function batchReviewTickets(data: { ticketIds: number[]; approved: boolean; reason?: string }) {
  return api.post<ApiResponse<{ message: string; processed: number }>>('/admin/ticket/tickets/batch-review', data)
}

/**
 * 管理员 - 验票（查询票据信息）
 */
export function verifyTicket(code: string) {
  return api.get<ApiResponse<{ ticket: unknown }>>('/admin/ticket/verify', {
    params: { code },
  })
}

/**
 * 管理员 - 核销票据
 */
export function useTicket(code: string) {
  return api.post<ApiResponse<{ message: string }>>('/admin/ticket/verify/use', { code })
}
