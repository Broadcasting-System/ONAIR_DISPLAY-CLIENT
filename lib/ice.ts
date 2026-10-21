import { backendBase } from '@/lib/backend'

/** WebRTC 에 쓸 STUN(+ 학교 밖 발표자까지 잇는 Cloudflare TURN) — 서버 /api/share/ice, 20분 기억 (TURN 자격은 1시간짜리). 못 받으면 STUN 만 */
const FALLBACK: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }]
let cache: { at: number; servers: RTCIceServer[] } | null = null

export async function getIceServers(): Promise<RTCIceServer[]> {
  if (cache && Date.now() - cache.at < 20 * 60_000) return cache.servers
  try {
    const r = await fetch(`${backendBase()}/api/share/ice`, { cache: 'no-store' })
    if (r.ok) {
      const servers = ((await r.json()) as { iceServers: RTCIceServer[] }).iceServers
      if (Array.isArray(servers) && servers.length) {
        cache = { at: Date.now(), servers }
        return servers
      }
    }
  } catch {
    /* 예전 서버 — STUN 만 */
  }
  return FALLBACK
}
