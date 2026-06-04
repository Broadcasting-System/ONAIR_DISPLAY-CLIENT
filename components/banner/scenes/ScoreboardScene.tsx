'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ScoreFlash,
  CollideOverlay,
  VictoryOverlay,
  CourtChangeOverlay,
  AnnounceOverlay,
  ScoreboardAnimKeyframes,
  ScoreAnim,
} from './scoreboardAnims'
import { playScore } from '@/lib/scoreSound'

export type ScoreboardSceneProps = {
  title?: string
  subtitle?: string
  titleSize?: number
  subtitleSize?: number
  showSet?: boolean
  targetScore?: number
  scoreAnim?: ScoreAnim
  victory?: { side: 'left' | 'right'; name?: string; at: number } | null
  courtChange?: { at: number } | null
  teamA?: { name?: string; score?: number; set?: number }
  teamB?: { name?: string; score?: number; set?: number }
}

type MatchStatus =
  | { kind: 'deuce' }
  | { kind: 'matchpoint'; name?: string }
  | null

/** 매치포인트/듀스 판정 (배구식: 목표점수, 2점차 승리) */
function computeStatus(
  a: number,
  b: number,
  target: number,
  nameA?: string,
  nameB?: string,
): MatchStatus {
  if (!target || target < 2) return null
  if (a < target - 1 && b < target - 1) return null
  // 이미 승리 조건이면 표시 안 함 (운영자가 승리 선언)
  const won = (x: number, y: number) => x >= target && x - y >= 2
  if (won(a, b) || won(b, a)) return null
  if (a === b && a >= target - 1) return { kind: 'deuce' }
  const matchPoint = (x: number, y: number) => x >= target - 1 && x - y >= 1
  if (matchPoint(a, b)) return { kind: 'matchpoint', name: nameA }
  if (matchPoint(b, a)) return { kind: 'matchpoint', name: nameB }
  return null
}

const BG_URL = '/banner-bg.png'

const num = (v: unknown): number => (Number.isFinite(v as number) ? (v as number) : 0)

export function ScoreboardScene({
  title = '',
  subtitle = '',
  titleSize = 160,
  subtitleSize = 76,
  showSet = true,
  targetScore = 25,
  scoreAnim = 'slamshine',
  victory,
  courtChange,
  teamA,
  teamB,
}: ScoreboardSceneProps) {
  const courtChangeAt = courtChange?.at ?? null

  // 부제목: 두 팀 이름이 있으면 "A VS B"로 자동 구성 (코트 체인지 시 자동 swap)
  const composedSubtitle =
    teamA?.name && teamB?.name ? `${teamA.name} VS ${teamB.name}` : subtitle

  const status = computeStatus(
    num(teamA?.score),
    num(teamB?.score),
    targetScore,
    teamA?.name,
    teamB?.name,
  )

  // 세트 획득 / 매치포인트 / 듀스 → 코트체인지 스타일 1회 오버레이
  const [announce, setAnnounce] = useState<{
    key: number
    text: string
    accent: string
    color: string
  } | null>(null)
  // 코트 체인지 1회 트리거 (마운트/새로고침 시엔 0이라 안 뜸)
  const [courtFx, setCourtFx] = useState(0)
  // collide 득점 애니메이션: 화면 전체 중앙에 SCORE 합체 1회 트리거
  const [collideFx, setCollideFx] = useState(0)
  const prevSetA = useRef(num(teamA?.set))
  const prevSetB = useRef(num(teamB?.set))
  const prevStatusKey = useRef('')
  const prevCourt = useRef(courtChangeAt)
  const mounted = useRef(false)
  // collide 감지용 (메인 점수 증가 시, 코트체인지/새로고침은 제외)
  const collideMounted = useRef(false)
  const prevMainA = useRef(num(teamA?.score))
  const prevMainB = useRef(num(teamB?.score))
  const prevCourtC = useRef(courtChangeAt)

  useEffect(() => {
    const a = num(teamA?.score)
    const b = num(teamB?.score)
    if (!collideMounted.current) {
      collideMounted.current = true
      prevMainA.current = a
      prevMainB.current = b
      prevCourtC.current = courtChangeAt
      return
    }
    // 코트 체인지로 인한 좌우 swap이면 무시
    if (courtChangeAt !== prevCourtC.current) {
      prevCourtC.current = courtChangeAt
      prevMainA.current = a
      prevMainB.current = b
      return
    }
    if (scoreAnim === 'collide' && (a > prevMainA.current || b > prevMainB.current)) {
      setCollideFx((k) => k + 1)
    }
    prevMainA.current = a
    prevMainB.current = b
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamA?.score, teamB?.score, scoreAnim, courtChangeAt])

  const statusKey = status
    ? status.kind === 'deuce'
      ? 'deuce'
      : `mp:${status.name ?? ''}`
    : ''

  useEffect(() => {
    const sa = num(teamA?.set)
    const sb = num(teamB?.set)
    if (!mounted.current) {
      mounted.current = true
      prevSetA.current = sa
      prevSetB.current = sb
      prevStatusKey.current = statusKey
      prevCourt.current = courtChangeAt
      return
    }
    // 코트 체인지(좌우 swap): 코트 체인지 오버레이만 1회, 세트/매치 안내는 억제
    if (courtChangeAt !== prevCourt.current) {
      setCourtFx((k) => k + 1)
      prevCourt.current = courtChangeAt
      prevSetA.current = sa
      prevSetB.current = sb
      prevStatusKey.current = statusKey
      return
    }
    const fire = (text: string, accent: string, color: string) =>
      setAnnounce((p) => ({ key: (p?.key ?? 0) + 1, text, accent, color }))

    if (sa > prevSetA.current || sb > prevSetB.current) {
      fire('SET SCORE', 'rgba(80,255,160,0.6)', '#9dffc4')
    } else if (statusKey && statusKey !== prevStatusKey.current) {
      if (status?.kind === 'deuce') {
        fire('DEUCE', 'rgba(255,213,77,0.65)', '#ffe14d')
      } else {
        // 매치포인트는 더 강한 빨강
        fire('MATCH POINT', 'rgba(255,30,30,0.7)', '#ff3b3b')
      }
    }
    prevSetA.current = sa
    prevSetB.current = sb
    prevStatusKey.current = statusKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamA?.set, teamB?.set, statusKey, courtChangeAt])

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background:
          'radial-gradient(ellipse at center, #0d4a2c 0%, #051a10 70%, #020a06 100%)',
        color: '#fff',
        fontFamily: '"Pretendard Variable", sans-serif',
        overflow: 'hidden',
      }}
    >
      <FlipKeyframes />
      <ScoreboardAnimKeyframes />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={BG_URL}
        alt=""
        aria-hidden
        onError={(e) => {
          ;(e.currentTarget as HTMLImageElement).style.display = 'none'
        }}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 0,
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 200px',
        }}
      >
        <ScoreCluster
          main={num(teamA?.score)}
          set={num(teamA?.set)}
          showSet={showSet}
          side="left"
          scoreAnim={scoreAnim}
          courtChangeAt={courtChangeAt}
        />

        <CenterTitle
          title={title}
          subtitle={composedSubtitle}
          titleSize={titleSize}
          subtitleSize={subtitleSize}
        />

        <ScoreCluster
          main={num(teamB?.score)}
          set={num(teamB?.set)}
          showSet={showSet}
          side="right"
          scoreAnim={scoreAnim}
          courtChangeAt={courtChangeAt}
        />
      </div>

      {/* 세트 획득 / 매치포인트 / 듀스 안내 (1회) */}
      {announce ? (
        <AnnounceOverlay
          key={`announce-${announce.key}`}
          text={announce.text}
          accent={announce.accent}
          color={announce.color}
        />
      ) : null}

      {/* 코트 체인지 오버레이 — courtFx가 오를 때만 1회 (새로고침 시엔 안 뜸) */}
      {courtFx > 0 ? <CourtChangeOverlay key={`court-${courtFx}`} /> : null}

      {/* collide 득점 — 화면 전체 중앙에 SC+ORE 합체 1회 */}
      {collideFx > 0 ? <CollideOverlay key={`collide-${collideFx}`} /> : null}

      {/* 승리 오버레이 — victory가 있으면 표시 (at 변경 시 재발동) */}
      {victory ? (
        <VictoryOverlay key={`victory-${victory.at}`} side={victory.side} name={victory.name} />
      ) : null}
    </div>
  )
}

function CenterTitle({
  title,
  subtitle,
  titleSize,
  subtitleSize,
}: {
  title: string
  subtitle: string
  titleSize: number
  subtitleSize: number
}) {
  return (
    <div style={{ flex: 1, textAlign: 'center', padding: '0 40px' }}>
      <h1
        style={{
          fontFamily: '"Paperlogy", "Pretendard Variable", sans-serif',
          fontSize: titleSize,
          fontWeight: 800,
          letterSpacing: '0.01em',
          lineHeight: 1.05,
          marginBottom: subtitleSize * 0.5,
          textShadow: '0 4px 18px rgba(0,0,0,0.75)',
          whiteSpace: 'nowrap',
        }}
      >
        {title}
      </h1>
      <p
        style={{
          fontFamily: '"Paperlogy", "Pretendard Variable", sans-serif',
          fontSize: subtitleSize,
          fontWeight: 500,
          opacity: 0.95,
          letterSpacing: '0.06em',
          whiteSpace: 'nowrap',
          textShadow: '0 2px 10px rgba(0,0,0,0.6)',
        }}
      >
        {subtitle}
      </p>
    </div>
  )
}

function ScoreCluster({
  main,
  set,
  showSet,
  side,
  scoreAnim,
  courtChangeAt,
}: {
  main: number
  set: number
  showSet: boolean
  side: 'left' | 'right'
  scoreAnim: ScoreAnim
  courtChangeAt: number | null
}) {
  // 메인 점수 증가 감지 → SCORE 플래시
  const prev = useRef(main)
  const lastCourt = useRef(courtChangeAt)
  const [flashKey, setFlashKey] = useState(0)
  const [flashing, setFlashing] = useState(false)
  // collide 애니메이션: 합체 후 득점 측 메인 점수 하이라이트 펄스
  const [highlight, setHighlight] = useState(0)

  // 카드에 실제로 표시하는 메인 점수. 득점 시엔 SCORE 플래시가 끝난 뒤에
  // 갱신해서 "SCORE 날아옴 → 그 다음 점수 넘김" 순서가 보이게 한다.
  const [displayMain, setDisplayMain] = useState(main)

  useEffect(() => {
    // 코트 체인지로 인한 변경이면 SCORE 플래시 없이 즉시 반영
    if (courtChangeAt !== lastCourt.current) {
      lastCourt.current = courtChangeAt
      setFlashing(false) // 진행 중이던 플래시 취소(카드 다시 보이게)
      setDisplayMain(main)
      prev.current = main
      return
    }

    if (main > prev.current) {
      // 득점: 효과음 + SCORE 먼저 보여주고, 그 후 점수 플립
      playScore()
      setFlashKey((k) => k + 1)
      setFlashing(true)
      const tFlash = setTimeout(() => setFlashing(false), 1400) // SCORE 종료
      const tFlip = setTimeout(() => setDisplayMain(main), 1620) // 카드 재등장 후 플립
      // collide: 점수 플립 직후 득점 측 메인 점수 하이라이트
      const tHi =
        scoreAnim === 'collide'
          ? setTimeout(() => setHighlight((h) => h + 1), 1660)
          : undefined
      prev.current = main
      return () => {
        clearTimeout(tFlash)
        clearTimeout(tFlip)
        if (tHi) clearTimeout(tHi)
      }
    }
    // 감소/수정/리셋: 플래시 취소하고 즉시 반영 (플래시 중 리셋해도 카드 안 사라지게)
    setFlashing(false)
    setDisplayMain(main)
    prev.current = main
  }, [main, courtChangeAt])

  // 하이라이트 펄스: 리마운트 없이 애니메이션만 재시작(플립 끊김 방지)
  const mainHiRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (highlight === 0) return
    const el = mainHiRef.current
    if (!el) return
    el.style.animation = 'none'
    void el.offsetWidth // 리플로우 강제 → 애니메이션 재시작
    el.style.animation = 'bnScoreHi 950ms ease-out'
  }, [highlight])

  const mainBlock = (
    <div key="main" ref={mainHiRef} style={{ display: 'inline-block' }}>
      <FlipCounter value={displayMain} digits={2} scale={1} />
    </div>
  )
  const setBlock = showSet ? (
    <FlipCounter key="set" value={set} digits={1} scale={0.62} />
  ) : null

  // side에 따라 메인(바깥)/세트(안쪽) 순서
  const children =
    side === 'left' ? (
      <>
        {mainBlock}
        {setBlock}
      </>
    ) : (
      <>
        {setBlock}
        {mainBlock}
      </>
    )

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 40 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start', // 세트 점수를 메인 점수 상단에 정렬
          gap: 40,
          opacity: flashing ? 0 : 1,
          transition: 'opacity 120ms linear',
        }}
      >
        {children}
      </div>

      {/* collide는 화면 전체 중앙 오버레이(루트)에서 렌더 → 여기선 제외 */}
      {flashing && scoreAnim !== 'collide' && (
        <ScoreFlash key={flashKey} side={side} anim={scoreAnim} />
      )}
    </div>
  )
}

function FlipCounter({
  value,
  digits,
  scale,
}: {
  value: number
  digits: number
  scale: number
}) {
  const max = Math.pow(10, digits) - 1
  const chars = String(Math.max(0, Math.min(max, value)))
    .padStart(digits, '0')
    .split('')
  return (
    <div style={{ display: 'flex', gap: 22 * scale }}>
      {chars.map((d, i) => (
        <FlipCard key={i} digit={d} scale={scale} />
      ))}
    </div>
  )
}

const BASE_W = 300
const BASE_H = 440
const FLIP_MS = 600

function FlipCard({ digit, scale }: { digit: string; scale: number }) {
  const W = BASE_W * scale
  const H = BASE_H * scale
  const [current, setCurrent] = useState(digit)
  const [previous, setPrevious] = useState(digit)
  const [flipping, setFlipping] = useState(false)

  useEffect(() => {
    if (digit !== current) {
      setPrevious(current)
      setCurrent(digit)
      setFlipping(true)
      const t = setTimeout(() => setFlipping(false), FLIP_MS)
      return () => clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digit])

  return (
    <div
      style={{
        position: 'relative',
        width: W,
        height: H,
        perspective: 1200,
        filter: 'drop-shadow(0 14px 30px rgba(0,0,0,0.55))',
      }}
    >
      <CardHalf half="top" digit={current} W={W} H={H} />
      <CardHalf half="bottom" digit={flipping ? previous : current} W={W} H={H} />

      {flipping && (
        <>
          <CardHalf
            half="top"
            digit={previous}
            W={W}
            H={H}
            style={{
              transformOrigin: 'bottom',
              animation: `bannerFlipTop ${FLIP_MS}ms ease-in forwards`,
              backfaceVisibility: 'hidden',
              zIndex: 3,
            }}
          />
          <CardHalf
            half="bottom"
            digit={current}
            W={W}
            H={H}
            style={{
              transformOrigin: 'top',
              animation: `bannerFlipBottom ${FLIP_MS}ms ease-out forwards`,
              backfaceVisibility: 'hidden',
              zIndex: 2,
            }}
          />
        </>
      )}

      {/* 상단 힌지 탭 2개 (플립클락 느낌) */}
      <CardTab offset={-0.18} scale={scale} />
      <CardTab offset={0.18} scale={scale} />
    </div>
  )
}

function CardHalf({
  half,
  digit,
  W,
  H,
  style,
}: {
  half: 'top' | 'bottom'
  digit: string
  W: number
  H: number
  style?: React.CSSProperties
}) {
  const isTop = half === 'top'
  const radius = 28 * (W / BASE_W)
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        width: W,
        height: H / 2,
        top: isTop ? 0 : H / 2,
        overflow: 'hidden',
        background: isTop
          ? 'linear-gradient(#ffffff, #f1f1f1)'
          : 'linear-gradient(#e8e8e8, #f7f7f7)',
        borderRadius: isTop
          ? `${radius}px ${radius}px 0 0`
          : `0 0 ${radius}px ${radius}px`,
        // 중앙 분할선
        borderBottom: isTop ? `${Math.max(2, 3 * (W / BASE_W))}px solid #c9c9c9` : 'none',
        ...style,
      }}
    >
      <span
        style={{
          position: 'absolute',
          left: 0,
          width: W,
          height: H,
          top: isTop ? 0 : -H / 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Orbitron, sans-serif',
          fontWeight: 900,
          fontSize: 320 * (W / BASE_W),
          lineHeight: `${H}px`,
          color: '#0f0f0f',
          letterSpacing: '-0.04em',
        }}
      >
        {digit}
      </span>
    </div>
  )
}

/** 카드 상단의 힌지 탭. offset: 카드 중심 대비 비율(-0.18 = 왼쪽). */
function CardTab({ offset, scale }: { offset: number; scale: number }) {
  const W = BASE_W * scale
  const tabW = 70 * scale
  return (
    <div
      style={{
        position: 'absolute',
        top: -10 * scale,
        left: W / 2 + offset * W - tabW / 2,
        width: tabW,
        height: 18 * scale,
        background: 'rgba(6,22,12,0.92)',
        borderRadius: 5 * scale,
        zIndex: 5,
      }}
    />
  )
}

function FlipKeyframes() {
  return (
    <style>{`
      @keyframes bannerFlipTop {
        0%   { transform: rotateX(0deg); }
        100% { transform: rotateX(-90deg); }
      }
      @keyframes bannerFlipBottom {
        0%   { transform: rotateX(90deg); }
        100% { transform: rotateX(0deg); }
      }
      @keyframes bnStatusPulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.05); opacity: 0.85; }
      }
    `}</style>
  )
}
