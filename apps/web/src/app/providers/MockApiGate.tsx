import { Suspense, use } from 'react'
import type { ReactNode } from 'react'
import { env } from '@/shared/config'

let mock_api_ready: Promise<void> | null = null

function waitForMockApi(): Promise<void> {
  mock_api_ready ??= import('@/shared/api/mocks').then(({ startMockApi }) => startMockApi())
  return mock_api_ready
}

function MockApiReady({ children }: { children: ReactNode }) {
  use(waitForMockApi())
  return children
}

/** Фикстурный gateway поднимается только по явному флагу и до первого запроса приложения. */
export function MockApiGate({ children }: { children: ReactNode }) {
  if (!env.is_api_mock) return children
  return (
    <Suspense fallback={null}>
      <MockApiReady>{children}</MockApiReady>
    </Suspense>
  )
}
