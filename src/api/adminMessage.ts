import api from './index'
import type { ApiResponse } from './index'
import type {
  MessageType,
  MessageTemplate,
  AdminMessage,
  AdminMessagesResponse,
  MessageStats,
  SendMessageRequest,
  BroadcastMessageRequest,
  CreateTemplateRequest,
  UpdateTemplateRequest,
} from '@/types/message'

// ==================== 模板管理 ====================

/**
 * 获取模板列表
 * GET /admin/messages/templates
 */
export function getTemplates(type?: MessageType, status?: number) {
  return api.get<ApiResponse<MessageTemplate[]>>('/admin/messages/templates', {
    params: { type, status },
  })
}

/**
 * 获取模板详情
 * GET /admin/messages/templates/{id}
 */
export function getTemplateDetail(id: number) {
  return api.get<ApiResponse<MessageTemplate>>(`/admin/messages/templates/${id}`)
}

/**
 * 根据代码获取模板
 * GET /admin/messages/templates/code/{code}
 */
export function getTemplateByCode(code: string) {
  return api.get<ApiResponse<MessageTemplate>>(`/admin/messages/templates/code/${code}`)
}

/**
 * 创建模板
 * POST /admin/messages/templates
 */
export function createTemplate(data: CreateTemplateRequest) {
  return api.post<ApiResponse<MessageTemplate>>('/admin/messages/templates', data)
}

/**
 * 更新模板
 * PUT /admin/messages/templates/{id}
 */
export function updateTemplate(id: number, data: UpdateTemplateRequest) {
  return api.put<ApiResponse<MessageTemplate>>(`/admin/messages/templates/${id}`, data)
}

/**
 * 删除模板
 * DELETE /admin/messages/templates/{id}
 */
export function deleteTemplate(id: number) {
  return api.delete<ApiResponse<null>>(`/admin/messages/templates/${id}`)
}

// ==================== 消息管理 ====================

/**
 * 获取消息列表（管理员）
 * GET /admin/messages
 */
export function getAdminMessages(params: {
  userId?: number
  type?: MessageType
  isRead?: boolean
  keyword?: string
  page?: number
  size?: number
} = {}) {
  return api.get<ApiResponse<AdminMessagesResponse>>('/admin/messages', {
    params: {
      userId: params.userId,
      type: params.type,
      isRead: params.isRead,
      keyword: params.keyword,
      page: params.page || 1,
      size: params.size || 20,
    },
  })
}

/**
 * 获取消息详情
 * GET /admin/messages/{id}
 */
export function getAdminMessageDetail(id: number) {
  return api.get<ApiResponse<AdminMessage>>(`/admin/messages/${id}`)
}

/**
 * 发送消息
 * POST /admin/messages/send
 */
export function sendMessage(data: SendMessageRequest) {
  return api.post<ApiResponse<string>>('/admin/messages/send', data)
}

/**
 * 广播消息
 * POST /admin/messages/broadcast
 */
export function broadcastMessage(data: BroadcastMessageRequest) {
  return api.post<ApiResponse<string>>('/admin/messages/broadcast', data)
}

/**
 * 使用模板发送消息
 * POST /admin/messages/send-by-template
 */
export function sendMessageByTemplate(
  templateCode: string,
  userIds: number[],
  variables: Record<string, string>,
  targetType?: string,
  targetId?: number
) {
  return api.post<ApiResponse<string>>(
    '/admin/messages/send-by-template',
    variables,
    {
      params: {
        templateCode,
        userIds: userIds.join(','),
        targetType,
        targetId,
      },
    }
  )
}

/**
 * 删除消息
 * DELETE /admin/messages/{id}
 */
export function deleteAdminMessage(id: number) {
  return api.delete<ApiResponse<null>>(`/admin/messages/${id}`)
}

/**
 * 批量删除消息
 * DELETE /admin/messages/batch
 */
export function batchDeleteMessages(ids: number[]) {
  return api.delete<ApiResponse<string>>('/admin/messages/batch', { data: ids })
}

// ==================== 统计 ====================

/**
 * 获取消息统计
 * GET /admin/messages/stats
 */
export function getMessageStats() {
  return api.get<ApiResponse<MessageStats>>('/admin/messages/stats')
}
