import { onBeforeUnmount, ref, watch, type Ref } from 'vue'
import { buildDebateWsUrl } from '@/api/debate'
import type { RoundResult } from '@/types/debate'

/**
 * 订阅一个场次的实时投票结果
 * 自动重连（指数回退，最大 30s）
 */
export function useDebateSocket(roundId: Ref<number | null | undefined>) {
  const result = ref<RoundResult | null>(null)
  const connected = ref(false)
  let ws: WebSocket | null = null
  let reconnectDelay = 1000
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let manualClose = false

  function connect(id: number) {
    cleanup()
    manualClose = false
    try {
      ws = new WebSocket(buildDebateWsUrl(id))
    } catch (e) {
      console.error('WS connect failed', e)
      scheduleReconnect(id)
      return
    }

    ws.onopen = () => {
      connected.value = true
      reconnectDelay = 1000
    }
    ws.onmessage = (ev) => {
      try {
        result.value = JSON.parse(ev.data) as RoundResult
      } catch (e) {
        console.error('WS message parse failed', e)
      }
    }
    ws.onclose = () => {
      connected.value = false
      if (!manualClose) scheduleReconnect(id)
    }
    ws.onerror = () => {
      // onclose will fire after onerror; let close handler reconnect
    }
  }

  function scheduleReconnect(id: number) {
    if (reconnectTimer) clearTimeout(reconnectTimer)
    reconnectTimer = setTimeout(() => connect(id), reconnectDelay)
    reconnectDelay = Math.min(reconnectDelay * 2, 30_000)
  }

  function cleanup() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    if (ws) {
      manualClose = true
      try {
        ws.close()
      } catch {
        // ignore
      }
      ws = null
    }
  }

  watch(
    roundId,
    (id) => {
      if (id) connect(id)
      else cleanup()
    },
    { immediate: true }
  )

  onBeforeUnmount(() => {
    manualClose = true
    cleanup()
  })

  return { result, connected }
}
