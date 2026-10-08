import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'

type StoryProvidersProps = { route?: string; children: ReactNode }

/** Окружение историй и тестов компонентов: свежий кэш без повторов и маршрутизатор в памяти. */
export function StoryProviders({ route = '/', children }: StoryProvidersProps) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0 } } }))
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
    </QueryClientProvider>
  )
}
