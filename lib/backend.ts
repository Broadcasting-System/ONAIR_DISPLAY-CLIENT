/**
 * 백엔드(FastAPI) 주소 유추.
 * - NEXT_PUBLIC_API_BASE_URL 이 명시돼 있으면 그 값을 사용 (override).
 * - 없으면 현재 접속한 호스트의 8000 포트를 사용 → localhost / LAN IP 모두 자동 대응.
 */
export function backendBase(): string {
  const override = process.env.NEXT_PUBLIC_API_BASE_URL
  if (override && override.trim()) return override.replace(/\/$/, '')
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:8000`
  }
  return 'http://localhost:8000'
}

/** WebSocket 주소 (http→ws 변환 + 경로). */
export function backendWs(path: string): string {
  // 명시적 WS override 우선
  const override = process.env.NEXT_PUBLIC_WS_URL
  if (override && override.trim() && path === '/api/display/ws') {
    return override
  }
  return backendBase().replace(/^http/, 'ws') + path
}
