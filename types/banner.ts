export type BannerScene = 'blank' | 'image' | 'gif' | 'scoreboard' | 'timer'

export type TeamState = {
  name?: string
  score: number // 메인 스코어 (현재 세트 득점)
  set?: number // 세트 스코어 (획득 세트 수)
}

export type ScoreAnim = 'slamshine' | 'slam' | 'shine' | 'neon' | 'drop' | 'collide'

export type VictoryState = {
  side: 'left' | 'right'
  name?: string
  at: number // 트리거 타임스탬프 (재발동 감지용)
} | null

export type ScoreboardPayload = {
  title: string
  subtitle: string
  titleSize?: number // 제목 폰트 크기 (디자인 px, 기본 160)
  subtitleSize?: number // 부제목 폰트 크기 (디자인 px, 기본 76)
  showSet?: boolean // 세트 스코어 표시 여부
  targetScore?: number // 몇 점 내기 (세트 승리 점수) — 매치포인트/듀스 판정용
  scoreAnim?: ScoreAnim // 득점 애니메이션 선택
  victory?: VictoryState // 승리 트리거 (있으면 승리 오버레이 표시)
  courtChange?: { at: number } | null // 코트 체인지 트리거
  teamA: TeamState
  teamB: TeamState
}

/** 현수막 이미지 위 텍스트 오버레이 — 점수보드 제목/부제목과 동일 폰트(Paperlogy).
 *  size는 6845×552 디자인 px 기준. */
export type BannerOverlay = {
  title: string
  subtitle: string
  titleSize: number // 디자인 px
  subtitleSize: number // 디자인 px
  showSubtitle: boolean
  color: string
  position: 'top' | 'center' | 'bottom'
  visible: boolean
}

export type ImagePayload = {
  url: string
  fit?: 'cover' | 'contain'
  overlay?: BannerOverlay
}

export type GifPayload = {
  url: string
}

export type TimerPayload = {
  durationSec: number
  label?: string
  mode?: 'down' | 'up'
  color?: string
}

export type BannerPayloadByScene = {
  blank: Record<string, never>
  image: ImagePayload
  gif: GifPayload
  scoreboard: ScoreboardPayload
  timer: TimerPayload
}

export type BannerState =
  | { scene: 'blank'; payload: Record<string, never> }
  | { scene: 'image'; payload: ImagePayload }
  | { scene: 'gif'; payload: GifPayload }
  | { scene: 'scoreboard'; payload: ScoreboardPayload }
  | { scene: 'timer'; payload: TimerPayload }

export type BannerWsMessage = {
  command: 'banner'
  scene: BannerScene
  payload: unknown
  serverTimestamp?: number
}

export const DEFAULT_BANNER_STATE: BannerState = {
  scene: 'blank',
  payload: {},
}
