import preview from '#.storybook/preview'
import { Tabs } from './Tabs.tsx'

const meta = preview.meta({ title: 'shared/ui/Tabs', component: Tabs })
export const Default = meta.story({
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
})
