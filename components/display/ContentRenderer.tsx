import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'
import { DisplayContent, Playback, ImageOverlay } from '@/types/display'
import { StandbyScreen } from './StandbyScreen'

/** 이미지 위 텍스트 오버레이 — 부모(16:9 박스)의 컨테이너 너비(cqw) 기준으로 크기 결정 */
function ImageTextOverlay({ overlay }: { overlay: ImageOverlay }) {
  if (!overlay.visible || !overlay.text?.trim()) return null
  const justify =
    overlay.position === 'top'
      ? 'flex-start'
      : overlay.position === 'center'
        ? 'center'
        : 'flex-end'
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        containerType: 'inline-size', // cqw 기준: 이 박스(이미지 영역) 너비
        display: 'flex',
        flexDirection: 'column',
        justifyContent: justify,
        alignItems: 'center',
        padding: '6cqw',
        pointerEvents: 'none',
      }}
    >
      <span
        style={{
          fontFamily: '"Paperlogy", "Pretendard Variable", sans-serif',
          fontWeight: 800,
          fontSize: `${overlay.size}cqw`,
          lineHeight: 1.15,
          color: overlay.color || '#ffffff',
          textAlign: 'center',
          whiteSpace: 'pre-wrap',
          wordBreak: 'keep-all',
          textShadow:
            '0 0.3cqw 1.2cqw rgba(0,0,0,0.85), 0 0 0.4cqw rgba(0,0,0,0.9)',
          WebkitTextStroke: '0.08cqw rgba(0,0,0,0.55)',
        }}
      >
        {overlay.text}
      </span>
    </div>
  )
}

interface ContentRendererProps {
  content: DisplayContent | null
  onEnded: () => void
  isFullscreen: boolean
  isArmed: boolean
}

type VideoState = 'loading' | 'playing' | 'error'

const calculateSlideIndex = (content: DisplayContent | null) => {
  if (content?.type !== 'presentation' || !content.urls || !content.duration || !content.serverTimestamp) {
    return 0
  }
  const elapsedMs = Date.now() - content.serverTimestamp
  const totalDurationMs = content.duration * 1000
  const index = Math.floor(elapsedMs / totalDurationMs)
  return index < content.urls.length ? index : content.urls.length - 1
}

/** playback으로부터 현재 재생 위치(초) */
const posFromPlayback = (pb?: Playback | null): number | null => {
  if (!pb) return null
  return pb.playing
    ? Math.max(0, pb.offset + (Date.now() - pb.anchorTs) / 1000)
    : Math.max(0, pb.offset)
}

export const ContentRenderer = ({ content, onEnded, isFullscreen, isArmed }: ContentRendererProps) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(() => calculateSlideIndex(content))
  const [videoState, setVideoState] = useState<VideoState>('loading')
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const contentKey = content ? `${content.type}-${content.url ?? content.urls?.[0] ?? ''}` : 'standby'

  // 최신 playback을 미디어-로드 effect에서 참조하기 위한 ref (URL 변경 시에만 reload)
  const playbackRef = useRef<Playback | null | undefined>(content?.playback)
  playbackRef.current = content?.playback

  // playback 적용 함수 (항상 최신 클로저)
  const applyRef = useRef<(v: HTMLVideoElement, pb: Playback) => void>(() => {})
  applyRef.current = (video, pb) => {
    if (!pb) return
    video.volume = typeof pb.volume === 'number' ? pb.volume : 1
    video.muted = !!pb.muted
    // 네이티브 loop는 'ended' 이벤트를 막아버려 HLS에서 멈춤 → loop는 onEnded 핸들러로 처리
    video.loop = false

    const target = posFromPlayback(pb)
    if (target != null) {
      let seekTo = target
      if (Number.isFinite(video.duration) && video.duration > 0) {
        // 반복 재생이면 경과 위치를 길이로 나눈 나머지(현재 루프 위치)
        seekTo = pb.loop
          ? target % video.duration
          : Math.min(target, Math.max(0, video.duration - 0.2))
      }
      if (Math.abs(video.currentTime - seekTo) > 0.7) {
        try {
          video.currentTime = seekTo
        } catch {
          /* seek 불가 시 무시 */
        }
      }
    }

    if (pb.playing) {
      if (video.paused) {
        video
          .play()
          .then(() => setVideoState('playing'))
          .catch(() => {
            video.muted = true
            video.play().then(() => setVideoState('playing')).catch(() => {})
          })
      }
    } else {
      if (!video.paused) video.pause()
    }
  }

  // ---- 프레젠테이션 슬라이드 동기화 (기존) ----
  useEffect(() => {
    if (!isArmed || content?.type !== 'presentation' || !content.urls || !content.duration || !content.serverTimestamp) {
      return
    }
    const syncSlides = () => {
      const elapsedMs = Date.now() - content.serverTimestamp!
      const totalDurationMs = content.duration! * 1000
      const index = Math.floor(elapsedMs / totalDurationMs)
      if (index >= content.urls!.length) onEnded()
      else setCurrentSlideIndex((prev) => (prev !== index ? index : prev))
    }
    const intervalId = setInterval(syncSlides, 1000)
    return () => clearInterval(intervalId)
  }, [content, onEnded, isArmed])

  // ---- 미디어 로드: URL 변경 시에만 (재생제어로는 reload 안 함) ----
  useEffect(() => {
    if (!isArmed || content?.type !== 'video' || !content.url || !videoRef.current) {
      return
    }
    const video = videoRef.current
    const primary = content.url
    const fallback = content.fallbackUrl
    const serverTs = content.serverTimestamp

    let hls: Hls | null = null
    let destroyed = false
    let usedFallback = false
    let recover = 0
    let applied = false

    setVideoState('loading')

    const initialPos = () => {
      const p = posFromPlayback(playbackRef.current)
      if (p != null) return p
      return serverTs ? Math.max(0, (Date.now() - serverTs) / 1000) : 0
    }

    const onLoadedMeta = () => {
      if (applied) return
      applied = true
      const pb = playbackRef.current
      if (pb) {
        applyRef.current(video, pb)
      } else {
        // 구버전 호환: 경과 위치로 시킹 후 재생
        const t = initialPos()
        if (Number.isFinite(video.duration) && t >= video.duration - 0.3) {
          onEnded()
          return
        }
        if (t > 0.5 && Math.abs(video.currentTime - t) > 1) {
          try {
            video.currentTime = t
          } catch {}
        }
        video.play().then(() => setVideoState('playing')).catch(() => {
          video.muted = true
          video.play().catch(() => {})
        })
      }
    }
    video.addEventListener('loadedmetadata', onLoadedMeta)

    const playNative = (src: string) => {
      applied = false
      video.src = src
      video.load()
    }

    const switchToFallback = () => {
      if (destroyed) return
      if (usedFallback || !fallback) {
        setVideoState('error')
        return
      }
      usedFallback = true
      if (hls) {
        hls.destroy()
        hls = null
        hlsRef.current = null
      }
      playNative(fallback)
    }

    const isM3u8 = primary.includes('.m3u8')

    if (isM3u8 && Hls.isSupported()) {
      hls = new Hls({ maxMaxBufferLength: 30, startPosition: initialPos() })
      hlsRef.current = hls
      hls.loadSource(primary)
      hls.attachMedia(video)
      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (!data.fatal || destroyed) return
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          if (
            data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR ||
            data.details === Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT ||
            data.details === Hls.ErrorDetails.MANIFEST_PARSING_ERROR
          ) {
            switchToFallback()
          } else if (recover < 3) {
            recover += 1
            hls?.startLoad()
          } else {
            switchToFallback()
          }
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          if (recover < 3) {
            recover += 1
            hls?.recoverMediaError()
          } else {
            switchToFallback()
          }
        } else {
          switchToFallback()
        }
      })
    } else {
      playNative(primary)
    }

    const onWaiting = () => !destroyed && setVideoState('loading')
    const onPlaying = () => !destroyed && setVideoState('playing')
    video.addEventListener('waiting', onWaiting)
    video.addEventListener('playing', onPlaying)

    // 반복 재생 백업: 'ended' 이벤트(addEventListener) — JSX onEnded가 못 잡는 경우 대비
    const onEndedEvt = () => {
      if (destroyed) return
      if (playbackRef.current?.loop) {
        try {
          video.currentTime = 0
        } catch {}
        video.play().catch(() => {})
      }
    }
    video.addEventListener('ended', onEndedEvt)

    // 주기 점검: ① 반복인데 끝에서 멈춤 → 되감기 ② 재생인데 멈춤 → 복구
    const stallCheck = setInterval(() => {
      if (destroyed) return
      const pb = playbackRef.current
      const dur = video.duration
      const nearEnd =
        Number.isFinite(dur) && dur > 0 && video.currentTime >= dur - 0.4
      // 반복: 끝났거나 끝에서 멈춰있으면 처음부터
      if (pb?.loop && (video.ended || (video.paused && nearEnd))) {
        try {
          video.currentTime = 0
        } catch {}
        video.play().catch(() => {})
        return
      }
      // 재생 상태인데 멈춰있으면 복구 (일시정지는 건드리지 않음)
      if (pb?.playing && video.paused && !video.ended && video.readyState >= 2) {
        video.play().catch(() => {})
      }
    }, 700)

    return () => {
      destroyed = true
      clearInterval(stallCheck)
      video.removeEventListener('loadedmetadata', onLoadedMeta)
      video.removeEventListener('waiting', onWaiting)
      video.removeEventListener('playing', onPlaying)
      video.removeEventListener('ended', onEndedEvt)
      if (hls) hls.destroy()
      hlsRef.current = null
    }
  }, [content?.url, content?.fallbackUrl, isArmed, onEnded])

  // ---- 재생제어 적용: playback 변경 시 (reload 없이 play/pause/seek/volume) ----
  useEffect(() => {
    const v = videoRef.current
    if (!isArmed || content?.type !== 'video' || !v || !content.playback) return
    applyRef.current(v, content.playback)
  }, [isArmed, content?.type, content?.playback])

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

  const videoFit: 'cover' | 'contain' =
    content.type === 'video' ? content.playback?.fit ?? 'contain' : 'contain'

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

      <div className="absolute z-10" style={contentAreaStyle}>
        {/* 영상: contentArea를 채움 (꽉채움=cover / 여백맞춤=contain) */}
        {content.type === 'video' && content.url ? (
          <>
            <video
              ref={videoRef}
              onEnded={() => {
                // 반복 재생이면 처음부터 다시, 아니면 종료 처리
                if (playbackRef.current?.loop && videoRef.current) {
                  try {
                    videoRef.current.currentTime = 0
                  } catch {}
                  videoRef.current.play().catch(() => {})
                  return
                }
                onEnded()
              }}
              playsInline
              className="absolute inset-0 h-full w-full focus:outline-none"
              style={{ objectFit: videoFit }}
            />
            {videoState !== 'playing' && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30">
                <div className="flex flex-col items-center gap-3">
                  {videoState === 'error' ? (
                    <span className="text-white/60 text-base font-pretendard">
                      영상을 재생할 수 없습니다
                    </span>
                  ) : (
                    <>
                      <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
                      <span className="text-white/40 text-sm font-pretendard">
                        영상 불러오는 중…
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          // 이미지 / 프레젠테이션: 16:9 박스
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="relative flex items-center justify-center"
              style={{ aspectRatio: "16 / 9", maxWidth: "100%", maxHeight: "100%" }}
            >
              {content.type === 'image' && content.url ? (
                <img
                  src={content.url}
                  alt="Broadcast Image"
                  className="h-full w-full object-contain"
                  draggable={false}
                />
              ) : null}

              {content.type === 'image' && content.overlay ? (
                <ImageTextOverlay overlay={content.overlay} />
              ) : null}

              {content.type === 'presentation' && content.urls && content.urls.length > 0 ? (
                (() => {
                  // slideIndex(수동 전환)가 있으면 그걸, 없으면 시간기반 인덱스
                  const idx =
                    typeof content.slideIndex === 'number'
                      ? Math.max(0, Math.min(content.slideIndex, content.urls.length - 1))
                      : currentSlideIndex
                  return (
                    <img
                      src={content.urls[idx]}
                      alt={`Broadcast Slide ${idx + 1}`}
                      className="h-full w-full object-contain"
                      draggable={false}
                    />
                  )
                })()
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
