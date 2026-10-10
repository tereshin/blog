import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './Button.tsx'
import { EmptyState } from './EmptyState.tsx'
import { BookmarkIcon } from './icons.tsx'

const meta = { title: 'shared/ui/EmptyState', component: EmptyState, args: { title: 'Пока нечего показать' } } satisfies Meta<typeof EmptyState>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const WithDescription: Story = { args: { description: 'Когда появятся комментарии, они будут здесь.' } }
export const WithAction: Story = {
  args: { title: 'Войдите, чтобы читать сообщения' },
  render: (args) => (
    <EmptyState {...args}>
      <Button variant="primary">Войти</Button>
    </EmptyState>
  ),
}

export const WithIcon: Story = {
  args: {
    title: 'Закладок пока нет',
    description: 'Нажмите на значок закладки в статье — она появится здесь.',
    icon: <BookmarkIcon width={28} height={28} />,
  },
}

export const Narrow: Story = {
  ...WithIcon,
  decorators: [(Story) => <div className="w-64"><Story /></div>],
}
