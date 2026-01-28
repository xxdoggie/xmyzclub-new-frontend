import api, { type ApiResponse } from './index'
import type { AdminUserCampusBindingItem } from '@/types/user'

// ==================== 管理员用户校园网绑定管理 ====================

/**
 * 通过校园网真实姓名搜索用户
 * @param name 校园网真实姓名（支持模糊搜索）
 */
export function searchUsersByCampusName(name: string) {
  return api.get<ApiResponse<AdminUserCampusBindingItem[]>>(
    '/admin/users/search/by-campus-name',
    { params: { name } }
  )
}

/**
 * 通过校园网账号搜索用户
 * @param campusAccount 校园网账号（支持模糊搜索）
 */
export function searchUsersByCampusAccount(campusAccount: string) {
  return api.get<ApiResponse<AdminUserCampusBindingItem[]>>(
    '/admin/users/search/by-campus-account',
    { params: { campusAccount } }
  )
}

/**
 * 通过用户信息搜索用户
 * @param params 搜索参数（至少提供一个）
 */
export function searchUsersByUserInfo(params: {
  userId?: number
  username?: string
  nickname?: string
}) {
  return api.get<ApiResponse<AdminUserCampusBindingItem[]>>(
    '/admin/users/search/by-user',
    { params }
  )
}
