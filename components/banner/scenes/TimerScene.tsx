'use client'

import { CountdownView } from '@/components/CountdownView'
import type { TimerPayload } from '@/types/banner'

/** 현수막 카운트다운/업 — 송출 CountdownView를 현수막 캔버스에 맞게 사용. */
export function TimerScene({
  durationSec,
  label,
  mode = 'down',
  color = '#ffffff',
  serverTimestamp,
}: TimerPayload & { serverTimestamp?: number }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-black">
      <CountdownView
        serverTimestamp={serverTimestamp}
        durationSec={durationSec}
        mode={mode}
        label={label}
        color={color}
        sizeVw={30}
      />
    </div>
  )
}
