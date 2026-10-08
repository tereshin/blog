import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './Button.tsx'
import { Menu } from './Menu.tsx'

const meta = { title: 'shared/ui/Menu', component: Menu } satisfies Meta<typeof Menu>
export default meta
type Story = StoryObj

export const Default: Story = {
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
}
