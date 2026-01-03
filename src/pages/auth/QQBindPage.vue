<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import type { QQData } from '@/types/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

type Mode = 'choose' | 'bind' | 'register'
const mode = ref<Mode>('choose')
const loading = ref(false)
const errorMessage = ref('')

const qqData = reactive<QQData>({
  openid: '',
  unionid: '',
  nickname: '',
  avatar: '',
})

const bindForm = reactive({
  username: '',
  password: '',
})

const registerForm = reactive({
  username: '',
  password: '',
})

onMounted(() => {
  const { openid, unionid, nickname, avatar } = route.query
  if (!openid) {
    router.push('/')
    return
  }
  qqData.openid = openid as string
  qqData.unionid = (unionid as string) || undefined
  qqData.nickname = (nickname as string) || undefined
  qqData.avatar = (avatar as string) || undefined
})

async function handleBind() {
  if (!bindForm.username || !bindForm.password) {
    errorMessage.value = '请填写用户名和密码'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    const result = await userStore.qqBind(
      bindForm.username,
      bindForm.password,
      qqData
    )
    if (result.code === 200) {
      const redirect = userStore.consumeRedirectRoute()
      router.push(redirect || '/')
    } else {
      errorMessage.value = result.message || '绑定失败'
    }
  } catch (err) {
    errorMessage.value = '网络错误'
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  if (!registerForm.username || !registerForm.password) {
    errorMessage.value = '请填写用户名和密码'
    return
  }
  if (registerForm.password.length < 6) {
    errorMessage.value = '密码至少 6 位'
    return
  }
  if (!/^[a-zA-Z0-9_]+$/.test(registerForm.username)) {
    errorMessage.value = '用户名只能包含英文字母、数字和下划线'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    const result = await userStore.qqRegister(
      registerForm.username,
      registerForm.password,
      qqData
    )
    if (result.code === 200) {
      const redirect = userStore.consumeRedirectRoute()
      router.push(redirect || '/')
    } else {
      errorMessage.value = result.message || '注册失败'
    }
  } catch (err) {
    errorMessage.value = '网络错误'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="qq-bind-page">
    <div class="card">
      <!-- QQ 用户信息 -->
      <div class="qq-info">
        <img
          v-if="qqData.avatar"
          :src="qqData.avatar"
          alt="头像"
          class="qq-avatar"
        />
        <div v-else class="qq-avatar-placeholder">QQ</div>
        <span class="qq-nickname">{{ qqData.nickname || 'QQ用户' }}</span>
      </div>

      <!-- 选择模式 -->
      <div v-if="mode === 'choose'" class="mode-choose">
        <h2>请选择操作</h2>
        <p class="hint">该 QQ 尚未绑定账号，请选择：</p>
        <div class="button-group">
          <button class="btn btn-primary" @click="mode = 'bind'">
            绑定已有账号
          </button>
          <button class="btn btn-secondary" @click="mode = 'register'">
            注册新账号
          </button>
        </div>
      </div>

      <!-- 绑定已有账号 -->
      <div v-else-if="mode === 'bind'" class="form-section">
        <h2>绑定已有账号</h2>
        <div class="form-group">
          <label>用户名</label>
          <input
            v-model="bindForm.username"
            type="text"
            placeholder="请输入用户名"
            :disabled="loading"
          />
        </div>
        <div class="form-group">
          <label>密码</label>
          <input
            v-model="bindForm.password"
            type="password"
            placeholder="请输入密码"
            :disabled="loading"
          />
        </div>
        <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
        <div class="button-group">
          <button
            class="btn btn-primary"
            :disabled="loading"
            @click="handleBind"
          >
            {{ loading ? '绑定中...' : '确认绑定' }}
          </button>
          <button
            class="btn btn-text"
            :disabled="loading"
            @click="mode = 'choose'"
          >
            返回
          </button>
        </div>
      </div>

      <!-- 注册新账号 -->
      <div v-else-if="mode === 'register'" class="form-section">
        <h2>注册新账号</h2>
        <div class="form-group">
          <label>用户名</label>
          <input
            v-model="registerForm.username"
            type="text"
            placeholder="英文字母、数字、下划线"
            :disabled="loading"
          />
        </div>
        <div class="form-group">
          <label>密码</label>
          <input
            v-model="registerForm.password"
            type="password"
            placeholder="至少 6 位"
            :disabled="loading"
          />
        </div>
        <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
        <div class="button-group">
          <button
            class="btn btn-primary"
            :disabled="loading"
            @click="handleRegister"
          >
            {{ loading ? '注册中...' : '确认注册' }}
          </button>
          <button
            class="btn btn-text"
            :disabled="loading"
            @click="mode = 'choose'"
          >
            返回
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.qq-bind-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg);
  padding: var(--spacing-md);
}

.card {
  width: 100%;
  max-width: 400px;
  background: var(--color-card);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
  box-shadow: var(--shadow-lg);
}

.qq-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-xl);
  padding-bottom: var(--spacing-lg);
  border-bottom: 1px solid var(--color-border);
}

.qq-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
}

.qq-avatar-placeholder {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-bold);
}

.qq-nickname {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-text);
}

.mode-choose h2,
.form-section h2 {
  text-align: center;
  font-size: var(--text-xl);
  margin-bottom: var(--spacing-sm);
  color: var(--color-text);
}

.hint {
  text-align: center;
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-lg);
}

.form-group {
  margin-bottom: var(--spacing-md);
}

.form-group label {
  display: block;
  margin-bottom: var(--spacing-xs);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.form-group input {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  background: var(--color-bg);
  color: var(--color-text);
}

.form-group input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.form-group input:disabled {
  opacity: 0.6;
}

.error-message {
  color: var(--color-error);
  font-size: var(--text-sm);
  margin-bottom: var(--spacing-md);
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
  border: none;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.btn-secondary {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  color: var(--color-text);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-border);
}

.btn-text {
  background: transparent;
  color: var(--color-text-secondary);
}

.btn-text:hover:not(:disabled) {
  color: var(--color-text);
}
</style>
