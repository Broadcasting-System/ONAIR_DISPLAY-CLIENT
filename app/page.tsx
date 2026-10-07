'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Header } from '@/components/display/Header'
import { ContentRenderer } from '@/components/display/ContentRenderer'
import { EntryOverlay } from '@/components/display/EntryOverlay'
import { useFullscreen } from '@/hooks/useFullscreen'
import { DisplayRole, useWebSocket } from '@/hooks/useWebSocket'
import { useScreenReceiver } from '@/hooks/useScreenReceiver'
import { backendBase } from '@/lib/backend'

const MAX_CHANNELS = 5

function DisplayInner() {
  const params = useSearchParams()
  const channel = useMemo(() => {
    const raw = Number(params.get('channel'))
    return Number.isFinite(raw) && raw >= 1 && raw <= MAX_CHANNELS ? Math.floor(raw) : 1
  }, [params])
  // recorder = 서버 PC 가 화면 녹화용으로 띄운 창 · control = 컨트롤 미리보기.
  // 둘 다 LIVE 송출 화면으로 세지 않고, 버튼·머리글 없이 바로 진짜 화면과 똑같이 그린다.
  const role: DisplayRole = useMemo(() => {
    const r = params.get('role')
    return r === 'recorder' || r === 'control' ? r : 'display'
  }, [params])
  const isLive = role === 'display'
  const isRecorder = role === 'recorder'

  const [armedByClick, setIsArmed] = useState(false)
  const isArmed = armedByClick || !isLive
  const { content, clearContent } = useWebSocket(null, channel, role)
  const { stream: screenStream } = useScreenReceiver(channel)
  const { isFullscreen: fullscreenToggle, toggleFullscreen } = useFullscreen()
  const isFullscreen = fullscreenToggle || !isLive

  // 녹화 창은 이 제목으로 서버 PC 의 ffmpeg 가 찾아 찍는다 (서버 app/services/screen_recorder.py).
  // Next 가 메타데이터 제목(ONAIR Display)을 다시 쓸 수 있어 계속 맞춰 둔다
  useEffect(() => {
    if (!isRecorder) return
    const want = `ONAIR REC CH${channel}`
    const apply = () => {
      if (document.title !== want) document.title = want
    }
    apply()
    const timer = setInterval(apply, 500)
    return () => clearInterval(timer)
  }, [isRecorder, channel])

  const handleMediaEnded = useCallback(() => {
    clearContent()
    // 송출 끝을 서버에 알리는 건 실제 송출 화면만 — 녹화 창·미리보기는 서버가 대기로 돌릴 때를 따른다
    if (!isLive) return
    // 서버도 해당 채널을 standby로 비워 컨트롤·다른 디스플레이까지 동기화
    const url =
      channel > 1
        ? `${backendBase()}/api/display/clear?channel=${channel}`
        : `${backendBase()}/api/display/clear`
    fetch(url, { method: 'POST' }).catch(() => {})
  }, [clearContent, channel, isLive])

  const handleEnter = () => {
    setIsArmed(true)
    if (!isFullscreen) {
      toggleFullscreen()
    }
  }

  return (
    <main
      className={`relative w-full h-[100dvh] bg-black overflow-hidden select-none ${isRecorder ? 'recorder' : ''}`}
    >
      {!isArmed && <EntryOverlay onEnter={handleEnter} />}
      {!isFullscreen && <Header onFullscreen={toggleFullscreen} />}
      <ContentRenderer
        content={content}
        onEnded={handleMediaEnded}
        isFullscreen={isFullscreen}
        isArmed={isArmed}
        screenStream={screenStream}
      />
    </main>
  )
}

export default function DisplayPage() {
  return (
    <Suspense fallback={<main className="w-full h-[100dvh] bg-black" />}>
      <DisplayInner />
    </Suspense>
  )
}
