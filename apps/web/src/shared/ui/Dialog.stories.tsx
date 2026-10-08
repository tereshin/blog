import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Button } from './Button.tsx'
import { Dialog } from './Dialog.tsx'

const meta = { title: 'shared/ui/Dialog', component: Dialog } satisfies Meta<typeof Dialog>
export default meta
type Story = StoryObj<typeof meta>

function Demo() {
  const [is_open, setIsOpen] = useState(true)
  return (
    <>
      <Button variant="primary" onPress={() => setIsOpen(true)}>
        Открыть
      </Button>
      <Dialog is_open={is_open} onOpenChange={setIsOpen}>
        <Dialog.CloseTrigger />
        <Dialog.Header>
          <Dialog.Heading>Войдите, чтобы продолжить</Dialog.Heading>
        </Dialog.Header>
        <Dialog.Body>Читать можно без входа.</Dialog.Body>
        <Dialog.Footer>
          <Button variant="primary">Войти через Google</Button>
        </Dialog.Footer>
      </Dialog>
    </>
  )
}

export const Default: Story = { args: { is_open: true, onOpenChange: () => {}, children: null }, render: () => <Demo /> }
