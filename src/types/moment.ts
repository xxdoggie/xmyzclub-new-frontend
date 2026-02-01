/**
 * 瞬间管理相关类型定义
 */

/**
 * 瞬间状态
 * 0=待审核, 1=已发布, 2=已拒绝, 3=已下架
 */
export type MomentStatus = 0 | 1 | 2 | 3

/**
 * 获取瞬间状态信息
 */
export function getMomentStatusInfo(status: MomentStatus): { label: string; class: string } {
  switch (status) {
    case 0:
      return { label: '待审核', class: 'status-pending' }
    case 1:
      return { label: '已发布', class: 'status-published' }
    case 2:
      return { label: '已拒绝', class: 'status-rejected' }
    case 3:
      return { label: '已下架', class: 'status-takedown' }
    default:
      return { label: '未知', class: 'status-unknown' }
  }
}

/**
 * 瞬间列表项
 */
export interface Moment {
  id: number
  userId: number
  username: string
  nickname: string
  content: string
  momentTime: string
  eventId: number | null
  eventTitle: string | null
  isAnonymous: boolean
  status: MomentStatus
  likeCount: number
  commentCount: number
  images: string[]
  createdAt: string
}

/**
 * 瞬间详情
 */
export interface MomentDetail extends Moment {
  // 可能的扩展字段
}

/**
 * 获取瞬间列表参数
 */
export interface GetMomentsParams {
  page?: number
  size?: number
  status?: MomentStatus
  eventId?: number
  userId?: number
  keyword?: string
  isAnonymous?: boolean
  startTime?: string
  endTime?: string
  sortBy?: 'momentTime' | 'createdAt' | 'likeCount'
  sortOrder?: 'asc' | 'desc'
}

/**
 * 瞬间列表分页响应
 */
export interface MomentsResponse {
  total: number
  page: number
  size: number
  list: Moment[]
}

/**
 * 拒绝/下架瞬间请求
 */
export interface RejectMomentRequest {
  reason: string
}

/**
 * 批量操作请求
 */
export interface BatchMomentActionRequest {
  ids: number[]
  action: 'approve' | 'reject' | 'takedown' | 'delete'
}
