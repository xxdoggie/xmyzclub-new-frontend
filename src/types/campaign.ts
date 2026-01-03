// ==================== 活动基本信息 ====================

/**
 * 活动阶段
 */
export interface CampaignStage {
  /** 阶段类型: submission=投稿, review=审核, voting=投票, result=公示 */
  type: 'submission' | 'review' | 'voting' | 'result'
  /** 阶段开始时间 */
  startTime: string
  /** 阶段结束时间 */
  endTime: string
}

/**
 * 全局配置
 */
export interface GlobalConfig {
  /** 每人每日投票次数限制 */
  voteLimit: number
  /** 每人最多可投稿数量 */
  submissionLimit: number
  /** 投稿是否需要审核 */
  requireReview: boolean
  /** 是否允许匿名投票 */
  anonymousVoting: boolean
}

/**
 * 活动信息
 */
export interface Campaign {
  id: number
  /** 活动名称 */
  name: string
  /** 活动描述 */
  description: string
  /** 活动封面图 */
  coverImage: string | null
  /** 当前阶段: idle=未开始, submission=投稿中, review=审核中, voting=投票中, result=公示中, ended=已结束 */
  currentStage: 'idle' | 'submission' | 'review' | 'voting' | 'result' | 'ended'
  /** 阶段配置 */
  stages: CampaignStage[]
  /** 全局配置 */
  globalConfig: GlobalConfig
  /** 状态: 0=禁用, 1=启用 */
  status: number
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
}

// ==================== 审核相关 ====================

/**
 * 音乐信息
 */
export interface MusicInfo {
  id: number
  /** 音乐名称 */
  name: string
  /** 歌手 */
  artist: string
  /** 音乐来源 */
  source: string
  /** 音乐来源 ID */
  sourceId: string
  /** 封面图 */
  coverImage: string | null
  /** 音乐时长(秒) */
  duration: number
}

/**
 * 用户信息
 */
export interface SubmissionUser {
  id: number
  nickname: string
  avatar: string | null
}

/**
 * 投稿信息
 */
export interface Submission {
  id: number
  /** 投稿用户 */
  user: SubmissionUser
  /** 音乐信息 */
  music: MusicInfo
  /** 投稿理由/留言 */
  message: string | null
  /** 审核状态: pending=待审核, approved=已通过, rejected=已拒绝 */
  reviewStatus: 'pending' | 'approved' | 'rejected'
  /** 审核备注 */
  reviewNote: string | null
  /** 创建时间 */
  createdAt: string
}

/**
 * 按音乐分组的投稿
 */
export interface SubmissionGroup {
  /** 音乐信息 */
  music: MusicInfo
  /** 该音乐的所有投稿 */
  submissions: Submission[]
  /** 投稿数量 */
  count: number
}

// ==================== 投票结果相关 ====================

/**
 * 投票结果项
 */
export interface VotingResultItem {
  /** 排名 */
  rank: number
  /** 音乐信息 */
  music: MusicInfo
  /** 得票数 */
  voteCount: number
  /** 投稿数 */
  submissionCount: number
}

/**
 * 投票结果统计
 */
export interface VotingResultStats {
  /** 总投票数 */
  totalVotes: number
  /** 参与投票人数 */
  totalVoters: number
  /** 有效投稿数 */
  validSubmissions: number
}

/**
 * 投票结果响应
 */
export interface VotingResultResponse {
  /** 活动信息 */
  campaign: Pick<Campaign, 'id' | 'name' | 'currentStage'>
  /** 结果列表 */
  results: VotingResultItem[]
  /** 统计信息 */
  stats: VotingResultStats
}

// ==================== 请求类型 ====================

/**
 * 创建活动请求
 */
export interface CreateCampaignRequest {
  name: string
  description: string
  coverImage?: string
  stages: CampaignStage[]
  globalConfig: GlobalConfig
}

/**
 * 更新活动请求
 */
export interface UpdateCampaignRequest {
  name?: string
  description?: string
  coverImage?: string
  stages?: CampaignStage[]
  globalConfig?: GlobalConfig
  status?: number
}

/**
 * 阶段操作请求
 */
export interface StageOperationRequest {
  /** 操作类型: start=开始, end=结束, next=进入下一阶段 */
  operation: 'start' | 'end' | 'next'
}

/**
 * 审核投稿请求
 */
export interface ReviewSubmissionRequest {
  /** 投稿 ID 列表 */
  submissionIds: number[]
  /** 审核结果: approved=通过, rejected=拒绝 */
  action: 'approved' | 'rejected'
  /** 审核备注 */
  note?: string
}

/**
 * 删除投稿请求
 */
export interface DeleteSubmissionRequest {
  /** 投稿 ID 列表 */
  submissionIds: number[]
}
