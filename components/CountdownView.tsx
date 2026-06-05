'use client'

import { useEffect, useState } from 'react'

export interface CountdownProps {
  /** 서버 시각(ms). 이 시점을 0초로 카운트. */
  serverTimestamp?: number
  /** 카운트다운 총 길이(초). mode='up'이면 무시. */
  durationSec?: number
  mode?: 'down' | 'up'
  label?: string
  color?: string
  /** 숫자 글자 크기(vw 단위, 기본 22). 배너 등에서 조절. */
  sizeVw?: number
}

function fmt(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`
}

/** 서버 시각 기준 카운트다운/업. 미디어 송출·배너 양쪽에서 재사용. */
export function CountdownView({
  serverTimestamp,
  durationSec = 0,
  mode = 'down',
  label,
  color = '#ffffff',
  sizeVw = 22,
}: CountdownProps) {
  const [now, setNow] = useState<number>(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 200)
    return () => clearInterval(id)
  }, [])

  const start = serverTimestamp ?? now
  const elapsed = Math.max(0, (now - start) / 1000)
  const secs = mode === 'up' ? elapsed : Math.max(0, durationSec - elapsed)
  const done = mode === 'down' && secs <= 0

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-[2vh] bg-black">
      {label ? (
        <div
          className="font-mbc font-semibold tracking-tight"
          style={{ fontSize: `${Math.max(3, sizeVw * 0.22)}vw`, color }}
        >
          {label}
        </div>
      ) : null}
      <div
        className={done ? 'animate-pulse' : undefined}
        style={{
          fontFamily: 'var(--font-orbitron, monospace)',
          fontSize: `${sizeVw}vw`,
          fontWeight: 800,
          lineHeight: 1,
          color: done ? '#ff4d4d' : color,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {fmt(secs)}
      </div>
    </div>
  )
}
