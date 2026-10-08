import type { Meta, StoryObj } from '@storybook/react-vite'
import { Tabs } from './Tabs.tsx'

const meta = { title: 'shared/ui/Tabs', component: Tabs } satisfies Meta<typeof Tabs>
export default meta
type Story = StoryObj

export const Default: Story = {
  render: () => (
    <Tabs defaultSelectedKey="posts">
      <Tabs.List aria-label="Вкладки профиля">
        <Tabs.Tab id="posts">Посты</Tabs.Tab>
        <Tabs.Tab id="comments">Комментарии</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel id="posts">Список постов</Tabs.Panel>
      <Tabs.Panel id="comments">Список комментариев</Tabs.Panel>
    </Tabs>
  ),
}
