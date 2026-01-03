/**
 * 用户信息
 */
export interface UserInfo {
  id: number
  username: string
  nickname: string
  gender: number
  signature: string
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
