'use client'

import type { BannerState } from '@/types/banner'
import { ScoreboardScene } from './scenes/ScoreboardScene'
import { ImageScene } from './scenes/ImageScene'
import { GifScene } from './scenes/GifScene'
import { BlankScene } from './scenes/BlankScene'
import { TimerScene } from './scenes/TimerScene'
import { DefaultBannerScene } from './scenes/DefaultBannerScene'

export function SceneRenderer({
  state,
  serverTimestamp,
}: {
  state: BannerState
  serverTimestamp?: number
}) {
  switch (state.scene) {
    case 'scoreboard':
      return <ScoreboardScene {...state.payload} />
    case 'image':
      return <ImageScene {...state.payload} />
    case 'gif':
      return <GifScene {...state.payload} />
    case 'timer':
      return <TimerScene {...state.payload} serverTimestamp={serverTimestamp} />
    case 'default':
      return <DefaultBannerScene {...state.payload} />
    case 'blank':
    default:
      return <BlankScene />
  }
}
