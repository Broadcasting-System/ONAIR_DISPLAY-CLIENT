'use client'

import { useCallback, useState } from 'react'
import { Header } from '@/components/display/Header'
import { ContentRenderer } from '@/components/display/ContentRenderer'
import { EntryOverlay } from '@/components/display/EntryOverlay'
import { useFullscreen } from '@/hooks/useFullscreen'
import { useWebSocket } from '@/hooks/useWebSocket'

export default function DisplayPage() {
  const [isArmed, setIsArmed] = useState(false)
  const { content, clearContent } = useWebSocket()
  const { isFullscreen, toggleFullscreen } = useFullscreen()

  const handleMediaEnded = useCallback(() => {
    clearContent()
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
      />
    </main>
  )
}
