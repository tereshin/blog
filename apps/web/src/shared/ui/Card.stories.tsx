import preview from '#.storybook/preview'
import { Button } from './Button.tsx'
import { Card } from './Card.tsx'

const meta = preview.meta({ title: 'shared/ui/Card', component: Card })
export const Default = meta.story({
  render: () => (
    <Card className="max-w-sm">
      <Card.Header>
        <Card.Title>Заголовок карточки</Card.Title>
      </Card.Header>
      <Card.Content>Содержимое карточки на токенах вида.</Card.Content>
      <Card.Footer>
        <Button variant="primary">Действие</Button>
      </Card.Footer>
    </Card>
  ),
})

export const ContentOnly = meta.story({
  render: () => (
    <Card className="max-w-sm">
      <Card.Content>Только содержимое</Card.Content>
    </Card>
  ),
})
