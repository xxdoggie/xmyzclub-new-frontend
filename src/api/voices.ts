import api from './index'
import type { ApiResponse } from './index'
import type {
  AdminAnswer,
  AdminQuestion,
  AdminReport,
  ReportTargetType,
  MyAnswer,
  MyQuestion,
  QuestionCard,
  QuestionDetail,
  VoiceAnswerItem,
  VoiceIdentity,
  VoicesPage,
  VoicesStats,
  VoicesStatus,
} from '@/types/voices'

// ==================== 活动 ====================

/**
 * 活动状态（公开）
 * GET /voices/status
 */
export function getVoicesStatus() {
  return api.get<ApiResponse<VoicesStatus>>('/voices/status')
}

/**
 * 查询我的身份
 * GET /voices/identity
 */
export function getMyVoiceIdentity() {
  return api.get<ApiResponse<{ identity: VoiceIdentity | null }>>('/voices/identity')
}

/**
 * 绑定身份（绑定后不可修改）
 * POST /voices/identity
 */
export function bindVoiceIdentity(identity: VoiceIdentity) {
  return api.post<ApiResponse<{ identity: VoiceIdentity }>>('/voices/identity', { identity })
}

// ==================== 问答 ====================

/**
 * 提问
 * POST /voices/questions
 */
export function createVoiceQuestion(content: string, targetIdentities: VoiceIdentity[]) {
  return api.post<ApiResponse<MyQuestion>>('/voices/questions', { content, targetIdentities })
}

/**
 * 回答墙问题列表（公开）
 * GET /voices/questions
 */
export function getVoiceWall(params: {
  scope?: 'mine' | 'all'
  sort?: 'latest' | 'hot' | 'random'
  /** 全部试卷下的目标人群过滤（多选），仅 scope=all 生效 */
  targets?: VoiceIdentity[]
  page?: number
  size?: number
}) {
  return api.get<ApiResponse<VoicesPage<QuestionCard>>>('/voices/questions', {
    params: {
      scope: params.scope || 'mine',
      sort: params.sort || 'latest',
      targets: params.targets?.length ? params.targets.join(',') : undefined,
      page: params.page || 1,
      size: params.size || 12,
    },
  })
}

/**
 * 问题详情（公开）
 * GET /voices/questions/{id}
 */
export function getVoiceQuestionDetail(id: number) {
  return api.get<ApiResponse<QuestionDetail>>(`/voices/questions/${id}`)
}

/**
 * 回答问题
 * POST /voices/questions/{id}/answers
 */
export function createVoiceAnswer(questionId: number, content: string) {
  return api.post<ApiResponse<VoiceAnswerItem>>(`/voices/questions/${questionId}/answers`, {
    content,
  })
}

/**
 * 点赞/取消点赞回答（toggle）
 * POST /voices/answers/{id}/like
 */
export function toggleVoiceAnswerLike(answerId: number) {
  return api.post<ApiResponse<{ liked: boolean; likeCount: number }>>(
    `/voices/answers/${answerId}/like`
  )
}

/**
 * 举报问题或回答
 * POST /voices/report
 */
export function reportVoiceContent(targetType: ReportTargetType, targetId: number, reason?: string) {
  return api.post<ApiResponse<null>>('/voices/report', {
    targetType,
    targetId,
    reason: reason || undefined,
  })
}

/**
 * 收藏/取消收藏问题（toggle）
 * POST /voices/questions/{id}/favorite
 */
export function toggleVoiceQuestionFavorite(questionId: number) {
  return api.post<ApiResponse<{ favorited: boolean }>>(`/voices/questions/${questionId}/favorite`)
}

/**
 * 我的收藏
 * GET /voices/mine/favorites
 */
export function getMyVoiceFavorites(page = 1, size = 10) {
  return api.get<ApiResponse<VoicesPage<QuestionCard>>>('/voices/mine/favorites', {
    params: { page, size },
  })
}

/**
 * 我的提问
 * GET /voices/mine/questions
 */
export function getMyVoiceQuestions(page = 1, size = 10) {
  return api.get<ApiResponse<VoicesPage<MyQuestion>>>('/voices/mine/questions', {
    params: { page, size },
  })
}

/**
 * 我的回答
 * GET /voices/mine/answers
 */
export function getMyVoiceAnswers(page = 1, size = 10) {
  return api.get<ApiResponse<VoicesPage<MyAnswer>>>('/voices/mine/answers', {
    params: { page, size },
  })
}

// ==================== 管理端 ====================

export function adminGetVoiceQuestions(params: {
  status?: number
  keyword?: string
  page?: number
  size?: number
}) {
  return api.get<ApiResponse<VoicesPage<AdminQuestion>>>('/admin/voices/questions', { params })
}

export function adminGetVoiceAnswers(params: {
  status?: number
  keyword?: string
  questionId?: number
  page?: number
  size?: number
}) {
  return api.get<ApiResponse<VoicesPage<AdminAnswer>>>('/admin/voices/answers', { params })
}

export function adminTakedownVoiceQuestion(id: number) {
  return api.put<ApiResponse<null>>(`/admin/voices/questions/${id}/takedown`)
}

export function adminRestoreVoiceQuestion(id: number) {
  return api.put<ApiResponse<null>>(`/admin/voices/questions/${id}/restore`)
}

export function adminTakedownVoiceAnswer(id: number) {
  return api.put<ApiResponse<null>>(`/admin/voices/answers/${id}/takedown`)
}

export function adminRestoreVoiceAnswer(id: number) {
  return api.put<ApiResponse<null>>(`/admin/voices/answers/${id}/restore`)
}

export function adminGetVoicesStats() {
  return api.get<ApiResponse<VoicesStats>>('/admin/voices/stats')
}

export function adminGetVoiceReports(params: { status?: number; page?: number; size?: number }) {
  return api.get<ApiResponse<VoicesPage<AdminReport>>>('/admin/voices/reports', { params })
}

export function adminHandleVoiceReport(id: number) {
  return api.put<ApiResponse<null>>(`/admin/voices/reports/${id}/handle`)
}
