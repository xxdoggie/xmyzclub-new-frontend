import type { Campus, TimePeriod, Building } from './dorm'

// ==================== 活动基本信息 ====================

/**
 * 活动阶段状态
 */
export type StageStatus = 'pending' | 'active' | 'completed'

/**
 * 活动阶段类型
 */
export type StageType = 'submission' | 'review' | 'voting' | 'result'

/**
 * 活动状态
 */
export type CampaignStatus = 'active' | 'completed' | 'draft' | 'cancelled'

/**
 * 活动阶段（详细版本，用于活动详情）
 */
export interface CampaignStage {
  /** 阶段ID */
  id: number
  /** 阶段类型: submission=投稿, review=审核, voting=投票, result=公示 */
  stageType: StageType
  /** 阶段名称 */
  stageName: string
  /** 阶段顺序 */
  stageOrder: number
  /** 阶段开始时间 */
  startTime: string
  /** 阶段结束时间 */
  endTime: string | null
  /** 阶段状态: pending=未开始, active=进行中, completed=已完成 */
  status: StageStatus
  /** 阶段配置（如投票阶段的每时段投票数等） */
  config: Record<string, unknown> | null
  /** 阶段描述 */
  description?: string
}

/**
 * 当前阶段信息（简化版本，用于列表）
 */
export interface CurrentStage {
  /** 阶段ID */
  id: number
  /** 阶段类型 */
  stageType: StageType
  /** 阶段名称 */
  stageName: string
  /** 阶段顺序 */
  stageOrder?: number
  /** 开始时间 */
  startTime?: string
  /** 结束时间 */
  endTime?: string
  /** 阶段状态 */
  status: StageStatus
}

/**
 * 全局配置
 */
export interface GlobalConfig {
  /** 是否允许多次投稿 */
  allowMultipleSubmissions: boolean
  /** 每时段最多投稿数 */
  maxSubmissionsPerPeriod: number
  /** 投票模式: unified=统一投票（海沧校区）, per_building=分宿舍投票（思明校区） */
  votingMode: 'unified' | 'per_building'
}

/**
 * 活动信息
 */
export interface Campaign {
  id: number
  /** 活动标题 */
  title: string
  /** 活动描述 */
  description: string
  /** 关联的校区 */
  campus: Campus
  /** 活动状态: active=进行中, completed=已完成, draft=草稿, cancelled=已取消 */
  status: CampaignStatus
  /** 当前阶段 */
  currentStage: CurrentStage | null
  /** 全局配置（仅在详情接口返回） */
  globalConfig?: GlobalConfig
  /** 铃声时段列表（仅在详情接口返回） */
  timePeriods?: TimePeriod[]
  /** 宿舍楼列表（仅在详情接口返回） */
  buildings?: Building[]
  /** 阶段配置（仅在详情接口返回） */
  stages?: CampaignStage[]
  /** 创建者ID */
  createdBy: number
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
}

// ==================== 审核相关 ====================

/**
 * 音乐信息（来自QQ音乐等服务）
 */
export interface MusicInfo {
  id: number
  /** 音乐服务ID */
  musicServiceId: string
  /** 音乐MID */
  mid: string
  /** 歌曲名称 */
  song: string
  /** 副标题 */
  subtitle: string
  /** 歌手 */
  singer: string
  /** 专辑 */
  album: string
  /** 时长（如 "3分54秒"） */
  interval: string
  /** 封面图URL */
  cover: string
  /** 播放链接 */
  link: string
}

/**
 * 按音乐分组的投稿项
 */
export interface SubmissionItem {
  /** 音乐信息 */
  music: MusicInfo
  /** 投稿数量 */
  submissionCount: number
  /** 投稿ID列表 */
  submissionIds: number[]
}

/**
 * 按时段分组的投稿（审核接口响应）
 */
export interface TimePeriodSubmissions {
  /** 铃声时段 */
  timePeriod: TimePeriod
  /** 该时段的投稿列表（按音乐分组） */
  submissions: SubmissionItem[]
}

// ==================== 投票结果相关 ====================

/**
 * 投票选项
 */
export interface VotingOption {
  /** 选项ID */
  id: number
  /** 音乐信息 */
  music: MusicInfo
  /** 目标宿舍楼列表 */
  targetBuildings: string[]
  /** 得票数 */
  voteCount: number
}

/**
 * 宿舍楼投票结果
 */
export interface BuildingVotingResult {
  /** 宿舍楼代码 */
  buildingCode: string
  /** 宿舍楼名称 */
  buildingName: string
  /** 总投票数 */
  totalVotes: number
  /** 投票选项列表 */
  options: VotingOption[]
}

/**
 * 按时段分组的投票结果
 */
export interface TimePeriodVotingResult {
  /** 铃声时段 */
  timePeriod: TimePeriod
  /** 各宿舍楼的投票结果 */
  buildingResults: BuildingVotingResult[]
}

// ==================== 请求类型 ====================

/**
 * 创建活动阶段请求
 */
export interface CreateCampaignStageRequest {
  /** 阶段类型 */
  stageType: StageType
  /** 阶段名称 */
  stageName: string
  /** 阶段顺序 */
  stageOrder: number
  /** 开始时间 */
  startTime: string
  /** 结束时间 */
  endTime: string
  /** 阶段配置 */
  config?: Record<string, unknown>
  /** 阶段描述 */
  description?: string
}

/**
 * 创建活动请求
 */
export interface CreateCampaignRequest {
  title: string
  description: string
  campusId: number
  timePeriodIds?: number[]
  buildingIds?: number[]
  stages: CreateCampaignStageRequest[]
  globalConfig: GlobalConfig
}

/**
 * 更新活动请求
 */
export interface UpdateCampaignRequest {
  title?: string
  description?: string
  campusId?: number
  timePeriodIds?: number[]
  buildingIds?: number[]
  stages?: CreateCampaignStageRequest[]
  globalConfig?: GlobalConfig
  status?: CampaignStatus
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
