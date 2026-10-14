import preview from '#.storybook/preview'
import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import type { Profile } from '@/entities/profile'
import { ToastProvider } from '@/shared/ui'
import { UserCommentRow } from './UserCommentRow.tsx'

const profile: Profile = {
  user_id: '0b3a4c50-3333-4c33-8c33-000000000005',
  public_number: 5,
  display_name: 'Евгения Евсеева',
  bio: null,
  avatar_url: null,
  cover_url: null,
  status_icon_id: null,
  slug: 'reader',
  reputation: 0,
  created_at: '2024-01-01T00:00:00.000Z',
  followers_count: 2,
  following_count: 1,
  badges: [],
  is_own: false,
  is_following: false,
}

const COMMENT = {
  id: '00000000-0000-4000-8000-000000000020',
  excerpt: 'спасибо, поправлю!',
  article_id: '9b2e3f40-2222-4b22-8b22-000000000001',
  article_title: 'Модель Fable 5 будет доступна всем пользователям',
  article_slug: 'statya-1',
  href: '/p/statya-1#comment-00000000-0000-4000-8000-000000000020',
  created_at: '2026-07-02T10:00:00.000Z',
  reaction_count: 0,
  reaction_counts: { laugh: 0, heart: 0, thumb: 0, fire: 0 },
  my_reaction: null,
  is_bookmarked: false,
}

function Preview(props: Parameters<typeof UserCommentRow>[0]) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  )
  return (
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <ToastProvider>
          <ul className="mx-auto max-w-[640px] p-4">
            <UserCommentRow {...props} />
          </ul>
        </ToastProvider>
      </QueryClientProvider>
    </MemoryRouter>
  )
}

const meta = preview.meta({
  title: 'widgets/profile-card/UserCommentRow',
  component: Preview,
  args: {
    profile,
    comment: COMMENT,
  },
})
export const WithoutReactions = meta.story()
export const WithReactions = meta.story({
  args: {
    comment: {
      ...COMMENT,
      excerpt: 'если мы все будем отдыхать — кто же будет писать новости',
      reaction_count: 4,
      reaction_counts: { laugh: 1, heart: 0, thumb: 1, fire: 2 },
    },
  },
})
export const SelectedHeart = meta.story({
  args: {
    comment: {
      ...COMMENT,
      excerpt: 'да, простите, поправила',
      reaction_count: 1,
      reaction_counts: { heart: 1 },
      my_reaction: 'heart',
    },
  },
})
export const LongText = meta.story({
  args: {
    profile: { ...profile, display_name: 'Очень длинное имя автора комментария' },
    comment: {
      ...COMMENT,
      excerpt:
        'Длинный комментарий\nс переносами строк и ссылкой: https://example.com/very-long-address-without-spaces-that-must-wrap-on-small-screens',
    },
  },
})
