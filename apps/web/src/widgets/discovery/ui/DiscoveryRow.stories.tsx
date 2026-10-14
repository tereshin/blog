import type { Meta, StoryObj } from '@storybook/react-vite'
import { StoryProviders } from '@/shared/api/mocks'
import { Button, Skeleton } from '@/shared/ui'
import { DiscoveryRow } from './DiscoveryRow.tsx'

const meta = {
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
} satisfies Meta<typeof DiscoveryRow>
export default meta
type Story = StoryObj<typeof meta>

export const Blog: Story = {
  args: {
    rank: 1,
    action: (
      <Button variant="primary" size="sm">
        Подписаться
      </Button>
    ),
  },
}
export const Following: Story = {
  args: {
    action: (
      <Button variant="tertiary" size="sm">
        Отписаться
      </Button>
    ),
  },
}
export const OwnBlog: Story = { args: { rank: 5 } }
export const LoadingFollow: Story = {
  args: { action: <Skeleton className="h-8 w-24 rounded-pill" /> },
}
export const Topic: Story = {
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
}
export const LongName: Story = {
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
}
