import { describe, expect, it } from 'vitest'
import { TOPICS_SECTION_ID, themeHostSectionId } from '@/widgets/shell'

describe('sidebar section theme host', () => {
  it('keeps the theme toggle in topics when there are no custom sections', () => {
    expect(themeHostSectionId([])).toBe(TOPICS_SECTION_ID)
  })

  it('puts the theme toggle in the last custom section', () => {
    expect(themeHostSectionId(['first', 'last'])).toBe('last')
  })
})
