/**
 * 时间线（Museum）模块类型定义
 * 包含：标签、活动、内容模块、瞬间
 */

// ==================== 标签 (Tag) ====================

/**
 * 标签
 */
export interface Tag {
  id: number
  name: string
  color: string
  icon: string
  sortOrder: number
  status: 0 | 1 // 0=禁用, 1=启用
  eventCount: number
}

/**
 * 创建/更新标签请求
 */
export interface TagRequest {
  name: string
  color: string
  icon?: string
  sortOrder?: number
}

/**
 * 获取标签列表参数
 */
export interface GetTagsParams {
  status?: 0 | 1
}

// ==================== 活动 (Event) ====================

/**
 * 活动状态
 * 0=草稿, 1=已发布, 2=已下架
 */
export type EventStatus = 0 | 1 | 2

/**
 * 获取活动状态信息
 */
export function getEventStatusInfo(status: EventStatus): { label: string; class: string } {
  switch (status) {
    case 0:
      return { label: '草稿', class: 'status-draft' }
    case 1:
      return { label: '已发布', class: 'status-published' }
    case 2:
      return { label: '已下架', class: 'status-unpublished' }
    default:
      return { label: '未知', class: 'status-unknown' }
  }
}

/**
 * 活动列表项中的标签
 */
export interface EventTag {
  id: number
  name: string
  color: string
}

/**
 * 活动列表项
 */
export interface Event {
  id: number
  title: string
  subtitle: string
  coverUrl: string
  startDate: string
  endDate: string
  location: string
  status: EventStatus
  isFeatured: boolean
  viewCount: number
  momentCount: number
  commentCount: number
  tags: EventTag[]
  creatorName: string
  publishedAt: string | null
  createdAt: string
}

/**
 * 活动详情
 */
export interface EventDetail extends Event {
  description: string
  blocks: Block[]
  creatorId: number
}

/**
 * 获取活动列表参数
 */
export interface GetEventsParams {
  page?: number
  size?: number
  status?: EventStatus
  tagId?: number
  keyword?: string
  startDate?: string
  endDate?: string
  isFeatured?: boolean
  sortBy?: 'startDate' | 'createdAt' | 'viewCount'
  sortOrder?: 'asc' | 'desc'
}

/**
 * 活动列表分页响应
 */
export interface EventsResponse {
  total: number
  page: number
  size: number
  pages: number
  list: Event[]
}

/**
 * 创建活动请求
 */
export interface CreateEventRequest {
  title: string
  subtitle?: string
  description?: string
  coverUrl?: string
  startDate: string
  endDate?: string
  location?: string
  tagIds?: number[]
}

/**
 * 更新活动请求
 */
export interface UpdateEventRequest {
  title?: string
  subtitle?: string
  description?: string
  coverUrl?: string
  startDate?: string
  endDate?: string
  location?: string
  tagIds?: number[]
}

/**
 * 批量操作请求
 */
export interface BatchEventActionRequest {
  ids: number[]
  action: 'publish' | 'unpublish' | 'feature' | 'unfeature' | 'delete'
}

// ==================== 内容模块 (Block) ====================

/**
 * 内容模块类型
 */
export type BlockType = 'text' | 'gallery' | 'video' | 'file' | 'timeline' | 'link'

/**
 * 获取内容模块类型标签
 */
export function getBlockTypeLabel(type: BlockType): string {
  const labels: Record<BlockType, string> = {
    text: '文字',
    gallery: '图片画廊',
    video: '视频',
    file: '文件附件',
    timeline: '时间线',
    link: '链接',
  }
  return labels[type] || type
}

/**
 * 文字模块内容
 */
export interface TextBlockContent {
  text: string
}

/**
 * 图片画廊模块内容
 */
export interface GalleryBlockContent {
  images: Array<{
    fileId: number
    url?: string
    caption?: string
  }>
}

/**
 * 视频模块内容
 */
export interface VideoBlockContent {
  fileId: number
  cover?: string
  title?: string
}

/**
 * 文件附件模块内容
 */
export interface FileBlockContent {
  files: Array<{
    fileId: number
    name: string
  }>
}

/**
 * 时间线模块内容
 */
export interface TimelineBlockContent {
  items: Array<{
    time: string
    title: string
    description?: string
  }>
}

/**
 * 链接模块内容
 */
export interface LinkBlockContent {
  links: Array<{
    url: string
    title: string
    description?: string
  }>
}

/**
 * 内容模块内容联合类型
 */
export type BlockContent =
  | TextBlockContent
  | GalleryBlockContent
  | VideoBlockContent
  | FileBlockContent
  | TimelineBlockContent
  | LinkBlockContent

/**
 * 内容模块
 */
export interface Block {
  id: number
  blockType: BlockType
  title: string | null
  content: BlockContent
  sortOrder: number
}

/**
 * 创建/更新内容模块请求
 */
export interface BlockRequest {
  blockType: BlockType
  title?: string | null
  content: BlockContent
  sortOrder?: number
}

// ==================== 瞬间 (Moment) ====================

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
