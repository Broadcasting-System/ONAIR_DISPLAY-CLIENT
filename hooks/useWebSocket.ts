import { useState, useEffect, useCallback, useRef } from 'react'
import { DisplayContent, WebSocketMessage, ContentType } from '@/types/display'
import { backendBase, backendWs } from '@/lib/backend'

/** role: display = 실제 송출 화면(LIVE 로 센다) · control = 미리보기 · recorder = 서버 PC 의 화면 녹화 창 */
export type DisplayRole = 'display' | 'control' | 'recorder'

export const useWebSocket = (
  initialState: DisplayContent | null,
  channel: number = 1,
  role: DisplayRole = 'display',
) => {
  const [content, setContent] = useState<DisplayContent | null>(initialState)
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    let reconnectTimer: NodeJS.Timeout
    // effect가 정리된 뒤(채널 변경·언마운트) 옛 소켓의 onclose가 옛 채널로 재연결하지 않게
    let cancelled = false
    // 소켓이 먼저 상태를 줬으면 늦게 온 초기 fetch 결과로 덮어쓰지 않는다
    let gotSocketState = false
    const BASE = backendBase()

    const resolveUrls = (data: Partial<WebSocketMessage>) => {
      const type = data.type as ContentType | undefined;
      const { url, urls, fileId, hlsUrl } = data

      // hlsUrl이 명시적으로 주어지면 최우선으로 원본 재생 경로로 취급
      let finalUrl = hlsUrl || url
      let finalUrls = urls
      let fallbackUrl: string | undefined

      const streamFromFileId = (t: string) => {
        if (!fileId) return undefined
        const name = fileId.startsWith('file_') ? fileId.slice(5) : fileId
        return `/api/files/stream/${t}/${name}`
      }

      if (type === 'video' || type === 'image' || type === 'audio') {
        if (!finalUrl && fileId) {
          finalUrl = streamFromFileId(type)
        }
        // 비디오: 직접 스트림(mp4)을 HLS 폴백으로 준비
        if (type === 'video') {
          const direct = streamFromFileId('video')
          if (direct && direct !== finalUrl) fallbackUrl = direct
        }
        if (finalUrl && !finalUrl.startsWith('http')) {
          finalUrl = `${BASE}${finalUrl}`
        }
        if (fallbackUrl && !fallbackUrl.startsWith('http')) {
          fallbackUrl = `${BASE}${fallbackUrl}`
        }
      }

      if (type === 'presentation' && finalUrls) {
        finalUrls = finalUrls.map((u: string) => u.startsWith('http') ? u : `${BASE}${u}`)
      }

      return { ...data, url: finalUrl, urls: finalUrls, fallbackUrl }
    }

    const statusUrl =
      channel > 1
        ? `${BASE}/api/display/status?channel=${channel}`
        : `${BASE}/api/display/status`

    const fetchInitialStatus = async () => {
      console.log('Fetching initial status from:', statusUrl)
      try {
        const res = await fetch(statusUrl)
        if (res.ok) {
          const data = await res.json()
          console.log('Initial status received:', data)
          if (cancelled || gotSocketState) return
          if (data && data.type && data.type !== 'standby') {
            const resolved = resolveUrls(data)
            setContent({
              type: resolved.type as ContentType,
              url: resolved.url,
              fallbackUrl: resolved.fallbackUrl,
              urls: resolved.urls,
              duration: resolved.duration,
              serverTimestamp: resolved.serverTimestamp,
              playback: data.playback,
              slideIndex: data.slideIndex,
              overlay: data.overlay,
              label: data.label,
              durationSec: data.durationSec,
              mode: data.mode,
              videoId: data.videoId,
              source: data.source,
              layout: data.layout,
              slots: data.slots,
            })
          }
        } else {
          console.warn('Initial status fetch failed with status:', res.status)
        }
      } catch {
        // 보조용 초기 fetch — WebSocket 자동 재연결이 상태를 받아오므로 경고만.
        console.warn('초기 상태 fetch 실패 — WebSocket 연결로 복구 시도')
      }
    }

    fetchInitialStatus()

    let pingTimer: ReturnType<typeof setInterval> | undefined

    const connect = () => {
      if (cancelled) return
      const wsUrl = backendWs('/api/display/ws', channel, role)

      console.log('Connecting to WebSocket:', wsUrl)
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        // 헬스체크용 하트비트 — 송출 화면 생존 신호
        if (pingTimer) clearInterval(pingTimer)
        pingTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }))
        }, 5000)
      }
      ws.onclose = () => {
        if (pingTimer) clearInterval(pingTimer)
        if (cancelled) return
        console.warn('WebSocket disconnected, reconnecting...')
        setIsConnected(false)
        reconnectTimer = setTimeout(connect, 3000)
      }
      ws.onerror = () => {
        // 연결 실패는 onclose에서 자동 재연결되므로 경고 수준으로만 남김
        console.warn('WebSocket 연결 재시도 예정')
        ws.close()
      }

      ws.onmessage = (event) => {
        if (cancelled) return
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          console.log('WS message received:', message)
          if (message.command === 'display') {
            gotSocketState = true
            if (message.type === 'standby') {
              setContent(null)
              return
            }

            const resolved = resolveUrls(message)

            setContent((prev) => {
              // 새로 보낸 송출은 서버 시각(serverTimestamp)이 달라진다 — 같은 타이머를
              // 다시 보내 재시작하거나 다른 길이로 바꿔도 무시되지 않게 비교에 넣는다.
              if (
                prev &&
                prev.serverTimestamp === resolved.serverTimestamp &&
                prev.label === message.label &&
                prev.durationSec === message.durationSec &&
                prev.mode === message.mode &&
                prev.type === resolved.type &&
                prev.url === resolved.url &&
                JSON.stringify(prev.urls) === JSON.stringify(resolved.urls || []) &&
                prev.duration === resolved.duration &&
                // 재생제어(playback)·슬라이드 변경은 무시하지 않음
                JSON.stringify(prev.playback) === JSON.stringify(message.playback) &&
                prev.slideIndex === message.slideIndex &&
                prev.videoId === message.videoId &&
                prev.source === message.source &&
                prev.layout === message.layout &&
                JSON.stringify(prev.slots) === JSON.stringify(message.slots) &&
                JSON.stringify(prev.overlay) === JSON.stringify(message.overlay)
              ) {
                console.log('Redundant content update ignored')
                return prev
              }

              console.log('Updating display content:', resolved)
              if (!resolved.type) return prev

              return {
                ...prev,
                type: resolved.type as ContentType,
                url: resolved.url,
                fallbackUrl: resolved.fallbackUrl,
                urls: resolved.urls || [],
                duration: resolved.duration,
                serverTimestamp: resolved.serverTimestamp,
                playback: message.playback,
                slideIndex: message.slideIndex,
                overlay: message.overlay,
                label: message.label,
                durationSec: message.durationSec,
                mode: message.mode,
                videoId: message.videoId,
                source: message.source,
                layout: message.layout,
                slots: message.slots,
              }
            })
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message', err)
        }
      }
    }

    connect()

    return () => {
      cancelled = true
      clearTimeout(reconnectTimer)
      if (pingTimer) clearInterval(pingTimer)
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [channel, role])

  const clearContent = useCallback(() => {
    setContent(null)
  }, [])

  return { content, isConnected, clearContent }
}
