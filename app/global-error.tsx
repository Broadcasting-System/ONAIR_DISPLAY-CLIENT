'use client'

import { useEffect } from 'react'
import { SENTRY_DSN } from '@/lib/sentryOptions'

/** 송출 화면 전체가 오류로 멈췄을 때 — 전교에 나가는 화면이라 글자 없이 검은 화면, Sentry 로 보내고 10초 뒤 다시 연다
 *  (송출 화면은 사람이 옆에 없는 곳에 켜 둔다. 다시 열면 서버가 지금 송출 상태를 다시 보내 준다) */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    if (SENTRY_DSN) void import('@sentry/nextjs').then((Sentry) => Sentry.captureException(error))
    const id = setTimeout(() => window.location.reload(), 10_000)
    return () => clearTimeout(id)
  }, [error])

  return (
    <html lang="ko">
      <body style={{ margin: 0, minHeight: '100dvh', background: '#000' }} />
    </html>
  )
}
