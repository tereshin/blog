import { useState } from 'react'
import { useT } from '@/shared/i18n'
import { BlockRenderer, Button, Dialog } from '@/shared/ui'
import type { usePageForm } from '../model/usePageForm.ts'
type Props = {
  form: ReturnType<typeof usePageForm>
  confirm_delete: boolean
  onConfirmDelete: (value: boolean) => void
  onDelete: () => Promise<void>
  is_blocked: boolean
  onStay: () => void
  onLeave: () => void
  onReload: () => void
  disabled: boolean
}
export function PageDialogs({
  form,
  confirm_delete,
  onConfirmDelete,
  onDelete,
  is_blocked,
  onStay,
  onLeave,
  onReload,
  disabled,
}: Props) {
  const { t } = useT()
  const [discard, setDiscard] = useState(false)
  function closeServer() {
    setDiscard(false)
    form.setServerVersion(null)
  }
  return (
    <>
      <Dialog is_open={confirm_delete} onOpenChange={onConfirmDelete}>
        <Dialog.Header>
          <Dialog.Heading>{t('pages.delete_title')}</Dialog.Heading>
        </Dialog.Header>
        <Dialog.Body>
          <p>{form.saved?.title}</p>
          <p>{t('pages.delete_hint')}</p>
        </Dialog.Body>
        <Dialog.Footer>
          <Button onPress={() => onConfirmDelete(false)}>{t('common.cancel')}</Button>
          <Button isDisabled={disabled} onPress={() => void onDelete()}>
            {t('common.delete')}
          </Button>
        </Dialog.Footer>
      </Dialog>
      <Dialog
        is_open={is_blocked}
        onOpenChange={(open) => {
          if (!open) onStay()
        }}
      >
        <Dialog.Header>
          <Dialog.Heading>{t('editor.leave_title')}</Dialog.Heading>
        </Dialog.Header>
        <Dialog.Body>{t('editor.leave_body')}</Dialog.Body>
        <Dialog.Footer>
          <Button onPress={onStay}>{t('editor.stay')}</Button>
          <Button onPress={onLeave}>{t('editor.leave')}</Button>
        </Dialog.Footer>
      </Dialog>
      <Dialog is_open={Boolean(form.server_version)} onOpenChange={closeServer}>
        <Dialog.Header>
          <Dialog.Heading>{t('pages.view_server')}</Dialog.Heading>
        </Dialog.Header>
        <Dialog.Body>
          {discard ? (
            <p>{t('pages.discard')}</p>
          ) : form.server_version ? (
            <article>
              <h2>{form.server_version.title}</h2>
              <BlockRenderer blocks={form.server_version.blocks.blocks} />
            </article>
          ) : null}
        </Dialog.Body>
        <Dialog.Footer>
          <Button onPress={closeServer}>{t('common.close')}</Button>
          <Button onPress={() => (discard ? onReload() : setDiscard(true))}>
            {t('pages.reload')}
          </Button>
        </Dialog.Footer>
      </Dialog>
    </>
  )
}
