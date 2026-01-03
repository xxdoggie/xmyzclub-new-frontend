import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  UserInfo,
  CampusInfo,
  QQData,
  ProfileInfo,
  UpdateProfileRequest,
  CampusBindingInfo,
  QQBindingInfo,
} from '@/types/user'
import * as authApi from '@/api/auth'
import * as userApi from '@/api/user'

const TOKEN_KEY = 'token'
const USER_KEY = 'user'
const EXPIRES_KEY = 'expiresAt'
const CAMPUS_INFO_KEY = 'campusInfo'
const PERMISSIONS_KEY = 'permissions'

export const useUserStore = defineStore('user', () => {
  // ==================== State ====================
  const token = ref<string | null>(null)
  const user = ref<UserInfo | null>(null)
  const expiresAt = ref<number | null>(null)
  const campusInfo = ref<CampusInfo | null>(null)

  // 个人资料（从 API 获取的完整信息）
  const profile = ref<ProfileInfo | null>(null)

  // 绑定信息
  const campusBinding = ref<CampusBindingInfo | null>(null)
  const qqBinding = ref<QQBindingInfo | null>(null)

  // 用户权限
  const permissions = ref<string[]>([])
  const permissionsFetched = ref(false)

  // 登录 Modal 控制
  const showLoginModal = ref(false)
  const loginModalMessage = ref<string | null>(null)

  // 登录成功后的跳转目标
  const redirectRoute = ref<string | null>(null)

  // ==================== Getters ====================
  const isLoggedIn = computed(() => {
    if (!token.value || !expiresAt.value) return false
    // 检查 token 是否过期
    return Date.now() < expiresAt.value
  })

  /**
   * 检查用户是否拥有指定权限
   */
  function hasPermission(permission: string): boolean {
    return permissions.value.includes(permission)
  }

  /**
   * 检查用户是否可以管理票务
   */
  const canManageTickets = computed(() => hasPermission('ticket.manage'))

  /**
   * 检查用户是否可以管理活动/宿舍铃声
   */
  const canManageCampaigns = computed(() => hasPermission('campaign.manage'))

  // ==================== Actions ====================

  /**
   * 从 localStorage 恢复登录状态
   * 在应用启动时调用
   */
  function restoreSession() {
    const savedToken = localStorage.getItem(TOKEN_KEY)
    const savedUser = localStorage.getItem(USER_KEY)
    const savedExpires = localStorage.getItem(EXPIRES_KEY)
    const savedCampusInfo = localStorage.getItem(CAMPUS_INFO_KEY)
    const savedPermissions = localStorage.getItem(PERMISSIONS_KEY)

    if (savedToken && savedUser && savedExpires) {
      const expires = Number(savedExpires)
      // 检查是否过期
      if (Date.now() < expires) {
        token.value = savedToken
        user.value = JSON.parse(savedUser)
        expiresAt.value = expires
        if (savedCampusInfo) {
          campusInfo.value = JSON.parse(savedCampusInfo)
        }
        if (savedPermissions) {
          permissions.value = JSON.parse(savedPermissions)
          permissionsFetched.value = true
        } else {
          // 如果没有缓存的权限，异步获取
          fetchPermissions()
        }
      } else {
        // Token 已过期，清除本地存储
        clearLocalStorage()
      }
    }
  }

  /**
   * 保存登录信息到 localStorage
   */
  function saveToLocalStorage() {
    if (token.value) {
      localStorage.setItem(TOKEN_KEY, token.value)
    }
    if (user.value) {
      localStorage.setItem(USER_KEY, JSON.stringify(user.value))
    }
    if (expiresAt.value) {
      localStorage.setItem(EXPIRES_KEY, String(expiresAt.value))
    }
    if (campusInfo.value) {
      localStorage.setItem(CAMPUS_INFO_KEY, JSON.stringify(campusInfo.value))
    }
    if (permissions.value.length > 0) {
      localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(permissions.value))
    }
  }

  /**
   * 清除 localStorage
   */
  function clearLocalStorage() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(EXPIRES_KEY)
    localStorage.removeItem(CAMPUS_INFO_KEY)
    localStorage.removeItem(PERMISSIONS_KEY)
  }

  /**
   * 设置登录数据
   */
  function setLoginData(data: {
    token: string
    user: UserInfo
    expiresAt: number
    campusInfo?: CampusInfo
  }) {
    token.value = data.token
    user.value = data.user
    // API 返回的 expiresAt 是秒级时间戳，转换为毫秒
    expiresAt.value = data.expiresAt * 1000
    campusInfo.value = data.campusInfo ?? null
    saveToLocalStorage()
    // 登录成功后获取权限
    fetchPermissions()
  }

  /**
   * 普通登录
   */
  async function login(username: string, password: string) {
    const res = await authApi.login(username, password)
    if (res.data.code === 200) {
      setLoginData(res.data.data)
    }
    return res.data
  }

  /**
   * 普通注册
   */
  async function register(username: string, password: string) {
    const res = await authApi.register(username, password)
    if (res.data.code === 200) {
      setLoginData(res.data.data)
    }
    return res.data
  }

  /**
   * 校园网登录
   */
  async function loginByCampus(
    campusAccount: string,
    campusPassword: string,
    captchaCode: string,
    jsessionId: string
  ) {
    const res = await authApi.loginByCampus(
      campusAccount,
      campusPassword,
      captchaCode,
      jsessionId
    )
    if (res.data.code === 200) {
      setLoginData(res.data.data)
    }
    return res.data
  }

  /**
   * QQ 登录（提交 code + state）
   */
  async function qqLogin(code: string, state: string) {
    const res = await authApi.qqLogin(code, state)
    if (res.data.code === 200 && 'token' in res.data.data) {
      setLoginData(res.data.data)
    }
    return res.data
  }

  /**
   * QQ 绑定已有账号
   */
  async function qqBind(username: string, password: string, qqData: QQData) {
    const res = await authApi.qqBind(username, password, qqData)
    if (res.data.code === 200) {
      setLoginData(res.data.data)
    }
    return res.data
  }

  /**
   * QQ 注册新账号
   */
  async function qqRegister(
    username: string,
    password: string,
    qqData: QQData
  ) {
    const res = await authApi.qqRegister(username, password, qqData)
    if (res.data.code === 200) {
      setLoginData(res.data.data)
    }
    return res.data
  }

  /**
   * 登出
   */
  function logout() {
    token.value = null
    user.value = null
    expiresAt.value = null
    campusInfo.value = null
    profile.value = null
    campusBinding.value = null
    qqBinding.value = null
    permissions.value = []
    permissionsFetched.value = false
    clearLocalStorage()
  }

  // ==================== 权限 ====================

  /**
   * 获取用户权限列表
   * 只在首次访问时调用（登录后或刷新页面时）
   */
  async function fetchPermissions() {
    if (permissionsFetched.value || !token.value) return

    try {
      const res = await userApi.getMyPermissions()
      if (res.data.code === 200) {
        permissions.value = res.data.data.permissions
        permissionsFetched.value = true
        // 保存到 localStorage
        localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(permissions.value))
      }
    } catch (error) {
      console.error('Failed to fetch permissions:', error)
    }
  }

  // ==================== 个人资料 ====================

  /**
   * 获取个人资料
   */
  async function fetchProfile() {
    const res = await userApi.getProfile()
    if (res.data.code === 200) {
      profile.value = res.data.data
    }
    return res.data
  }

  /**
   * 更新个人资料
   */
  async function updateProfile(data: UpdateProfileRequest) {
    const res = await userApi.updateProfile(data)
    if (res.data.code === 200) {
      profile.value = res.data.data
      // 同步更新 user 中的相关字段
      if (user.value) {
        if (data.nickname !== undefined) user.value.nickname = data.nickname
        if (data.gender !== undefined) user.value.gender = data.gender
        if (data.signature !== undefined) user.value.signature = data.signature
        if (data.birthdate !== undefined) user.value.birthdate = data.birthdate
        saveToLocalStorage()
      }
    }
    return res.data
  }

  // ==================== 校园网绑定 ====================

  /**
   * 获取校园网绑定信息
   */
  async function fetchCampusBinding() {
    const res = await userApi.getCampusBinding()
    if (res.data.code === 200) {
      campusBinding.value = res.data.data
    }
    return res.data
  }

  /**
   * 绑定校园网
   */
  async function bindCampus(
    campusAccount: string,
    campusPassword: string,
    captchaCode: string,
    jsessionId: string
  ) {
    const res = await userApi.bindCampus({
      campusAccount,
      campusPassword,
      captchaCode,
      jsessionId,
    })
    if (res.data.code === 200) {
      campusBinding.value = res.data.data
    }
    return res.data
  }

  /**
   * 解绑校园网
   */
  async function unbindCampus() {
    const res = await userApi.unbindCampus()
    if (res.data.code === 200) {
      campusBinding.value = { isBound: false }
      campusInfo.value = null
      saveToLocalStorage()
    }
    return res.data
  }

  // ==================== QQ 绑定 ====================

  /**
   * 获取 QQ 绑定信息
   */
  async function fetchQQBinding() {
    const res = await userApi.getQQBinding()
    if (res.data.code === 200) {
      qqBinding.value = res.data.data
    }
    return res.data
  }

  /**
   * 获取 QQ 绑定授权 URL
   */
  async function getQQBindAuthorizeUrl() {
    return userApi.getQQBindAuthorizeUrl()
  }

  /**
   * 完成 QQ 绑定
   */
  async function bindQQ(code: string, state: string) {
    const res = await userApi.bindQQ({ code, state })
    if (res.data.code === 200) {
      qqBinding.value = res.data.data
    }
    return res.data
  }

  /**
   * 解绑 QQ
   */
  async function unbindQQ() {
    const res = await userApi.unbindQQ()
    if (res.data.code === 200) {
      qqBinding.value = { isBound: false }
    }
    return res.data
  }

  /**
   * 打开登录 Modal
   */
  function openLoginModal(message?: string) {
    loginModalMessage.value = message ?? null
    showLoginModal.value = true
  }

  /**
   * 关闭登录 Modal
   */
  function closeLoginModal() {
    showLoginModal.value = false
    loginModalMessage.value = null
  }

  /**
   * 设置登录后的跳转路由
   */
  function setRedirectRoute(route: string | null) {
    redirectRoute.value = route
  }

  /**
   * 获取并清除跳转路由
   */
  function consumeRedirectRoute(): string | null {
    const route = redirectRoute.value
    redirectRoute.value = null
    return route
  }

  return {
    // State
    token,
    user,
    expiresAt,
    campusInfo,
    profile,
    campusBinding,
    qqBinding,
    permissions,
    showLoginModal,
    loginModalMessage,
    redirectRoute,

    // Getters
    isLoggedIn,
    canManageTickets,
    canManageCampaigns,

    // Actions - 认证
    restoreSession,
    login,
    register,
    loginByCampus,
    qqLogin,
    qqBind,
    qqRegister,
    logout,

    // Actions - 权限
    hasPermission,
    fetchPermissions,

    // Actions - 个人资料
    fetchProfile,
    updateProfile,

    // Actions - 校园网绑定
    fetchCampusBinding,
    bindCampus,
    unbindCampus,

    // Actions - QQ 绑定
    fetchQQBinding,
    getQQBindAuthorizeUrl,
    bindQQ,
    unbindQQ,

    // Actions - Modal 控制
    openLoginModal,
    closeLoginModal,
    setRedirectRoute,
    consumeRedirectRoute,
  }
})
