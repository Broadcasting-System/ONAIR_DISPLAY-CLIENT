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

/** 화면 공유가 '연결 중'에 멈출 때 원인을 보려고 — 송출 화면 개발자 도구 콘솔에 [화면 공유] 로 남긴다 */
const log = (...a: unknown[]) => console.info('[화면 공유]', ...a)
/** ICE 가 실패하면 보내는 쪽에 hello 를 다시 보내 새 offer 를 받는다 (같은 보내는 쪽에 이만큼까지) */
const MAX_RETRY = 3
const RETRY_MS = 2000

const hasTurn = (s: RTCIceServer) =>
  (Array.isArray(s.urls) ? s.urls : [s.urls]).some((u) => /^turns?:/.test(u))

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
    const retries = new Map<string, number>() // 보내는 쪽 연결별 다시 시도한 횟수
    const retryTimers = new Set<ReturnType<typeof setTimeout>>()

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
      log(`offer 받음 (${source}, 연결 ${peer || '-'}) — TURN ${iceServers.some(hasTurn) ? '있음' : '없음(STUN 만)'}`)
      const pc = new RTCPeerConnection({ iceServers })
      entry.pc = pc
      pc.onicecandidate = (e) => {
        if (e.candidate) reply(peer, { command: 'webrtc', from: 'display', kind: 'ice', candidate: e.candidate.toJSON() })
      }
      pc.onicecandidateerror = (e) => {
        const ev = e as RTCPeerConnectionIceErrorEvent
        console.warn('[화면 공유] ICE 서버 오류', source, ev.url, ev.errorCode, ev.errorText)
      }
      pc.oniceconnectionstatechange = () => log(`ICE ${pc.iceConnectionState} (${source})`)
      pc.ontrack = (e) => {
        log(`${e.track.kind} 트랙 받음 (${source})`)
        const st = e.streams[0] ?? new MediaStream([e.track])
        setStreams((s) => ({ ...s, [source]: st }))
        setLatest(source)
      }
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState
        if (state === 'failed') console.warn(`[화면 공유] 연결 실패 (${source}) — 방화벽·TURN 확인`)
        else log(`연결 ${state} (${source})`)
        if (state === 'connected') retries.delete(peer)
        if (state !== 'failed' || map.get(peer)?.pc !== pc) return
        dropPeer(peer)
        // 보내는 쪽은 그대로 있는데 길만 못 찾았다 → 잠깐 뒤 hello 로 새 offer 를 받는다 (몇 번까지만)
        const n = (retries.get(peer) ?? 0) + 1
        retries.set(peer, n)
        if (!peer || n > MAX_RETRY) return
        const t = setTimeout(() => {
          retryTimers.delete(t)
          if (closed || map.has(peer)) return
          log(`다시 시도 ${n}/${MAX_RETRY} (${source})`)
          send({ command: 'webrtc', from: 'display', kind: 'hello', to: peer })
        }, RETRY_MS * n)
        retryTimers.add(t)
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
        log(`answer 보냄 (${source})`)
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
        log(`신호 연결됨 (CH${channel}) — hello`)
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
          log(`보내는 쪽 붙음 (${m.source || 'screen'}) — hello 답장`)
          retries.delete(m.fromPeer)
          send({ command: 'webrtc', from: 'display', kind: 'hello', to: m.fromPeer })
        } else if (m.kind === 'bye' && m.fromPeer) {
          if (map.has(m.fromPeer)) log(`보내는 쪽 떠남 (${map.get(m.fromPeer)?.source})`)
          retries.delete(m.fromPeer)
          dropPeer(m.fromPeer) // 보내던 쪽이 떠났다
        }
      }
      ws.onclose = (ev) => {
        if (closed) return
        log(`신호 연결 끊김 (code ${ev.code}) — 3초 뒤 다시`)
        reconnectTimer = setTimeout(connect, 3000)
      }
      ws.onerror = () => { try { ws.close() } catch {} }
    }
    connect()

    return () => {
      closed = true
      clearTimeout(reconnectTimer)
      retryTimers.forEach(clearTimeout)
      for (const k of [...map.keys()]) dropPeer(k)
      if (wsRef.current) { try { wsRef.current.close() } catch {} }
    }
  }, [channel])

  return { stream: latest ? streams[latest] ?? null : null, streams }
}
