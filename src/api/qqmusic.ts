import api from './index'
import type { ApiResponse } from './index'

// ==================== 类型定义 ====================

export interface QQMusicQRCode {
  qrCodeBase64: string
  qrKey: string
  expiresIn: number
  loginType: string
}

export interface QQMusicQRCodeStatus {
  code: number
  message: string
  credential: string | null
  nickname: string | null
  avatar: string | null
}

export interface QQMusicAuthStatus {
  loggedIn: boolean
  musicid: number | null
  expiredAt: number | null
  expired: boolean
  canRefresh: boolean
  remainingSeconds: number | null
}

// ==================== API 函数 ====================

/**
 * 获取QQ音乐登录二维码
 */
export function getQRCode() {
  return api.get<ApiResponse<QQMusicQRCode>>('/qqmusic/auth/qrcode')
}

/**
 * 检查二维码扫描状态
 * @param qrKey 二维码标识
 */
export function checkQRCodeStatus(qrKey: string) {
  return api.get<ApiResponse<QQMusicQRCodeStatus>>('/qqmusic/auth/qrcode/status', {
    params: { qrKey },
  })
}

/**
 * 获取当前登录状态
 */
export function getAuthStatus() {
  return api.get<ApiResponse<QQMusicAuthStatus>>('/qqmusic/auth/status')
}
