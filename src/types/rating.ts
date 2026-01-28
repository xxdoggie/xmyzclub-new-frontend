/**
 * 学校
 */
export interface School {
  id: number
  name: string
}

/**
 * 大分区（旧版，保留兼容）
 */
export interface MajorSection {
  id: number
  name: string
  description: string
  url: string | null
}

/**
 * 小分区（旧版，保留兼容）
 */
export interface MinorSection {
  id: number
  name: string
  description: string
  url: string | null
}

/**
 * 通用分类（新版无限层级结构）
 */
export interface Category {
  id: number
  name: string
  description: string
  depth: number
  hasChildren: boolean
  childrenCount: number
  itemCount: number
  imageUrl: string | null
}

/**
 * 分类面包屑中的祖先项
 */
export interface CategoryAncestor {
  id: number
  name: string
  depth: number
}

/**
 * 分类面包屑导航（新版）
 */
export interface CategoryBreadcrumb {
  school: School
  ancestors: CategoryAncestor[]
  current: CategoryAncestor
}

/**
 * 分类详情（包含子分类、评分项目和面包屑）
 */
export interface CategoryDetail {
  id: number
  name: string
  description: string
  depth: number
  hasChildren: boolean
  imageUrl: string | null
  breadcrumb: CategoryBreadcrumb
  children: Category[]
  ratingItems: RatingItem[]
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
  imageUrls: string[] | null // 评论图片URL列表
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
  breadcrumb: Breadcrumb | CategoryBreadcrumb
}

/**
 * 面包屑导航（旧版，保留兼容）
 */
export interface Breadcrumb {
  school: School
  majorSection: MajorSection
  minorSection: MinorSection
}

/**
 * 获取面包屑显示名称的辅助函数
 * 兼容新旧两种面包屑格式
 */
export function getBreadcrumbDisplayName(breadcrumb: Breadcrumb | CategoryBreadcrumb): string {
  // 新版格式
  if ('ancestors' in breadcrumb && 'current' in breadcrumb) {
    // 返回当前分类的上一级（如果有的话），否则返回当前分类名称
    const ancestors = breadcrumb.ancestors
    if (ancestors.length > 0) {
      return ancestors[ancestors.length - 1]!.name
    }
    return breadcrumb.current.name
  }
  // 旧版格式
  return breadcrumb.minorSection.name
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
  userId: number
  commentText: string
  username: string
  nickname: string
  createdAt: string
  likeCount: number
  isLiked: boolean
  isMyComment: boolean
  commenterScore: number | null // 评论者对该项目的评分（10分制）
  commenterStars: number | null // 评论者对该项目的评分（5星制）
  imageUrls: string[] | null // 评论图片URL列表（仅顶级评论支持）
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

// ==================== 管理端大分区 (AdminMajorSection) - 旧版，保留兼容 ====================

/**
 * 管理端大分区信息（旧版）
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
 * 创建大分区请求（旧版）
 */
export interface CreateMajorSectionRequest {
  schoolId: number
  name: string
  description?: string
}

/**
 * 更新大分区请求（旧版）
 */
export interface UpdateMajorSectionRequest {
  schoolId?: number
  name?: string
  description?: string
}

// ==================== 管理端小分区 (AdminMinorSection) - 旧版，保留兼容 ====================

/**
 * 管理端小分区信息（旧版）
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
 * 创建小分区请求（旧版）
 */
export interface CreateMinorSectionRequest {
  majorSectionId: number
  name: string
  description?: string
}

/**
 * 更新小分区请求（旧版）
 */
export interface UpdateMinorSectionRequest {
  majorSectionId?: number
  name?: string
  description?: string
}

// ==================== 管理端分类 (AdminCategory) - 新版无限层级 ====================

/**
 * 管理端分类面包屑项
 */
export interface AdminCategoryBreadcrumbItem {
  id: number
  name: string
  depth: number
}

/**
 * 管理端分类信息
 */
export interface AdminCategory {
  id: number
  schoolId: number
  schoolName: string
  parentId: number | null
  parentName: string | null
  name: string
  description: string
  depth: number
  path: string
  sortOrder: number
  imageUrl: string | null
  status: RatingStatus
  hasChildren: boolean
  childrenCount: number
  itemCount: number
  breadcrumb: AdminCategoryBreadcrumbItem[]
  createdAt: string
  updatedAt: string
}

/**
 * 管理端分类列表查询参数
 */
export interface AdminCategoryParams {
  page?: number
  size?: number
  schoolId?: number
  parentId?: number | null
  status?: RatingStatus
  depth?: number
}

/**
 * 创建分类请求
 */
export interface CreateCategoryRequest {
  schoolId?: number // 创建顶级分类时必填
  parentId?: number | null // 创建子分类时必填，null 表示顶级分类
  name: string
  description?: string
  sortOrder?: number
}

/**
 * 更新分类请求
 */
export interface UpdateCategoryRequest {
  name?: string
  description?: string
  sortOrder?: number
}

/**
 * 移动分类请求
 */
export interface MoveCategoryRequest {
  targetParentId: number // 目标父分类ID，0 表示移动到顶级
}

// ==================== 管理端评分项目 (AdminRatingItem) ====================

/**
 * 管理端面包屑信息（旧版）
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
 * 管理端评分项目面包屑信息（新版）
 */
export interface AdminRatingItemBreadcrumb {
  school: {
    id: number
    name: string
  }
  ancestors: AdminCategoryBreadcrumbItem[]
  current: AdminCategoryBreadcrumbItem
}

/**
 * 判断是否为新版面包屑格式
 */
export function isNewBreadcrumbFormat(
  breadcrumb: AdminRatingBreadcrumb | AdminRatingItemBreadcrumb
): breadcrumb is AdminRatingItemBreadcrumb {
  return 'ancestors' in breadcrumb && 'current' in breadcrumb
}

/**
 * 获取管理端面包屑的路径显示（兼容新旧格式）
 * 返回格式: "学校名 / 分类1 / 分类2 / ..."
 */
export function getAdminBreadcrumbPath(
  breadcrumb: AdminRatingBreadcrumb | AdminRatingItemBreadcrumb
): string {
  if (isNewBreadcrumbFormat(breadcrumb)) {
    const parts = [breadcrumb.school.name]
    breadcrumb.ancestors.forEach((a) => parts.push(a.name))
    parts.push(breadcrumb.current.name)
    return parts.join(' / ')
  }
  return `${breadcrumb.school.name} / ${breadcrumb.majorSection.name} / ${breadcrumb.minorSection.name}`
}

/**
 * 获取管理端面包屑的各部分（兼容新旧格式）
 * 返回: { school, parts } 其中 parts 是分类/分区名称数组
 */
export function getAdminBreadcrumbParts(
  breadcrumb: AdminRatingBreadcrumb | AdminRatingItemBreadcrumb
): { school: string; parts: string[] } {
  if (isNewBreadcrumbFormat(breadcrumb)) {
    const parts = breadcrumb.ancestors.map((a) => a.name)
    parts.push(breadcrumb.current.name)
    return { school: breadcrumb.school.name, parts }
  }
  return {
    school: breadcrumb.school.name,
    parts: [breadcrumb.majorSection.name, breadcrumb.minorSection.name],
  }
}

/**
 * 管理端评分项目信息
 */
export interface AdminRatingItem {
  id: number
  categoryId: number // 新版使用 categoryId
  minorSectionId?: number // 旧版兼容
  breadcrumb: AdminRatingBreadcrumb | AdminRatingItemBreadcrumb
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
 * 管理端评分项目列表查询参数
 */
export interface AdminRatingItemParams {
  page?: number
  size?: number
  categoryId?: number
  status?: RatingStatus
}

/**
 * 创建评分项目请求
 */
export interface CreateRatingItemRequest {
  categoryId: number // 新版使用 categoryId
  minorSectionId?: number // 旧版兼容
  name: string
  description?: string
}

/**
 * 更新评分项目请求
 */
export interface UpdateRatingItemRequest {
  categoryId?: number
  minorSectionId?: number // 旧版兼容
  name?: string
  description?: string
}

/**
 * 移动评分项目请求
 */
export interface MoveRatingItemRequest {
  targetCategoryId: number // 新版使用 targetCategoryId
  targetMinorSectionId?: number // 旧版兼容
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
  breadcrumb: AdminRatingBreadcrumb | AdminRatingItemBreadcrumb
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

// ==================== 用户贡献 (Contribution) ====================

/**
 * 贡献类型
 * 1=修改现有内容, 2=新增内容
 */
export type ContributionType = 1 | 2

/**
 * 目标类型
 * 1=分类, 2=评分项目, 3=合集
 */
export type TargetType = 1 | 2 | 3

/**
 * 贡献状态
 * 0=待审核, 1=已通过, 2=已拒绝
 */
export type ContributionStatus = 0 | 1 | 2

/**
 * 字段名称
 */
export type FieldName = 'name' | 'description' | 'image'

/**
 * 贡献详情项
 */
export interface ContributionDetail {
  id?: number
  fieldName: FieldName
  fieldNameDisplay?: string
  oldValue?: string | null
  newValue: string
  oldImageUrl?: string | null
  newImageUrl?: string | null
  createdAt?: string
}

/**
 * 提交贡献请求
 */
export interface SubmitContributionRequest {
  contributionType: ContributionType
  targetType: TargetType
  targetId?: number | null
  parentId?: number | null
  schoolId?: number | null // 新建分类时必填
  reason: string
  details: ContributionDetail[]
}

/**
 * 贡献响应
 */
export interface Contribution {
  id: number
  userId: number
  username: string
  nickname: string
  contributionType: ContributionType
  contributionTypeDisplay: string
  targetType: TargetType
  targetTypeDisplay: string
  targetId: number | null
  targetName: string | null
  parentId: number | null
  parentName: string | null
  schoolId: number | null
  schoolName: string | null
  status: ContributionStatus
  statusDisplay: string
  reason: string
  rejectReason: string | null
  reviewerId: number | null
  reviewerUsername: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
  details: ContributionDetail[]
}

/**
 * 贡献图片上传响应
 */
export interface ContributionImageUploadResponse {
  id: number
  fileUrl: string
}

/**
 * 我的贡献列表项（简化版）
 */
export interface MyContribution {
  id: number
  userId: number
  username: string
  nickname: string
  contributionType: ContributionType
  contributionTypeDisplay: string
  targetType: TargetType
  targetTypeDisplay: string
  targetId: number | null
  targetName: string | null
  schoolId: number | null
  schoolName: string | null
  status: ContributionStatus
  statusDisplay: string
  reason: string
  rejectReason: string | null
  reviewedAt: string | null
  createdAt: string
  details: ContributionDetail[]
}

/**
 * 我的贡献列表响应
 */
export interface MyContributionsResponse {
  items: MyContribution[]
  total: number
  page: number
  size: number
  totalPages: number
}

/**
 * 贡献历史项
 */
export interface ContributionHistoryItem {
  contributionId: number
  contributionType: ContributionType
  contributionTypeDisplay: string
  userId: number
  username: string
  nickname: string
  details: ContributionDetail[]
  reviewedAt: string
}

// ==================== 管理端贡献审核 (AdminContribution) ====================

/**
 * 管理端贡献列表查询参数
 */
export interface AdminContributionsParams {
  page?: number
  size?: number
  status?: ContributionStatus
  targetType?: TargetType
  contributionType?: ContributionType
}

/**
 * 审核贡献请求
 */
export interface ReviewContributionRequest {
  status: 1 | 2 // 1=通过, 2=拒绝
  rejectReason?: string // 拒绝时必填
}

/**
 * 获取贡献状态信息的辅助函数
 */
export function getContributionStatusInfo(status: ContributionStatus): StatusInfo {
  switch (status) {
    case 0:
      return { label: '待审核', class: 'status-pending' }
    case 1:
      return { label: '已通过', class: 'status-approved' }
    case 2:
      return { label: '已拒绝', class: 'status-rejected' }
    default:
      return { label: '未知', class: 'status-unknown' }
  }
}

/**
 * 获取贡献类型信息的辅助函数
 */
export function getContributionTypeInfo(type: ContributionType): { label: string; class: string } {
  switch (type) {
    case 1:
      return { label: '修改现有', class: 'type-modify' }
    case 2:
      return { label: '新增内容', class: 'type-create' }
    default:
      return { label: '未知', class: 'type-unknown' }
  }
}

/**
 * 获取目标类型信息的辅助函数
 */
export function getTargetTypeInfo(type: TargetType): { label: string; class: string } {
  switch (type) {
    case 1:
      return { label: '分类', class: 'target-category' }
    case 2:
      return { label: '评分项目', class: 'target-item' }
    case 3:
      return { label: '合集', class: 'target-collection' }
    default:
      return { label: '未知', class: 'target-unknown' }
  }
}

// ==================== 每日评分统计 (DailyRatingStatistics) ====================

/**
 * 时间范围预设
 */
export type DailyRatingPreset = 'today' | 'yesterday' | 'last7days' | 'last30days'

/**
 * 每日评分统计项
 */
export interface DailyRatingStat {
  date: string // YYYY-MM-DD 格式
  count: number
}

/**
 * 每日评分统计响应
 */
export interface DailyRatingStatistics {
  startDate: string // YYYY-MM-DD 格式
  endDate: string // YYYY-MM-DD 格式
  totalDays: number
  totalRatings: number
  dailyStats: DailyRatingStat[]
}

/**
 * 每日评分统计请求参数
 */
export interface DailyRatingStatisticsParams {
  preset?: DailyRatingPreset
  startDate?: string // YYYY-MM-DD 格式
  endDate?: string // YYYY-MM-DD 格式
}
