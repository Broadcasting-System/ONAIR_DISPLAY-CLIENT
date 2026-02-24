'use client'

import { Header } from '@/components/display/Header'
import { ContentRenderer } from '@/components/display/ContentRenderer'
import { useFullscreen } from '@/hooks/useFullscreen'
import { useWebSocket } from '@/hooks/useWebSocket'

export default function DisplayPage() {
  const { toggleFullscreen } = useFullscreen()
  const { content, clearContent } = useWebSocket()

  const handleMediaEnded = () => {
    clearContent()
  }

  return (
    <main className="w-full h-[100dvh] bg-black relative select-none">
      <Header onFullscreen={toggleFullscreen} />
      <ContentRenderer content={content} onEnded={handleMediaEnded} />
    </main>
  )
}
