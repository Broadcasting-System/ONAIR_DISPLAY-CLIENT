'use client'

import { useCallback, useState } from 'react'
import { Header } from '@/components/display/Header'
import { ContentRenderer } from '@/components/display/ContentRenderer'
import { EntryOverlay } from '@/components/display/EntryOverlay'
import { useFullscreen } from '@/hooks/useFullscreen'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useScreenReceiver } from '@/hooks/useScreenReceiver'
import { backendBase } from '@/lib/backend'

export default function DisplayPage() {
  const [isArmed, setIsArmed] = useState(false)
  const { content, clearContent } = useWebSocket(null)
  const { stream: screenStream } = useScreenReceiver()
  const { isFullscreen, toggleFullscreen } = useFullscreen()

  const handleMediaEnded = useCallback(() => {
    clearContent()
    // 서버도 standby로 비워 컨트롤·다른 디스플레이까지 동기화
    fetch(`${backendBase()}/api/display/clear`, { method: 'POST' }).catch(() => {})
  }, [clearContent])

  const handleEnter = () => {
    setIsArmed(true)
    if (!isFullscreen) {
      toggleFullscreen()
    }
  }

  return (
    <main className="relative w-full h-[100dvh] bg-black overflow-hidden select-none">
      {!isArmed && <EntryOverlay onEnter={handleEnter} />}
      {!isFullscreen && <Header onFullscreen={toggleFullscreen} />}
      <ContentRenderer
        content={content}
        onEnded={handleMediaEnded}
        isFullscreen={isFullscreen}
        isArmed={isArmed}
        screenStream={screenStream}
      />
    </main>
  )
}
