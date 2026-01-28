/**
 * 用户信息
 */
export interface UserInfo {
  id: number
  username: string
  nickname: string
  gender: number
  signature: string
  birthdate?: string
  createdAt?: string
  status: number
  avatar?: string
}

/**
 * 校园网用户额外信息
 */
export interface CampusInfo {
  name: string
  classAlias: string
  studentId: string
}

/**
 * QQ 用户信息 (OAuth 返回)
 */
export interface QQData {
  openid: string
  unionid?: string
  nickname?: string
  avatar?: string
}

/**
 * 登录响应数据
 */
export interface LoginResponse {
  token: string
  user: UserInfo
  expiresAt: number
  campusInfo?: CampusInfo
  isNewUser?: boolean
}

/**
 * QQ 未绑定响应数据
 */
export interface QQNeedBindingResponse {
  needBinding: true
  openid: string
  unionid?: string
  nickname?: string
  avatar?: string
}

/**
 * 登录类型
 */
export type LoginType = 'normal' | 'campus'

/**
 * 个人资料（GET /api/v2/user/profile 响应）
 */
export interface ProfileInfo {
  id: number
  username: string
  nickname: string
  gender: number // 0=未知, 1=男, 2=女
  signature: string
  birthdate?: string
  hasAvatar: boolean
  avatarUrl?: string
}

/**
 * 更新个人资料请求体
 */
export interface UpdateProfileRequest {
  nickname?: string
  gender?: number // 0=未知, 1=男, 2=女
  signature?: string
  birthdate?: string // ISO日期格式
}

/**
 * 校园网绑定信息（GET /api/v2/user/campus-binding 响应）
 */
export interface CampusBindingInfo {
  isBound: boolean
  campusAccount?: string
  address?: string
  dtype?: string
  seatNumber?: number
  classAlias?: string
  mobilePhone?: string
  name?: string
  qqBound?: boolean
  qqNumber?: string
  isClassInfoExpired?: boolean
}

/**
 * 绑定校园网请求体
 */
export interface BindCampusRequest {
  campusAccount: string
  campusPassword: string
  captchaCode: string
  jsessionId: string
}

/**
 * QQ 绑定信息（GET /api/v2/user/qq-binding 响应）
 */
export interface QQBindingInfo {
  isBound: boolean
  nickname?: string
  avatar?: string
}

/**
 * QQ 绑定授权 URL 响应
 */
export interface QQAuthorizeUrlResponse {
  authorizeUrl: string
  state: string
}

/**
 * 完成 QQ 绑定请求体
 */
export interface BindQQRequest {
  code: string
  state: string
}

/**
 * 校园网验证码响应
 */
export interface CampusCaptchaResponse {
  captchaImage: string
  jsessionId: string
  expiresAt: number
}

/**
 * 头像上传响应
 */
export interface AvatarUploadResponse {
  id: number
  fileUrl: string
  filePath: string
  fileSize: number
  fileType: string
}

/**
 * 头像信息响应
 */
export interface AvatarInfo {
  hasAvatar: boolean
  avatarUrl?: string
}

/**
 * 隐私设置
 */
export interface PrivacySettings {
  showCampusBinding: boolean
  showStatistics: boolean
  showContributions: boolean
}

/**
 * 更新隐私设置请求体
 */
export interface UpdatePrivacySettingsRequest {
  showCampusBinding?: boolean
  showStatistics?: boolean
  showContributions?: boolean
}

/**
 * 用户公开资料（GET /api/v2/user/users/{userId}/profile 响应）
 */
export interface UserPublicProfile {
  // 基本信息（始终显示）
  id: number
  nickname: string
  gender: number // 0=未知, 1=男, 2=女
  signature: string
  hasAvatar: boolean
  avatarUrl?: string
  joinDate: string // yyyy-MM-dd

  // 校园网绑定（可隐藏）
  showCampusBinding: boolean
  hasCampusBinding: boolean
  classAlias: string | null
  campusName: string | null

  // 统计数据（可隐藏）
  showStatistics: boolean
  ratingCount: number | null
  commentCount: number | null
  likeCount: number | null

  // 贡献数据（可隐藏）
  showContributions: boolean
  contributionCount: number | null
}

// ==================== 管理员用户校园网绑定管理 ====================

/**
 * 管理员搜索用户校园网绑定响应项
 */
export interface AdminUserCampusBindingItem {
  // 用户账号信息
  userId: number
  username: string
  nickname: string
  gender: number // 0=未设置, 1=男, 2=女
  signature: string | null
  status: number // 1=正常, 0=禁用
  userCreatedAt: string

  // 校园网绑定信息
  hasCampusBinding: boolean
  campusBindingId: number | null
  campusAccount: string | null
  name: string | null
  classAlias: string | null
  classId: string | null
  studentId: string | null
  mobilePhone: string | null
  address: string | null
  campusBindingCreatedAt: string | null
  campusBindingUpdatedAt: string | null
}
