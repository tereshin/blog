import preview from '#.storybook/preview'
import { StoryProviders } from '@/shared/lib'
import { Button, Skeleton } from '@/shared/ui'
import { DiscoveryRow } from './DiscoveryRow.tsx'

const meta = preview.meta({
  title: 'widgets/discovery/DiscoveryRow',
  component: DiscoveryRow,
  decorators: [
    (Story) => (
      <StoryProviders>
        <div className="max-w-[640px] bg-surface p-5">
          <Story />
        </div>
      </StoryProviders>
    ),
  ],
  args: { href: '/u/anna', name: 'Анна Авторова', slug: 'anna', avatar_url: null },
})
export const Blog = meta.story({
  args: {
    rank: 1,
    action: (
      <Button variant="primary" size="sm">
        Подписаться
      </Button>
    ),
  },
})
export const Following = meta.story({
  args: {
    action: (
      <Button variant="tertiary" size="sm">
        Отписаться
      </Button>
    ),
  },
})
export const OwnBlog = meta.story({ args: { rank: 5 } })
export const LoadingFollow = meta.story({
  args: { action: <Skeleton className="h-8 w-24 rounded-pill" /> },
})
export const Topic = meta.story({
  args: {
    href: '/t/life',
    name: 'Личный опыт',
    slug: 'life',
    action: (
      <Button variant="primary" size="sm">
        Подписаться
      </Button>
    ),
  },
})
export const LongName = meta.story({
  args: {
    rank: 125,
    name: 'Очень длинное название блога для проверки узкого экрана и доступности действий',
    slug: 'a-very-long-blog-address',
    action: (
      <Button variant="primary" size="sm">
        Подписаться
      </Button>
    ),
  },
})
