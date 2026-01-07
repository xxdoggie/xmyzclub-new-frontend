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
