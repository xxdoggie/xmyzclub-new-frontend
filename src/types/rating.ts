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
  topComment: TopComment | null
}

/**
 * 面包屑导航
 */
export interface Breadcrumb {
  schoolId: number
  schoolName: string
  majorSectionId: number
  majorSectionName: string
  minorSectionId: number
  minorSectionName: string
}

/**
 * 评分分布
 */
export interface ScoreDistribution {
  score: number
  count: number
  percentage: number
}

/**
 * 评论回复
 */
export interface CommentReply {
  id: number
  commentText: string
  username: string
  nickname: string
  createdAt: string
  likeCount: number
  isLiked: boolean
  isMyComment: boolean
  replyToUsername: string | null
  replyToNickname: string | null
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
  replies: CommentReply[]
}

/**
 * 我的评分
 */
export interface MyRating {
  id: number
  score: number
  commentText: string | null
  createdAt: string
  updatedAt: string
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
  scoreDistribution: ScoreDistribution[]
  comments: Comment[]
  myRating: MyRating | null
}
