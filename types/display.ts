export type ContentType = 'image' | 'video' | 'presentation' | 'audio' | 'standby' | 'screen' | 'timer' | 'youtube' | 'switch'

/** 스위처 소스 — 서버 app/services/switcher.py 와 같은 모양 */
export type SwitchSource =
  | { kind: 'share'; id: string; name: string }
  | { kind: 'video'; url: string; fileId?: string; name: string }
  | { kind: 'image'; url: string; fileId?: string; name: string }
  | { kind: 'youtube'; videoId: string; name: string }
  | { kind: 'timer'; durationSec: number; mode: 'down' | 'up'; label: string; name: string }

export interface SwitchSlot {
  source: SwitchSource | null
  mute: boolean
  volume: number // 0..100
  startedAt: number // ms, 이 칸 소스가 바뀐 서버 시각
}

export type SwitchLayout = 'one' | 'two' | 'four' | 'pip'

export interface Playback {
  playing: boolean
  anchorTs: number // ms, playing 시작 기준 서버시각
  offset: number // sec, anchor 시점 위치
  volume: number // 0..1
  muted: boolean
  duration?: number | null
  fit?: 'contain' | 'cover' // 여백맞춤 | 꽉채움
  loop?: boolean // 반복 재생
}

/** 이미지 위 텍스트 오버레이 */
export interface ImageOverlay {
  text: string
  size: number // 컨테이너 너비 대비 % (cqw)
  color: string // hex
  position: 'top' | 'center' | 'bottom'
  visible: boolean
}

export interface DisplayContent {
  type: ContentType
  url?: string
  /** HLS(m3u8) 재생 실패 시 폴백할 직접 스트림(mp4) URL */
  fallbackUrl?: string
  urls?: string[]
  duration?: number
  serverTimestamp?: number
  playback?: Playback
  slideIndex?: number // 프레젠테이션 현재 슬라이드 (수동 전환)
  overlay?: ImageOverlay // 이미지 텍스트 오버레이
  // 타이머(type==='timer')
  label?: string
  durationSec?: number
  mode?: 'down' | 'up'
  // 유튜브(type==='youtube')
  videoId?: string
  // 화면 공유(type==='screen') — 어느 소스를 띄울지 (없으면 가장 최근)
  source?: string
  // 스위처(type==='switch')
  layout?: SwitchLayout
  slots?: SwitchSlot[]
}

export interface WebSocketMessage {
  command: 'display'
  type: ContentType
  fileId: string
  url?: string
  hlsUrl?: string
  urls?: string[]
  duration?: number
  serverTimestamp?: number
  playback?: Playback
  slideIndex?: number
  overlay?: ImageOverlay
  label?: string
  durationSec?: number
  mode?: 'down' | 'up'
  videoId?: string
  source?: string
  layout?: SwitchLayout
  slots?: SwitchSlot[]
}
