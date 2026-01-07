import api from './index'
import type { ApiResponse } from './index'
import type {
  Message,
  MessagesResponse,
  UnreadCountResponse,
  GetMessagesParams,
  MessageType,
} from '@/types/message'

/**
 * 获取消息列表
 * GET /messages
 */
export function getMessages(params: GetMessagesParams = {}) {
  return api.get<ApiResponse<MessagesResponse>>('/messages', {
    params: {
      type: params.type,
      isRead: params.isRead,
      page: params.page || 1,
      size: params.size || 20,
    },
  })
}

/**
 * 获取未读消息数量
 * GET /messages/unread-count
 */
export function getUnreadCount() {
  return api.get<ApiResponse<UnreadCountResponse>>('/messages/unread-count')
}

/**
 * 获取消息详情
 * GET /messages/{id}
 */
export function getMessageDetail(id: number) {
  return api.get<ApiResponse<Message>>(`/messages/${id}`)
}

/**
 * 标记单条消息已读
 * PUT /messages/{id}/read
 */
export function markAsRead(id: number) {
  return api.put<ApiResponse<null>>(`/messages/${id}/read`)
}

/**
 * 标记所有消息已读
 * PUT /messages/read-all
 */
export function markAllAsRead(type?: MessageType) {
  return api.put<ApiResponse<{ message: string }>>('/messages/read-all', null, {
    params: type ? { type } : undefined,
  })
}

/**
 * 删除消息
 * DELETE /messages/{id}
 */
export function deleteMessage(id: number) {
  return api.delete<ApiResponse<null>>(`/messages/${id}`)
}
