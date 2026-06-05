import { useState, useEffect, useCallback, useRef } from 'react'
import { DisplayContent, WebSocketMessage, ContentType } from '@/types/display'
import { backendBase, backendWs } from '@/lib/backend'

export const useWebSocket = (initialState: DisplayContent | null, channel: number = 1) => {
  const [content, setContent] = useState<DisplayContent | null>(initialState)
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    let reconnectTimer: NodeJS.Timeout
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

    const connect = () => {
      const wsUrl = backendWs('/api/display/ws', channel)

      console.log('Connecting to WebSocket:', wsUrl)
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
      }
      ws.onclose = () => {
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
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          console.log('WS message received:', message)
          if (message.command === 'display') {
            if (message.type === 'standby') {
              setContent(null)
              return
            }

            const resolved = resolveUrls(message)

            setContent((prev) => {
              if (
                prev &&
                prev.type === resolved.type &&
                prev.url === resolved.url &&
                JSON.stringify(prev.urls) === JSON.stringify(resolved.urls || []) &&
                prev.duration === resolved.duration &&
                // 재생제어(playback)·슬라이드 변경은 무시하지 않음
                JSON.stringify(prev.playback) === JSON.stringify(message.playback) &&
                prev.slideIndex === message.slideIndex &&
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
      clearTimeout(reconnectTimer)
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [channel])

  const clearContent = useCallback(() => {
    setContent(null)
  }, [])

  return { content, isConnected, clearContent }
}
