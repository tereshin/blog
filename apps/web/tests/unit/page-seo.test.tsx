import { act, render, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PageSeo } from '@blog/contracts'
import { PageSeo as SeoWidget } from '@/widgets/page-seo'
import { getPageSeo } from '@/entities/seo'

vi.mock('@/entities/settings', () => ({ useSettings: () => ({ data: { name: 'Блог' } }) }))
vi.mock('@/shared/api', () => ({ useLiveSignals: vi.fn() }))
vi.mock('@/entities/seo/api/get-page-seo.ts', () => ({ getPageSeo: vi.fn() }))
const page = (path: string): PageSeo => ({ status: 200, title: path, description: '</script><script>alert(1)</script>', canonical_url: `https://blog.example${path}`, robots: 'noindex, follow', locale: 'ru', site_name: 'Блог', og_type: path.startsWith('/p/') ? 'article' : 'website', images: null, body_text: '', structured_data: { '@context': 'https://schema.org', '@graph': [{ '@type': 'WebPage', name: path, description: '</script><script>alert(1)</script>' }] } })
function deferred<T>() { let resolve: (value: T) => void = () => {}; const promise = new Promise<T>((done) => { resolve = done }); return { promise, resolve } }
beforeEach(() => { document.head.innerHTML = '<title>Блог</title>'; vi.clearAllMocks() })
describe('метаданные при переходах React', () => {
  it('старый ответ не перезаписывает текущую страницу, возврат назад не дублирует теги', async () => {
    const old = deferred<PageSeo>(), current = deferred<PageSeo>()
    vi.mocked(getPageSeo).mockImplementation((path) => path === '/p/old' ? old.promise : current.promise)
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
    const view = render(<SeoWidget path="/p/old" />, { wrapper })
    await waitFor(() => expect(getPageSeo).toHaveBeenCalledWith('/p/old', expect.any(AbortSignal)))
    view.rerender(<SeoWidget path="/search" />)
    await act(async () => current.resolve(page('/search')))
    await waitFor(() => expect(document.title).toBe('/search'))
    await act(async () => old.resolve(page('/p/old')))
    expect(document.title).toBe('/search')
    expect(document.head.querySelectorAll('meta[name="description"]')).toHaveLength(1)
    expect(document.head.querySelectorAll('script[type="application/ld+json"]')).toHaveLength(1)
    expect(document.head.querySelectorAll('script')).toHaveLength(1)
    expect(JSON.parse(document.head.querySelector('script')?.textContent ?? '{}')['@graph'][0].name).toBe('/search')
    view.rerender(<SeoWidget path="/p/old" />)
    await waitFor(() => expect(document.title).toBe('/p/old'))
    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1)
    view.unmount(); client.clear()
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull()
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, follow')
  })
})
