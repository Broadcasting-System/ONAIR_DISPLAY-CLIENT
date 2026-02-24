import { useState, useEffect, useCallback, useRef } from 'react'
import { DisplayContent, WebSocketMessage } from '@/types/display'

export const useWebSocket = () => {
  const [content, setContent] = useState<DisplayContent | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    let reconnectTimer: NodeJS.Timeout

    const connect = () => {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL
      if (!wsUrl) return

      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => setIsConnected(true)
      ws.onclose = () => {
        setIsConnected(false)
        reconnectTimer = setTimeout(connect, 3000)
      }
      ws.onerror = () => ws.close()

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || ''

          if (message.command === 'display') {
            // 서버에서 직접 전체 URL(message.url)을 내려주면 그것을 우선 사용
            // 아닐 경우 기존 방식(fileId 조합)으로 폴백
            const finalUrl = message.url || (message.fileId ? `${apiBaseUrl}/uploads/${message.fileId}` : undefined)

            setContent({
              type: message.type,
              url: finalUrl,
              urls: message.urls || [],
              duration: message.duration,
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
