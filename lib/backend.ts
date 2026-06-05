/**
 * 백엔드(FastAPI) 주소 유추.
 * - NEXT_PUBLIC_API_BASE_URL 이 명시돼 있으면 그 값을 사용 (override).
 * - 없으면 현재 접속한 호스트의 8000 포트를 사용 → localhost / LAN IP 모두 자동 대응.
 */
/** localhost / IPv6 루프백은 127.0.0.1(IPv4)로 강제.
 *  → 8000 포트를 IPv6(::1)로 점유한 다른 프로세스(예: Docker)로 새는 것 방지. */
function resolveHost(host: string): string {
  if (host === 'localhost' || host === '::1' || host === '[::1]') return '127.0.0.1'
  return host
}

export function backendBase(): string {
  const override = process.env.NEXT_PUBLIC_API_BASE_URL
  if (override && override.trim()) return override.replace(/\/$/, '')
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${resolveHost(window.location.hostname)}:8000`
  }
  return 'http://127.0.0.1:8000'
}

/** WebSocket 주소 (http→ws 변환 + 경로). channel 주어지면 ?channel=N 부착. */
export function backendWs(path: string, channel?: number): string {
  // 명시적 WS override 우선
  const override = process.env.NEXT_PUBLIC_WS_URL
  const base =
    override && override.trim() && path === '/api/display/ws'
      ? override
      : backendBase().replace(/^http/, 'ws') + path
  if (channel && channel > 1) {
    return base + (base.includes('?') ? '&' : '?') + `channel=${channel}`
  }
  return base
}
