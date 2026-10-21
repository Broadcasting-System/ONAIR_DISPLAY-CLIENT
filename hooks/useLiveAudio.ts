import { useEffect, useState } from 'react'
import { backendBase } from '@/lib/backend'

/** live 중계 창(?role=recorder&live=1&audioKey=..&audio=element|tab)의 소리를 서버로 보낸다 — 서버 app/api/live_stream.py.
 *
 *  서버 PC 소리는 방송 장비(학교 스피커)로 나간다. 그래서 창 안에서 소리를 잡아 48kHz 스테레오 16비트 PCM 으로
 *  웹소켓에 보낸다 (서버가 실시간 속도로 ffmpeg 에 넣는다).
 *  - element(기본) — 창은 소리를 끈 채(--mute-audio). 화면 안 <video>·<audio> 와 화면 공유 스트림을 Web Audio 로 잡는다.
 *    소리를 끈 창이어도 Web Audio 안에서는 소리가 흐른다 (유튜브 iframe 은 잡을 수 없다)
 *  - tab — 이 탭 소리 전체(getDisplayMedia 지금 탭, 크롬 --auto-accept-this-tab-capture). 유튜브까지 잡히지만
 *    크롬은 소리를 끈 탭을 무음으로 잡아서 창 소리를 켜야 한다. 스피커로 새지 않게 suppressLocalAudioPlayback 을 걸고,
 *    잡기가 시작되기 전·끊긴 뒤에는 화면(소리 나는 것)을 그리지 않는다 → 돌려주는 armed 가 false
 *
 *  돌려주는 값: 화면을 그려도 되는지 (중계 창이 아니면 늘 true) */
const RATE = 48000
const CHUNK = 960 // 20ms

const WORKLET = `
class OnairTap extends AudioWorkletProcessor {
  constructor() { super(); this.buf = new Int16Array(${CHUNK * 2}); this.n = 0 }
  process(inputs) {
    const ch = inputs[0] || []
    const l = ch[0], r = ch[1] || ch[0]
    const frames = l ? l.length : 128
    for (let i = 0; i < frames; i++) {
      const a = l ? Math.max(-1, Math.min(1, l[i])) : 0
      const b = r ? Math.max(-1, Math.min(1, r[i])) : 0
      this.buf[this.n++] = a * 32767
      this.buf[this.n++] = b * 32767
      if (this.n >= this.buf.length) {
        this.port.postMessage(this.buf.buffer, [this.buf.buffer])
        this.buf = new Int16Array(${CHUNK * 2})
        this.n = 0
      }
    }
    return true
  }
}
registerProcessor('onair-tap', OnairTap)
`

export function useLiveAudio(channel: number, key: string | null, mode: string | null): boolean {
  const tab = !!key && mode === 'tab'
  // tab 이면 잡기가 시작될 때까지 화면을 그리지 않는다 (창 소리가 켜져 있어 스피커로 샐 수 있다)
  const [armed, setArmed] = useState(!tab)

  useEffect(() => {
    if (!key) return
    let closed = false
    let ws: WebSocket | null = null
    let retry: ReturnType<typeof setTimeout> | null = null
    let observer: MutationObserver | null = null
    let poll: ReturnType<typeof setInterval> | null = null
    let tabStream: MediaStream | null = null
    let status: object | null = null
    const ctx = new AudioContext({ sampleRate: RATE })
    const mix = ctx.createGain()

    const send = (data: ArrayBuffer | string) => {
      if (ws && ws.readyState === WebSocket.OPEN) ws.send(data)
    }
    const report = (m: string, detail = '') => {
      status = { type: 'audio', mode: m, detail }
      send(JSON.stringify(status))
    }

    const connect = () => {
      if (closed) return
      const url = `${backendBase().replace(/^http/, 'ws')}/api/live/stream/audio?channel=${channel}&key=${encodeURIComponent(key)}`
      const sock = new WebSocket(url)
      sock.binaryType = 'arraybuffer'
      ws = sock
      sock.onopen = () => {
        if (status) sock.send(JSON.stringify(status))
      }
      sock.onclose = (e) => {
        // 4403 = 열쇠가 틀림, 4410 = 그 중계가 끝남 — 다시 붙지 않는다
        if (closed || e.code === 4403 || e.code === 4410) return
        retry = setTimeout(connect, 2000)
      }
    }

    // ---- element: 화면 안 영상·소리 요소와 화면 공유 스트림을 하나씩 섞는다 ----
    const done = new WeakSet<HTMLMediaElement>()
    const streams = new WeakSet<MediaStream>()
    const tapElement = (el: HTMLMediaElement) => {
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
          // 다른 주소(서버 :8000)의 파일은 CORS 로 받아야 Web Audio 가 무음 대신 소리를 준다 — 한 번 다시 불러온다
          // (hls.js 영상은 blob: 이라 그대로. 서버는 127.0.0.1·사설망 출처에 CORS 를 연다)
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
          // 소리가 이 노드로만 간다 (창은 원래 소리를 끈 상태)
          ctx.createMediaElementSource(el).connect(mix)
        }
        done.add(el)
      } catch {
        // 이미 다른 노드에 묶였거나 지원하지 않는 요소
      }
    }
    const scan = () => document.querySelectorAll('video, audio').forEach((n) => tapElement(n as HTMLMediaElement))
    const tapElements = (why: string) => {
      scan()
      observer = new MutationObserver(scan)
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] })
      poll = setInterval(scan, 2000) // srcObject 는 속성이 아니라 바뀌어도 알림이 없다
      report('element', why)
    }

    const start = async () => {
      try {
        await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' })))
      } catch (e) {
        report('none', `AudioWorklet: ${String(e)}`)
        return
      }
      if (closed) return
      const node = new AudioWorkletNode(ctx, 'onair-tap', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2] })
      node.port.onmessage = (e) => send(e.data as ArrayBuffer)
      const silent = ctx.createGain()
      silent.gain.value = 0 // 노드가 돌게 출력에 잇되 소리는 내지 않는다
      mix.connect(node)
      node.connect(silent)
      silent.connect(ctx.destination)
      void ctx.resume().catch(() => {})

      if (!tab) {
        tapElements('')
        return
      }
      try {
        const md = navigator.mediaDevices as MediaDevices & { getDisplayMedia: (o: object) => Promise<MediaStream> }
        tabStream = await md.getDisplayMedia({
          video: true,
          audio: { suppressLocalAudioPlayback: true, echoCancellation: false, noiseSuppression: false, autoGainControl: false },
          preferCurrentTab: true,
          selfBrowserSurface: 'include',
          surfaceSwitching: 'exclude',
          systemAudio: 'exclude',
        })
        tabStream.getVideoTracks().forEach((t) => t.stop()) // 화면은 ffmpeg 가 찍는다
        const track = tabStream.getAudioTracks()[0]
        if (closed) return
        if (!track) {
          report('none', '탭 소리 트랙이 없습니다')
          return
        }
        ctx.createMediaStreamSource(new MediaStream([track])).connect(mix)
        track.onended = () => {
          // 잡기가 끝나면 소리가 스피커로 샐 수 있다 — 화면을 내린다
          setArmed(false)
          report('none', '탭 소리 잡기가 끊겼습니다')
        }
        report('tab')
        setArmed(true)
      } catch (e) {
        if (!closed) report('none', `탭 소리를 잡지 못했습니다: ${e instanceof Error ? e.name : String(e)}`)
      }
    }

    connect()
    void start()
    return () => {
      closed = true
      if (retry) clearTimeout(retry)
      if (poll) clearInterval(poll)
      observer?.disconnect()
      tabStream?.getTracks().forEach((t) => t.stop())
      ws?.close()
      void ctx.close().catch(() => {})
    }
  }, [channel, key, tab])

  return armed
}
