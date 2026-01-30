import api, { type ApiResponse } from './index'
import type {
  SmsSendResponse,
  SmsLoginResponse,
  SmsBindingInfo,
  SmsCheckResponse,
} from '@/types/user'

// ==================== 短信验证码 ====================

/**
 * 发送短信验证码
 * @param phoneNumber 手机号（11位）
 * @param purpose 用途：login/register/bind_phone/reset_password
 */
export function sendSmsCode(phoneNumber: string, purpose: string) {
  return api.post<ApiResponse<SmsSendResponse>>('/sms/send', {
    phoneNumber,
    purpose,
  })
}

/**
 * 验证短信验证码
 * @param phoneNumber 手机号
 * @param code 验证码（6位数字）
 * @param purpose 用途（需与发送时一致）
 */
export function verifySmsCode(phoneNumber: string, code: string, purpose: string) {
  return api.post<ApiResponse<null>>('/sms/verify', {
    phoneNumber,
    code,
    purpose,
  })
}

// ==================== 手机号登录/注册 ====================

/**
 * 手机号登录
 * 如果手机号未绑定账号，会自动创建新账号
 * @param phoneNumber 手机号
 * @param code 验证码
 */
export function smsLogin(phoneNumber: string, code: string) {
  return api.post<ApiResponse<SmsLoginResponse>>('/sms/login', {
    phoneNumber,
    code,
  })
}

/**
 * 手机号注册
 * 与登录接口的区别是可以指定用户名和密码
 * @param phoneNumber 手机号
 * @param code 验证码
 * @param username 用户名（可选，不填则自动生成）
 * @param password 密码（可选，不填则后续可设置）
 */
export function smsRegister(
  phoneNumber: string,
  code: string,
  username?: string,
  password?: string
) {
  return api.post<ApiResponse<SmsLoginResponse>>('/sms/register', {
    phoneNumber,
    code,
    username,
    password,
  })
}

// ==================== 手机号绑定 ====================

/**
 * 绑定手机号
 * 需要 JWT Token
 * @param phoneNumber 手机号
 * @param code 验证码（purpose=bind_phone）
 */
export function bindPhone(phoneNumber: string, code: string) {
  return api.post<ApiResponse<null>>('/sms/bind', {
    phoneNumber,
    code,
  })
}

/**
 * 解绑手机号
 * 需要 JWT Token
 */
export function unbindPhone() {
  return api.delete<ApiResponse<null>>('/sms/unbind')
}

/**
 * 获取当前用户绑定的手机号
 * 需要 JWT Token
 */
export function getPhoneBinding() {
  return api.get<ApiResponse<SmsBindingInfo>>('/sms/binding')
}

/**
 * 检查手机号是否已被绑定
 * @param phoneNumber 手机号
 */
export function checkPhoneBound(phoneNumber: string) {
  return api.get<ApiResponse<SmsCheckResponse>>('/sms/check', {
    params: { phoneNumber },
  })
}
