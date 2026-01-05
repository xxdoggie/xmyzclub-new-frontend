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
