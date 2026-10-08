import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Button } from './Button.tsx'
import { Drawer } from './Drawer.tsx'

const meta = { title: 'shared/ui/Drawer', component: Drawer } satisfies Meta<typeof Drawer>
export default meta
type Story = StoryObj<typeof meta>

function Demo({ placement }: { placement: 'left' | 'right' }) {
  const [is_open, setIsOpen] = useState(true)
  return (
    <>
      <Button onPress={() => setIsOpen(true)}>Открыть</Button>
      <Drawer is_open={is_open} onOpenChange={setIsOpen} placement={placement} aria-label="Навигация">
        <Drawer.Header>
          <Drawer.Heading>Навигация</Drawer.Heading>
        </Drawer.Header>
        <Drawer.Body>Пункты навигации</Drawer.Body>
      </Drawer>
    </>
  )
}

export const Left: Story = { args: { is_open: true, onOpenChange: () => {}, children: null }, render: () => <Demo placement="left" /> }
export const Right: Story = { args: { is_open: true, onOpenChange: () => {}, children: null }, render: () => <Demo placement="right" /> }
