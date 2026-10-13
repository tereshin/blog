import type { Meta, StoryObj } from '@storybook/react-vite'
import { BaseIcon } from './BaseIcon.tsx'
import { Button } from './Button.tsx'
import { PageCard } from './PageCard.tsx'

const meta = {
  title: 'shared/ui/PageCard',
  component: PageCard,
  args: { children: null },
} satisfies Meta<typeof PageCard>
export default meta
type Story = StoryObj<typeof meta>
export const Content: Story = {
  render: () => (
    <PageCard>
      <PageCard.Header title="Настройки" />
      <PageCard.Content>Содержимое страницы</PageCard.Content>
    </PageCard>
  ),
}
export const Form: Story = {
  render: () => (
    <form onSubmit={(event) => event.preventDefault()}>
      <PageCard>
        <PageCard.Header
          title="Настройки"
          actions={
            <Button type="button" isIconOnly aria-label="Создать">
              <BaseIcon name="add" style="line" />
            </Button>
          }
        />
        <PageCard.Content>
          <label>
            Название
            <input className="block" defaultValue="Блог" />
          </label>
        </PageCard.Content>
        <PageCard.Footer>
          <Button type="submit" variant="primary">
            Сохранить
          </Button>
        </PageCard.Footer>
      </PageCard>
    </form>
  ),
}
