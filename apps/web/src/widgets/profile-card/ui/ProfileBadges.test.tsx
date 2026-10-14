import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PROFILE_BADGES_FIXTURE } from '@/shared/api/mocks/fixtures/profile-badges'
import type { BadgeDefinition } from '@blog/contracts'
import { ProfileCard } from './ProfileCard.tsx'

const settings = vi.hoisted(() => ({ profile_badges: [] as BadgeDefinition[] }))
vi.mock('@/entities/settings', () => ({ useSettings: () => ({ data: settings }) }))
afterEach(cleanup)

describe('profile badges from the configured catalog', () => {
  it('uses catalog order and edited labels/images, including archived earned awards', () => {
    const veteran = PROFILE_BADGES_FIXTURE[2]
    const first = PROFILE_BADGES_FIXTURE[0]
    if (!veteran || !first) throw new Error('Missing default badges')
    settings.profile_badges = [
      {
        ...veteran,
        label: 'Veteran',
        image_url: 'http://media.test/veteran.png',
        status: 'archived',
      },
      first,
    ]
    render(<ProfileCard.Badges badges={['first_post', 'unknown', 'one_year']} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Veteran',
      'Первая публикация',
    ])
    expect(buttons[0]?.querySelector('img')?.getAttribute('src')).toBe(
      'http://media.test/veteran.png',
    )
  })
  it('does not display unearned badges or an empty list', () => {
    settings.profile_badges = PROFILE_BADGES_FIXTURE
    render(<ProfileCard.Badges badges={[]} />)
    expect(screen.queryByRole('list')).toBeNull()
  })
  it('respects an explicitly empty catalog', () => {
    settings.profile_badges = []
    render(<ProfileCard.Badges badges={['first_post']} />)
    expect(screen.queryByRole('list')).toBeNull()
  })
})
