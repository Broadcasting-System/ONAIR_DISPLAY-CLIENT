'use client'

import { useEffect, useRef, useState } from 'react'
import {
  BannerState,
  BannerWsMessage,
  DEFAULT_BANNER_STATE,
} from '@/types/banner'
import { backendBase, backendWs } from '@/lib/backend'

/**
 * role: "display" → LIVE 카운트에 포함되는 실제 송출 연결.
 *       "control" → 컨트롤 미리보기 (카운트 제외).
 */
export function useBannerSocket(role: 'display' | 'control' = 'display') {
  const BASE = backendBase()
  const WS_BASE =
    process.env.NEXT_PUBLIC_BANNER_WS_URL || backendWs('/api/banner/ws')
  const WS_URL = `${WS_BASE}?role=${role}`
  const [state, setState] = useState<BannerState>(DEFAULT_BANNER_STATE)
  const [serverTimestamp, setServerTimestamp] = useState<number | undefined>(undefined)
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined
    let cancelled = false

    // 1) 새로고침 직후 초기 상태를 REST로 한번 받아온다 (WS 연결 지연 대응).
    fetch(`${BASE}/api/banner/state`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.scene) return
        setState({ scene: data.scene, payload: data.payload ?? {} } as BannerState)
        setServerTimestamp(data.serverTimestamp)
      })
      .catch(() => {})

    const connect = () => {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => setIsConnected(true)
      ws.onclose = () => {
        setIsConnected(false)
        if (!cancelled) reconnectTimer = setTimeout(connect, 2000)
      }
      ws.onerror = () => ws.close()

      ws.onmessage = (e) => {
        try {
          const msg: BannerWsMessage = JSON.parse(e.data)
          if (msg.command !== 'banner' || !msg.scene) return
          setState({
            scene: msg.scene,
            payload: (msg.payload ?? {}) as never,
          } as BannerState)
          setServerTimestamp(msg.serverTimestamp)
        } catch (err) {
          console.error('Failed to parse banner WS message', err)
        }
      }
    }

    connect()

    return () => {
      cancelled = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      wsRef.current?.close()
    }
  }, [])

  return { state, isConnected, serverTimestamp }
}
