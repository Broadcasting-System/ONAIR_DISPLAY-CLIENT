'use client'

import { Suspense, useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Header } from '@/components/display/Header'
import { ContentRenderer } from '@/components/display/ContentRenderer'
import { EntryOverlay } from '@/components/display/EntryOverlay'
import { useFullscreen } from '@/hooks/useFullscreen'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useScreenReceiver } from '@/hooks/useScreenReceiver'
import { backendBase } from '@/lib/backend'

const MAX_CHANNELS = 5

function DisplayInner() {
  const params = useSearchParams()
  const channel = useMemo(() => {
    const raw = Number(params.get('channel'))
    return Number.isFinite(raw) && raw >= 1 && raw <= MAX_CHANNELS ? Math.floor(raw) : 1
  }, [params])

  const [isArmed, setIsArmed] = useState(false)
  const { content, clearContent } = useWebSocket(null, channel)
  const { stream: screenStream } = useScreenReceiver(channel)
  const { isFullscreen, toggleFullscreen } = useFullscreen()

  const handleMediaEnded = useCallback(() => {
    clearContent()
    // 서버도 해당 채널을 standby로 비워 컨트롤·다른 디스플레이까지 동기화
    const url =
      channel > 1
        ? `${backendBase()}/api/display/clear?channel=${channel}`
        : `${backendBase()}/api/display/clear`
    fetch(url, { method: 'POST' }).catch(() => {})
  }, [clearContent, channel])

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

export default function DisplayPage() {
  return (
    <Suspense fallback={<main className="w-full h-[100dvh] bg-black" />}>
      <DisplayInner />
    </Suspense>
  )
}
