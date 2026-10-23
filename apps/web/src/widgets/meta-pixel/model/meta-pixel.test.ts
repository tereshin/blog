import { beforeEach, describe, expect, it, vi } from 'vitest'

const ID = '1661355165525767'
beforeEach(() => {
  vi.resetModules()
  delete window.fbq
  delete window._fbq
  document.head.innerHTML = ''
})
describe('Meta Pixel page views', () => {
  it('loads once and tracks initial, next and back navigations without duplicate renders', async () => {
    const { trackMetaPageView } = await import('./meta-pixel.ts')
    trackMetaPageView(ID, 'home')
    trackMetaPageView(ID, 'home')
    trackMetaPageView(ID, 'article')
    trackMetaPageView(ID, 'home')
    expect(document.querySelectorAll('script[src="https://connect.facebook.net/en_US/fbevents.js"]')).toHaveLength(1)
    expect(window.fbq?.queue).toEqual([
      ['init', ID],
      ['trackSingle', ID, 'PageView'], ['trackSingle', ID, 'PageView'], ['trackSingle', ID, 'PageView'],
    ])
  })
  it('does not load or track for an empty or invalid ID', async () => {
    const { trackMetaPageView } = await import('./meta-pixel.ts')
    for (const id of [null, undefined, '', '<script>', '123abc']) trackMetaPageView(id, 'home')
    expect(window.fbq).toBeUndefined()
    expect(document.querySelector('script')).toBeNull()
  })
  it('stops sending after disabling and targets only the new ID after replacement', async () => {
    const { trackMetaPageView } = await import('./meta-pixel.ts')
    trackMetaPageView(ID, 'home')
    const count = window.fbq?.queue.length
    trackMetaPageView(null, 'article')
    expect(window.fbq?.queue).toHaveLength(count ?? 0)
    const next_id = '1234567890'
    trackMetaPageView(next_id, 'article')
    expect(window.fbq?.queue.at(-1)).toEqual(['trackSingle', next_id, 'PageView'])
    expect(document.querySelectorAll('script')).toHaveLength(1)
  })
})


it('does not duplicate the server PageView when React starts', async () => {
  const { trackMetaPageView } = await import('./meta-pixel.ts')
  // Bootstrap queue created by the server base code before the application runs.
  trackMetaPageView(ID, 'bootstrap')
  const queued = window.fbq?.queue.length
  const marker = document.createElement('script')
  marker.dataset.metaPixelId = ID
  document.head.append(marker)
  vi.resetModules()
  const client = await import('./meta-pixel.ts')
  client.trackMetaPageView(ID, 'initial')
  client.trackMetaPageView(ID, 'initial')
  expect(window.fbq?.queue).toHaveLength(queued ?? 0)
  client.trackMetaPageView(ID, 'next')
  expect(window.fbq?.queue.at(-1)).toEqual(['trackSingle', ID, 'PageView'])
  expect(window.fbq?.queue).toHaveLength((queued ?? 0) + 1)
})
