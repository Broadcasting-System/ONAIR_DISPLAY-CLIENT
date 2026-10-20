/* eslint-disable @next/next/no-img-element -- 송출 이미지는 서버가 주는 임의 주소라 next/image 최적화를 쓰지 않는다 */
import { useEffect, useRef } from 'react'
import type { SwitchLayout, SwitchSlot } from '@/types/display'
import { CountdownView } from '@/components/CountdownView'
import { YouTubePlayer } from './YouTubePlayer'
import { resolveMediaUrl } from '@/lib/backend'

/** 스위처 송출 — 칸마다 소스를 그리고 칸마다 소리(음소거·볼륨)를 따로 맞춘다.
 *  외부 화면은 이 화면이 WebRTC 로 직접 받은 streams 에서 찾는다 (share:<요청 id>). */

type Fit = 'contain' | 'cover'

function StreamSlot({ stream, mute, volume, fit }: { stream?: MediaStream; mute: boolean; volume: number; fit: Fit }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const v = ref.current
    if (!v) return
    if (v.srcObject !== (stream ?? null)) v.srcObject = stream ?? null
    if (stream) v.play().catch(() => {})
  }, [stream])
  useEffect(() => {
    const v = ref.current
    if (!v) return
    v.muted = mute
    v.volume = Math.max(0, Math.min(1, volume / 100))
  }, [mute, volume])
  return (
    <>
      <video ref={ref} autoPlay playsInline className="absolute inset-0 h-full w-full" style={{ objectFit: fit }} />
      {!stream && <SlotNote text="연결 중" />}
    </>
  )
}

function VideoSlot({ url, startedAt, mute, volume, fit, loop }: {
  url: string
  startedAt: number
  mute: boolean
  volume: number
  fit: Fit
  loop: boolean
}) {
  const ref = useRef<HTMLVideoElement>(null)
  // 서버 시각 기준 같은 자리에서 — 송출 화면·녹화 창·미리보기가 맞게 (반복이면 길이로 나눈 나머지, 아니면 끝에서 멈춤)
  const seek = () => {
    const v = ref.current
    if (!v || !v.duration || !isFinite(v.duration)) return
    const el = Math.max(0, (Date.now() - startedAt) / 1000)
    const want = loop ? el % v.duration : Math.min(el, v.duration)
    if (Math.abs(v.currentTime - want) > 1.5) v.currentTime = want
  }
  useEffect(() => {
    const v = ref.current
    if (!v) return
    v.muted = mute
    v.volume = Math.max(0, Math.min(1, volume / 100))
    v.play().catch(() => {
      // 소리 있는 자동 재생이 막히면 음소거로라도
      v.muted = true
      v.play().catch(() => {})
    })
  }, [mute, volume])
  return (
    <video
      ref={ref}
      src={resolveMediaUrl(url)}
      autoPlay
      loop={loop}
      playsInline
      onLoadedMetadata={seek}
      className="absolute inset-0 h-full w-full"
      style={{ objectFit: fit }}
    />
  )
}

function SlotNote({ text }: { text: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <span className="font-pretendard text-white/40" style={{ fontSize: '2.4cqw' }}>
        {text}
      </span>
    </div>
  )
}

function Slot({ slot, streams }: { slot: SwitchSlot; streams: Record<string, MediaStream> }) {
  const src = slot.source
  const { mute, volume, startedAt } = slot
  // 칸마다 화면 맞춤·꽉 채움, 영상 반복 (예전 서버는 안 보내므로 기본값)
  const fit: Fit = slot.fit === 'cover' ? 'cover' : 'contain'
  const loop = slot.loop !== false
  if (!src) return null
  if (src.kind === 'share') return <StreamSlot stream={streams[`share:${src.id}`]} mute={mute} volume={volume} fit={fit} />
  if (src.kind === 'video')
    return <VideoSlot key={startedAt} url={src.url} startedAt={startedAt} mute={mute} volume={volume} fit={fit} loop={loop} />
  if (src.kind === 'image')
    return <img src={resolveMediaUrl(src.url)} alt="" className="absolute inset-0 h-full w-full" style={{ objectFit: fit }} />
  if (src.kind === 'youtube')
    return (
      <div className="absolute inset-0">
        <YouTubePlayer
          key={`${src.videoId}-${startedAt}`}
          videoId={src.videoId}
          playback={{ playing: true, anchorTs: startedAt, offset: 0, volume: volume / 100, muted: mute, loop }}
        />
      </div>
    )
  return (
    <div className="absolute inset-0">
      <CountdownView
        serverTimestamp={startedAt}
        durationSec={src.durationSec}
        mode={src.mode}
        label={src.label}
        sizeVw={22}
        unit="cqw"
      />
    </div>
  )
}

/** 칸 하나 — 16:9 안에서 그리고, 글자 크기는 칸 너비(cqw) 기준 */
function Cell({ slot, streams, className, style }: {
  slot?: SwitchSlot
  streams: Record<string, MediaStream>
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div className={`overflow-hidden bg-black ${className ?? ''}`} style={{ containerType: 'size', ...style }}>
      {slot ? <Slot slot={slot} streams={streams} /> : null}
    </div>
  )
}

export function SwitchView({ layout, slots, streams }: {
  layout?: SwitchLayout
  slots?: SwitchSlot[]
  streams: Record<string, MediaStream>
}) {
  const s = slots ?? []
  if (layout === 'pip') {
    return (
      <div className="relative h-[100dvh] w-full bg-black">
        <Cell slot={s[0]} streams={streams} className="absolute inset-0" />
        {s[1]?.source ? (
          <Cell
            slot={s[1]}
            streams={streams}
            className="absolute rounded-[0.6vw] shadow-[0_0_0_2px_rgba(255,255,255,0.35),0_1vw_3vw_rgba(0,0,0,0.6)]"
            style={{ right: '2.5%', bottom: '4%', width: '28%', aspectRatio: '16 / 9' }}
          />
        ) : null}
      </div>
    )
  }
  if (layout === 'two') {
    return (
      <div className="grid h-[100dvh] w-full grid-cols-2 items-center gap-[0.4vw] bg-black">
        <Cell slot={s[0]} streams={streams} className="relative aspect-video w-full" />
        <Cell slot={s[1]} streams={streams} className="relative aspect-video w-full" />
      </div>
    )
  }
  if (layout === 'four') {
    return (
      <div className="grid h-[100dvh] w-full grid-cols-2 grid-rows-2 gap-[0.3vw] bg-black">
        {[0, 1, 2, 3].map((i) => (
          <Cell key={i} slot={s[i]} streams={streams} className="relative h-full w-full" />
        ))}
      </div>
    )
  }
  return (
    <div className="relative h-[100dvh] w-full bg-black">
      <Cell slot={s[0]} streams={streams} className="absolute inset-0" />
    </div>
  )
}
