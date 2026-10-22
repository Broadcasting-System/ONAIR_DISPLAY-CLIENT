import { useEffect, useState } from 'react'
import { backendWs } from '@/lib/backend'
import { getIceServers } from '@/lib/ice'

/** 실시간 미러 (WebRTC) — 다른 장소의 송출 화면이 서버 PC 의 그 채널 화면을 그대로 받아 튼다.
 *
 *  - 보내는 쪽: 서버 PC 가 띄운 미러 창 (?role=recorder&mirror=send, 서버 app/services/mirror_service.py).
 *    자기 탭 화면(크롬 --auto-accept-this-tab-capture)과 화면 안 영상·소리 요소의 소리를 받는 쪽마다 보낸다.
 *    창은 소리를 끈 채라 서버 PC 스피커(방송 장비)로 새지 않는다 — 유튜브 소리는 잡을 수 없다 (live 중계와 같다)
 *  - 받는 쪽: 다른 장소의 송출 화면 (?channel=N&mirror=1). 직접 그리지 않고 받은 영상을 튼다.
 *  신호는 화면 공유와 같은 길(/api/display/ws?role=signal)을 쓰되 source=mirror·want=mirror 로 갈라서,
 *  화면 공유 보내는 쪽·보통 송출 화면은 미러와 섞이지 않는다 (보내는 쪽은 want=mirror 인 hello 에만 offer 를 보낸다). */

type Signal = {
  command: 'webrtc'
  from?: string
  kind: 'offer' | 'answer' | 'ice' | 'hello' | 'bye'
  sdp?: RTCSessionDescriptionInit
  candidate?: RTCIceCandidateInit
  fromPeer?: string
  source?: string
  want?: string
}

const log = (...a: unknown[]) => console.info('[미러]', ...a)
const MAX_BITRATE = 8_000_000 // 1080p30 — 학교 안 망이라 넉넉히

function signalUrl(channel: number, extra: string): string {
  const base = backendWs('/api/display/ws', channel, 'signal')
  return base + (base.includes('?') ? '&' : '?') + extra
}

/** 화면 안 <video>·<audio>·화면 공유 스트림의 소리를 섞는다 (창은 소리를 끈 채 — Web Audio 안에서는 흐른다) */
function tapPageAudio(ctx: AudioContext, mix: AudioNode): () => void {
  const done = new WeakSet<HTMLMediaElement>()
  const streams = new WeakSet<MediaStream>()
  const tap = (el: HTMLMediaElement) => {
    if (done.has(el)) return
    const stream = el.srcObject instanceof MediaStream ? el.srcObject : null
    try {
      if (stream) {
        if (streams.has(stream) || stream.getAudioTracks().length === 0) return
        streams.add(stream)
        ctx.createMediaStreamSource(stream).connect(mix)
      } else {
        const src = el.currentSrc || el.src
        if (!src) return
        // 다른 주소의 파일은 CORS 로 다시 불러야 무음 대신 소리가 잡힌다 (useLiveAudio 와 같다)
        if (!src.startsWith('blob:') && !el.crossOrigin && new URL(src, location.href).origin !== location.origin) {
          const at = el.currentTime
          const playing = !el.paused
          el.crossOrigin = 'anonymous'
          el.load()
          el.addEventListener('loadedmetadata', () => {
            try { el.currentTime = at } catch {}
            if (playing) void el.play().catch(() => {})
          }, { once: true })
        }
        ctx.createMediaElementSource(el).connect(mix)
      }
      done.add(el)
    } catch {
      // 이미 묶였거나 지원하지 않는 요소
    }
  }
  const scan = () => document.querySelectorAll('video, audio').forEach((n) => tap(n as HTMLMediaElement))
  scan()
  const observer = new MutationObserver(scan)
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] })
  const poll = setInterval(scan, 2000) // srcObject 는 바뀌어도 알림이 없다
  return () => {
    observer.disconnect()
    clearInterval(poll)
  }
}

/** 서버 PC 미러 창 — 이 탭을 잡아 받는 쪽마다 보낸다 */
export function useMirrorSender(channel: number, on: boolean) {
  useEffect(() => {
    if (!on) return
    let closed = false
    let ws: WebSocket | null = null
    let reconnect: ReturnType<typeof setTimeout> | null = null
    let media: MediaStream | null = null
    let untap: (() => void) | null = null
    const ctx = new AudioContext({ sampleRate: 48000 })
    const mix = ctx.createGain()
    const dest = ctx.createMediaStreamDestination()
    mix.connect(dest)
    const peers = new Map<string, { pc: RTCPeerConnection; pendingIce: RTCIceCandidateInit[] }>()

    const send = (msg: object) => {
      if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg))
    }
    const drop = (peer: string) => {
      const p = peers.get(peer)
      if (!p) return
      peers.delete(peer)
      try { p.pc.close() } catch {}
    }

    const offer = async (peer: string) => {
      if (!media) return
      drop(peer)
      const entry = { pc: null as unknown as RTCPeerConnection, pendingIce: [] as RTCIceCandidateInit[] }
      peers.set(peer, entry)
      const iceServers = await getIceServers()
      if (closed || peers.get(peer) !== entry || !media) return
      const pc = new RTCPeerConnection({ iceServers })
      entry.pc = pc
      for (const track of media.getTracks()) {
        const sender = pc.addTrack(track, media)
        if (track.kind === 'video') {
          const p = sender.getParameters()
          p.encodings = [{ ...(p.encodings?.[0] ?? {}), maxBitrate: MAX_BITRATE, maxFramerate: 30 }]
          p.degradationPreference = 'maintain-resolution'
          void sender.setParameters(p).catch(() => {})
        }
      }
      pc.onicecandidate = (e) => {
        if (e.candidate) send({ command: 'webrtc', from: 'mirror', kind: 'ice', candidate: e.candidate.toJSON(), to: peer })
      }
      pc.onconnectionstatechange = () => {
        log(`연결 ${pc.connectionState} (${peer})`)
        if (pc.connectionState === 'failed' && peers.get(peer)?.pc === pc) drop(peer)
      }
      const sdp = await pc.createOffer()
      await pc.setLocalDescription(sdp)
      send({ command: 'webrtc', from: 'mirror', kind: 'offer', sdp, to: peer })
      log(`offer 보냄 (${peer})`)
    }

    const connect = () => {
      if (closed) return
      const sock = new WebSocket(signalUrl(channel, 'source=mirror'))
      ws = sock
      sock.onopen = () => {
        log(`신호 연결됨 (CH${channel})`)
        send({ command: 'webrtc', from: 'mirror', kind: 'hello' }) // 이미 기다리는 받는 쪽이 hello 로 답한다
      }
      sock.onmessage = (ev) => {
        let m: Signal
        try { m = JSON.parse(ev.data) } catch { return }
        if (m?.command !== 'webrtc' || m.from !== 'display' || !m.fromPeer) return
        const peer = m.fromPeer
        if (m.kind === 'hello') {
          if (m.want === 'mirror') void offer(peer).catch((e) => console.error('[미러] offer 실패', e))
        } else if (m.kind === 'answer' && m.sdp) {
          const p = peers.get(peer)
          if (!p?.pc) return
          void p.pc.setRemoteDescription(new RTCSessionDescription(m.sdp)).then(async () => {
            for (const c of p.pendingIce) {
              try { await p.pc.addIceCandidate(c) } catch {}
            }
            p.pendingIce = []
          }).catch(() => {})
        } else if (m.kind === 'ice' && m.candidate) {
          const p = peers.get(peer)
          if (!p?.pc) return
          if (p.pc.remoteDescription) void p.pc.addIceCandidate(m.candidate).catch(() => {})
          else p.pendingIce.push(m.candidate)
        } else if (m.kind === 'bye') {
          drop(peer)
        }
      }
      sock.onclose = () => {
        if (closed) return
        reconnect = setTimeout(connect, 2000)
      }
      sock.onerror = () => { try { sock.close() } catch {} }
    }

    const start = async () => {
      try {
        const md = navigator.mediaDevices as MediaDevices & { getDisplayMedia: (o: object) => Promise<MediaStream> }
        const tab = await md.getDisplayMedia({
          video: { width: 1920, height: 1080, frameRate: 30 },
          audio: false,
          preferCurrentTab: true,
          selfBrowserSurface: 'include',
          surfaceSwitching: 'exclude',
        })
        if (closed) {
          tab.getTracks().forEach((t) => t.stop())
          return
        }
        const video = tab.getVideoTracks()[0]
        if (video && 'contentHint' in video) video.contentHint = 'motion'
        // 화면이 그대로면(포스터·대기 화면) 크롬이 새 장면을 안 보내서 나중에 붙은 화면이 검게 남는다 —
        // 오른쪽 아래 1픽셀을 아주 조금씩 바꿔 초당 10장은 나오게 (눈에는 안 보인다)
        const dot = document.createElement('div')
        dot.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;z-index:2147483647;pointer-events:none;background:#000'
        document.body.appendChild(dot)
        let odd = false
        const pulse = setInterval(() => { odd = !odd; dot.style.background = odd ? '#010101' : '#000' }, 100)
        const untapAudio = tapPageAudio(ctx, mix)
        untap = () => {
          untapAudio()
          clearInterval(pulse)
          dot.remove()
        }
        void ctx.resume().catch(() => {})
        media = new MediaStream([...tab.getVideoTracks(), ...dest.stream.getAudioTracks()])
        log('탭 잡기 시작')
        connect()
      } catch (e) {
        console.error('[미러] 탭을 잡지 못했습니다', e)
        if (!closed) reconnect = setTimeout(() => void start(), 5000)
      }
    }
    void start()

    return () => {
      closed = true
      if (reconnect) clearTimeout(reconnect)
      for (const k of [...peers.keys()]) drop(k)
      media?.getTracks().forEach((t) => t.stop())
      untap?.()
      ws?.close()
      void ctx.close().catch(() => {})
    }
  }, [channel, on])
}

/** 다른 장소의 송출 화면 — 미러 창이 보내는 영상을 받는다. 받은 MediaStream (없으면 null) */
export function useMirrorReceiver(channel: number, on: boolean): MediaStream | null {
  const [stream, setStream] = useState<MediaStream | null>(null)

  useEffect(() => {
    if (!on) return
    let closed = false
    let ws: WebSocket | null = null
    let reconnect: ReturnType<typeof setTimeout> | null = null
    let retry: ReturnType<typeof setTimeout> | null = null
    let current: { peer: string; pc: RTCPeerConnection; pendingIce: RTCIceCandidateInit[] } | null = null

    const send = (msg: object) => {
      if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg))
    }
    const hello = (to?: string) => send({ command: 'webrtc', from: 'display', kind: 'hello', want: 'mirror', ...(to ? { to } : {}) })
    const drop = () => {
      if (!current) return
      try { current.pc.close() } catch {}
      current = null
      setStream(null)
    }
    const again = () => {
      // 길을 못 찾았거나 미러 창이 다시 떴다 — 잠깐 뒤 다시 부른다
      if (retry) clearTimeout(retry)
      retry = setTimeout(() => { if (!closed && !current) hello() }, 3000)
    }

    const handleOffer = async (sdp: RTCSessionDescriptionInit, peer: string) => {
      drop()
      const entry = { peer, pc: null as unknown as RTCPeerConnection, pendingIce: [] as RTCIceCandidateInit[] }
      current = entry
      const iceServers = await getIceServers()
      if (closed || current !== entry) return
      const pc = new RTCPeerConnection({ iceServers })
      entry.pc = pc
      pc.onicecandidate = (e) => {
        if (e.candidate) send({ command: 'webrtc', from: 'display', kind: 'ice', candidate: e.candidate.toJSON(), to: peer })
      }
      pc.ontrack = (e) => {
        log(`${e.track.kind} 트랙 받음`)
        setStream(e.streams[0] ?? new MediaStream([e.track]))
      }
      pc.onconnectionstatechange = () => {
        log(`연결 ${pc.connectionState}`)
        if (pc.connectionState === 'failed' && current === entry) {
          drop()
          again()
        }
      }
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp))
        for (const c of entry.pendingIce) {
          try { await pc.addIceCandidate(c) } catch {}
        }
        entry.pendingIce = []
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        send({ command: 'webrtc', from: 'display', kind: 'answer', sdp: answer, to: peer })
      } catch (err) {
        console.error('[미러] answer 실패', err)
      }
    }

    const connect = () => {
      if (closed) return
      const sock = new WebSocket(signalUrl(channel, 'mirror=1'))
      ws = sock
      sock.onopen = () => {
        log(`신호 연결됨 (CH${channel}) — 미러 요청`)
        hello()
      }
      sock.onmessage = (ev) => {
        let m: Signal
        try { m = JSON.parse(ev.data) } catch { return }
        if (m?.command !== 'webrtc' || !m.fromPeer) return
        if (m.kind === 'bye' && current?.peer === m.fromPeer) {
          // 미러 창이 닫혔다 (서버가 대신 알리는 bye 에는 source 가 없다)
          drop()
          again()
          return
        }
        // 화면 공유 보내는 쪽(control·외부 화면)의 offer 는 받지 않는다 — 미러만
        if (m.source !== 'mirror') return
        if (m.kind === 'offer' && m.sdp) void handleOffer(m.sdp, m.fromPeer)
        else if (m.kind === 'ice' && m.candidate && current?.peer === m.fromPeer) {
          if (current.pc?.remoteDescription) void current.pc.addIceCandidate(m.candidate).catch(() => {})
          else current.pendingIce.push(m.candidate)
        } else if (m.kind === 'hello') {
          hello(m.fromPeer) // 미러 창이 (다시) 떴다
        }
      }
      sock.onclose = () => {
        if (closed) return
        drop()
        reconnect = setTimeout(connect, 2000)
      }
      sock.onerror = () => { try { sock.close() } catch {} }
    }
    connect()

    return () => {
      closed = true
      if (reconnect) clearTimeout(reconnect)
      if (retry) clearTimeout(retry)
      drop()
      ws?.close()
    }
  }, [channel, on])

  return stream
}
