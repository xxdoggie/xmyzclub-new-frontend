import api from './index'
import type { ApiResponse } from './index'
import type {
  TicketActivityListResponse,
  TicketActivityDetail,
  MyTicketsResponse,
  GrabTicketRequest,
  GrabTicketResponse,
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
