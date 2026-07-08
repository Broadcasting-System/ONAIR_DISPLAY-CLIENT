'use client'

import type { ImagePayload } from '@/types/banner'
import { resolveMediaUrl } from '@/lib/backend'

export function ImageScene({ url, fit = 'cover', overlay }: ImagePayload) {
  if (!url) return null
  const src = resolveMediaUrl(url)
  const hasTitle = !!overlay?.title?.trim()
  const hasSub = !!overlay?.showSubtitle && !!overlay?.subtitle?.trim()
  const showText = !!overlay?.visible && (hasTitle || hasSub)
  // 옛/부분 데이터로 size가 비어도 NaN이 안 나도록 보정
  const titleSize = Number.isFinite(overlay?.titleSize) ? overlay!.titleSize : 240
  const subtitleSize = Number.isFinite(overlay?.subtitleSize)
    ? overlay!.subtitleSize
    : 120
  const justify =
    overlay?.position === 'top'
      ? 'flex-start'
      : overlay?.position === 'center'
        ? 'center'
        : 'flex-end'
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#000',
      }}
    >
      {/* 6845x552 캔버스에 맞춰 그대로 렌더. img 태그가 next/image보다 풀-블리드에 단순. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        style={{
          width: '100%',
          height: '100%',
          objectFit: fit,
          display: 'block',
        }}
        draggable={false}
      />

      {/* 텍스트 오버레이 — 점수보드 제목/부제목과 동일 폰트(Paperlogy), 그림자·외곽선 없음.
          size는 디자인 px(스테이지가 자동 스케일). */}
      {showText && overlay ? (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: justify,
            alignItems: 'center',
            padding: '40px 120px',
            textAlign: 'center',
            color: overlay.color || '#ffffff',
            pointerEvents: 'none',
          }}
        >
          {hasTitle ? (
            <h1
              style={{
                fontFamily: '"Paperlogy", "Pretendard Variable", sans-serif',
                fontSize: `${titleSize}px`,
                fontWeight: 800,
                letterSpacing: '0.01em',
                lineHeight: 1.05,
                margin: 0,
                marginBottom: hasSub ? subtitleSize * 0.5 : 0,
                whiteSpace: 'nowrap',
              }}
            >
              {overlay.title}
            </h1>
          ) : null}
          {hasSub ? (
            <p
              style={{
                fontFamily: '"Paperlogy", "Pretendard Variable", sans-serif',
                fontSize: `${subtitleSize}px`,
                fontWeight: 500,
                letterSpacing: '0.06em',
                lineHeight: 1.1,
                margin: 0,
                whiteSpace: 'nowrap',
              }}
            >
              {overlay.subtitle}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
