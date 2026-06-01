'use client'

import { ReactNode, useEffect, useState } from 'react'

export const BANNER_DESIGN_W = 6845
export const BANNER_DESIGN_H = 552

type Mode = 'broadcast' | 'preview'

type Props = {
  children: ReactNode
  mode?: Mode
  /** broadcast 모드에서 debug=true면 정상 비율로 표시 (편집자용 시각 확인). */
  debug?: boolean
  /** preview 모드일 때 외부에서 강제할 컨테이너 폭. 미지정시 부모 100%. */
  previewWidth?: number
}

/**
 * 6845×552 캔버스에 정상 비율로 콘텐츠를 렌더링하고,
 * 노트북 화면 크기에 맞춰 non-uniform scale을 적용해
 * 현수막에서 정상 비율로 보이도록 미리 찌그러뜨린다.
 */
export function BannerStage({
  children,
  mode = 'broadcast',
  debug = false,
  previewWidth,
}: Props) {
  const [viewport, setViewport] = useState({ w: 1920, h: 1080 })

  useEffect(() => {
    const update = () =>
      setViewport({ w: window.innerWidth, h: window.innerHeight })
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const warp = mode === 'broadcast' && !debug

  // broadcast: 노트북 viewport를 6845×552로 매핑(찌그러진 화면 = 현수막 정상)
  // preview/debug: 12.4:1 비율 유지하며 uniform scale (편집자 확인용)
  let sx: number
  let sy: number
  if (warp) {
    sx = viewport.w / BANNER_DESIGN_W
    sy = viewport.h / BANNER_DESIGN_H
  } else {
    const targetW = previewWidth ?? viewport.w
    const targetH = (targetW * BANNER_DESIGN_H) / BANNER_DESIGN_W
    sx = sy = Math.min(targetW / BANNER_DESIGN_W, targetH / BANNER_DESIGN_H)
  }

  const containerStyle: React.CSSProperties = warp
    ? { width: '100%', height: '100%' }
    : {
        width: previewWidth ?? '100%',
        aspectRatio: `${BANNER_DESIGN_W} / ${BANNER_DESIGN_H}`,
      }

  return (
    <div
      style={{
        ...containerStyle,
        overflow: 'hidden',
        position: 'relative',
        background: '#000',
      }}
    >
      <div
        style={{
          width: BANNER_DESIGN_W,
          height: BANNER_DESIGN_H,
          transformOrigin: 'top left',
          transform: `scale(${sx}, ${sy})`,
          willChange: 'transform',
        }}
      >
        {children}
      </div>
    </div>
  )
}
