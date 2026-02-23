import api, { type ApiResponse } from './index'
import type {
  Tag,
  TagRequest,
  GetTagsParams,
  Event,
  EventDetail,
  GetEventsParams,
  EventsResponse,
  CreateEventRequest,
  UpdateEventRequest,
  BatchEventActionRequest,
  Block,
  BlockRequest,
  Moment,
  MomentDetail,
  GetMomentsParams,
  MomentsResponse,
  RejectMomentRequest,
  BatchMomentActionRequest,
} from '@/types/museum'

// ==================== 标签管理 ====================

/**
 * 获取所有标签
 */
export async function adminGetTags(params?: GetTagsParams): Promise<Tag[]> {
  const response = await api.get<ApiResponse<Tag[]>>('/admin/museum/tags', { params })
  return response.data.data
}

/**
 * 创建标签
 */
export async function adminCreateTag(data: TagRequest): Promise<Tag> {
  const response = await api.post<ApiResponse<Tag>>('/admin/museum/tags', data)
  return response.data.data
}

/**
 * 更新标签
 */
export async function adminUpdateTag(id: number, data: Partial<TagRequest>): Promise<Tag> {
  const response = await api.put<ApiResponse<Tag>>(`/admin/museum/tags/${id}`, data)
  return response.data.data
}

/**
 * 删除标签
 */
export async function adminDeleteTag(id: number): Promise<void> {
  await api.delete<ApiResponse<null>>(`/admin/museum/tags/${id}`)
}

/**
 * 切换标签状态
 */
export async function adminToggleTagStatus(id: number): Promise<Tag> {
  const response = await api.post<ApiResponse<Tag>>(`/admin/museum/tags/${id}/toggle-status`)
  return response.data.data
}

/**
 * 批量更新标签排序
 */
export async function adminSortTags(ids: number[]): Promise<void> {
  await api.post<ApiResponse<null>>('/admin/museum/tags/sort', { ids })
}

// ==================== 活动管理 ====================

/**
 * 获取活动列表（分页）
 */
export async function adminGetEvents(params?: GetEventsParams): Promise<EventsResponse> {
  const response = await api.get<ApiResponse<EventsResponse>>('/admin/museum/events', { params })
  return response.data.data
}

/**
 * 获取活动详情
 */
export async function adminGetEvent(id: number): Promise<EventDetail> {
  const response = await api.get<ApiResponse<EventDetail>>(`/admin/museum/events/${id}`)
  return response.data.data
}

/**
 * 创建活动
 */
export async function adminCreateEvent(data: CreateEventRequest): Promise<Event> {
  const response = await api.post<ApiResponse<Event>>('/admin/museum/events', data)
  return response.data.data
}

/**
 * 更新活动
 */
export async function adminUpdateEvent(id: number, data: UpdateEventRequest): Promise<Event> {
  const response = await api.put<ApiResponse<Event>>(`/admin/museum/events/${id}`, data)
  return response.data.data
}

/**
 * 删除活动
 */
export async function adminDeleteEvent(id: number): Promise<void> {
  await api.delete<ApiResponse<null>>(`/admin/museum/events/${id}`)
}

/**
 * 发布活动
 */
export async function adminPublishEvent(id: number): Promise<void> {
  await api.post<ApiResponse<null>>(`/admin/museum/events/${id}/publish`)
}

/**
 * 下架活动
 */
export async function adminUnpublishEvent(id: number): Promise<void> {
  await api.post<ApiResponse<null>>(`/admin/museum/events/${id}/unpublish`)
}

/**
 * 设为精选
 */
export async function adminFeatureEvent(id: number): Promise<void> {
  await api.post<ApiResponse<null>>(`/admin/museum/events/${id}/feature`)
}

/**
 * 取消精选
 */
export async function adminUnfeatureEvent(id: number): Promise<void> {
  await api.post<ApiResponse<null>>(`/admin/museum/events/${id}/unfeature`)
}

/**
 * 批量操作活动
 */
export async function adminBatchEventAction(data: BatchEventActionRequest): Promise<void> {
  await api.post<ApiResponse<null>>('/admin/museum/events/batch', data)
}

// ==================== 内容模块管理 ====================

/**
 * 获取活动的所有内容模块
 */
export async function adminGetBlocks(eventId: number): Promise<Block[]> {
  const response = await api.get<ApiResponse<Block[]>>(`/admin/museum/events/${eventId}/blocks`)
  return response.data.data
}

/**
 * 添加内容模块
 */
export async function adminCreateBlock(eventId: number, data: BlockRequest): Promise<Block> {
  const response = await api.post<ApiResponse<Block>>(`/admin/museum/events/${eventId}/blocks`, data)
  return response.data.data
}

/**
 * 更新内容模块
 */
export async function adminUpdateBlock(eventId: number, blockId: number, data: Partial<BlockRequest>): Promise<Block> {
  const response = await api.put<ApiResponse<Block>>(`/admin/museum/events/${eventId}/blocks/${blockId}`, data)
  return response.data.data
}

/**
 * 删除内容模块
 */
export async function adminDeleteBlock(eventId: number, blockId: number): Promise<void> {
  await api.delete<ApiResponse<null>>(`/admin/museum/events/${eventId}/blocks/${blockId}`)
}

/**
 * 批量更新模块排序
 */
export async function adminSortBlocks(eventId: number, ids: number[]): Promise<void> {
  await api.post<ApiResponse<null>>(`/admin/museum/events/${eventId}/blocks/sort`, { ids })
}

// ==================== 瞬间管理 ====================

/**
 * 获取瞬间列表（分页）
 */
export async function adminGetMoments(params?: GetMomentsParams): Promise<MomentsResponse> {
  const response = await api.get<ApiResponse<MomentsResponse>>('/admin/museum/moments', { params })
  return response.data.data
}

/**
 * 获取瞬间详情
 */
export async function adminGetMoment(id: number): Promise<MomentDetail> {
  const response = await api.get<ApiResponse<MomentDetail>>(`/admin/museum/moments/${id}`)
  return response.data.data
}

/**
 * 审核通过
 */
export async function adminApproveMoment(id: number): Promise<void> {
  await api.post<ApiResponse<null>>(`/admin/museum/moments/${id}/approve`)
}

/**
 * 审核拒绝
 */
export async function adminRejectMoment(id: number, data: RejectMomentRequest): Promise<void> {
  await api.post<ApiResponse<null>>(`/admin/museum/moments/${id}/reject`, data)
}

/**
 * 下架瞬间
 */
export async function adminTakedownMoment(id: number, data: RejectMomentRequest): Promise<void> {
  await api.post<ApiResponse<null>>(`/admin/museum/moments/${id}/takedown`, data)
}

/**
 * 删除瞬间
 */
export async function adminDeleteMoment(id: number): Promise<void> {
  await api.delete<ApiResponse<null>>(`/admin/museum/moments/${id}`)
}

/**
 * 批量操作瞬间
 */
export async function adminBatchMomentAction(data: BatchMomentActionRequest): Promise<void> {
  await api.post<ApiResponse<null>>('/admin/museum/moments/batch', data)
}
