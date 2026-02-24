/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from 'react'
import { DisplayContent } from '@/types/display'
import { StandbyScreen } from './StandbyScreen'

interface ContentRendererProps {
  content: DisplayContent | null
  onEnded: () => void
}

export const ContentRenderer = ({ content, onEnded }: ContentRendererProps) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const contentKey = content ? `${content.type}-${content.url ?? content.urls?.[0] ?? ''}` : 'standby'

  // Presentation auto-slide logic
  useEffect(() => {
    if (content?.type === 'presentation' && content.urls && content.duration) {
      const interval = setInterval(() => {
        setCurrentSlideIndex((prev) => {
          if (prev + 1 >= (content.urls?.length || 0)) {
            clearInterval(interval)
            onEnded()
            return prev
          }
          return prev + 1
        })
      }, content.duration * 1000)

      return () => clearInterval(interval)
    }
  }, [content, onEnded])

  // Standby screen fallback
  if (!content) {
    return <StandbyScreen />
  }

  // Audio rendering with standby visualizer
  if (content.type === 'audio') {
    return (
      <>
        <StandbyScreen isAudioPlaying />
        {content.url && (
          <audio
            src={content.url}
            autoPlay
            onEnded={onEnded}
            className="hidden"
          />
        )}
      </>
    )
  }

  // Visual content renderer
  return (
    <div key={contentKey} className="flex items-center justify-center w-full h-screen bg-black overflow-hidden relative z-0">
      {content.type === 'image' && content.url && (
        <img
          src={content.url}
          alt="Broadcast Image"
          className="w-full h-full object-contain"
          draggable={false}
        />
      )}

      {content.type === 'video' && content.url && (
        <video
          src={content.url}
          autoPlay
          onEnded={onEnded}
          className="w-full h-full object-contain focus:outline-none"
        />
      )}

      {content.type === 'presentation' && content.urls && content.urls.length > 0 && (
        <img
          src={content.urls[currentSlideIndex]}
          alt={`Broadcast Slide ${currentSlideIndex + 1}`}
          className="w-full h-full object-contain"
          draggable={false}
        />
      )}
    </div>
  )
}
