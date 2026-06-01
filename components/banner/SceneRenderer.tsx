'use client'

import type { BannerState } from '@/types/banner'
import { ScoreboardScene } from './scenes/ScoreboardScene'
import { ImageScene } from './scenes/ImageScene'
import { GifScene } from './scenes/GifScene'
import { BlankScene } from './scenes/BlankScene'

export function SceneRenderer({ state }: { state: BannerState }) {
  switch (state.scene) {
    case 'scoreboard':
      return <ScoreboardScene {...state.payload} />
    case 'image':
      return <ImageScene {...state.payload} />
    case 'gif':
      return <GifScene {...state.payload} />
    case 'blank':
    default:
      return <BlankScene />
  }
}
