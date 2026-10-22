import { useEffect, useRef } from 'react'

/** 실시간 미러로 받은 서버 PC 화면 (hooks/useMirror.ts) — 1920x1080 을 화면에 맞춰 튼다.
 *  소리는 입장(EntryOverlay)을 눌러 브라우저가 소리를 허락한 뒤에 켠다 */
export function MirrorView({ stream, isArmed }: { stream: MediaStream | null; isArmed: boolean }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const v = ref.current
    if (!v) return
    if (v.srcObject !== stream) v.srcObject = stream
    if (stream) void v.play().catch(() => {})
  }, [stream])
  useEffect(() => {
    const v = ref.current
    if (!v) return
    v.muted = !isArmed
    if (stream) void v.play().catch(() => {})
  }, [isArmed, stream])
  return (
    <div className="relative w-full h-[100dvh] bg-black overflow-hidden">
      <video ref={ref} autoPlay playsInline muted className="absolute inset-0 h-full w-full object-contain" />
      {!stream && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-pretendard text-white/40 text-[2.4vw]">연결 중</span>
        </div>
      )}
    </div>
  )
}
