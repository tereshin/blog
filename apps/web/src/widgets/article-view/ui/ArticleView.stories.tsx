import type { Meta, StoryObj } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router'
import type { ArticleModel } from '@/entities/article'
import { ArticleSkeleton } from './ArticleSkeleton.tsx'
import { ArticleUnavailable } from './ArticleUnavailable.tsx'
import { ArticleView } from './ArticleView.tsx'

const article: ArticleModel = {
  id: '9b2e3f40-2222-4b22-8b22-000000000001',
  slug: 'statya-1',
  title: 'Статья о технологиях без компромиссов',
  blocks: [
    { type: 'paragraph', data: { text: 'Полный текст статьи.' } },
    { type: 'image', data: { file: { url: 'https://example.com/one.png' }, caption: 'Первое' } },
  ],
  author: {
    user_id: 'a1000000-0000-4000-8000-000000000001',
    display_name: 'Анна Авторова',
    avatar_url: null,
    slug: 'anna',
    href: '/u/anna',
  },
  topic: {
    id: '5f0f6a52-0d8b-4f6e-a8b1-000000000001',
    title: 'Технологии',
    slug: 'tehnologii',
    status: 'active',
    href: '/t/tehnologii',
  },
  published_at: '2026-10-08T10:00:00.000Z',
  visibility: 'public',
  comments_enabled: true,
  status: 'published',
  reaction_counts: { laugh: 0, heart: 0, thumb: 0, fire: 0 },
  reaction_count: 0,
  comment_count: 0,
  bookmark_count: 0,
  view_count: 1,
  is_own: false,
}

function Frame({ own }: { own: boolean }) {
  return (
    <MemoryRouter>
      <div className="mx-auto max-w-2xl">
        <ArticleView article={{ ...article, is_own: own }}>
          <ArticleView.Byline />
          <ArticleView.Title />
          <ArticleView.Body />
        </ArticleView>
      </div>
    </MemoryRouter>
  )
}

const meta = { title: 'widgets/article-view/ArticleView', component: Frame } satisfies Meta<
  typeof Frame
>
export default meta
type Story = StoryObj<typeof Frame>

export const Own: Story = { args: { own: true } }
export const Others: Story = { args: { own: false } }
export const Unavailable: Story = { render: () => <ArticleUnavailable status="unavailable" /> }
export const MembersOnly: Story = { render: () => <ArticleUnavailable status="members_only" /> }
export const Loading: Story = { render: () => <ArticleSkeleton /> }
