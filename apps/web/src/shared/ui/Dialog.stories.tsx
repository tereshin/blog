import preview from '#.storybook/preview'
import { useState } from 'react'
import { Button } from './Button.tsx'
import { Dialog } from './Dialog.tsx'

const meta = preview.meta({ title: 'shared/ui/Dialog', component: Dialog })
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

export const Default = meta.story({ args: { is_open: true, onOpenChange: () => {}, children: null }, render: () => <Demo /> })
