'use client'

import { CSSProperties } from 'react'

export type ScoreAnim = 'slamshine' | 'slam' | 'shine' | 'neon' | 'drop' | 'collide'

const SCORE_FONT: CSSProperties = {
  fontFamily: '"SDDystopianDemo", Orbitron, sans-serif',
  fontWeight: 400,
  fontSize: 420,
  lineHeight: 1,
  letterSpacing: '0.02em',
  whiteSpace: 'nowrap',
}

const GREEN_GLOW = '0 0 60px rgba(80,255,160,0.95), 0 8px 28px rgba(0,0,0,0.75)'
const GOLD_GLOW = '0 0 70px rgba(255,225,77,0.9), 0 8px 30px rgba(0,0,0,0.85)'

/* =========================== 득점 애니메이션 =========================== */

export function ScoreFlash({
  side,
  anim,
}: {
  side: 'left' | 'right'
  anim: ScoreAnim
}) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        [side]: 120,
        display: 'flex',
        alignItems: 'center',
        pointerEvents: 'none',
        animation: 'bnHold 1600ms ease-out forwards',
      }}
    >
      {anim === 'shine' ? (
        <Shine />
      ) : anim === 'neon' ? (
        <Neon />
      ) : anim === 'drop' ? (
        <Drop />
      ) : anim === 'slam' ? (
        <Slam />
      ) : (
        // 기본: 임팩트 + 샤인
        <ImpactShineWord text="SCORE" accent="#fff" glow={GREEN_GLOW} />
      )}
    </div>
  )
}

/**
 * 임팩트(쾅 착지 + 흔들림 + 발광) → 끝에 샤인 스윕(빛줄기가 글자를 훑음).
 * 득점 SCORE / 승리 WIN 모두 재사용.
 */
export function ImpactShineWord({
  text,
  accent,
  glow,
}: {
  text: string
  accent: string
  glow: string
}) {
  return (
    <div style={{ position: 'relative', animation: 'bnSlamShake 1400ms ease-out forwards' }}>
      {/* 착지 임팩트 발광 버스트 */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: '-25% -12%',
          borderRadius: '50%',
          background:
            'radial-gradient(ellipse at center, rgba(255,255,255,0.45) 0%, transparent 65%)',
          animation: 'bnBurst 1400ms ease-out forwards',
        }}
      />
      {/* 글자 박스 (레이아웃은 scale=1 기준 고정 → 샤인 클론과 정렬됨) */}
      <div style={{ position: 'relative', display: 'inline-block' }}>
        {/* 베이스: 원래 밝기 그대로 */}
        <span
          style={{
            ...SCORE_FONT,
            display: 'inline-block',
            color: accent,
            textShadow: glow,
            animation: 'bnSlam 1400ms cubic-bezier(0.15,0.85,0.25,1) forwards',
          }}
        >
          {text}
        </span>
        {/* 샤인 레이어: 글자 글리프에 빛줄기(background-clip: text) + 강한 블룸.
            베이스를 어둡게 하지 않고 글로우 헤일로로 훑는 효과를 낸다. */}
        <span
          aria-hidden
          style={{
            ...SCORE_FONT,
            position: 'absolute',
            top: 0,
            left: 0,
            display: 'inline-block',
            backgroundImage:
              'linear-gradient(100deg, transparent 42%, rgba(255,255,255,1) 50%, transparent 58%)',
            backgroundSize: '300% 100%',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: '200% 0',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            WebkitTextFillColor: 'transparent',
            filter:
              'drop-shadow(0 0 36px rgba(255,255,255,1)) drop-shadow(0 0 16px rgba(150,255,200,1)) drop-shadow(0 0 6px rgba(255,255,255,1))',
            opacity: 0,
            animation: 'bnShineBg 850ms 600ms ease-out forwards',
          }}
        >
          {text}
        </span>
      </div>
    </div>
  )
}

function Slam() {
  return <ImpactShineWordNoShine text="SCORE" accent="#fff" glow={GREEN_GLOW} />
}

function ImpactShineWordNoShine({
  text,
  accent,
  glow,
}: {
  text: string
  accent: string
  glow: string
}) {
  return (
    <div style={{ position: 'relative', animation: 'bnSlamShake 1400ms ease-out forwards' }}>
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: '-20% -10%',
          borderRadius: '50%',
          background:
            'radial-gradient(ellipse at center, rgba(80,255,160,0.55) 0%, transparent 65%)',
          animation: 'bnBurst 1400ms ease-out forwards',
        }}
      />
      <span
        style={{
          ...SCORE_FONT,
          position: 'relative',
          display: 'inline-block',
          color: accent,
          textShadow: glow,
          animation: 'bnSlam 1400ms cubic-bezier(0.15,0.85,0.25,1) forwards',
        }}
      >
        {text}
      </span>
    </div>
  )
}

function Shine() {
  return (
    <div style={{ position: 'relative', overflow: 'hidden', display: 'inline-block' }}>
      <span
        style={{
          ...SCORE_FONT,
          display: 'inline-block',
          color: '#fff',
          textShadow: GREEN_GLOW,
          animation: 'bnFadeUp 480ms ease-out forwards',
        }}
      >
        SCORE
      </span>
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: '55%',
          background:
            'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.95) 50%, transparent 70%)',
          mixBlendMode: 'overlay',
          transform: 'translateX(-180%)',
          animation: 'bnShine 1100ms 240ms ease-in-out forwards',
        }}
      />
    </div>
  )
}

function Neon() {
  return (
    <span
      style={{
        ...SCORE_FONT,
        display: 'inline-block',
        color: '#fff',
        animation: 'bnNeon 1500ms ease-out forwards',
      }}
    >
      SCORE
    </span>
  )
}

function Drop() {
  const letters = 'SCORE'.split('')
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {letters.map((c, i) => (
        <span
          key={i}
          style={{
            ...SCORE_FONT,
            display: 'inline-block',
            color: '#fff',
            textShadow: GREEN_GLOW,
            opacity: 0,
            animation: `bnDrop 640ms ${i * 70}ms cubic-bezier(0.3,1.5,0.5,1) forwards`,
          }}
        >
          {c}
        </span>
      ))}
    </div>
  )
}

/** collide 득점 오버레이 — 화면 전체 정중앙에 SCORE 합체 (좌/우 영역 아님) */
export function CollideOverlay() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 43,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {/* 가독성용 옅은 중앙 비네팅 */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 40% 90% at center, rgba(0,0,0,0.45) 0%, transparent 70%)',
          animation: 'bnHold 1600ms ease-out forwards',
        }}
      />
      <div style={{ position: 'relative', animation: 'bnHold 1600ms ease-out forwards' }}>
        <CollideWord />
      </div>
    </div>
  )
}

/** SC(왼쪽)·ORE(오른쪽)가 날아와 가운데서 콱 부딪혀 SCORE로 합체 + 충돌 플래시 */
function CollideWord() {
  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        animation: 'bnCollideShake 320ms 360ms ease-out',
      }}
    >
      {/* 충돌 플래시 */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: '55%',
          height: '130%',
          transform: 'translate(-50%,-50%)',
          borderRadius: '50%',
          background:
            'radial-gradient(ellipse at center, rgba(255,255,255,0.55) 0%, rgba(125,255,176,0.35) 35%, transparent 65%)',
          opacity: 0,
          animation: 'bnAnnFlash 520ms 360ms ease-out forwards',
        }}
      />
      <span
        style={{
          ...SCORE_FONT,
          display: 'inline-block',
          color: '#fff',
          textShadow: GREEN_GLOW,
          opacity: 0,
          animation: 'bnCollideL 560ms cubic-bezier(0.18,0.85,0.2,1) forwards',
        }}
      >
        SC
      </span>
      <span
        style={{
          ...SCORE_FONT,
          display: 'inline-block',
          color: '#fff',
          textShadow: GREEN_GLOW,
          opacity: 0,
          animation: 'bnCollideR 560ms cubic-bezier(0.18,0.85,0.2,1) forwards',
        }}
      >
        ORE
      </span>
    </div>
  )
}

/* =========================== 승리 애니메이션 (임팩트+샤인 WIN) =========================== */

export function VictoryOverlay({
  side,
  name,
}: {
  side: 'left' | 'right'
  name?: string
}) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: side === 'left' ? 'flex-start' : 'flex-end',
        padding: '0 200px',
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          animation: 'bnFade 500ms ease-out forwards',
        }}
      />
      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
        {name ? (
          <div
            style={{
              fontFamily: '"Paperlogy", "Pretendard Variable", sans-serif',
              fontWeight: 800,
              fontSize: 120,
              color: '#fff',
              textShadow: '0 4px 20px rgba(0,0,0,0.85)',
              marginBottom: 8,
              animation: 'bnFadeUp 600ms 200ms both',
            }}
          >
            {name}
          </div>
        ) : null}
        <ImpactShineWord
          text="WIN"
          accent="#7dffb0"
          glow="0 0 70px rgba(80,255,160,0.95), 0 8px 30px rgba(0,0,0,0.85)"
        />
      </div>
    </div>
  )
}

/* =========================== 코트 체인지 애니메이션 =========================== */

export function CourtChangeOverlay() {
  const sky = 'rgba(90,184,255,0.55)'
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {/* 백드롭 */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(4,12,24,0.5)',
          animation: 'bnCourtBg 1600ms ease-out forwards',
        }}
      />
      {/* 좌우 교차(swap) 빔 A: 왼→오 */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: '38%',
          background: `linear-gradient(100deg, transparent 0%, ${sky} 50%, transparent 100%)`,
          transform: 'translateX(-170%) skewX(-16deg)',
          animation: 'bnCourtBeamA 900ms ease-in-out forwards',
        }}
      />
      {/* 좌우 교차(swap) 빔 B: 오→왼 (A와 엇갈려 교차 = 코트 스왑) */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: 0,
          width: '38%',
          background: `linear-gradient(-100deg, transparent 0%, ${sky} 50%, transparent 100%)`,
          transform: 'translateX(170%) skewX(16deg)',
          animation: 'bnCourtBeamB 900ms ease-in-out forwards',
        }}
      />
      {/* 텍스트 — 코트가 뒤집히듯 3D 회전하며 등장 (SCORE와 동일 폰트) */}
      <span
        style={{
          position: 'relative',
          zIndex: 2,
          transformStyle: 'preserve-3d',
          fontFamily: '"SDDystopianDemo", Orbitron, sans-serif',
          fontWeight: 400,
          fontSize: 300,
          lineHeight: 1,
          letterSpacing: '0.02em',
          color: '#cfeaff',
          whiteSpace: 'nowrap',
          textShadow: '0 0 60px rgba(90,184,255,0.95), 0 8px 28px rgba(0,0,0,0.85)',
          animation: 'bnCourtFlip 1600ms cubic-bezier(0.2,1.1,0.25,1) forwards',
        }}
      >
        COURT CHANGE
      </span>
    </div>
  )
}

/* =========================== 공용 announce 오버레이 =========================== */
// 세트 획득 / 매치포인트 / 듀스 안내. 글자를 쪼개 양옆에서 날아와 콱 박히는 연출.
// accent: 스윕·글로우 색, color: 글자색.
export function AnnounceOverlay({
  text,
  accent,
  color,
}: {
  text: string
  accent: string
  color: string
}) {
  const chars = text.split('')
  // 글자들이 거의 동시에 착지하는 시각(ms) — 충격파/흔들림 타이밍 기준
  const IMPACT = 560

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 42,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {/* 백드롭 */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(4,12,24,0.5)',
          animation: 'bnCourtBg 1600ms ease-out forwards',
        }}
      />
      {/* 착지 충격파 링 */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          width: 200,
          height: 200,
          borderRadius: '50%',
          border: `6px solid ${accent}`,
          boxShadow: `0 0 80px ${accent}`,
          opacity: 0,
          animation: `bnAnnShock 700ms ${IMPACT}ms cubic-bezier(0.1,0.7,0.3,1) forwards`,
        }}
      />
      {/* 착지 백색 플래시 */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at center, rgba(255,255,255,0.5) 0%, transparent 55%)',
          opacity: 0,
          animation: `bnAnnFlash 480ms ${IMPACT}ms ease-out forwards`,
        }}
      />
      {/* 글자 — 양옆에서 날아와 착지 후 흔들림 (바깥 div는 유지 후 페이드아웃) */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          animation: 'bnAnnHold 1600ms ease-out forwards',
        }}
      >
       <div
        style={{
          display: 'flex',
          alignItems: 'center',
          whiteSpace: 'nowrap',
          animation: `bnAnnShake 360ms ${IMPACT}ms ease-out`,
        }}
       >
        {chars.map((c, i) => {
          if (c === ' ') return <span key={i} style={{ width: 80 }} />
          const fromLeft = i % 2 === 0
          // 가운데에서 멀수록 살짝 먼저 출발 → 거의 동시에 착지
          const delay = Math.max(0, IMPACT - 520 - i * 6)
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                fontFamily: '"SDDystopianDemo", Orbitron, sans-serif',
                fontWeight: 400,
                fontSize: 300,
                lineHeight: 1,
                letterSpacing: '0.02em',
                color,
                textShadow: `0 0 60px ${accent}, 0 8px 28px rgba(0,0,0,0.85)`,
                opacity: 0,
                animation: `${fromLeft ? 'bnAnnFlyL' : 'bnAnnFlyR'} 560ms ${delay}ms cubic-bezier(0.2,0.9,0.2,1) forwards`,
              }}
            >
              {c}
            </span>
          )
        })}
       </div>
      </div>
    </div>
  )
}

/* =========================== 키프레임 =========================== */

export function ScoreboardAnimKeyframes() {
  return (
    <style>{`
      @keyframes bnHold {
        0% { opacity: 0; } 5% { opacity: 1; } 86% { opacity: 1; } 100% { opacity: 0; }
      }
      @keyframes bnFade { 0% { opacity: 0; } 100% { opacity: 1; } }

      @keyframes bnSlam {
        0% { opacity: 0; transform: scale(2.7); filter: blur(8px); }
        11% { opacity: 1; transform: scale(0.9); filter: blur(0); }
        17% { transform: scale(1.05); } 23% { transform: scale(0.99); }
        28% { transform: scale(1); } 100% { opacity: 1; transform: scale(1); }
      }
      @keyframes bnSlamShake {
        0%,11% { transform: translate(0,0); }
        13% { transform: translate(-14px,5px); } 16% { transform: translate(11px,-4px); }
        19% { transform: translate(-8px,3px); } 22% { transform: translate(5px,-2px); }
        25%,100% { transform: translate(0,0); }
      }
      @keyframes bnBurst {
        0% { opacity: 0; transform: scale(0.4); }
        11% { opacity: 0.9; transform: scale(1.15); }
        26%,100% { opacity: 0; transform: scale(1.4); }
      }

      /* 샤인 (글자 글리프 클립 스윕) */
      @keyframes bnShineBg {
        0% { background-position: 220% 0; opacity: 0; }
        12% { opacity: 1; }
        88% { opacity: 1; }
        100% { background-position: -120% 0; opacity: 0; }
      }

      /* 독립 샤인(바) */
      @keyframes bnFadeUp {
        0% { opacity: 0; transform: translateY(24px) scale(0.96); }
        100% { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes bnShine {
        0% { transform: translateX(-180%) skewX(-12deg); }
        100% { transform: translateX(320%) skewX(-12deg); }
      }

      /* 네온 */
      @keyframes bnNeon {
        0% { opacity: 0; text-shadow: none; }
        8% { opacity: 1; } 10% { opacity: 0.2; } 14% { opacity: 1; } 16% { opacity: 0.35; }
        20% { opacity: 1; text-shadow: 0 0 30px rgba(80,255,160,0.8); }
        24% { opacity: 0.6; } 28% { opacity: 1; }
        100% { opacity: 1; text-shadow: 0 0 60px rgba(80,255,160,0.95), 0 0 20px rgba(80,255,160,0.9); }
      }

      /* 바운스 드롭 */
      @keyframes bnDrop {
        0% { opacity: 0; transform: translateY(-440px); }
        60% { opacity: 1; transform: translateY(22px); }
        80% { transform: translateY(-8px); }
        100% { opacity: 1; transform: translateY(0); }
      }

      /* 코트 체인지 */
      @keyframes bnCourtBg {
        0% { opacity: 0; } 12% { opacity: 1; } 80% { opacity: 1; } 100% { opacity: 0; }
      }
      @keyframes bnCourtSwipe {
        0% { transform: translateX(-160%) skewX(-12deg); }
        100% { transform: translateX(340%) skewX(-12deg); }
      }
      @keyframes bnCourtText {
        0% { opacity: 0; transform: scale(0.5); }
        58% { opacity: 1; transform: scale(1.06); }
        72% { transform: scale(1); }
        84% { opacity: 1; }
        100% { opacity: 0; transform: scale(1); }
      }
      /* 코트 스왑 교차 빔 */
      @keyframes bnCourtBeamA {
        0% { transform: translateX(-170%) skewX(-16deg); }
        100% { transform: translateX(360%) skewX(-16deg); }
      }
      @keyframes bnCourtBeamB {
        0% { transform: translateX(170%) skewX(16deg); }
        100% { transform: translateX(-360%) skewX(16deg); }
      }
      /* 코트 체인지 텍스트: 뒤집히듯 3D 회전 등장 → 유지 → 페이드 */
      @keyframes bnCourtFlip {
        0%   { opacity: 0; transform: perspective(1400px) rotateY(-100deg) scale(1.12); }
        22%  { opacity: 1; transform: perspective(1400px) rotateY(14deg) scale(1.02); }
        33%  { transform: perspective(1400px) rotateY(-7deg) scale(1); }
        44%  { transform: perspective(1400px) rotateY(0deg) scale(1); }
        82%  { opacity: 1; transform: perspective(1400px) rotateY(0deg) scale(1); }
        100% { opacity: 0; transform: perspective(1400px) rotateY(0deg) scale(1.03); }
      }

      /* announce: 글자 쪼개 양옆에서 날아와 콱 박힘 */
      @keyframes bnAnnFlyL {
        0%   { opacity: 0; transform: translateX(-118vw) rotate(-16deg) scale(1.5); filter: blur(6px); }
        55%  { opacity: 1; filter: blur(0); }
        72%  { transform: translateX(26px) rotate(4deg) scale(1.04); }
        86%  { transform: translateX(-8px) rotate(-1deg) scale(0.99); }
        100% { opacity: 1; transform: translateX(0) rotate(0) scale(1); }
      }
      @keyframes bnAnnFlyR {
        0%   { opacity: 0; transform: translateX(118vw) rotate(16deg) scale(1.5); filter: blur(6px); }
        55%  { opacity: 1; filter: blur(0); }
        72%  { transform: translateX(-26px) rotate(-4deg) scale(1.04); }
        86%  { transform: translateX(8px) rotate(1deg) scale(0.99); }
        100% { opacity: 1; transform: translateX(0) rotate(0) scale(1); }
      }
      @keyframes bnAnnShake {
        0% { transform: translate(0,0); }
        20% { transform: translate(-12px,4px); }
        40% { transform: translate(9px,-3px); }
        60% { transform: translate(-6px,2px); }
        80% { transform: translate(3px,-1px); }
        100% { transform: translate(0,0); }
      }
      @keyframes bnAnnShock {
        0% { opacity: 0; transform: scale(0.2); }
        18% { opacity: 0.95; }
        100% { opacity: 0; transform: scale(7); }
      }
      @keyframes bnAnnFlash {
        0% { opacity: 0; }
        14% { opacity: 1; }
        100% { opacity: 0; }
      }
      @keyframes bnAnnHold {
        0% { opacity: 1; } 82% { opacity: 1; } 100% { opacity: 0; }
      }

      /* collide: SC 왼쪽 끝 / ORE 오른쪽 끝(디자인 px)에서 날아와 정중앙 충돌(오버슈트)→합체 */
      @keyframes bnCollideL {
        0%   { opacity: 0; transform: translateX(-3600px) rotate(-8deg); }
        55%  { opacity: 1; }
        68%  { transform: translateX(30px) rotate(3deg); }   /* 중앙 넘어 부딪힘 */
        82%  { transform: translateX(-8px) rotate(-1deg); }
        100% { opacity: 1; transform: translateX(0) rotate(0); }
      }
      @keyframes bnCollideR {
        0%   { opacity: 0; transform: translateX(3600px) rotate(8deg); }
        55%  { opacity: 1; }
        68%  { transform: translateX(-30px) rotate(-3deg); }
        82%  { transform: translateX(8px) rotate(1deg); }
        100% { opacity: 1; transform: translateX(0) rotate(0); }
      }
      @keyframes bnCollideShake {
        0% { transform: translate(0,0); }
        25% { transform: translate(0,-7px); }
        50% { transform: translate(0,4px); }
        75% { transform: translate(0,-2px); }
        100% { transform: translate(0,0); }
      }

      /* 득점 측 점수 하이라이트 펄스 (collide 전용) */
      @keyframes bnScoreHi {
        0%   { transform: scale(1); filter: drop-shadow(0 0 0 rgba(125,255,176,0)); }
        22%  { transform: scale(1.14); filter: drop-shadow(0 0 48px rgba(125,255,176,0.95)); }
        100% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(125,255,176,0)); }
      }
    `}</style>
  )
}
