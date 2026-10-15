import { beforeEach, describe, expect, it } from 'vitest'
import { cancelFeedReturn, feedReturnForNavigation, getReturnTarget, readFeedReturn, saveFeedReturn } from './feed-return.ts'

const saved = { mode: 'fresh', feed_key: 'fresh', scroll_top: 840, entry_key: 'feed-entry', path: '/' }
beforeEach(() => { sessionStorage.clear(); cancelFeedReturn() })

describe('feed return eligibility', () => {
  it('ignores persisted offsets after a new document, including explicit state left by Back', () => {
    sessionStorage.setItem('feedReturn', JSON.stringify(saved))
    expect(feedReturnForNavigation('feed-entry', undefined, true)).toBeNull()
    expect(feedReturnForNavigation('other', 'feed-entry', false)).toBeNull()
  })
  it('restores only the original POP entry or an explicit Back from this document', () => {
    saveFeedReturn(saved)
    expect(feedReturnForNavigation('feed-entry', undefined, true)).toEqual(saved)
    expect(feedReturnForNavigation('new-entry', 'feed-entry', false)).toEqual(saved)
    expect(feedReturnForNavigation('feed-entry', undefined, false)).toBeNull()
    expect(feedReturnForNavigation('unrelated', undefined, true)).toBeNull()
  })
  it('sidebar navigation cancels eligibility without losing the return address', () => {
    saveFeedReturn(saved)
    cancelFeedReturn()
    expect(feedReturnForNavigation('feed-entry', undefined, true)).toBeNull()
    expect(getReturnTarget()).toEqual({ path: '/', scroll_top: 840 })
  })
  it('preserves the exact topic path and reads older saved offsets without enabling restoration', () => {
    saveFeedReturn({ ...saved, mode: 'topic:123', feed_key: 'topic:123', path: '/t/design' })
    expect(getReturnTarget().path).toBe('/t/design')
    sessionStorage.setItem('feedReturn', JSON.stringify({ mode: 'popular', scroll_top: 12 }))
    expect(readFeedReturn()).toMatchObject({ feed_key: 'popular' })
    expect(feedReturnForNavigation('feed-entry', undefined, true)).toBeNull()
  })
})
