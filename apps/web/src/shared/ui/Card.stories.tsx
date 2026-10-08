import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './Button.tsx'
import { Card } from './Card.tsx'

const meta = { title: 'shared/ui/Card', component: Card } satisfies Meta<typeof Card>
export default meta
type Story = StoryObj

export const Default: Story = {
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
}

export const ContentOnly: Story = {
  render: () => (
    <Card className="max-w-sm">
      <Card.Content>Только содержимое</Card.Content>
    </Card>
  ),
}
