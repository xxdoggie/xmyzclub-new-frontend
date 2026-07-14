import axios from 'axios'
import api, { type ApiResponse } from './index'
import type {
  ActiveRound,
  CreateRoundRequest,
  DebateRound,
  MeStatus,
  RoundResult,
  VoteRequest,
} from '@/types/debate'

/**
 * 投票相关接口需要携带 vote_token cookie，用独立 axios 实例
 * （主 api 实例不带 credentials；debate 公开接口走 cookie 鉴权）
 */
const baseURL = import.meta.env.PROD ? 'https://api.xmyzstudent.com/api/v2' : '/api/v2'

const debateApi = axios.create({
  baseURL,
  timeout: 15000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

// ============= 公开接口（携带 vote_token cookie）=============

export function getActiveRound() {
  return debateApi.get<ApiResponse<ActiveRound | null>>('/debate/active')
}

export function getRoundById(roundId: number) {
  return debateApi.get<ApiResponse<ActiveRound | null>>(`/debate/round/${roundId}`)
}

export function getMyStatus() {
  return debateApi.get<ApiResponse<MeStatus>>('/debate/me')
}

export function submitVote(req: VoteRequest) {
  return debateApi.post<ApiResponse<void>>('/debate/vote', req)
}

export function getRoundResults(roundId: number) {
  return debateApi.get<ApiResponse<RoundResult>>(`/debate/results/${roundId}`)
}

export function buildWechatLoginUrl(returnTo: string = '/vote') {
  // 直接重定向，不走 axios
  return `${baseURL}/debate/wechat/login?return=${encodeURIComponent(returnTo)}`
}

// ============= 管理接口（走主 api 的 JWT）=============

export function adminListRounds() {
  return api.get<ApiResponse<DebateRound[]>>('/admin/debate/rounds')
}

export function adminCreateRound(req: CreateRoundRequest) {
  return api.post<ApiResponse<DebateRound>>('/admin/debate/rounds', req)
}

export function adminUpdateRound(id: number, req: CreateRoundRequest) {
  return api.put<ApiResponse<DebateRound>>(`/admin/debate/rounds/${id}`, req)
}

export function adminDeleteRound(id: number) {
  return api.delete<ApiResponse<void>>(`/admin/debate/rounds/${id}`)
}

export function adminActivateRound(id: number) {
  return api.put<ApiResponse<DebateRound>>(`/admin/debate/rounds/${id}/active`)
}

export function adminLockRound(id: number) {
  return api.put<ApiResponse<void>>(`/admin/debate/rounds/${id}/lock`)
}

export function adminResetRound(id: number) {
  return api.put<ApiResponse<DebateRound>>(`/admin/debate/rounds/${id}/reset`)
}

export function adminUnlockRound(id: number, extendSeconds?: number) {
  const q = extendSeconds ? `?extendSeconds=${extendSeconds}` : ''
  return api.put<ApiResponse<void>>(`/admin/debate/rounds/${id}/unlock${q}`)
}

export function adminGetResults(id: number) {
  return api.get<ApiResponse<RoundResult>>(`/admin/debate/rounds/${id}/results`)
}

export function adminRegeneratePassword(id: number) {
  return api.put<ApiResponse<string>>(`/admin/debate/rounds/${id}/regenerate-password`)
}

// ============= 操作员端（密码授权，无需 JWT）=============

const operatorApi = axios.create({
  baseURL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

export function operatorVerify(roundId: number, password: string) {
  return operatorApi.post<ApiResponse<DebateRound>>('/debate/operator/verify', { roundId, password })
}

export function operatorUpdateRound(id: number, password: string, req: CreateRoundRequest) {
  return operatorApi.put<ApiResponse<DebateRound>>(`/debate/operator/rounds/${id}`, req, {
    headers: { 'X-Round-Password': password },
  })
}

export function operatorResetCountdown(id: number, password: string) {
  return operatorApi.put<ApiResponse<DebateRound>>(`/debate/operator/rounds/${id}/reset`, null, {
    headers: { 'X-Round-Password': password },
  })
}

export function operatorLock(id: number, password: string) {
  return operatorApi.put<ApiResponse<void>>(`/debate/operator/rounds/${id}/lock`, null, {
    headers: { 'X-Round-Password': password },
  })
}

export function operatorActivate(id: number, password: string) {
  return operatorApi.put<ApiResponse<DebateRound>>(`/debate/operator/rounds/${id}/active`, null, {
    headers: { 'X-Round-Password': password },
  })
}

// ============= WebSocket =============

export function buildDebateWsUrl(roundId: number) {
  if (import.meta.env.PROD) {
    return `wss://api.xmyzstudent.com/ws/debate/round/${roundId}`
  }
  // 开发环境：直连后端 6680
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${location.hostname}:6680/ws/debate/round/${roundId}`
}
