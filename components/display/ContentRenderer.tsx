/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from 'react'
import { DisplayContent } from '@/types/display'
import { StandbyScreen } from './StandbyScreen'

interface ContentRendererProps {
  content: DisplayContent | null
  onEnded: () => void
  isFullscreen: boolean
}

export const ContentRenderer = ({ content, onEnded, isFullscreen }: ContentRendererProps) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const contentKey = content ? `${content.type}-${content.url ?? content.urls?.[0] ?? ''}` : 'standby'

  useEffect(() => {
    if (content?.type !== 'presentation' || !content.urls || !content.duration) return
    const intervalId = setInterval(() => {
      setCurrentSlideIndex((prev) => {
        const next = prev + 1
        if (next >= (content.urls?.length ?? 0)) {
          clearInterval(intervalId)
          onEnded()
          return prev
        }
        return next
      })
    }, content.duration * 1000)
    return () => clearInterval(intervalId)
  }, [content, onEnded])

  if (!content) {
    return <StandbyScreen isFullscreen={isFullscreen} />
  }

  if (content.type === 'audio') {
    return (
      <>
        <StandbyScreen isAudioPlaying isFullscreen={isFullscreen} />
        {content.url ? (
          <audio src={content.url} autoPlay onEnded={onEnded} className="hidden" />
        ) : null}
      </>
    )
  }

  const contentAreaStyle = isFullscreen
    ? { top: 0, left: 0, right: 0, bottom: 0 }
    : { top: "140px", left: "58px", right: "58px", bottom: "40px" }

  return (
    <div
      key={contentKey}
      className="relative w-full h-[100dvh] bg-[#101010] overflow-hidden"
    >
      <div className="pointer-events-none absolute inset-0 opacity-20" style={{ zIndex: 0 }}>
        <img
          src="/onair_background.png"
          alt=""
          className="absolute w-full h-full object-cover"
          draggable={false}
        />
      </div>

      <div
        className="absolute z-10 flex items-center justify-center"
        style={contentAreaStyle}
      >
        <div
          className="relative flex items-center justify-center"
          style={{
            aspectRatio: "16 / 9",
            maxWidth: "100%",
            maxHeight: "100%",
          }}
        >
          {content.type === 'image' && content.url ? (
            <img
              src={content.url}
              alt="Broadcast Image"
              className="w-full h-full object-contain"
              draggable={false}
            />
          ) : null}

          {content.type === 'video' && content.url ? (
            <video
              src={content.url}
              autoPlay
              onEnded={onEnded}
              className="w-full h-full object-contain focus:outline-none"
            />
          ) : null}

          {content.type === 'presentation' && content.urls && content.urls.length > 0 ? (
            <img
              src={content.urls[currentSlideIndex]}
              alt={`Broadcast Slide ${currentSlideIndex + 1}`}
              className="w-full h-full object-contain"
              draggable={false}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
