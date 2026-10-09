import { useT } from '@/shared/i18n'
import { Button, Dialog } from '@/shared/ui'

type UnsavedChangesDialogProps = {
  is_open: boolean
  onStay: () => void
  onLeave: () => void
}

/** Вопрос поверх каркаса: уход с несохранённым текстом. Отказ (и Escape) оставляют редактор. */
export function UnsavedChangesDialog({ is_open, onStay, onLeave }: UnsavedChangesDialogProps) {
  const { t } = useT()
  return (
    <Dialog is_open={is_open} onOpenChange={(next) => { if (!next) onStay() }}>
      <Dialog.Header>
        <Dialog.Heading>{t('editor.leave_title')}</Dialog.Heading>
      </Dialog.Header>
      <Dialog.Body>
        <p className="text-muted">{t('editor.leave_body')}</p>
      </Dialog.Body>
      <Dialog.Footer>
        <Button variant="ghost" onPress={onStay}>
          {t('editor.stay')}
        </Button>
        <Button variant="primary" onPress={onLeave}>
          {t('editor.leave')}
        </Button>
      </Dialog.Footer>
    </Dialog>
  )
}
