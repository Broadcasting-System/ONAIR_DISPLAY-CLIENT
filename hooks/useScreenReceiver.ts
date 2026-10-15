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
  /** 서버가 붙여 주는 소스 — 외부 화면은 share:<요청 id>, 컨트롤 화면 공유는 screen */
  source?: string
}

type Peer = { pc: RTCPeerConnection; source: string; pendingIce: RTCIceCandidateInit[] }

/** 송출(프로젝터)·녹화 창 측 화면 공유 수신기.
 *  전용 시그널링 WS로 보내는 쪽들의 offer를 받아 answer하고, 받은 MediaStream을 소스별로 돌려준다.
 *
 *  보내는 쪽(컨트롤·외부 화면 발표자)이 여럿일 수 있다 — 스위처가 한 채널에 여러 외부 화면을 나눠 띄운다.
 *  - 이 화면이 붙으면 hello → 보내는 쪽마다 이 화면 몫의 offer 를 보낸다
 *  - 보내는 쪽이 (다시) 붙어 hello 하면 그쪽에만 hello 로 답한다
 *  - answer·ice 는 offer 를 보낸 쪽(fromPeer)에게만 (to)
 *  - stream 은 가장 최근에 붙은 것 (한 화면 공유 'screen' 송출용), streams 는 소스별 */
export function useScreenReceiver(channel: number = 1) {
  const [streams, setStreams] = useState<Record<string, MediaStream>>({})
  const [latest, setLatest] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const peers = useRef(new Map<string, Peer>())

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout>
    let closed = false
    const map = peers.current

    const send = (msg: object) => {
      const ws = wsRef.current
      if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg))
    }
    // 보내는 쪽 이름을 알면 그 연결에만 (예전 서버면 이름이 없어 모두에게)
    const reply = (peer: string, msg: object) => send(peer ? { ...msg, to: peer } : msg)

    const dropPeer = (peer: string) => {
      const p = map.get(peer)
      if (!p) return
      map.delete(peer)
      try { p.pc.close() } catch {}
      // 같은 소스를 다른 연결이 이미 이어받았으면 그대로 둔다
      if ([...map.values()].some((o) => o.source === p.source)) return
      setStreams((s) => {
        const next = { ...s }
        delete next[p.source]
        return next
      })
      setLatest((l) => (l === p.source ? null : l))
    }

    const handleOffer = async (sdp: RTCSessionDescriptionInit, peer: string, source: string) => {
      dropPeer(peer) // 같은 쪽의 새 세션이면 기존 연결 정리 후 재협상
      // 같은 소스가 다른 연결로 다시 붙었으면(발표자 새로고침 등) 옛 연결은 정리
      for (const [k, o] of map) if (o.source === source) dropPeer(k)
      const entry: Peer = { pc: null as unknown as RTCPeerConnection, source, pendingIce: [] }
      map.set(peer, entry)
      const iceServers = await getIceServers()
      if (closed || map.get(peer) !== entry) return // 기다리는 사이 다시 왔거나 화면을 닫았다
      const pc = new RTCPeerConnection({ iceServers })
      entry.pc = pc
      pc.onicecandidate = (e) => {
        if (e.candidate) reply(peer, { command: 'webrtc', from: 'display', kind: 'ice', candidate: e.candidate.toJSON() })
      }
      pc.ontrack = (e) => {
        const st = e.streams[0] ?? new MediaStream([e.track])
        setStreams((s) => ({ ...s, [source]: st }))
        setLatest(source)
      }
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' && map.get(peer)?.pc === pc) dropPeer(peer)
      }
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp))
        for (const c of entry.pendingIce) {
          try { await pc.addIceCandidate(c) } catch {}
        }
        entry.pendingIce = []
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        reply(peer, { command: 'webrtc', from: 'display', kind: 'answer', sdp: answer })
      } catch (err) {
        console.error('WebRTC answer 생성 실패', err)
      }
    }

    const handleIce = async (candidate: RTCIceCandidateInit, peer: string) => {
      const p = map.get(peer)
      if (!p) return // 지금 받는 연결이 아님
      if (p.pc && p.pc.remoteDescription) {
        try { await p.pc.addIceCandidate(candidate) } catch {}
      } else {
        p.pendingIce.push(candidate) // remoteDescription 전 도착분 큐잉
      }
    }

    const connect = () => {
      const ws = new WebSocket(backendWs('/api/display/ws', channel, 'signal'))
      wsRef.current = ws
      ws.onopen = () => {
        // 공유가 이미 진행 중일 수 있으니 "나 왔다" 알려 보내는 쪽들이 이 화면 몫의 offer를 보내게 함
        send({ command: 'webrtc', from: 'display', kind: 'hello' })
      }
      ws.onmessage = (ev) => {
        let m: Signal
        try { m = JSON.parse(ev.data) } catch { return }
        if (m?.command !== 'webrtc' || m.from === 'display') return
        const peer = m.fromPeer ?? ''
        if (m.kind === 'offer' && m.sdp) handleOffer(m.sdp, peer, m.source || 'screen')
        else if (m.kind === 'ice' && m.candidate) handleIce(m.candidate, peer)
        else if (m.kind === 'hello' && m.fromPeer) {
          // 보내는 쪽이 (다시) 붙었다 → 그쪽에게만 "여기 있다"
          send({ command: 'webrtc', from: 'display', kind: 'hello', to: m.fromPeer })
        } else if (m.kind === 'bye' && m.fromPeer) {
          dropPeer(m.fromPeer) // 보내던 쪽이 떠났다
        }
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
      for (const k of [...map.keys()]) dropPeer(k)
      if (wsRef.current) { try { wsRef.current.close() } catch {} }
    }
  }, [channel])

  return { stream: latest ? streams[latest] ?? null : null, streams }
}
