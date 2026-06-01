export type ContentType = 'image' | 'video' | 'presentation' | 'audio' | 'standby'

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
}
