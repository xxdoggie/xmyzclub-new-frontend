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
