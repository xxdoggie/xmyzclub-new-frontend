/**
 * 活动配置
 */
export interface ActivityConfig {
  require_campus_binding: boolean
  require_extra_info: boolean
  extra_info_fields: ExtraInfoField[]
  require_approval: boolean
  max_tickets_per_user: number
  auto_confirm_tickets: boolean
}

/**
 * 额外信息字段配置
 */
export interface ExtraInfoField {
  name: string
  label: string
  type: 'text' | 'number' | 'email' | 'phone' | 'textarea'
  required: boolean
}

/**
 * 活动档期
 */
export interface ActivitySession {
  id: number
  activityId: number
  name: string
  description?: string
  startTime: string
  endTime: string
  totalTickets: number
  availableTickets: number
  status: SessionStatus
  isActive: boolean
  canGrab: boolean
  createdAt?: string
  updatedAt?: string
}

/**
 * 档期状态
 */
export type SessionStatus = 'waiting' | 'active' | 'ended' | 'cancelled'

/**
 * 活动状态
 */
export type ActivityStatus = 'draft' | 'published' | 'active' | 'ended' | 'cancelled'

/**
 * 活动列表项（简要信息）
 */
export interface TicketActivityListItem {
  id: number
  name: string
  description?: string
  imageUrl?: string
  status: ActivityStatus
  sessionCount: number
  createdAt: string
  updatedAt: string
}

/**
 * 活动详情（完整信息）
 */
export interface TicketActivityDetail {
  id: number
  name: string
  description?: string
  imageUrl?: string
  config: ActivityConfig
  status: ActivityStatus
  sessionCount: number
  sessions: ActivitySession[]
  createdAt: string
  updatedAt: string
}

/**
 * 活动列表响应
 */
export interface TicketActivityListResponse {
  activities: TicketActivityListItem[]
  total: number
  page: number
  page_size: number
}

/**
 * 票据状态
 */
export type TicketStatus = 'pending' | 'confirmed' | 'used' | 'cancelled'

/**
 * 票据信息
 */
export interface Ticket {
  id: number
  activityId: number
  activityName: string
  sessionId: number
  sessionName: string
  ticketCode: string
  status: TicketStatus
  userInfo?: Record<string, string>
  adminNote?: string
  createdAt: string
  confirmedAt?: string
  usedAt?: string
}

/**
 * 我的票据列表响应
 */
export interface MyTicketsResponse {
  tickets: Ticket[]
}

/**
 * 抢票请求
 */
export interface GrabTicketRequest {
  sessionId: number
  userInfo?: Record<string, string>
}

/**
 * 抢票响应
 */
export interface GrabTicketResponse {
  success: boolean
  message: string
  ticketCode?: string
  ticketId?: number
}

// ==================== Admin Types ====================

/**
 * 创建活动请求
 */
export interface CreateActivityRequest {
  name: string
  description?: string
  imageUrl?: string
  config: ActivityConfig
}

/**
 * 更新活动请求
 */
export interface UpdateActivityRequest {
  name?: string
  description?: string
  imageUrl?: string
  config?: Partial<ActivityConfig>
}

/**
 * 创建档期请求
 */
export interface CreateSessionRequest {
  activityId: number
  name: string
  description?: string
  startTime: string
  endTime: string
  totalTickets: number
}

/**
 * 更新档期请求
 */
export interface UpdateSessionRequest {
  name?: string
  description?: string
  startTime?: string
  endTime?: string
  totalTickets?: number
}

/**
 * 管理员票据信息（包含用户信息）
 */
export interface AdminTicket extends Ticket {
  userId: number
  username: string
  nickname?: string
}

/**
 * 管理员票据列表响应
 */
export interface AdminTicketsResponse {
  tickets: AdminTicket[]
  total: number
  page: number
  pageSize: number
}

/**
 * 更新票据状态请求
 */
export interface UpdateTicketStatusRequest {
  status: TicketStatus
  adminNote?: string
}

/**
 * 管理员活动列表响应
 */
export interface AdminActivitiesResponse {
  activities: TicketActivityListItem[]
  total: number
  page: number
  pageSize: number
}
