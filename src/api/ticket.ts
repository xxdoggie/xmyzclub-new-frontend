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
  AdminTicketsResponse,
  UpdateTicketStatusRequest,
  ActivitySession,
  TicketStatus,
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

/**
 * 管理员 - 获取活动列表
 */
export function getAdminActivities(page = 1, pageSize = 10, status?: string) {
  return api.get<ApiResponse<AdminActivitiesResponse>>('/admin/ticket-activities', {
    params: { page, pageSize, status },
  })
}

/**
 * 管理员 - 获取活动详情
 */
export function getAdminActivityDetail(id: number) {
  return api.get<ApiResponse<TicketActivityDetail>>(`/admin/ticket-activities/${id}`)
}

/**
 * 管理员 - 创建活动
 */
export function createActivity(data: CreateActivityRequest) {
  return api.post<ApiResponse<TicketActivityDetail>>('/admin/ticket-activities', data)
}

/**
 * 管理员 - 更新活动
 */
export function updateActivity(id: number, data: UpdateActivityRequest) {
  return api.put<ApiResponse<TicketActivityDetail>>(`/admin/ticket-activities/${id}`, data)
}

/**
 * 管理员 - 删除活动
 */
export function deleteActivity(id: number) {
  return api.delete<ApiResponse<{ message: string }>>(`/admin/ticket-activities/${id}`)
}

/**
 * 管理员 - 更新活动状态
 */
export function updateActivityStatus(id: number, status: string) {
  return api.patch<ApiResponse<TicketActivityDetail>>(`/admin/ticket-activities/${id}/status`, { status })
}

/**
 * 管理员 - 创建档期
 */
export function createSession(data: CreateSessionRequest) {
  return api.post<ApiResponse<ActivitySession>>('/admin/activity-sessions', data)
}

/**
 * 管理员 - 更新档期
 */
export function updateSession(id: number, data: UpdateSessionRequest) {
  return api.put<ApiResponse<ActivitySession>>(`/admin/activity-sessions/${id}`, data)
}

/**
 * 管理员 - 删除档期
 */
export function deleteSession(id: number) {
  return api.delete<ApiResponse<{ message: string }>>(`/admin/activity-sessions/${id}`)
}

/**
 * 管理员 - 更新档期状态
 */
export function updateSessionStatus(id: number, status: string) {
  return api.patch<ApiResponse<ActivitySession>>(`/admin/activity-sessions/${id}/status`, { status })
}

/**
 * 管理员 - 获取活动票据列表
 */
export function getAdminTickets(activityId: number, page = 1, pageSize = 20, status?: TicketStatus) {
  return api.get<ApiResponse<AdminTicketsResponse>>(`/admin/ticket-activities/${activityId}/tickets`, {
    params: { page, pageSize, status },
  })
}

/**
 * 管理员 - 更新票据状态
 */
export function updateTicketStatus(ticketId: number, data: UpdateTicketStatusRequest) {
  return api.patch<ApiResponse<{ message: string }>>(`/admin/tickets/${ticketId}/status`, data)
}

/**
 * 管理员 - 批量确认票据
 */
export function batchConfirmTickets(ticketIds: number[]) {
  return api.post<ApiResponse<{ message: string; confirmed: number }>>('/admin/tickets/batch-confirm', { ticketIds })
}
