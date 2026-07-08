'use client'

import type { GifPayload } from '@/types/banner'
import { resolveMediaUrl } from '@/lib/backend'

export function GifScene({ url }: GifPayload) {
  if (!url) return null
  return (
    <div style={{ width: '100%', height: '100%', background: '#000' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolveMediaUrl(url)}
        alt=""
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
        draggable={false}
      />
    </div>
  )
}
