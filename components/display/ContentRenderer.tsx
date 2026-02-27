import { useEffect, useState, useRef } from 'react'
import { DisplayContent } from '@/types/display'
import { StandbyScreen } from './StandbyScreen'

interface ContentRendererProps {
  content: DisplayContent | null
  onEnded: () => void
  isFullscreen: boolean
  isArmed: boolean
}

const calculateSlideIndex = (content: DisplayContent | null) => {
  if (content?.type !== 'presentation' || !content.urls || !content.duration || !content.serverTimestamp) {
    return 0
  }
  const elapsedMs = Date.now() - content.serverTimestamp
  const totalDurationMs = content.duration * 1000
  const index = Math.floor(elapsedMs / totalDurationMs)
  return index < content.urls.length ? index : content.urls.length - 1
}

export const ContentRenderer = ({ content, onEnded, isFullscreen, isArmed }: ContentRendererProps) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(() => calculateSlideIndex(content))
  const videoRef = useRef<HTMLVideoElement>(null)
  const contentKey = content ? `${content.type}-${content.url ?? content.urls?.[0] ?? ''}` : 'standby'

  useEffect(() => {
    if (!isArmed || content?.type !== 'presentation' || !content.urls || !content.duration || !content.serverTimestamp) {
      return
    }

    const syncSlides = () => {
      const elapsedMs = Date.now() - content.serverTimestamp!
      const totalDurationMs = content.duration! * 1000
      const index = Math.floor(elapsedMs / totalDurationMs)

      if (index >= content.urls!.length) {
        onEnded()
      } else {
        setCurrentSlideIndex((prev) => prev !== index ? index : prev)
      }
    }

    const intervalId = setInterval(syncSlides, 1000)
    return () => clearInterval(intervalId)
  }, [content, onEnded, isArmed])

  useEffect(() => {
    if (isArmed && content?.type === 'video' && content.serverTimestamp && videoRef.current) {
      const video = videoRef.current
      const elapsedSec = (Date.now() - content.serverTimestamp) / 1000

      const syncVideo = async () => {
        try {
          video.currentTime = elapsedSec
          await video.play()
        } catch (err) {
          console.error('Auto-play with sound blocked or sync failed', err)
          video.muted = true
          video.play().catch(e => console.error('Even muted play failed', e))
        }
      }

      syncVideo()
    }
  }, [content, isArmed])

  if (!content || content.type === 'standby') {
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
              ref={videoRef}
              src={content.url}
              onEnded={onEnded}
              playsInline
              autoPlay
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
