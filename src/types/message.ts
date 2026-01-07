// 消息类型
export type MessageType = 'ticket' | 'rating' | 'contribution' | 'system'

// 目标类型
export type MessageTargetType = 'ticket' | 'activity' | 'comment' | 'contribution' | ''

// 消息实体
export interface Message {
  id: number
  type: MessageType
  title: string
  content: string
  targetType: MessageTargetType
  targetId: number | null
  isRead: boolean
  createdAt: string
}

// 消息列表响应
export interface MessagesResponse {
  records: Message[]
  total: number
  size: number
  current: number
  pages: number
}

// 未读消息数量响应
export interface UnreadCountResponse {
  total: number
  ticket: number
  rating: number
  contribution: number
  system: number
}

// 消息列表请求参数
export interface GetMessagesParams {
  type?: MessageType
  isRead?: boolean
  page?: number
  size?: number
}

// ==================== 管理端类型 ====================

// 消息模板
export interface MessageTemplate {
  id: number
  code: string
  titleTemplate: string
  contentTemplate: string
  type: MessageType
  status: number
  createdAt: string
  updatedAt: string
}

// 管理端消息（包含用户信息）
export interface AdminMessage {
  id: number
  userId: number
  username: string
  type: MessageType
  title: string
  content: string
  targetType: MessageTargetType
  targetId: number | null
  isRead: boolean
  isDeleted: boolean
  createdAt: string
}

// 管理端消息列表响应
export interface AdminMessagesResponse {
  records: AdminMessage[]
  total: number
  current: number
  pages: number
}

// 消息统计
export interface MessageStats {
  totalMessages: number
  unreadMessages: number
  readMessages: number
  todaySent: number
  typeStats: {
    ticket: number
    rating: number
    contribution: number
    system: number
  }
}

// 发送消息请求
export interface SendMessageRequest {
  userIds: number[]
  type: MessageType
  title: string
  content: string
  targetType?: string | null
  targetId?: number | null
}

// 广播消息请求
export interface BroadcastMessageRequest {
  title: string
  content: string
  targetType?: string | null
  targetId?: number | null
}

// 创建模板请求
export interface CreateTemplateRequest {
  code: string
  titleTemplate: string
  contentTemplate: string
  type: MessageType
  status?: number
}

// 更新模板请求
export interface UpdateTemplateRequest {
  titleTemplate?: string
  contentTemplate?: string
  type?: MessageType
  status?: number
}
