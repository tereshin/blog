import preview from '#.storybook/preview'
import { Button } from './Button.tsx'
import { Menu } from './Menu.tsx'

const meta = preview.meta({ title: 'shared/ui/Menu', component: Menu })
export const Default = meta.story({
  render: () => (
    <Menu>
      <Button aria-label="Меню учётной записи">Меню</Button>
      <Menu.Content aria-label="Учётная запись">
        <Menu.Item id="profile" textValue="Профиль">
          Профиль
        </Menu.Item>
        <Menu.Item id="logout" textValue="Выйти" variant="danger">
          Выйти
        </Menu.Item>
      </Menu.Content>
    </Menu>
  ),
})
