import api from './index'
import type { ApiResponse } from './index'
import type {
  School,
  MajorSection,
  MinorSection,
  Category,
  CategoryDetail,
  RatingItem,
  RatingItemDetail,
  Comment,
  RandomRatingItem,
  Collection,
  CollectionDetail,
  PaginatedResponse,
  AdminSchool,
  AdminMajorSection,
  AdminMinorSection,
  AdminCategory,
  AdminCategoryParams,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  MoveCategoryRequest,
  AdminRatingItem,
  AdminRatingItemParams,
  AdminComment,
  AdminUserRating,
  AdminCollection,
  AdminCollectionItem,
  RatingStatistics,
  ImageUploadResponse,
  CreateSchoolRequest,
  UpdateSchoolRequest,
  UpdateStatusRequest,
  CreateMajorSectionRequest,
  UpdateMajorSectionRequest,
  CreateMinorSectionRequest,
  UpdateMinorSectionRequest,
  CreateRatingItemRequest,
  UpdateRatingItemRequest,
  MoveRatingItemRequest,
  BatchDeleteCommentsRequest,
  BatchDeleteRatingsRequest,
  CreateCollectionRequest,
  UpdateCollectionRequest,
  AddCollectionItemRequest,
  BatchAddCollectionItemsRequest,
  UpdateCollectionItemSortRequest,
  SubmitContributionRequest,
  Contribution,
  ContributionImageUploadResponse,
  MyContributionsResponse,
  ContributionHistoryItem,
  TargetType,
  AdminContributionsParams,
  ReviewContributionRequest,
  DailyRatingStatistics,
  DailyRatingStatisticsParams,
  BatchSubmitRatingItemsRequest,
  BatchSubmitRatingItemsResponse,
} from '@/types/rating'

/**
 * 获取学校列表
 */
export function getSchools() {
  return api.get<ApiResponse<School[]>>('/rating-community/schools')
}

/**
 * 获取学校的大分区列表（旧版 API，保留兼容）
 */
export function getMajorSections(schoolId: number) {
  return api.get<ApiResponse<MajorSection[]>>(`/rating-community/schools/${schoolId}/major-sections`)
}

/**
 * 获取大分区的小分区列表（旧版 API，保留兼容）
 */
export function getMinorSections(majorSectionId: number) {
  return api.get<ApiResponse<MinorSection[]>>(`/rating-community/major-sections/${majorSectionId}/minor-sections`)
}

/**
 * 获取小分区的评分项目列表（旧版 API，保留兼容）
 */
export function getRatingItems(minorSectionId: number) {
  return api.get<ApiResponse<RatingItem[]>>(`/rating-community/minor-sections/${minorSectionId}/rating-items`)
}

// ==================== 新版分类 API（无限层级结构） ====================

/**
 * 获取学校下的顶级分类列表
 */
export function getCategories(schoolId: number) {
  return api.get<ApiResponse<Category[]>>(`/rating-community/schools/${schoolId}/categories`)
}

/**
 * 获取分类的子分类列表
 */
export function getCategoryChildren(categoryId: number) {
  return api.get<ApiResponse<Category[]>>(`/rating-community/categories/${categoryId}/children`)
}

/**
 * 获取分类详情（含面包屑、子分类和评分项目）
 */
export function getCategoryDetail(categoryId: number) {
  return api.get<ApiResponse<CategoryDetail>>(`/rating-community/categories/${categoryId}`)
}

/**
 * 获取分类下的评分项目列表
 */
export function getCategoryRatingItems(categoryId: number) {
  return api.get<ApiResponse<RatingItem[]>>(`/rating-community/categories/${categoryId}/rating-items`)
}

/**
 * 获取评分项目详情
 */
export function getRatingItemDetail(itemId: number) {
  return api.get<ApiResponse<RatingItemDetail>>(`/rating-community/rating-items/${itemId}`)
}

/**
 * 提交评分（创建或更新）
 */
export function submitRating(data: { ratingItemId: number; stars: number }) {
  return api.post<ApiResponse<null>>('/rating-community/ratings', data)
}

/**
 * 获取我的评分
 */
export function getMyRating(itemId: number) {
  return api.get<ApiResponse<number | null>>(`/rating-community/rating-items/${itemId}/my-rating`)
}

/**
 * 评论图片上传响应
 */
export interface CommentImageUploadResponse {
  id: number
  fileUrl: string
  filePath: string
  fileSize: number
  fileType: string
}

/**
 * 上传评论图片
 */
export function uploadCommentImage(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('businessType', 'comment_image')
  return api.post<ApiResponse<CommentImageUploadResponse>>('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

/**
 * 发表评论
 */
export function createComment(data: { ratingItemId: number; commentText: string; parentId?: number; imageIds?: number[] }) {
  return api.post<ApiResponse<Comment>>('/rating-community/comments', data)
}

/**
 * 删除评论
 */
export function deleteComment(commentId: number) {
  return api.delete<ApiResponse<null>>(`/rating-community/comments/${commentId}`)
}

/**
 * 获取我的评论历史
 */
export function getMyComments() {
  return api.get<ApiResponse<Comment[]>>('/rating-community/my-comments')
}

/**
 * 点赞/取消点赞评论（toggle）
 */
export function toggleLike(commentId: number) {
  return api.post<ApiResponse<null>>('/rating-community/likes', { commentId })
}

/**
 * 获取随机推荐项目
 */
export function getRandomItems(schoolId: number, count: number = 10) {
  return api.get<ApiResponse<RandomRatingItem[]>>('/rating-community/random-items', {
    params: { schoolId, count },
  })
}

/**
 * 获取热门评分项目（按评分人数排序）
 */
export function getHotItems(count: number = 10) {
  return api.get<ApiResponse<RandomRatingItem[]>>('/rating-community/hot-items', {
    params: { count },
  })
}

/**
 * 搜索评分项目响应类型
 */
export interface SearchRatingItemsResponse {
  items: RatingItem[]
  total: number
}

/**
 * 搜索评分项目
 */
export function searchRatingItems(keyword: string) {
  return api.get<ApiResponse<SearchRatingItemsResponse>>('/rating-community/search', {
    params: { keyword },
  })
}

// ==================== 管理端 API ====================

const ADMIN_BASE = '/admin/rating-community'

// ----- 统计 -----

/**
 * 获取统计概览
 */
export function getStatistics() {
  return api.get<ApiResponse<RatingStatistics>>(`${ADMIN_BASE}/statistics/overview`)
}

/**
 * 获取每日评分统计
 * @param params 查询参数（preset 或 startDate+endDate 二选一）
 */
export function getDailyRatingStatistics(params?: DailyRatingStatisticsParams) {
  return api.get<ApiResponse<DailyRatingStatistics>>(`${ADMIN_BASE}/statistics/daily-ratings`, { params })
}

// ----- 学校管理 -----

/**
 * 获取学校列表（管理端）
 */
export function getAdminSchools(params?: { page?: number; size?: number; status?: number }) {
  return api.get<ApiResponse<PaginatedResponse<AdminSchool>>>(`${ADMIN_BASE}/schools`, { params })
}

/**
 * 获取学校详情（管理端）
 */
export function getAdminSchoolDetail(id: number) {
  return api.get<ApiResponse<AdminSchool>>(`${ADMIN_BASE}/schools/${id}`)
}

/**
 * 创建学校
 */
export function createSchool(data: CreateSchoolRequest) {
  return api.post<ApiResponse<AdminSchool>>(`${ADMIN_BASE}/schools`, data)
}

/**
 * 更新学校
 */
export function updateSchool(id: number, data: UpdateSchoolRequest) {
  return api.put<ApiResponse<AdminSchool>>(`${ADMIN_BASE}/schools/${id}`, data)
}

/**
 * 删除学校
 */
export function deleteSchool(id: number) {
  return api.delete<ApiResponse<null>>(`${ADMIN_BASE}/schools/${id}`)
}

/**
 * 更新学校状态
 */
export function updateSchoolStatus(id: number, data: UpdateStatusRequest) {
  return api.put<ApiResponse<AdminSchool>>(`${ADMIN_BASE}/schools/${id}/status`, data)
}

// ----- 大分区管理 -----

/**
 * 获取大分区列表（管理端）
 */
export function getAdminMajorSections(params?: {
  page?: number
  size?: number
  schoolId?: number
  status?: number
}) {
  return api.get<ApiResponse<PaginatedResponse<AdminMajorSection>>>(`${ADMIN_BASE}/major-sections`, { params })
}

/**
 * 获取大分区详情（管理端）
 */
export function getAdminMajorSectionDetail(id: number) {
  return api.get<ApiResponse<AdminMajorSection>>(`${ADMIN_BASE}/major-sections/${id}`)
}

/**
 * 创建大分区
 */
export function createMajorSection(data: CreateMajorSectionRequest) {
  return api.post<ApiResponse<AdminMajorSection>>(`${ADMIN_BASE}/major-sections`, data)
}

/**
 * 更新大分区
 */
export function updateMajorSection(id: number, data: UpdateMajorSectionRequest) {
  return api.put<ApiResponse<AdminMajorSection>>(`${ADMIN_BASE}/major-sections/${id}`, data)
}

/**
 * 删除大分区
 */
export function deleteMajorSection(id: number) {
  return api.delete<ApiResponse<null>>(`${ADMIN_BASE}/major-sections/${id}`)
}

/**
 * 更新大分区状态
 */
export function updateMajorSectionStatus(id: number, data: UpdateStatusRequest) {
  return api.put<ApiResponse<AdminMajorSection>>(`${ADMIN_BASE}/major-sections/${id}/status`, data)
}

/**
 * 上传大分区图片
 */
export function uploadMajorSectionImage(id: number, file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return api.post<ApiResponse<ImageUploadResponse>>(`${ADMIN_BASE}/major-sections/${id}/image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

/**
 * 删除大分区图片
 */
export function deleteMajorSectionImage(id: number) {
  return api.delete<ApiResponse<null>>(`${ADMIN_BASE}/major-sections/${id}/image`)
}

// ----- 小分区管理 -----

/**
 * 获取小分区列表（管理端）
 */
export function getAdminMinorSections(params?: {
  page?: number
  size?: number
  majorSectionId?: number
  status?: number
}) {
  return api.get<ApiResponse<PaginatedResponse<AdminMinorSection>>>(`${ADMIN_BASE}/minor-sections`, { params })
}

/**
 * 获取小分区详情（管理端）
 */
export function getAdminMinorSectionDetail(id: number) {
  return api.get<ApiResponse<AdminMinorSection>>(`${ADMIN_BASE}/minor-sections/${id}`)
}

/**
 * 创建小分区
 */
export function createMinorSection(data: CreateMinorSectionRequest) {
  return api.post<ApiResponse<AdminMinorSection>>(`${ADMIN_BASE}/minor-sections`, data)
}

/**
 * 更新小分区
 */
export function updateMinorSection(id: number, data: UpdateMinorSectionRequest) {
  return api.put<ApiResponse<AdminMinorSection>>(`${ADMIN_BASE}/minor-sections/${id}`, data)
}

/**
 * 删除小分区
 */
export function deleteMinorSection(id: number) {
  return api.delete<ApiResponse<null>>(`${ADMIN_BASE}/minor-sections/${id}`)
}

/**
 * 更新小分区状态
 */
export function updateMinorSectionStatus(id: number, data: UpdateStatusRequest) {
  return api.put<ApiResponse<AdminMinorSection>>(`${ADMIN_BASE}/minor-sections/${id}/status`, data)
}

/**
 * 上传小分区图片
 */
export function uploadMinorSectionImage(id: number, file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return api.post<ApiResponse<ImageUploadResponse>>(`${ADMIN_BASE}/minor-sections/${id}/image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

/**
 * 删除小分区图片
 */
export function deleteMinorSectionImage(id: number) {
  return api.delete<ApiResponse<null>>(`${ADMIN_BASE}/minor-sections/${id}/image`)
}

// ----- 分类管理（新版无限层级） -----

/**
 * 获取分类列表（管理端）
 */
export function getAdminCategories(params?: AdminCategoryParams) {
  return api.get<ApiResponse<PaginatedResponse<AdminCategory>>>(`${ADMIN_BASE}/categories`, { params })
}

/**
 * 获取分类详情（管理端）
 */
export function getAdminCategoryDetail(id: number) {
  return api.get<ApiResponse<AdminCategory>>(`${ADMIN_BASE}/categories/${id}`)
}

/**
 * 创建分类
 */
export function createCategory(data: CreateCategoryRequest) {
  return api.post<ApiResponse<AdminCategory>>(`${ADMIN_BASE}/categories`, data)
}

/**
 * 更新分类
 */
export function updateCategory(id: number, data: UpdateCategoryRequest) {
  return api.put<ApiResponse<AdminCategory>>(`${ADMIN_BASE}/categories/${id}`, data)
}

/**
 * 删除分类
 */
export function deleteCategory(id: number) {
  return api.delete<ApiResponse<null>>(`${ADMIN_BASE}/categories/${id}`)
}

/**
 * 更新分类状态
 */
export function updateCategoryStatus(id: number, data: UpdateStatusRequest) {
  return api.put<ApiResponse<AdminCategory>>(`${ADMIN_BASE}/categories/${id}/status`, data)
}

/**
 * 移动分类
 */
export function moveCategory(id: number, data: MoveCategoryRequest) {
  return api.put<ApiResponse<AdminCategory>>(`${ADMIN_BASE}/categories/${id}/move`, data)
}

/**
 * 上传分类图片
 */
export function uploadCategoryImage(id: number, file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return api.post<ApiResponse<ImageUploadResponse>>(`${ADMIN_BASE}/categories/${id}/image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

/**
 * 删除分类图片
 */
export function deleteCategoryImage(id: number) {
  return api.delete<ApiResponse<null>>(`${ADMIN_BASE}/categories/${id}/image`)
}

// ----- 评分项目管理 -----

/**
 * 获取评分项目列表（管理端）
 */
export function getAdminRatingItems(params?: AdminRatingItemParams & {
  minorSectionId?: number // 旧版兼容
  keyword?: string
}) {
  return api.get<ApiResponse<PaginatedResponse<AdminRatingItem>>>(`${ADMIN_BASE}/rating-items`, { params })
}

/**
 * 获取评分项目详情（管理端）
 */
export function getAdminRatingItemDetail(id: number) {
  return api.get<ApiResponse<AdminRatingItem>>(`${ADMIN_BASE}/rating-items/${id}`)
}

/**
 * 创建评分项目
 */
export function createRatingItem(data: CreateRatingItemRequest) {
  return api.post<ApiResponse<AdminRatingItem>>(`${ADMIN_BASE}/rating-items`, data)
}

/**
 * 更新评分项目
 */
export function updateRatingItem(id: number, data: UpdateRatingItemRequest) {
  return api.put<ApiResponse<AdminRatingItem>>(`${ADMIN_BASE}/rating-items/${id}`, data)
}

/**
 * 删除评分项目
 */
export function deleteRatingItem(id: number) {
  return api.delete<ApiResponse<null>>(`${ADMIN_BASE}/rating-items/${id}`)
}

/**
 * 更新评分项目状态
 */
export function updateRatingItemStatus(id: number, data: UpdateStatusRequest) {
  return api.put<ApiResponse<AdminRatingItem>>(`${ADMIN_BASE}/rating-items/${id}/status`, data)
}

/**
 * 移动评分项目
 */
export function moveRatingItem(id: number, data: MoveRatingItemRequest) {
  return api.put<ApiResponse<AdminRatingItem>>(`${ADMIN_BASE}/rating-items/${id}/move`, data)
}

/**
 * 上传评分项目图片
 */
export function uploadRatingItemImage(id: number, file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return api.post<ApiResponse<ImageUploadResponse>>(`${ADMIN_BASE}/rating-items/${id}/image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

/**
 * 删除评分项目图片
 */
export function deleteRatingItemImage(id: number) {
  return api.delete<ApiResponse<null>>(`${ADMIN_BASE}/rating-items/${id}/image`)
}

// ----- 评论管理 -----

/**
 * 获取评论列表（管理端）
 */
export function getAdminComments(params?: {
  page?: number
  size?: number
  ratingItemId?: number
  userId?: number
}) {
  return api.get<ApiResponse<PaginatedResponse<AdminComment>>>(`${ADMIN_BASE}/comments`, { params })
}

/**
 * 获取评论详情（管理端）
 */
export function getAdminCommentDetail(id: number) {
  return api.get<ApiResponse<AdminComment>>(`${ADMIN_BASE}/comments/${id}`)
}

/**
 * 删除评论（管理端）
 */
export function deleteAdminComment(id: number) {
  return api.delete<ApiResponse<null>>(`${ADMIN_BASE}/comments/${id}`)
}

/**
 * 批量删除评论
 */
export function batchDeleteComments(data: BatchDeleteCommentsRequest) {
  return api.delete<ApiResponse<null>>(`${ADMIN_BASE}/comments/batch`, { data })
}

// ----- 用户评分管理 -----

/**
 * 获取用户评分列表（管理端）
 */
export function getAdminRatings(params?: {
  page?: number
  size?: number
  ratingItemId?: number
  userId?: number
}) {
  return api.get<ApiResponse<PaginatedResponse<AdminUserRating>>>(`${ADMIN_BASE}/ratings`, { params })
}

/**
 * 删除用户评分（管理端）
 */
export function deleteAdminRating(id: number) {
  return api.delete<ApiResponse<null>>(`${ADMIN_BASE}/ratings/${id}`)
}

/**
 * 批量删除用户评分
 */
export function batchDeleteRatings(data: BatchDeleteRatingsRequest) {
  return api.delete<ApiResponse<null>>(`${ADMIN_BASE}/ratings/batch`, { data })
}

// ==================== 用户端合集 API ====================

/**
 * 获取所有合集（用户端）
 */
export function getCollections() {
  return api.get<ApiResponse<Collection[]>>('/rating-community/collections')
}

/**
 * 获取合集详情（用户端）
 */
export function getCollectionDetail(collectionId: number) {
  return api.get<ApiResponse<CollectionDetail>>(`/rating-community/collections/${collectionId}`)
}

// ==================== 管理端合集 API ====================

// ----- 合集管理 -----

/**
 * 获取合集列表（管理端）
 */
export function getAdminCollections(params?: { page?: number; size?: number; status?: number }) {
  return api.get<ApiResponse<PaginatedResponse<AdminCollection>>>(
    `${ADMIN_BASE}/collections`,
    { params }
  )
}

/**
 * 获取合集详情（管理端）
 */
export function getAdminCollectionDetail(id: number) {
  return api.get<ApiResponse<AdminCollection>>(`${ADMIN_BASE}/collections/${id}`)
}

/**
 * 创建合集
 */
export function createCollection(data: CreateCollectionRequest) {
  return api.post<ApiResponse<AdminCollection>>(`${ADMIN_BASE}/collections`, data)
}

/**
 * 更新合集
 */
export function updateCollection(id: number, data: UpdateCollectionRequest) {
  return api.put<ApiResponse<AdminCollection>>(`${ADMIN_BASE}/collections/${id}`, data)
}

/**
 * 删除合集
 */
export function deleteCollection(id: number) {
  return api.delete<ApiResponse<null>>(`${ADMIN_BASE}/collections/${id}`)
}

/**
 * 更新合集状态
 */
export function updateCollectionStatus(id: number, data: UpdateStatusRequest) {
  return api.put<ApiResponse<AdminCollection>>(`${ADMIN_BASE}/collections/${id}/status`, data)
}

/**
 * 上传合集封面
 */
export function uploadCollectionImage(id: number, file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return api.post<ApiResponse<ImageUploadResponse>>(`${ADMIN_BASE}/collections/${id}/image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

/**
 * 删除合集封面
 */
export function deleteCollectionImage(id: number) {
  return api.delete<ApiResponse<null>>(`${ADMIN_BASE}/collections/${id}/image`)
}

// ----- 合集项目管理 -----

/**
 * 获取合集内的评分项目列表
 */
export function getAdminCollectionItems(collectionId: number, params?: { page?: number; size?: number }) {
  return api.get<ApiResponse<PaginatedResponse<AdminCollectionItem>>>(
    `${ADMIN_BASE}/collections/${collectionId}/items`,
    { params }
  )
}

/**
 * 添加评分项目到合集
 */
export function addCollectionItem(collectionId: number, data: AddCollectionItemRequest) {
  return api.post<ApiResponse<AdminCollectionItem>>(`${ADMIN_BASE}/collections/${collectionId}/items`, data)
}

/**
 * 从合集移除评分项目
 */
export function removeCollectionItem(collectionId: number, ratingItemId: number) {
  return api.delete<ApiResponse<null>>(`${ADMIN_BASE}/collections/${collectionId}/items/${ratingItemId}`)
}

/**
 * 更新合集项目排序
 */
export function updateCollectionItemSort(collectionId: number, ratingItemId: number, data: UpdateCollectionItemSortRequest) {
  return api.put<ApiResponse<null>>(`${ADMIN_BASE}/collections/${collectionId}/items/${ratingItemId}/sort`, data)
}

/**
 * 批量添加评分项目到合集
 */
export function batchAddCollectionItems(collectionId: number, data: BatchAddCollectionItemsRequest) {
  return api.post<ApiResponse<null>>(`${ADMIN_BASE}/collections/${collectionId}/items/batch`, data)
}

// ==================== 用户端贡献 API ====================

/**
 * 提交贡献
 */
export function submitContribution(data: SubmitContributionRequest) {
  return api.post<ApiResponse<Contribution>>('/rating-community/contributions', data)
}

/**
 * 批量提交评分项目
 */
export function batchSubmitRatingItems(data: BatchSubmitRatingItemsRequest) {
  return api.post<ApiResponse<BatchSubmitRatingItemsResponse>>('/rating-community/contributions/batch-rating-items', data)
}

/**
 * 上传贡献图片
 */
export function uploadContributionImage(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return api.post<ApiResponse<ContributionImageUploadResponse>>('/rating-community/contributions/upload-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

/**
 * 获取我的贡献列表
 */
export function getMyContributions(params?: { page?: number; size?: number; status?: number }) {
  return api.get<ApiResponse<MyContributionsResponse>>('/rating-community/contributions/my', { params })
}

/**
 * 获取贡献详情
 */
export function getContributionDetail(id: number) {
  return api.get<ApiResponse<Contribution>>(`/rating-community/contributions/${id}`)
}

/**
 * 获取实体贡献历史
 */
export function getContributionHistory(targetType: TargetType, targetId: number) {
  return api.get<ApiResponse<ContributionHistoryItem[]>>('/rating-community/contributions/history', {
    params: { targetType, targetId },
  })
}

// ==================== 管理端贡献审核 API ====================

/**
 * 获取贡献列表（管理端）
 */
export function getAdminContributions(params?: AdminContributionsParams) {
  return api.get<ApiResponse<PaginatedResponse<Contribution>>>(`${ADMIN_BASE}/contributions`, { params })
}

/**
 * 获取待审核贡献数量（管理端）
 */
export function getAdminContributionsPendingCount() {
  return api.get<ApiResponse<number>>(`${ADMIN_BASE}/contributions/pending-count`)
}

/**
 * 获取贡献详情（管理端）
 */
export function getAdminContributionDetail(id: number) {
  return api.get<ApiResponse<Contribution>>(`${ADMIN_BASE}/contributions/${id}`)
}

/**
 * 审核贡献（管理端）
 */
export function reviewContribution(id: number, data: ReviewContributionRequest) {
  return api.post<ApiResponse<Contribution>>(`${ADMIN_BASE}/contributions/${id}/review`, data)
}
