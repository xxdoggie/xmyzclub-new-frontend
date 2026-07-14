import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'

// ============ vConsole 调试工具 ============
// 触发方式：
//   1. URL 带 ?debug=1 → 开启并记住（localStorage），之后任意页面都生效
//   2. URL 带 ?debug=0 → 关闭并清除记录
//   3. 已开启状态下直接访问任意页面都会自动加载 vConsole
// 适合在手机微信里扫码后遇到问题时排查
const DEBUG_KEY = '__vconsole_debug__'
const urlDebug = new URLSearchParams(window.location.search).get('debug')
if (urlDebug === '1') {
  localStorage.setItem(DEBUG_KEY, '1')
} else if (urlDebug === '0') {
  localStorage.removeItem(DEBUG_KEY)
}
if (localStorage.getItem(DEBUG_KEY) === '1') {
  import('vconsole')
    .then(({ default: VConsole }) => {
      new VConsole()
      console.log('[vConsole] 已启用。URL 加 ?debug=0 关闭。')
    })
    .catch((e) => console.error('[vConsole] 加载失败', e))
}

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.mount('#app')
