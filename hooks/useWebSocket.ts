import { useState, useEffect, useCallback, useRef } from 'react'
import { DisplayContent, WebSocketMessage, ContentType } from '@/types/display'

export const useWebSocket = (initialState: DisplayContent | null) => {
  const [content, setContent] = useState<DisplayContent | null>(initialState)
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    let reconnectTimer: NodeJS.Timeout
    const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

    const resolveUrls = (data: Partial<WebSocketMessage & { fileId?: string, hlsUrl?: string }>) => {
      const type = data.type as ContentType | undefined;
      const { url, urls, fileId, hlsUrl } = data

      // hlsUrl이 명시적으로 주어지면 최우선으로 원본 재생 경로로 취급
      let finalUrl = hlsUrl || url
      let finalUrls = urls

      if (type === 'video' || type === 'image' || type === 'audio') {
        if (!finalUrl && fileId) {
          finalUrl = `/api/files/stream/${type}/${fileId}`
        }
        if (finalUrl && !finalUrl.startsWith('http')) {
          finalUrl = `${BASE}${finalUrl}`
        }
      }

      if (type === 'presentation' && finalUrls) {
        finalUrls = finalUrls.map((u: string) => u.startsWith('http') ? u : `${BASE}${u}`)
      }

      return { ...data, url: finalUrl, urls: finalUrls }
    }

    const fetchInitialStatus = async () => {
      console.log('Fetching initial status from:', `${BASE}/api/display/status`)
      try {
        const res = await fetch(`${BASE}/api/display/status`)
        if (res.ok) {
          const data = await res.json()
          console.log('Initial status received:', data)
          if (data && data.type && data.type !== 'standby') {
            const resolved = resolveUrls(data)
            setContent({
              type: resolved.type as ContentType,
              url: resolved.url,
              urls: resolved.urls,
              duration: resolved.duration,
              serverTimestamp: resolved.serverTimestamp,
            })
          }
        } else {
          console.warn('Initial status fetch failed with status:', res.status)
        }
      } catch (err) {
        console.error('Failed to fetch initial status', err)
      }
    }

    fetchInitialStatus()

    const connect = () => {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL
      if (!wsUrl) {
        console.error('NEXT_PUBLIC_WS_URL is not defined')
        return
      }

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
      ws.onerror = (err: Event) => {
        console.error('WebSocket error:', err)
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
                prev.duration === resolved.duration
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
                urls: resolved.urls || [],
                duration: resolved.duration,
                serverTimestamp: resolved.serverTimestamp,
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
  }, [])

  const clearContent = useCallback(() => {
    setContent(null)
  }, [])

  return { content, isConnected, clearContent }
}
