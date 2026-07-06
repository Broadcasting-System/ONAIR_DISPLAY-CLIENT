'use client'

import type { DefaultBannerPayload } from '@/types/banner'

/* 텍스트 위치/크기 — 배경(6845×552 캔버스에 꽉 채움) 기준 %.
   배경의 파란 막대/정보의바다 위치에 맞춰 측정됨. 미세조정은 여기 상수만 바꾸면 됨. */
const MAIN = { leftPct: 15, centerYPct: 49, fontPx: 235 } // 좌측 대형 제목(수직 중앙)
const SUB1 = { leftPct: 72.5, centerYPct: 40, fontPx: 72 } // "정보의 바다" 오른쪽(옆 크기와 맞춤)
const SUB2 = { centerXPct: 71.4, centerYPct: 58.3, fontPx: 52 } // 파란 막대 위 중앙

const MAIN_FONT = '"HakgyoansimMoheomga", "Pretendard Variable", sans-serif'
const SUB_FONT = '"Freesentation", "Pretendard Variable", sans-serif'

/** 기본(동계캠프) 현수막 — 고정 배경 + 메인/서브1/서브2 텍스트만 교체. */
export function DefaultBannerScene({ mainText, subText1, subText2 }: DefaultBannerPayload) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#fff' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/default-banner-bg.png"
        alt=""
        draggable={false}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'fill',
          display: 'block',
        }}
      />

      {/* 메인 텍스트 — Hakgyoansim 모험가 B, 파랑→보라 그라데이션 */}
      {mainText?.trim() ? (
        <div
          style={{
            position: 'absolute',
            left: `${MAIN.leftPct}%`,
            top: `${MAIN.centerYPct}%`,
            transform: 'translateY(-50%)',
            whiteSpace: 'nowrap',
            fontFamily: MAIN_FONT,
            fontWeight: 700,
            fontSize: `${MAIN.fontPx}px`,
            lineHeight: 1,
            backgroundImage: 'linear-gradient(90deg, #16225f 0%, #3a2d86 55%, #8a2a86 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {mainText}
        </div>
      ) : null}

      {/* 서브1 — Freesentation medium, 네이비 */}
      {subText1?.trim() ? (
        <div
          style={{
            position: 'absolute',
            left: `${SUB1.leftPct}%`,
            top: `${SUB1.centerYPct}%`,
            transform: 'translateY(-50%)',
            whiteSpace: 'nowrap',
            fontFamily: SUB_FONT,
            fontWeight: 500,
            fontSize: `${SUB1.fontPx}px`,
            lineHeight: 1,
            color: '#20366b',
          }}
        >
          {subText1}
        </div>
      ) : null}

      {/* 서브2 — 파란 막대 위 중앙, Freesentation medium, 흰색 */}
      {subText2?.trim() ? (
        <div
          style={{
            position: 'absolute',
            left: `${SUB2.centerXPct}%`,
            top: `${SUB2.centerYPct}%`,
            transform: 'translate(-50%, -50%)',
            whiteSpace: 'nowrap',
            fontFamily: SUB_FONT,
            fontWeight: 500,
            fontSize: `${SUB2.fontPx}px`,
            lineHeight: 1,
            color: '#ffffff',
          }}
        >
          {subText2}
        </div>
      ) : null}
    </div>
  )
}
