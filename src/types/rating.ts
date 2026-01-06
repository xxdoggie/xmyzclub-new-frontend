/**
 * 学校
 */
export interface School {
  id: number
  name: string
}

/**
 * 大分区
 */
export interface MajorSection {
  id: number
  name: string
  description: string
  url: string | null
}

/**
 * 小分区
 */
export interface MinorSection {
  id: number
  name: string
  description: string
  url: string | null
}

/**
 * 热门评论
 */
export interface TopComment {
  id: number
  commentText: string
  username: string
  nickname: string
  createdAt: string
  likeCount: number
  isLiked: boolean
  isMyComment: boolean
  commenterScore: number | null // 评论者对该项目的评分（10分制）
  commenterStars: number | null // 评论者对该项目的评分（5星制）
}

/**
 * 评分项目
 */
export interface RatingItem {
  id: number
  name: string
  description: string
  url: string | null
  averageScore: number
  ratingCount: number
  myScore: number | null // 当前用户对该项目的评分（10分制）
  myStars: number | null // 当前用户对该项目的评分（5星制）
  topComment: TopComment | null
}

/**
 * 随机推荐评分项目（包含面包屑）
 */
export interface RandomRatingItem extends RatingItem {
  breadcrumb: Breadcrumb
}

/**
 * 面包屑导航
 */
export interface Breadcrumb {
  school: School
  majorSection: MajorSection
  minorSection: MinorSection
}

/**
 * 评分分布
 */
export interface ScoreDistribution {
  oneStar: number
  twoStar: number
  threeStar: number
  fourStar: number
  fiveStar: number
  oneStarPercent: number
  twoStarPercent: number
  threeStarPercent: number
  fourStarPercent: number
  fiveStarPercent: number
}

/**
 * 评论（包含回复）
 */
export interface Comment {
  id: number
  commentText: string
  username: string
  nickname: string
  createdAt: string
  likeCount: number
  isLiked: boolean
  isMyComment: boolean
  commenterScore: number | null // 评论者对该项目的评分（10分制）
  commenterStars: number | null // 评论者对该项目的评分（5星制）
  replies: Comment[] | null
}

/**
 * 评分项目详情
 */
export interface RatingItemDetail {
  id: number
  name: string
  description: string
  url: string | null
  averageScore: number
  ratingCount: number
  breadcrumb: Breadcrumb
  scoreDistribution: ScoreDistribution | null
  comments: Comment[] | null
  myRating: number | null
}

// ==================== 管理端类型定义 ====================

/**
 * 状态枚举
 * 0=禁用, 1=启用, 2=待审核, 3=审核拒绝
 */
export type RatingStatus = 0 | 1 | 2 | 3

/**
 * 状态信息
 */
export interface StatusInfo {
  label: string
  class: string
}

/**
 * 获取状态信息的辅助函数
 */
export function getRatingStatusInfo(status: number): StatusInfo {
  switch (status) {
    case 1:
      return { label: '启用', class: 'status-enabled' }
    case 0:
      return { label: '禁用', class: 'status-disabled' }
    case 2:
      return { label: '待审核', class: 'status-pending' }
    case 3:
      return { label: '审核拒绝', class: 'status-rejected' }
    default:
      return { label: '未知', class: 'status-unknown' }
  }
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  size: number
  totalPages: number
}

// ==================== 管理端学校 (AdminSchool) ====================

/**
 * 管理端学校信息
 */
export interface AdminSchool {
  id: number
  name: string
  status: RatingStatus
  majorSectionCount: number
  createdAt: string
  updatedAt: string
}

/**
 * 创建学校请求
 */
export interface CreateSchoolRequest {
  name: string
}

/**
 * 更新学校请求
 */
export interface UpdateSchoolRequest {
  name?: string
}

/**
 * 更新状态请求
 */
export interface UpdateStatusRequest {
  status: RatingStatus
}

// ==================== 管理端大分区 (AdminMajorSection) ====================

/**
 * 管理端大分区信息
 */
export interface AdminMajorSection {
  id: number
  schoolId: number
  schoolName: string
  name: string
  description: string
  imageUrl: string | null
  status: RatingStatus
  minorSectionCount: number
  createdAt: string
  updatedAt: string
}

/**
 * 创建大分区请求
 */
export interface CreateMajorSectionRequest {
  schoolId: number
  name: string
  description?: string
}

/**
 * 更新大分区请求
 */
export interface UpdateMajorSectionRequest {
  schoolId?: number
  name?: string
  description?: string
}

// ==================== 管理端小分区 (AdminMinorSection) ====================

/**
 * 管理端小分区信息
 */
export interface AdminMinorSection {
  id: number
  majorSectionId: number
  majorSectionName: string
  schoolId: number
  schoolName: string
  name: string
  description: string
  imageUrl: string | null
  status: RatingStatus
  ratingItemCount: number
  createdAt: string
  updatedAt: string
}

/**
 * 创建小分区请求
 */
export interface CreateMinorSectionRequest {
  majorSectionId: number
  name: string
  description?: string
}

/**
 * 更新小分区请求
 */
export interface UpdateMinorSectionRequest {
  majorSectionId?: number
  name?: string
  description?: string
}

// ==================== 管理端评分项目 (AdminRatingItem) ====================

/**
 * 管理端面包屑信息
 */
export interface AdminRatingBreadcrumb {
  school: {
    id: number
    name: string
  }
  majorSection: {
    id: number
    name: string
    description: string | null
    url: string | null
  }
  minorSection: {
    id: number
    name: string
    description: string | null
    url: string | null
  }
}

/**
 * 管理端评分项目信息
 */
export interface AdminRatingItem {
  id: number
  minorSectionId: number
  breadcrumb: AdminRatingBreadcrumb
  name: string
  description: string
  imageUrl: string | null
  status: RatingStatus
  averageScore: number
  ratingCount: number
  commentCount: number
  createdAt: string
  updatedAt: string
}

/**
 * 创建评分项目请求
 */
export interface CreateRatingItemRequest {
  minorSectionId: number
  name: string
  description?: string
}

/**
 * 更新评分项目请求
 */
export interface UpdateRatingItemRequest {
  minorSectionId?: number
  name?: string
  description?: string
}

/**
 * 移动评分项目请求
 */
export interface MoveRatingItemRequest {
  targetMinorSectionId: number
}

// ==================== 管理端评论 (AdminComment) ====================

/**
 * 管理端评论信息
 */
export interface AdminComment {
  id: number
  userId: number
  username: string
  nickname: string
  ratingItemId: number
  ratingItemName: string
  parentId: number | null
  commentText: string
  likeCount: number
  replyCount: number
  createdAt: string
}

/**
 * 批量删除评论请求
 */
export interface BatchDeleteCommentsRequest {
  ids: number[]
}

// ==================== 管理端用户评分 (AdminUserRating) ====================

/**
 * 管理端用户评分信息
 */
export interface AdminUserRating {
  id: number
  userId: number
  username: string
  nickname: string
  ratingItemId: number
  ratingItemName: string
  score: number
  stars: number
  createdAt: string
}

/**
 * 批量删除评分请求
 */
export interface BatchDeleteRatingsRequest {
  ids: number[]
}

// ==================== 统计 (Statistics) ====================

/**
 * 统计概览数据
 */
export interface RatingStatistics {
  schoolCount: number
  majorSectionCount: number
  minorSectionCount: number
  ratingItemCount: number
  userRatingCount: number
  commentCount: number
  enabledSchoolCount: number
  enabledRatingItemCount: number
}

// ==================== 图片上传 (Image) ====================

/**
 * 图片上传响应
 */
export interface ImageUploadResponse {
  id: number
  filePath: string
  fileUrl: string
  fileSize: number
  fileType: string
  businessType: 'major_rating' | 'minor_rating' | 'rating_item' | 'collection'
  businessId: number
  createdAt: string
}

// ==================== 合集 (Collection) ====================

/**
 * 用户端合集列表项
 */
export interface Collection {
  id: number
  name: string
  description: string
  coverUrl: string | null
  itemCount: number
}

/**
 * 用户端合集详情
 */
export interface CollectionDetail {
  id: number
  name: string
  description: string
  coverUrl: string | null
  itemCount: number
  items: CollectionRatingItem[]
}

/**
 * 合集内的评分项目（用户端）
 */
export interface CollectionRatingItem {
  id: number
  name: string
  description: string
  url: string | null
  averageScore: number
  ratingCount: number
  topComment: TopComment | null
  breadcrumb: Breadcrumb
  myScore: number | null
  myStars: number | null
}

/**
 * 管理端合集信息
 */
export interface AdminCollection {
  id: number
  name: string
  description: string
  coverUrl: string | null
  sortOrder: number
  status: RatingStatus
  itemCount: number
  createdAt: string
  updatedAt: string
}

/**
 * 创建合集请求
 */
export interface CreateCollectionRequest {
  name: string
  description?: string
  sortOrder?: number
}

/**
 * 更新合集请求
 */
export interface UpdateCollectionRequest {
  name?: string
  description?: string
  sortOrder?: number
}

/**
 * 合集内的评分项目（管理端）
 */
export interface AdminCollectionItem {
  id: number
  collectionId: number
  ratingItemId: number
  ratingItemName: string
  ratingItemImageUrl: string | null
  breadcrumb: AdminRatingBreadcrumb
  averageScore: number
  ratingCount: number
  sortOrder: number
  createdAt: string
}

/**
 * 添加评分项目到合集请求
 */
export interface AddCollectionItemRequest {
  ratingItemId: number
  sortOrder?: number
}

/**
 * 批量添加评分项目到合集请求
 */
export interface BatchAddCollectionItemsRequest {
  ids: number[]
}

/**
 * 更新合集项目排序请求
 */
export interface UpdateCollectionItemSortRequest {
  sortOrder: number
}
