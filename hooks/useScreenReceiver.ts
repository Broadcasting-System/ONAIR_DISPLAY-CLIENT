import { useEffect, useRef, useState } from 'react'
import { backendWs } from '@/lib/backend'
import { getIceServers } from '@/lib/ice'

type Signal = {
  command: 'webrtc'
  from?: string
  kind: 'offer' | 'answer' | 'ice' | 'hello' | 'bye'
  sdp?: RTCSessionDescriptionInit
  candidate?: RTCIceCandidateInit
  /** 서버가 붙여 주는 보낸 연결의 이름 — 답(answer·ice)은 그 연결에만 보낸다 */
  fromPeer?: string
}


/** 송출(프로젝터)·녹화 창 측 화면 공유 수신기.
 *  전용 시그널링 WS로 컨트롤의 offer를 받아 answer하고, 받은 MediaStream을 반환.
 *
 *  보내는 쪽(컨트롤) 하나가 받는 쪽(송출 화면·서버 PC 녹화 창) 여럿에게 연결을 따로 만든다.
 *  - 이 화면이 붙으면 hello → 컨트롤이 이 화면 몫의 offer 를 보낸다
 *  - 컨트롤이 (다시) 붙어 hello 하면 그 컨트롤에게만 hello 로 답한다
 *  - answer·ice 는 offer 를 보낸 컨트롤(fromPeer)에게만 (to) */
export function useScreenReceiver(channel: number = 1) {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const senderRef = useRef<string | undefined>(undefined)
  const pendingIce = useRef<RTCIceCandidateInit[]>([])

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout>
    let closed = false

    const send = (msg: object) => {
      const ws = wsRef.current
      if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg))
    }
    // 보내는 쪽 이름을 알면 그 연결에만 (예전 서버·컨트롤이면 이름이 없어 모두에게)
    const reply = (msg: object) => {
      const to = senderRef.current
      send(to ? { ...msg, to } : msg)
    }

    const teardownPc = () => {
      pendingIce.current = []
      if (pcRef.current) {
        try { pcRef.current.close() } catch {}
        pcRef.current = null
      }
      setStream(null)
    }

    const handleOffer = async (sdp: RTCSessionDescriptionInit, fromPeer?: string) => {
      teardownPc() // 새 공유 세션이면 기존 연결 정리 후 재협상
      senderRef.current = fromPeer
      const iceServers = await getIceServers()
      if (closed || senderRef.current !== fromPeer) return // 기다리는 사이 다른 공유가 왔거나 화면을 닫았다
      const pc = new RTCPeerConnection({ iceServers })
      pcRef.current = pc
      pc.onicecandidate = (e) => {
        if (e.candidate)
          reply({ command: 'webrtc', from: 'display', kind: 'ice', candidate: e.candidate.toJSON() })
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
        reply({ command: 'webrtc', from: 'display', kind: 'answer', sdp: answer })
      } catch (err) {
        console.error('WebRTC answer 생성 실패', err)
      }
    }

    const handleIce = async (candidate: RTCIceCandidateInit, fromPeer?: string) => {
      const pc = pcRef.current
      // 다른 컨트롤의 옛 ice 는 버린다 (지금 받는 공유가 아님)
      if (pc && senderRef.current && fromPeer && fromPeer !== senderRef.current) return
      if (pc && pc.remoteDescription) {
        try { await pc.addIceCandidate(candidate) } catch {}
      } else {
        pendingIce.current.push(candidate) // remoteDescription 전 도착분 큐잉
      }
    }

    const connect = () => {
      const ws = new WebSocket(backendWs('/api/display/ws', channel, 'signal'))
      wsRef.current = ws
      ws.onopen = () => {
        // 공유가 이미 진행 중일 수 있으니 "나 왔다" 알려 컨트롤이 이 화면 몫의 offer를 보내게 함
        send({ command: 'webrtc', from: 'display', kind: 'hello' })
      }
      ws.onmessage = (ev) => {
        let m: Signal
        try { m = JSON.parse(ev.data) } catch { return }
        if (m?.command !== 'webrtc' || m.from === 'display') return
        if (m.kind === 'offer' && m.sdp) handleOffer(m.sdp, m.fromPeer)
        else if (m.kind === 'ice' && m.candidate) handleIce(m.candidate, m.fromPeer)
        else if (m.kind === 'hello' && m.fromPeer) {
          // 컨트롤이 (다시) 붙었다 → 그 컨트롤에게만 "여기 있다"
          send({ command: 'webrtc', from: 'display', kind: 'hello', to: m.fromPeer })
        } else if (m.kind === 'bye' && m.fromPeer && m.fromPeer === senderRef.current) {
          teardownPc() // 보내던 컨트롤이 떠났다
          senderRef.current = undefined
        }
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
