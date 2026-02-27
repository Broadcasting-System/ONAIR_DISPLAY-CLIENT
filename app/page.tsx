'use client'

import { useCallback } from 'react'
import { Header } from '@/components/display/Header'
import { ContentRenderer } from '@/components/display/ContentRenderer'
import { useFullscreen } from '@/hooks/useFullscreen'
import { useWebSocket } from '@/hooks/useWebSocket'

export default function DisplayPage() {
  const { isFullscreen, toggleFullscreen } = useFullscreen()
  const { content, isConnected, clearContent } = useWebSocket()

  const handleMediaEnded = useCallback(() => {
    clearContent()
  }, [clearContent])

  return (
    <main className="w-full h-[100dvh] bg-black relative select-none">
      {!isFullscreen ? <Header onFullscreen={toggleFullscreen} /> : null}
      <ContentRenderer
        content={content}
        onEnded={handleMediaEnded}
        isFullscreen={isFullscreen}
      />
      {!isConnected ? (
        <div
          className="fixed z-50 flex items-center gap-2"
          style={{
            bottom: "16px",
            right: "16px",
            background: "rgba(0,0,0,0.75)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "999px",
            padding: "8px 16px",
            backdropFilter: "blur(8px)",
          }}
        >
          <span style={{ fontSize: "12px" }}>🔴</span>
          <span
            style={{
              fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif",
              fontWeight: 600,
              fontSize: "13px",
              color: "#ffffff",
              letterSpacing: "0.02em",
            }}
          >
            서버 연결 끊김
          </span>
        </div>
      ) : null}
    </main>
  )
}
