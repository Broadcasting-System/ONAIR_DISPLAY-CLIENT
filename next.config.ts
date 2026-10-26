import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs/config'

const nextConfig: NextConfig = {
  // 개발 모드 좌하단 Next.js 인디케이터(N 로고) 숨김 — 현수막 송출 화면에 안 뜨게
  devIndicators: false,
}

// Sentry — 소스맵은 SENTRY_AUTH_TOKEN 이 있을 때만 올린다(없으면 빌드만, 업로드 없음)
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  telemetry: false,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
})
