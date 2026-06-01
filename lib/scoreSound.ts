// 득점 효과음 — Web Audio로 합성 (파일 불필요).
// 브라우저 자동재생 정책상 사용자 제스처(버튼 클릭) 후 unlock 되어야 소리가 난다.
// 모듈 전역 상태이므로 컨트롤 미리보기(iframe, 별도 컨텍스트)에선 unlock 안 하면 무음.

type Ctx = AudioContext

let ctx: Ctx | null = null
let enabled = false

function ensureCtx(): Ctx | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  return ctx
}

/** 사용자 제스처에서 호출 — 오디오 컨텍스트를 깨우고 사운드 활성화. */
export function unlockScoreSound() {
  const c = ensureCtx()
  if (!c) return
  void c.resume()
  enabled = true
}

export function isScoreSoundEnabled() {
  return enabled
}

/** 위압감 있는 "쿵~~ 딱" 임팩트 — 묵직한 서브 베이스 부밍 + 노이즈 퍽 + 밝은 딱. */
export function playScore() {
  const c = ctx
  if (!enabled || !c) return
  const now = c.currentTime
  const master = c.createGain()
  master.gain.value = 0.95
  master.connect(c.destination)

  // 1) 서브 베이스 "쿵~~" (저음 + 긴 여운). 소형 스피커 대비 90Hz 근처에 안착.
  const sub = c.createOscillator()
  const subG = c.createGain()
  sub.type = 'sine'
  sub.frequency.setValueAtTime(200, now)
  sub.frequency.exponentialRampToValueAtTime(72, now + 0.12)
  sub.frequency.exponentialRampToValueAtTime(60, now + 0.6)
  subG.gain.setValueAtTime(0.0001, now)
  subG.gain.exponentialRampToValueAtTime(1, now + 0.006)
  subG.gain.exponentialRampToValueAtTime(0.0001, now + 0.65)
  sub.connect(subG)
  subG.connect(master)
  sub.start(now)
  sub.stop(now + 0.7)

  // 2) 바디 하모닉 (작은 스피커에서도 들리게 중저역 보강)
  const body = c.createOscillator()
  const bg = c.createGain()
  body.type = 'triangle'
  body.frequency.setValueAtTime(360, now)
  body.frequency.exponentialRampToValueAtTime(120, now + 0.18)
  bg.gain.setValueAtTime(0.0001, now)
  bg.gain.exponentialRampToValueAtTime(0.6, now + 0.005)
  bg.gain.exponentialRampToValueAtTime(0.0001, now + 0.38)
  body.connect(bg)
  bg.connect(master)
  body.start(now)
  body.stop(now + 0.4)

  // 3) 밝은 트랜지언트 (딱)
  const click = c.createOscillator()
  const cg = c.createGain()
  click.type = 'square'
  click.frequency.setValueAtTime(1500, now)
  click.frequency.exponentialRampToValueAtTime(680, now + 0.05)
  cg.gain.setValueAtTime(0.0001, now)
  cg.gain.exponentialRampToValueAtTime(0.5, now + 0.002)
  cg.gain.exponentialRampToValueAtTime(0.0001, now + 0.09)
  click.connect(cg)
  cg.connect(master)
  click.start(now)
  click.stop(now + 0.1)

  // 4) 노이즈 임팩트 (퍽)
  const dur = 0.13
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2.2)
  }
  const noise = c.createBufferSource()
  noise.buffer = buf
  const nf = c.createBiquadFilter()
  nf.type = 'bandpass'
  nf.frequency.value = 1500
  nf.Q.value = 0.8
  const ng = c.createGain()
  ng.gain.value = 0.45
  noise.connect(nf)
  nf.connect(ng)
  ng.connect(master)
  noise.start(now)
  noise.stop(now + dur)
}
