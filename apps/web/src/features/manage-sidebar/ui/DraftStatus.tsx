import { useState } from 'react'
import type { ConfigDraft } from '../model/useConfigDraft.ts'
import { useT } from '@/shared/i18n'
import { Button, Dialog, EditorSaveBar } from '@/shared/ui'
export function DraftStatus<T extends { version: number }>({ form }: { form: ConfigDraft<T> }) {
  const { t } = useT()
  const [is_confirming, setConfirming] = useState(false)
  return (
    <>
      <EditorSaveBar
        is_dirty={form.is_dirty}
        is_pending={form.mutation.isPending}
        onSave={form.submit}
        onCancel={form.cancel}
      />
      {form.is_invalid ? (
        <p role="alert" className="text-danger">
          {t('widgets.invalid')}
        </p>
      ) : null}
      {form.mutation.isSuccess ? <p role="status">{t('widgets.saved')}</p> : null}
      {form.mutation.isError ? (
        <div role="alert">
          <p className="text-danger">
            {t(form.is_conflict ? 'widgets.conflict' : 'error.unknown')}
          </p>
          {form.is_conflict ? (
            <Button type="button" onPress={() => setConfirming(true)}>
              {t('widgets.reload')}
            </Button>
          ) : null}
        </div>
      ) : null}
      {is_confirming ? (
        <Dialog is_open onOpenChange={setConfirming}>
          <Dialog.Header>
            <Dialog.Heading>{t('sidebars.replace_draft')}</Dialog.Heading>
          </Dialog.Header>
          <Dialog.Footer>
            <Button variant="ghost" onPress={() => setConfirming(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onPress={() => {
                void form.reload()
                setConfirming(false)
              }}
            >
              {t('widgets.reload')}
            </Button>
          </Dialog.Footer>
        </Dialog>
      ) : null}
    </>
  )
}
