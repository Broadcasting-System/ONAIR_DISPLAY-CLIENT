'use client'

import { useEffect, useRef } from 'react'
import type { Playback } from '@/types/display'

/* eslint-disable @typescript-eslint/no-explicit-any */

// YouTube IFrame API 를 한 번만 로드
let ytApiPromise: Promise<void> | null = null
function loadYouTubeApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if ((window as any).YT?.Player) return Promise.resolve()
  if (ytApiPromise) return ytApiPromise
  ytApiPromise = new Promise<void>((resolve) => {
    const prev = (window as any).onYouTubeIframeAPIReady
    ;(window as any).onYouTubeIframeAPIReady = () => {
      prev?.()
      resolve()
    }
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
  })
  return ytApiPromise
}

// 서버 권위 재생 위치(초)
function posFromPlayback(pb?: Playback | null): number {
  if (!pb) return 0
  if (pb.playing) return Math.max(0, pb.offset + (Date.now() - pb.anchorTs) / 1000)
  return Math.max(0, pb.offset)
}

function applyPlayback(player: any, pb: Playback | null | undefined, initial: boolean) {
  if (!player || !pb) return
  try {
    let want = posFromPlayback(pb)
    // 반복 재생: 서버 시계는 계속 증가하지만 유튜브 위치는 매 루프 0으로 리셋되므로
    // 영상 길이로 나눈 나머지로 환산(안 그러면 want가 길이를 넘어 계속 끝으로 시킹됨).
    if (pb.loop) {
      const dur = player.getDuration?.() || 0
      if (dur > 0) want = want % dur
    }
    const cur = player.getCurrentTime?.() ?? 0
    if (initial ? want > 1 : Math.abs(cur - want) > 1.5) {
      player.seekTo(want, true)
    }
    if (pb.playing) player.playVideo?.()
    else player.pauseVideo?.()
    if (pb.muted) {
      player.mute?.()
    } else {
      player.unMute?.()
      player.setVolume?.(Math.round((pb.volume ?? 1) * 100))
    }
  } catch {
    /* YT API not ready */
  }
}

/** 유튜브 송출 — IFrame Player API 로 재생. 서버 playback(재생/일시정지/소리/반복/시킹) 반영. */
export function YouTubePlayer({
  videoId,
  playback,
  onEnded,
}: {
  videoId: string
  playback?: Playback | null
  onEnded?: () => void
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<any>(null)
  const readyRef = useRef(false)
  const pbRef = useRef(playback)
  pbRef.current = playback
  const onEndedRef = useRef(onEnded)
  onEndedRef.current = onEnded

  // videoId 바뀌면 플레이어 재생성
  useEffect(() => {
    let cancelled = false
    let syncTimer: ReturnType<typeof setInterval> | undefined
    let mountEl: HTMLDivElement | null = null

    loadYouTubeApi().then(() => {
      if (cancelled || !hostRef.current) return
      const YT = (window as any).YT
      // YT 가 엘리먼트를 iframe 으로 교체하므로 자식 div 를 따로 만들어 넘긴다
      mountEl = document.createElement('div')
      mountEl.className = 'h-full w-full'
      hostRef.current.appendChild(mountEl)
      readyRef.current = false
      playerRef.current = new YT.Player(mountEl, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 1,
          controls: 0,
          mute: 1, // 자동재생 보장(음소거로 시작, 서버 playback.muted 로 제어)
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          fs: 0,
          disablekb: 1,
          iv_load_policy: 3,
        },
        events: {
          onReady: (e: any) => {
            readyRef.current = true
            applyPlayback(e.target, pbRef.current, true)
          },
          onStateChange: (e: any) => {
            const YTs = (window as any).YT?.PlayerState
            // ENDED
            if (e.data === (YTs?.ENDED ?? 0)) {
              if (pbRef.current?.loop) {
                try {
                  e.target.seekTo(0, true)
                  e.target.playVideo()
                } catch {
                  /* noop */
                }
              } else {
                onEndedRef.current?.()
              }
            }
            // PAUSED이지만 서버는 재생 상태 → 브라우저 자동재생 정책으로 멈춘 경우 복구
            if (e.data === (YTs?.PAUSED ?? 2) && pbRef.current?.playing) {
              try {
                e.target.playVideo()
              } catch {
                /* noop */
              }
            }
          },
        },
      })

      // 주기적 드리프트 보정(재생 중일 때만)
      syncTimer = setInterval(() => {
        const p = playerRef.current
        const pb = pbRef.current
        // 반복 모드는 각 디스플레이가 자연스럽게 루프하도록 두고 드리프트 보정 안 함
        // (루프 경계에서 want가 급변해 오히려 재생을 끊는 것을 방지)
        if (!readyRef.current || !p || !pb?.playing || pb.loop) return
        try {
          const want = posFromPlayback(pb)
          const cur = p.getCurrentTime?.() ?? 0
          if (Math.abs(cur - want) > 2) p.seekTo(want, true)
        } catch {
          /* noop */
        }
      }, 4000)
    })

    return () => {
      cancelled = true
      if (syncTimer) clearInterval(syncTimer)
      try {
        playerRef.current?.destroy?.()
      } catch {
        /* noop */
      }
      playerRef.current = null
      readyRef.current = false
      if (hostRef.current) hostRef.current.innerHTML = ''
    }
  }, [videoId])

  // playback 변경 반영
  useEffect(() => {
    if (readyRef.current) applyPlayback(playerRef.current, playback, false)
  }, [playback])

  return (
    <div className="h-full w-full bg-black">
      <div ref={hostRef} className="h-full w-full" />
    </div>
  )
}
