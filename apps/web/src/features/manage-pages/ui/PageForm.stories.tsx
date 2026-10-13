import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider } from 'react-router'
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { AdminPage } from '@blog/contracts'
import { PageForm } from './PageForm.tsx'
import session from '@/shared/api/mocks/fixtures/session.json'
import { sessionKeys } from '@/entities/session'
const initial: AdminPage = {
  id: '33333333-3333-4333-8333-333333333333',
  title: 'Контакты',
  slug: 'contacts',
  blocks: { blocks: [] },
  status: 'draft',
  version: 1,
  created_by: '11111111-1111-4111-8111-111111111111',
  updated_by: '11111111-1111-4111-8111-111111111111',
  created_at: '2026-10-12T10:00:00.000Z',
  updated_at: '2026-10-12T10:00:00.000Z',
  published_at: null,
}
function Frame({ kind }: { kind: 'new' | 'draft' | 'published' | 'loading' | 'guest' }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  client.setQueryData(sessionKeys.current(), kind === 'guest' ? session.guest : session.superadmin)
  const page =
    kind === 'new'
      ? null
      : {
          ...initial,
          ...(kind === 'published'
            ? { status: 'published' as const, published_at: initial.created_at }
            : {}),
        }
  const router = createMemoryRouter(
    [
      {
        path: '*',
        element: (
          <PageForm
            renderPanel={({ header, metadata, children, footer }) => (
              <div>
                {header}
                {metadata}
                {children}
                {footer}
              </div>
            )}
            initial={page}
            is_dirty={false}
            is_ready={kind !== 'loading'}
            read={async () => ({
              title: 'Контакты',
              document: { blocks: [] },
              fingerprint: 'snapshot',
            })}
            acknowledge={async () => true}
          >
            {(title) => <div className="min-h-48 bg-surface-secondary p-5">{title}</div>}
          </PageForm>
        ),
      },
    ],
    { initialEntries: ['/admin/pages/new'] },
  )
  return (
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
const meta = { title: 'features/manage-pages/PageForm', component: Frame } satisfies Meta<
  typeof Frame
>
export default meta
type Story = StoryObj<typeof Frame>
export const New: Story = { args: { kind: 'new' } }
export const Draft: Story = { args: { kind: 'draft' } }
export const Published: Story = { args: { kind: 'published' } }
export const Loading: Story = { args: { kind: 'loading' } }
export const SessionExpired: Story = { args: { kind: 'guest' } }
