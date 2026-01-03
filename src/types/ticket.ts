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
 * waiting - 等待中（未到开始时间）
 * active - 进行中（可抢票）
 * ended - 已结束
 * cancelled - 已取消
 */
export type SessionStatus = 'waiting' | 'active' | 'ended' | 'cancelled'

/**
 * 活动状态
 * draft - 草稿
 * published - 已发布
 * active - 进行中
 * ended - 已结束
 * cancelled - 已取消
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
  config?: ActivityConfig
  status: ActivityStatus
  sessionCount: number
  totalTickets: number
  soldTickets: number
  createdBy: number
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
  totalTickets?: number
  soldTickets?: number
  sessions: ActivitySession[]
  createdBy?: number
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
 * pending - 待审核
 * confirmed - 已确认
 * used - 已使用
 * cancelled - 已取消
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
  confirmedBy?: number
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

// ==================== 管理端类型 ====================

/**
 * 创建活动请求
 */
export interface CreateActivityRequest {
  name: string
  description?: string
  imageUrl?: string
  config?: ActivityConfig
}

/**
 * 更新活动请求
 */
export interface UpdateActivityRequest {
  name?: string
  description?: string
  imageUrl?: string
  config?: Partial<ActivityConfig>
  status?: ActivityStatus
}

/**
 * 创建档期请求
 */
export interface CreateSessionRequest {
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
  status?: SessionStatus
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
 * 管理员活动列表响应
 */
export interface AdminActivitiesResponse {
  activities: TicketActivityListItem[]
  total: number
  page: number
  page_size: number
}

// ==================== 活动统计相关类型 ====================

/**
 * 档期统计信息
 */
export interface SessionStats {
  sessionId: number
  sessionName: string
  totalTickets: number
  soldTickets: number
  availableTickets: number
  status: SessionStatus
}

/**
 * 活动统计信息
 */
export interface ActivityStats {
  activityId: number
  totalSessions: number
  totalTickets: number
  grabbedTickets: number
  pendingTickets: number
  confirmedTickets: number
  usedTickets: number
}

// ==================== 审票相关类型 ====================

/**
 * 审票列表响应
 */
export interface ReviewTicketsResponse {
  tickets: AdminTicket[]
  total: number
  page: number
  page_size: number
}

/**
 * 审核票据请求
 */
export interface ReviewTicketRequest {
  action: 'approve' | 'reject'
  adminNote?: string
}

/**
 * 批量审核请求
 */
export interface BatchReviewRequest {
  ticketIds: number[]
  action: 'approve' | 'reject'
  adminNote?: string
}

/**
 * 批量审核响应
 */
export interface BatchReviewResponse {
  success_count: number
  failed_count: number
}

// ==================== 验票相关类型 ====================

/**
 * 验票查询响应（票据详情）
 */
export interface VerifyTicketResponse {
  id: number
  activityId: number
  activityName: string
  sessionId: number
  sessionName: string
  userId: number
  username: string
  nickname?: string
  ticketCode: string
  status: TicketStatus
  userInfo?: Record<string, string>
  createdAt: string
  confirmedAt?: string
  usedAt?: string
}

/**
 * 核销票据响应
 */
export interface UseTicketResponse {
  success: boolean
  message: string
  ticketId?: number
  activityName?: string
  sessionName?: string
  userName?: string
  usedAt?: string
}
