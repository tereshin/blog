import type { Meta, StoryObj } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router'
import type { Profile } from '@/entities/profile'
import { Button } from '@/shared/ui'
import { ProfileCard } from './ProfileCard.tsx'
import { ReputationHint } from './ReputationHint.tsx'

const own: Profile = {
  user_id: '0b3a4c50-3333-4c33-8c33-000000000005',
  public_number: 5,
  display_name: 'Роман Читаев',
  bio: null,
  avatar_url: null,
  cover_url: null,
  slug: 'reader',
  reputation: 0,
  created_at: '2024-01-01T00:00:00.000Z',
  followers_count: 2,
  following_count: 1,
  badges: [],
  is_own: true,
  is_following: false,
}

const foreign: Profile = {
  ...own,
  user_id: '0b3a4c50-3333-4c33-8c33-000000000001',
  display_name: 'Анна Авторова',
  bio: 'Пишет о технологиях',
  cover_url: 'https://example.com/cover.jpg',
  slug: 'anna',
  reputation: 12,
  created_at: '2020-01-01T00:00:00.000Z',
  badges: ['first_post', 'ten_reactions', 'one_year'],
  is_own: false,
}

function Frame({ profile, action }: { profile: Profile; action?: boolean }) {
  const address = profile.slug ?? String(profile.public_number)
  return (
    <MemoryRouter>
      <div className="max-w-xl p-4">
        <ProfileCard>
          <ProfileCard.Cover url={profile.cover_url} is_own={profile.is_own} action={action ? <Button variant="secondary">Добавить обложку</Button> : null} />
          <div className="flex items-end justify-between px-4">
            <ProfileCard.Avatar profile={profile} />
            <ProfileCard.Actions>
              {profile.is_own ? <Button variant="secondary">Редактировать</Button> : <Button isDisabled>Подписаться</Button>}
            </ProfileCard.Actions>
          </div>
          <div className="flex flex-col gap-3 px-4 pb-4 pt-3">
            <ProfileCard.Name profile={profile} aside={profile.is_own ? <ReputationHint /> : null} />
            <ProfileCard.Reputation profile={profile} />
            <ProfileCard.Bio profile={profile} />
            <ProfileCard.Counts profile={profile} address={address} />
            <ProfileCard.Badges badges={profile.badges} />
            <ProfileCard.Tabs tab="posts" onChange={() => undefined} />
          </div>
        </ProfileCard>
      </div>
    </MemoryRouter>
  )
}

const meta = { title: 'widgets/profile-card/ProfileCard', component: ProfileCard } satisfies Meta<typeof ProfileCard>
export default meta
type Story = StoryObj

export const OwnWithoutCover: Story = { render: () => <Frame profile={own} action /> }
export const OwnWithCover: Story = { render: () => <Frame profile={{ ...own, cover_url: 'https://example.com/cover.jpg', bio: 'О себе' }} /> }
export const Foreign: Story = { render: () => <Frame profile={foreign} /> }
export const WithoutBioAndBadges: Story = { render: () => <Frame profile={{ ...foreign, bio: null, badges: [] }} /> }
export const ZeroReputation: Story = { render: () => <Frame profile={own} /> }
export const Loading: Story = { render: () => <ProfileCard.Skeleton /> }
