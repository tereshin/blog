import { useState } from 'react'
import { useT } from '@/shared/i18n'
import type { MessageKey } from '@/shared/i18n'
import { Button, Dialog, FormTextField } from '@/shared/ui'

type SectionTitleDialogProps = {
  title: string
  heading: MessageKey
  is_pending: boolean
  onClose: () => void
  onSave: (title: string) => void
}

export function SectionTitleDialog({ title, heading, is_pending, onClose, onSave }: SectionTitleDialogProps) {
  const { t } = useT()
  const [value, setValue] = useState(title)
  const [error, setError] = useState<MessageKey | null>(null)
  return (
    <Dialog is_open onOpenChange={(open) => { if (!open) onClose() }}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          const next = value.trim()
          if (!next) {
            setError('nav.sections.title_required')
            return
          }
          onSave(next)
        }}
      >
        <Dialog.Header>
          <Dialog.Heading>{t(heading)}</Dialog.Heading>
        </Dialog.Header>
        <Dialog.Body>
          <FormTextField
            label={t('nav.sections.section_title')}
            value={value}
            maxLength={80}
            error={error ? t(error) : undefined}
            onChange={(event) => setValue(event.target.value)}
          />
        </Dialog.Body>
        <Dialog.Footer>
          <Button type="button" variant="ghost" onPress={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" isDisabled={is_pending}>{t('common.save')}</Button>
        </Dialog.Footer>
      </form>
    </Dialog>
  )
}
