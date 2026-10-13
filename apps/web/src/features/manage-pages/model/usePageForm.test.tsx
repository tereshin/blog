import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/shared/api'
import { createPage, pageKeys } from '@/entities/page'
import { usePageForm } from './usePageForm.ts'
vi.mock('@/entities/page', () => ({
  createPage: vi.fn(),
  updatePage: vi.fn(),
  deletePage: vi.fn(),
  getAdminPage: vi.fn(),
  pageKeys: {
    admin: (id: string) => ['admin', id],
    public: (slug: string) => ['public', slug],
    lists: ['lists'],
  },
}))
const snapshot = {
  title: 'Contacts',
  document: { blocks: [{ type: 'paragraph' as const, data: { text: 'Hello' } }] },
  fingerprint: 'first',
}
const response = {
  id: '33333333-3333-4333-8333-333333333333',
  slug: 'contacts',
  title: 'Contacts',
  blocks: snapshot.document,
  status: 'draft' as const,
  version: 1,
  created_by: '11111111-1111-4111-8111-111111111111',
  updated_by: '11111111-1111-4111-8111-111111111111',
  created_at: '2026-10-12T10:00:00.000Z',
  updated_at: '2026-10-12T10:00:00.000Z',
  published_at: null,
}
function mount(acknowledge = vi.fn(async () => true)) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
  const hook = renderHook(
    () => usePageForm({ initial: null, read: async () => snapshot, acknowledge }),
    { wrapper: Wrapper },
  )
  return { ...hook, client, acknowledge }
}
beforeEach(() => vi.clearAllMocks())
describe('page save snapshots and retries', () => {
  it('retries the identical request key/body after an uncertain response and retains newer metadata', async () => {
    vi.mocked(createPage)
      .mockRejectedValueOnce(new ApiError({ code: 'network_error', status: 0, message: 'offline' }))
      .mockResolvedValueOnce(response)
    const { result, acknowledge } = mount()
    act(() => result.current.changeSlug('contacts'))
    await act(async () => {
      expect(await result.current.submit('save')).toBe(false)
    })
    expect(result.current.can_retry).toBe(true)
    act(() => result.current.changeSlug('new-local-slug'))
    await act(async () => {
      expect(await result.current.submit('save', true)).toBe(true)
    })
    const calls = vi.mocked(createPage).mock.calls
    expect(calls[1]).toEqual(calls[0])
    expect(result.current.slug).toBe('new-local-slug')
    expect(result.current.metadata_dirty).toBe(true)
    expect(acknowledge).toHaveBeenCalledWith(snapshot)
  })
  it('serializes rapid double clicks before reading a document', async () => {
    vi.mocked(createPage).mockResolvedValue(response)
    const { result, client } = mount()
    act(() => result.current.changeSlug('contacts'))
    await act(async () => {
      await Promise.all([result.current.submit('save'), result.current.submit('save')])
    })
    expect(createPage).toHaveBeenCalledTimes(1)
    expect(client.getQueryData(pageKeys.admin(response.id))).toEqual(response)
  })
  it('does not acknowledge a preview or a rejected mutation', async () => {
    vi.mocked(createPage).mockRejectedValue(
      new ApiError({ code: 'page_slug_taken', status: 409, message: 'taken' }),
    )
    const { result, acknowledge } = mount()
    act(() => result.current.changeSlug('contacts'))
    await act(async () => {
      await result.current.showPreview()
    })
    expect(result.current.preview).toEqual(snapshot)
    expect(acknowledge).not.toHaveBeenCalled()
    await act(async () => {
      await result.current.submit('save')
    })
    expect(result.current.saved).toBeNull()
    expect(acknowledge).not.toHaveBeenCalled()
  })
})
