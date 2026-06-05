import { useEffect, useRef, useState } from 'react'
import { backendWs } from '@/lib/backend'

type Signal = {
  command: 'webrtc'
  from: string
  kind: 'offer' | 'answer' | 'ice'
  sdp?: RTCSessionDescriptionInit
  candidate?: RTCIceCandidateInit
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
}

/** 송출(프로젝터) 측 화면 공유 수신기.
 *  전용 시그널링 WS로 컨트롤의 offer를 받아 answer하고, 받은 MediaStream을 반환. */
export function useScreenReceiver(channel: number = 1) {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const pendingIce = useRef<RTCIceCandidateInit[]>([])

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout>
    let closed = false

    const send = (msg: object) => {
      const ws = wsRef.current
      if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg))
    }

    const teardownPc = () => {
      pendingIce.current = []
      if (pcRef.current) {
        try { pcRef.current.close() } catch {}
        pcRef.current = null
      }
      setStream(null)
    }

    const handleOffer = async (sdp: RTCSessionDescriptionInit) => {
      teardownPc() // 새 공유 세션이면 기존 연결 정리 후 재협상
      const pc = new RTCPeerConnection(RTC_CONFIG)
      pcRef.current = pc
      pc.onicecandidate = (e) => {
        if (e.candidate)
          send({ command: 'webrtc', from: 'display', kind: 'ice', candidate: e.candidate.toJSON() })
      }
      pc.ontrack = (e) => {
        setStream(e.streams[0] ?? new MediaStream([e.track]))
      }
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp))
        for (const c of pendingIce.current) {
          try { await pc.addIceCandidate(c) } catch {}
        }
        pendingIce.current = []
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        send({ command: 'webrtc', from: 'display', kind: 'answer', sdp: answer })
      } catch (err) {
        console.error('WebRTC answer 생성 실패', err)
      }
    }

    const handleIce = async (candidate: RTCIceCandidateInit) => {
      const pc = pcRef.current
      if (pc && pc.remoteDescription) {
        try { await pc.addIceCandidate(candidate) } catch {}
      } else {
        pendingIce.current.push(candidate) // remoteDescription 전 도착분 큐잉
      }
    }

    const connect = () => {
      const ws = new WebSocket(backendWs('/api/display/ws', channel))
      wsRef.current = ws
      ws.onmessage = (ev) => {
        let m: Signal
        try { m = JSON.parse(ev.data) } catch { return }
        if (m?.command !== 'webrtc' || m.from === 'display') return
        if (m.kind === 'offer' && m.sdp) handleOffer(m.sdp)
        else if (m.kind === 'ice' && m.candidate) handleIce(m.candidate)
        // answer는 수신 측에선 사용 안 함
      }
      ws.onclose = () => {
        if (!closed) reconnectTimer = setTimeout(connect, 3000)
      }
      ws.onerror = () => { try { ws.close() } catch {} }
    }
    connect()

    return () => {
      closed = true
      clearTimeout(reconnectTimer)
      teardownPc()
      if (wsRef.current) { try { wsRef.current.close() } catch {} }
    }
  }, [channel])

  return { stream }
}
