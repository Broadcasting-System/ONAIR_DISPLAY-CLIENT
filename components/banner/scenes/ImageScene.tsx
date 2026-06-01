'use client'

import type { ImagePayload } from '@/types/banner'

export function ImageScene({ url, fit = 'cover' }: ImagePayload) {
  if (!url) return null
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#000',
      }}
    >
      {/* 6845x552 캔버스에 맞춰 그대로 렌더. img 태그가 next/image보다 풀-블리드에 단순. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        style={{
          width: '100%',
          height: '100%',
          objectFit: fit,
          display: 'block',
        }}
        draggable={false}
      />
    </div>
  )
}
