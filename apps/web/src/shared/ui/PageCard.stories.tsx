import preview from '#.storybook/preview'
import { BaseIcon } from './BaseIcon.tsx'
import { Button } from './Button.tsx'
import { PageCard } from './PageCard.tsx'

const meta = preview.meta({
  title: 'shared/ui/PageCard',
  component: PageCard,
  args: { children: null },
})
export const Content = meta.story({
  render: () => (
    <PageCard>
      <PageCard.Header title="Настройки" />
      <PageCard.Content>Содержимое страницы</PageCard.Content>
    </PageCard>
  ),
})
export const Form = meta.story({
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
})
