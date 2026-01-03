import api, { type ApiResponse } from './index'
import type {
  LoginResponse,
  QQData,
  QQNeedBindingResponse,
} from '@/types/user'

// ==================== 普通账号 ====================

/**
 * 普通账号注册
 */
export function register(username: string, password: string) {
  return api.post<ApiResponse<LoginResponse>>('/auth/register', {
    username,
    password,
  })
}

/**
 * 普通账号登录
 */
export function login(username: string, password: string) {
  return api.post<ApiResponse<LoginResponse>>('/auth/login', {
    loginType: 'normal',
    username,
    password,
  })
}

// ==================== 校园网登录 ====================

/**
 * 校园网验证码响应
 */
export interface CampusCaptchaResponse {
  captchaImage: string
  jsessionId: string
}

/**
 * 获取校园网验证码
 */
export function getCampusCaptcha() {
  return api.get<ApiResponse<CampusCaptchaResponse>>('/campus/captcha')
}

/**
 * 校园网登录
 */
export function loginByCampus(
  campusAccount: string,
  campusPassword: string,
  captchaCode: string,
  jsessionId: string
) {
  return api.post<ApiResponse<LoginResponse>>('/auth/login', {
    loginType: 'campus',
    campusAccount,
    campusPassword,
    captchaCode,
    jsessionId,
  })
}

// ==================== QQ 登录 ====================

/**
 * QQ 授权 URL 响应
 */
export interface QQAuthorizeUrlResponse {
  authorizeUrl: string
  state: string
}

/**
 * 获取 QQ 授权 URL
 */
export function getQQAuthorizeUrl() {
  return api.get<ApiResponse<QQAuthorizeUrlResponse>>('/auth/qq/authorize-url')
}

/**
 * QQ 登录（提交 code + state）
 * 返回登录成功 或 需要绑定
 */
export function qqLogin(code: string, state: string) {
  return api.post<ApiResponse<LoginResponse | QQNeedBindingResponse>>(
    '/auth/qq-login',
    { code, state }
  )
}

/**
 * QQ 绑定已有账号
 */
export function qqBind(username: string, password: string, qqData: QQData) {
  return api.post<ApiResponse<LoginResponse>>('/auth/qq-bind', {
    username,
    password,
    qqData,
  })
}

/**
 * QQ 注册新账号
 */
export function qqRegister(
  username: string,
  password: string,
  qqData: QQData
) {
  return api.post<ApiResponse<LoginResponse>>('/auth/qq-register', {
    username,
    password,
    qqData,
  })
}
