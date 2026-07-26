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

/* ==================== 管理端 ====================
   需要 admission.manage 权限。这些接口会返回学生实名信息，
   也能直接把人移出群聊。 */

export interface AdmissionGroupSummary {
  groupId: string
  groupName: string | null
  isTarget: boolean
  pending: number
  verified: number
  kicked: number
  left: number
  exempted: number
  /** 待认证且已超期，下一轮扫描会被移出 */
  overdue: number
}

export type MemberStatus = 'pending' | 'verified' | 'kicked' | 'left'

export interface AdmissionMemberRow {
  id: number
  groupId: string
  qqNumber: string
  nickname: string | null
  avatarUrl: string
  status: MemberStatus
  exempted: boolean
  exemptedAt: string | null
  exemptedNote: string | null
  joinTime: string | null
  verifyTime: string | null
  kickTime: string | null
  muteUntil: string | null
  muteExpired: boolean
  realName: string | null
  campusAccount: string | null
  studentId: string | null
  classAlias: string | null
  boundAt: string | null
  previousQqNumber: string | null
}

export interface AdmissionMemberPage {
  members: AdmissionMemberRow[]
  total: number
  page: number
  pageSize: number
  botOnline: boolean
}

export function adminListGroups() {
  return api.get<ApiResponse<AdmissionGroupSummary[]>>('/admin/admission/groups')
}

export function adminListMembers(params: {
  groupId: string
  status?: string
  keyword?: string
  page?: number
  pageSize?: number
}) {
  return api.get<ApiResponse<AdmissionMemberPage>>('/admin/admission/members', { params })
}

/** 豁免：本群内该 QQ 不再需要实名信息，并解除其禁言 */
export function adminExempt(groupId: string, qqNumber: string, note?: string) {
  return api.post<ApiResponse<unknown>>('/admin/admission/exempt', { groupId, qqNumber, note })
}

export function adminRevokeExempt(groupId: string, qqNumber: string) {
  return api.post<ApiResponse<unknown>>('/admin/admission/revoke-exempt', { groupId, qqNumber })
}

export function adminKick(groupId: string, qqNumber: string) {
  return api.post<ApiResponse<unknown>>('/admin/admission/kick', { groupId, qqNumber })
}

/** 重发认证链接，并把认证期限重新算起 */
export function adminResendLink(groupId: string, qqNumber: string) {
  return api.post<ApiResponse<unknown>>('/admin/admission/resend', { groupId, qqNumber })
}
