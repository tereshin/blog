import { describe, expect, it } from 'vitest'
import { toAdminItem } from '../../src/modules/nav-section/nav-section.mapper.ts'

describe('nav section rows', () => {
  it('keeps a deleted page link as a broken page target', () => {
    expect(
      toAdminItem({
        id: '55555555-5555-4555-8555-555555555555',
        section_id: '44444444-4444-4444-8444-444444444444',
        title: 'О проекте',
        icon: null,
        page_id: null,
        url: null,
        position: 0,
        page_slug: null,
        page_status: null,
      }).target,
    ).toEqual({ kind: 'page', page_id: null, slug: null, status: null })
  })
})
