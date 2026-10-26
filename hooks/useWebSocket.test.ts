import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FakeWebSocket } from '@/test/fakeSocket'
import { useWebSocket } from './useWebSocket'

const timer = (serverTimestamp: number, extra: Record<string, unknown> = {}) => ({
  command: 'display', type: 'timer', label: '쉬는 시간', durationSec: 300, mode: 'down', serverTimestamp, ...extra,
})

beforeEach(() => {
  vi.useFakeTimers()
  FakeWebSocket.reset()
  vi.stubGlobal('WebSocket', FakeWebSocket)
  // 초기 상태 fetch 는 응답 없이 둔다 (소켓 쪽만 본다)
  vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function connected(channel = 1) {
  const hook = renderHook(({ ch }) => useWebSocket(null, ch), { initialProps: { ch: channel } })
  const ws = FakeWebSocket.last()
  act(() => ws.open())
  return { ...hook, ws }
}

describe('useWebSocket 중복 업데이트 거르기', () => {
  it('완전히 같은 내용이 다시 오면 그대로 둔다 — 영상이 처음부터 다시 틀어지지 않게', () => {
    const { result, ws } = connected()
    act(() => ws.message(timer(1)))
    const before = result.current.content
    act(() => ws.message(timer(1)))
    expect(result.current.content).toBe(before)
  })

  // 회귀: 9cee3ea — 같은 타이머를 다시 보내 재시작하면 '중복'으로 무시되던 버그
  it('같은 타이머를 다시 보내면(서버 시각이 다르면) 새로 시작한다', () => {
    const { result, ws } = connected()
    act(() => ws.message(timer(1)))
    act(() => ws.message(timer(2)))
    expect(result.current.content?.serverTimestamp).toBe(2)
  })

  it('타이머 길이·이름·방향만 바꿔도 반영한다', () => {
    const { result, ws } = connected()
    act(() => ws.message(timer(1)))
    act(() => ws.message(timer(1, { durationSec: 600 })))
    expect(result.current.content?.durationSec).toBe(600)
    act(() => ws.message(timer(1, { durationSec: 600, label: '점심 시간', mode: 'up' })))
    expect(result.current.content).toMatchObject({ label: '점심 시간', mode: 'up' })
  })
})

describe('useWebSocket 연결', () => {
  it('끊기면 다시 붙고, 서버가 준 standby 로 옛 내용을 지운다', () => {
    const { result, ws } = connected()
    act(() => {
      ws.message(timer(1))
      ws.serverClose()
    })
    expect(result.current.isConnected).toBe(false)
    act(() => vi.advanceTimersByTime(3000))
    expect(FakeWebSocket.all).toHaveLength(2)
    act(() => {
      FakeWebSocket.last().open()
      FakeWebSocket.last().message({ command: 'display', type: 'standby' })
    })
    expect(result.current.isConnected).toBe(true)
    expect(result.current.content).toBeNull()
  })

  it('붙어 있는 동안 5초마다 ping 을 보낸다', () => {
    const { ws } = connected()
    act(() => vi.advanceTimersByTime(10_000))
    expect(ws.sent.map((s) => JSON.parse(s).type)).toEqual(['ping', 'ping'])
  })

  // 회귀: 9cee3ea — 채널을 바꾼 뒤 옛 채널 소켓이 다시 붙던 버그
  it('채널을 바꾸면 옛 채널로 다시 붙지 않는다', async () => {
    const { rerender, ws: ch1 } = connected(1)
    rerender({ ch: 2 })
    await act(async () => {
      await Promise.resolve()
      vi.advanceTimersByTime(10_000)
    })
    const ch1Sockets = FakeWebSocket.all.filter((s) => !s.url.includes('channel=2'))
    expect(ch1Sockets).toEqual([ch1])
  })
})
