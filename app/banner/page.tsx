'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { BannerStage } from '@/components/banner/BannerStage'
import { SceneRenderer } from '@/components/banner/SceneRenderer'
import { useBannerSocket } from '@/hooks/useBannerSocket'
import { unlockScoreSound } from '@/lib/scoreSound'

function BannerInner() {
  const params = useSearchParams()
  const debug = params.get('debug') === '1'
  const safe = params.get('safe') === '1'
  // 컨트롤 미리보기 iframe은 ?role=control 로 열어 LIVE 카운트를 부풀리지 않게 한다.
  const role = params.get('role') === 'control' ? 'control' : 'display'
  const { state, isConnected } = useBannerSocket(role)

  // 송출 중 마우스가 멈추면 커서 자동 숨김 (debug일 땐 유지)
  const cursorHidden = useIdleCursor(2000, debug)

  // 효과음 (실제 송출 화면에서만, 사용자 클릭 1회로 활성화)
  const [soundOn, setSoundOn] = useState(false)

  return (
    <main
      style={{
        width: '100vw',
        height: '100dvh',
        background: '#000',
        overflow: 'hidden',
        display: debug ? 'flex' : 'block',
        alignItems: debug ? 'center' : undefined,
        justifyContent: debug ? 'center' : undefined,
        cursor: cursorHidden ? 'none' : 'auto',
      }}
    >
      <BannerStage mode="broadcast" debug={debug}>
        <SceneRenderer state={state} />
      </BannerStage>

      {/* 안전 영역 가이드 (?safe=1) — 현수막 가장자리 잘림 대비 */}
      {safe && <SafeAreaGuide />}

      {/* 효과음 활성화 버튼 (실제 송출 화면 + 아직 안 켰을 때만) */}
      {role === 'display' && !soundOn && (
        <button
          onClick={() => {
            unlockScoreSound()
            setSoundOn(true)
          }}
          style={{
            position: 'fixed',
            top: 12,
            right: 12,
            zIndex: 1000,
            padding: '8px 14px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.25)',
            background: 'rgba(0,0,0,0.55)',
            color: '#fff',
            font: '14px/1 "Pretendard Variable", sans-serif',
            cursor: 'pointer',
          }}
        >
          🔊 효과음 켜기
        </button>
      )}

      {debug && role !== 'control' && (
        <div
          style={{
            position: 'fixed',
            top: 12,
            left: 12,
            padding: '6px 10px',
            background: isConnected ? '#0a3' : '#a30',
            color: '#fff',
            font: '12px/1 monospace',
            borderRadius: 4,
            zIndex: 1000,
          }}
        >
          {isConnected ? '● LIVE' : '● OFFLINE'} · scene: {state.scene}
        </div>
      )}
    </main>
  )
}

/** 일정 시간 마우스 정지 시 true (커서 숨김). debug면 항상 false. */
function useIdleCursor(delay: number, disabled: boolean) {
  const [idle, setIdle] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (disabled) {
      setIdle(false)
      return
    }
    const reset = () => {
      setIdle(false)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setIdle(true), delay)
    }
    reset()
    window.addEventListener('mousemove', reset)
    return () => {
      window.removeEventListener('mousemove', reset)
      if (timer.current) clearTimeout(timer.current)
    }
  }, [delay, disabled])

  return idle
}

function SafeAreaGuide() {
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 999,
      }}
    >
      {/* 상하 5% 마진 라인 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '5%',
          borderTop: '2px dashed rgba(255,80,80,0.7)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: '5%',
          borderBottom: '2px dashed rgba(255,80,80,0.7)',
        }}
      />
      {/* 좌우 3% 마진 라인 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: '3%',
          borderLeft: '2px dashed rgba(255,80,80,0.7)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: '3%',
          borderRight: '2px dashed rgba(255,80,80,0.7)',
        }}
      />
    </div>
  )
}

export default function BannerPage() {
  return (
    <Suspense fallback={null}>
      <BannerInner />
    </Suspense>
  )
}
