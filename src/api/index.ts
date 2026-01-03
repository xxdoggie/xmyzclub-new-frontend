import axios from 'axios'
import type { AxiosError, InternalAxiosRequestConfig } from 'axios'

/**
 * API 响应基础结构
 */
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

/**
 * API 基础地址
 * 开发环境：通过 vite proxy 代理到 localhost:6666
 * 生产环境：直接访问 api.xmyzstudent.com
 */
const baseURL = import.meta.env.PROD
  ? 'https://api.xmyzstudent.com/api/v2'
  : '/api/v2'

/**
 * 创建 axios 实例
 */
const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * 请求拦截器：自动添加 token
 */
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

/**
 * 响应拦截器：处理 401 等错误
 */
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse>) => {
    // 401 未授权 - token 过期或无效
    if (error.response?.status === 401) {
      // 清除本地 token
      localStorage.removeItem('token')

      // 触发全局事件，让 App.vue 弹出登录 Modal
      window.dispatchEvent(new CustomEvent('auth:token-expired'))
    }

    return Promise.reject(error)
  }
)

export default api
