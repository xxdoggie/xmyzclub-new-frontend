import { onBeforeUnmount, ref, watch, type Ref } from 'vue'
import { buildTallyWsUrl } from '@/api/tally'
import type { ActivitySnapshot } from '@/types/tally'

/**
 * 订阅一个活动的实时唱票快照。
 * 自动重连（指数回退，最大 30s）。
 */
export function useTallySocket(activityId: Ref<number | null | undefined>) {
  const snapshot = ref<ActivitySnapshot | null>(null)
  const connected = ref(false)
  let ws: WebSocket | null = null
  let reconnectDelay = 1000
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let manualClose = false

  function connect(id: number) {
    cleanup()
    manualClose = false
    try {
      ws = new WebSocket(buildTallyWsUrl(id))
    } catch (e) {
      console.error('Tally WS connect failed', e)
      scheduleReconnect(id)
      return
    }

    ws.onopen = () => {
      connected.value = true
      reconnectDelay = 1000
    }
    ws.onmessage = (ev) => {
      try {
        snapshot.value = JSON.parse(ev.data) as ActivitySnapshot
      } catch (e) {
        console.error('Tally WS message parse failed', e)
      }
    }
    ws.onclose = () => {
      connected.value = false
      if (!manualClose) scheduleReconnect(id)
    }
    ws.onerror = () => {
      // onclose 会随后触发，由 close handler 重连
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
    activityId,
    (id) => {
      if (id) connect(id)
      else cleanup()
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    manualClose = true
    cleanup()
  })

  return { snapshot, connected }
}
