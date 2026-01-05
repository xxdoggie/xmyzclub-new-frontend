import api from './index'
import type { ApiResponse } from './index'
import type {
  School,
  MajorSection,
  MinorSection,
  RatingItem,
  RatingItemDetail,
  Comment,
} from '@/types/rating'

/**
 * 获取学校列表
 */
export function getSchools() {
  return api.get<ApiResponse<School[]>>('/rating-community/schools')
}

/**
 * 获取学校的大分区列表
 */
export function getMajorSections(schoolId: number) {
  return api.get<ApiResponse<MajorSection[]>>(`/rating-community/schools/${schoolId}/major-sections`)
}

/**
 * 获取大分区的小分区列表
 */
export function getMinorSections(majorSectionId: number) {
  return api.get<ApiResponse<MinorSection[]>>(`/rating-community/major-sections/${majorSectionId}/minor-sections`)
}

/**
 * 获取小分区的评分项目列表
 */
export function getRatingItems(minorSectionId: number) {
  return api.get<ApiResponse<RatingItem[]>>(`/rating-community/minor-sections/${minorSectionId}/rating-items`)
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
export function submitRating(itemId: number, data: { score: number; commentText?: string }) {
  return api.post<ApiResponse<number>>(`/rating-community/rating-items/${itemId}/ratings`, data)
}

/**
 * 获取我的评分
 */
export function getMyRating(itemId: number) {
  return api.get<ApiResponse<number | null>>(`/rating-community/rating-items/${itemId}/my-rating`)
}

/**
 * 发表评论
 */
export function createComment(itemId: number, data: { commentText: string; parentCommentId?: number }) {
  return api.post<ApiResponse<Comment>>(`/rating-community/rating-items/${itemId}/comments`, data)
}

/**
 * 删除评论
 */
export function deleteComment(commentId: number) {
  return api.delete<ApiResponse<null>>(`/rating-community/comments/${commentId}`)
}

/**
 * 获取我的评论
 */
export function getMyComments(itemId: number) {
  return api.get<ApiResponse<Comment[]>>(`/rating-community/rating-items/${itemId}/my-comments`)
}

/**
 * 点赞评论
 */
export function likeComment(commentId: number) {
  return api.post<ApiResponse<null>>(`/rating-community/comments/${commentId}/likes`)
}

/**
 * 取消点赞评论
 */
export function unlikeComment(commentId: number) {
  return api.delete<ApiResponse<null>>(`/rating-community/comments/${commentId}/likes`)
}
