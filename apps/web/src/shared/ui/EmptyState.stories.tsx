import preview from '#.storybook/preview'
import { Button } from './Button.tsx'
import { EmptyState } from './EmptyState.tsx'
import { BookmarkIcon } from './icons.tsx'

const meta = preview.meta({ title: 'shared/ui/EmptyState', component: EmptyState, args: { title: 'Пока нечего показать' } })
export const Default = meta.story()
export const WithDescription = meta.story({ args: { description: 'Когда появятся комментарии, они будут здесь.' } })
export const WithAction = meta.story({
  args: { title: 'Войдите, чтобы читать сообщения' },
  render: (args) => (
    <EmptyState {...args}>
      <Button variant="primary">Войти</Button>
    </EmptyState>
  ),
})

export const WithIcon = meta.story({
  args: {
    title: 'Закладок пока нет',
    description: 'Нажмите на значок закладки в статье — она появится здесь.',
    icon: <BookmarkIcon width={28} height={28} />,
  },
})

export const Narrow = meta.story({
  args: {
    title: 'Закладок пока нет',
    description: 'Нажмите на значок закладки в статье — она появится здесь.',
    icon: <BookmarkIcon width={28} height={28} />,
  },
  decorators: [(Story) => <div className="w-64"><Story /></div>],
})
