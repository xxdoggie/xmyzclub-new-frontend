import api, { type ApiResponse } from './index'
import type {
  TallyActivity,
  ActivitySnapshot,
  TallyRecord,
} from '@/types/tally'

// ===== 公开 =====

export function getTallySnapshot(activityId: number) {
  return api.get<ApiResponse<ActivitySnapshot>>(`/tally/activities/${activityId}/snapshot`)
}

// ===== 管理端（走主 api 的 JWT）=====

export function adminListActivities() {
  return api.get<ApiResponse<TallyActivity[]>>('/admin/tally/activities')
}

export function adminGetActivity(id: number) {
  return api.get<ApiResponse<TallyActivity>>(`/admin/tally/activities/${id}`)
}

export function adminCreateActivity(title: string) {
  return api.post<ApiResponse<number>>('/admin/tally/activities', { title })
}

export function adminUpdateActivity(id: number, body: { title?: string; status?: 0 | 1 | 2 }) {
  return api.put<ApiResponse<void>>(`/admin/tally/activities/${id}`, body)
}

export function adminDeleteActivity(id: number) {
  return api.delete<ApiResponse<void>>(`/admin/tally/activities/${id}`)
}

export function adminAddCandidate(
  activityId: number,
  body: { number: string; name: string; displayOrder?: number },
) {
  return api.post<ApiResponse<number>>(`/admin/tally/activities/${activityId}/candidates`, body)
}

export function adminUpdateCandidate(
  id: number,
  body: { number?: string; name?: string; displayOrder?: number },
) {
  return api.put<ApiResponse<void>>(`/admin/tally/candidates/${id}`, body)
}

export function adminDeleteCandidate(id: number) {
  return api.delete<ApiResponse<void>>(`/admin/tally/candidates/${id}`)
}

export function adminVote(candidateId: number, delta: number) {
  return api.post<ApiResponse<void>>(`/admin/tally/candidates/${candidateId}/vote`, { delta })
}

export function adminUndo(activityId: number) {
  return api.post<ApiResponse<boolean>>(`/admin/tally/activities/${activityId}/undo`)
}

export function adminListRecords(activityId: number) {
  return api.get<ApiResponse<TallyRecord[]>>(`/admin/tally/activities/${activityId}/records`)
}

export function adminExportCsv(activityId: number) {
  return api.get(`/admin/tally/activities/${activityId}/export`, {
    responseType: 'blob',
  })
}

// ===== WebSocket =====

export function buildTallyWsUrl(activityId: number) {
  if (import.meta.env.PROD) {
    return `wss://api.xmyzstudent.com/ws/tally/activity/${activityId}`
  }
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${location.hostname}:6680/ws/tally/activity/${activityId}`
}
