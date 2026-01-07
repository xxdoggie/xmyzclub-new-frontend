import api, { type ApiResponse } from './index'
import type {
  ProfileInfo,
  UpdateProfileRequest,
  CampusBindingInfo,
  BindCampusRequest,
  QQBindingInfo,
  QQAuthorizeUrlResponse,
  BindQQRequest,
  CampusCaptchaResponse,
  AvatarUploadResponse,
  AvatarInfo,
} from '@/types/user'

// ==================== 权限 ====================

/**
 * 获取我的权限列表
 */
export function getMyPermissions() {
  return api.get<ApiResponse<{ permissions: string[] }>>('/permissions/my')
}

// ==================== 个人资料 ====================

/**
 * 获取个人资料
 */
export function getProfile() {
  return api.get<ApiResponse<ProfileInfo>>('/user/profile')
}

/**
 * 更新个人资料
 */
export function updateProfile(data: UpdateProfileRequest) {
  return api.put<ApiResponse<ProfileInfo>>('/user/profile', data)
}

// ==================== 校园网绑定 ====================

/**
 * 获取校园网验证码（用于绑定）
 */
export function getCampusCaptcha() {
  return api.get<ApiResponse<CampusCaptchaResponse>>('/campus/captcha')
}

/**
 * 获取校园网绑定信息
 */
export function getCampusBinding() {
  return api.get<ApiResponse<CampusBindingInfo>>('/user/campus-binding')
}

/**
 * 绑定校园网
 */
export function bindCampus(data: BindCampusRequest) {
  return api.post<ApiResponse<CampusBindingInfo>>('/user/bind-campus', data)
}

/**
 * 解绑校园网
 */
export function unbindCampus() {
  return api.delete<ApiResponse<{ message: string }>>('/user/unbind-campus')
}

// ==================== QQ 绑定 ====================

/**
 * 获取 QQ 绑定信息
 */
export function getQQBinding() {
  return api.get<ApiResponse<QQBindingInfo>>('/user/qq-binding')
}

/**
 * 获取 QQ 绑定授权 URL
 */
export function getQQBindAuthorizeUrl() {
  return api.get<ApiResponse<QQAuthorizeUrlResponse>>('/user/qq/authorize-url')
}

/**
 * 完成 QQ 绑定
 */
export function bindQQ(data: BindQQRequest) {
  return api.post<ApiResponse<QQBindingInfo>>('/user/bind-qq', data)
}

/**
 * 解绑 QQ
 */
export function unbindQQ() {
  return api.delete<ApiResponse<{ message: string }>>('/user/unbind-qq')
}

// ==================== 密码管理 ====================

/**
 * 检查是否已设置密码
 */
export function checkHasPassword() {
  return api.get<ApiResponse<boolean>>('/user/has-password')
}

/**
 * 修改密码
 */
export function changePassword(data: { oldPassword?: string; newPassword: string }) {
  return api.put<ApiResponse<{ message: string }>>('/user/password', data)
}

// ==================== 头像管理 ====================

/**
 * 上传/更新头像
 */
export function uploadAvatar(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return api.post<ApiResponse<AvatarUploadResponse>>('/user/avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}

/**
 * 删除头像
 */
export function deleteAvatar() {
  return api.delete<ApiResponse<{ message: string }>>('/user/avatar')
}

/**
 * 通过用户ID获取头像（公开接口）
 */
export function getUserAvatar(userId: number) {
  return api.get<ApiResponse<AvatarInfo>>(`/user/users/${userId}/avatar`)
}
