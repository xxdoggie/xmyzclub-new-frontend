// 跨代留声活动类型定义

// 身份: 1初中生 2高中生 3大学生 4社会人
export type VoiceIdentity = 1 | 2 | 3 | 4

export const VOICE_IDENTITIES: VoiceIdentity[] = [1, 2, 3, 4]

export const IDENTITY_LABELS: Record<VoiceIdentity, string> = {
  1: '初中生',
  2: '高中生',
  3: '大学生',
  4: '社会人',
}

// 试卷标题用词：「初中生的大问题」「高中生的中问题」「大学生的小问题」「社会人的老问题」
export const IDENTITY_QUESTION_WORDS: Record<VoiceIdentity, string> = {
  1: '大',
  2: '中',
  3: '小',
  4: '老',
}

export function identityLabel(identity: number | null | undefined): string {
  if (!identity) return '未知'
  return IDENTITY_LABELS[identity as VoiceIdentity] ?? '未知'
}

export function examTitle(identity: number): string {
  const id = identity as VoiceIdentity
  return `${IDENTITY_LABELS[id] ?? '匿名'}的${IDENTITY_QUESTION_WORDS[id] ?? ''}问题`
}

// 活动状态
export interface VoicesStatus {
  open: boolean
  // 截止限制已取消，恒为 null
  deadline: string | null
  questionCount: number
  answerCount: number
  participantCount: number
  myIdentity: VoiceIdentity | null
  myIdentityLabel: string | null
}

// 回答墙问题卡片
export interface QuestionCard {
  id: number
  content: string
  askerIdentity: VoiceIdentity
  askerIdentityLabel: string
  targetIdentities: VoiceIdentity[]
  answerCount: number
  createdAt: string
  answeredByMe: boolean
  mine: boolean
  favoritedByMe: boolean
}

// 回答条目
export interface VoiceAnswerItem {
  id: number
  content: string
  answererIdentity: VoiceIdentity
  answererIdentityLabel: string
  createdAt: string
  mine: boolean
  likeCount: number
  likedByMe: boolean
}

// 问题详情
export interface QuestionDetail extends QuestionCard {
  answers: VoiceAnswerItem[]
  canAnswer: boolean
  cannotAnswerReason: string | null
}

// 我的提问
export interface MyQuestion {
  id: number
  content: string
  targetIdentities: VoiceIdentity[]
  status: number // 0正常 1已下架
  answerCount: number
  createdAt: string
}

// 我的回答
export interface MyAnswer {
  id: number
  questionId: number
  questionContent: string
  content: string
  status: number // 0正常 1已下架
  createdAt: string
}

// MyBatis-Plus 分页结构
export interface VoicesPage<T> {
  records: T[]
  total: number
  size: number
  current: number
  pages: number
}

// ==================== 管理端 ====================

export interface AdminQuestion {
  id: number
  content: string
  askerUserId: number
  askerIdentity: VoiceIdentity
  askerIdentityLabel: string
  targetIdentities: VoiceIdentity[]
  status: number
  answerCount: number
  createdAt: string
}

export interface AdminAnswer {
  id: number
  questionId: number
  questionContent: string
  content: string
  answererUserId: number
  answererIdentity: VoiceIdentity
  answererIdentityLabel: string
  status: number
  createdAt: string
}

export interface VoicesStats {
  questionCount: number
  answerCount: number
  takedownQuestionCount: number
  takedownAnswerCount: number
  bindCount: number
  pendingReportCount: number
  bindCountByIdentity: Record<number, number>
}

// 举报目标类型: 1问题 2回答
export type ReportTargetType = 1 | 2

export interface AdminReport {
  id: number
  targetType: ReportTargetType
  targetId: number
  targetContent: string
  // 0正常 1已下架 -1已删除
  targetStatus: number
  questionId: number | null
  reporterUserId: number
  reason: string | null
  status: number // 0待处理 1已处理
  createdAt: string
}
