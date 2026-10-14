import { useT } from '@/shared/i18n'
import { Button, Dialog } from '@/shared/ui'

type DeleteSectionDialogProps = {
  title: string
  is_pending: boolean
  onClose: () => void
  onDelete: () => void
}

export function DeleteSectionDialog({ title, is_pending, onClose, onDelete }: DeleteSectionDialogProps) {
  const { t } = useT()
  return (
    <Dialog is_open onOpenChange={(open) => { if (!open) onClose() }}>
      <Dialog.Header>
        <Dialog.Heading>{t('nav.sections.delete_title')}</Dialog.Heading>
      </Dialog.Header>
      <Dialog.Body>
        <p>{title}</p>
        <p>{t('nav.sections.delete_hint')}</p>
      </Dialog.Body>
      <Dialog.Footer>
        <Button variant="ghost" onPress={onClose}>{t('common.cancel')}</Button>
        <Button isDisabled={is_pending} onPress={onDelete}>{t('common.delete')}</Button>
      </Dialog.Footer>
    </Dialog>
  )
}
