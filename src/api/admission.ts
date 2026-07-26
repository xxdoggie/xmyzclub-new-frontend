import api from './index'
import type { ApiResponse } from './index'

/**
 * 新生入群校园网身份验证
 */

/** QQ 号的展示信息，用于让用户核对「这是不是我」 */
export interface QqProfile {
  qqNumber: string
  /** 群名片 / 昵称，机器人离线或查不到时为 null */
  nickname: string | null
  avatarUrl: string
  /** 是否仍在目标群内，查不到时为 null */
  inGroup: boolean | null
}

/** 打开认证链接后的信息 */
export interface TokenInfo {
  qq: QqProfile
  alreadyVerified: boolean
  verifiedName: string | null
}

/** 校园网校验通过后的结果 */
export interface VerifyResult {
  sessionId: string
  name: string
  /** 该校园网身份当前绑定在哪个 QQ 号上；null 表示没被占用 */
  conflict: QqProfile | null
}

export type ConfirmStatus = 'SUCCESS' | 'NOT_IN_GROUP' | 'UNMUTE_FAILED'

/** 认证收尾结果 */
export interface ConfirmResult {
  status: ConfirmStatus
  name: string
  qq: QqProfile
}

/** 打开认证链接，拿到链接锁定的 QQ 号信息 */
export function getTokenInfo(token: string) {
  return api.get<ApiResponse<TokenInfo>>(`/admission/token/${encodeURIComponent(token)}`)
}

/** 查任意 QQ 号的展示信息（用户自行填号时用） */
export function getQqProfile(qqNumber: string) {
  return api.get<ApiResponse<QqProfile>>('/admission/qq-profile', { params: { qqNumber } })
}

/** 校验校园网账号密码。只校验并暂存，不落库、不改禁言状态 */
export function verifyCampus(payload: {
  token?: string
  qqNumber: string
  campusAccount: string
  campusPassword: string
  captchaCode: string
  jsessionId: string
}) {
  return api.post<ApiResponse<VerifyResult>>('/admission/verify', payload)
}

/** 确认身份并解除禁言。唯一产生副作用的接口，耗时较长 */
export function confirmAdmission(sessionId: string, takeover: boolean) {
  return api.post<ApiResponse<ConfirmResult>>(
    '/admission/confirm',
    { sessionId, takeover },
    // 解禁流程要跟 QQ 来回确认，比普通请求慢得多
    { timeout: 90000 }
  )
}

/** 群机器人是否在线 */
export function getBotStatus() {
  return api.get<ApiResponse<{ botOnline: boolean }>>('/admission/status')
}
