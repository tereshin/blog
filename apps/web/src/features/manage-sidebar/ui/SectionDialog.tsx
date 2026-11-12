import { useState } from 'react'
import { useT } from '@/shared/i18n'
import { Button, Dialog, FormTextField, ToggleField } from '@/shared/ui'

export function SectionDialog({
  initial,
  onSave,
  onClose,
  side,
}: {
  initial: { id: string; title: string; has_card?: boolean }
  onSave: (value: { id: string; title: string; has_card?: boolean }) => void
  onClose: () => void
  side: 'left' | 'right'
}) {
  const { t } = useT()
  const [value, setValue] = useState(initial)
  const [is_invalid, setInvalid] = useState(false)
  return (
    <Dialog
      is_open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <Dialog.Header>
        <Dialog.Heading>{t('sidebars.section')}</Dialog.Heading>
      </Dialog.Header>
      <Dialog.Body>
        <div className="grid gap-4">
          <FormTextField
            label={t('widgets.title')}
            maxLength={80}
            value={value.title}
            error={is_invalid ? t('widgets.invalid') : undefined}
            onChange={(event) => setValue({ ...value, title: event.target.value })}
          />
          {side === 'right' ? (
            <ToggleField
              label={t('widgets.card')}
              is_selected={value.has_card ?? true}
              onChange={(has_card) => setValue({ ...value, has_card })}
            />
          ) : null}
        </div>
      </Dialog.Body>
      <Dialog.Footer>
        <Button variant="ghost" onPress={onClose}>
          {t('common.cancel')}
        </Button>
        <Button
          onPress={() => {
            if (side === 'left' && !value.title.trim()) {
              setInvalid(true)
              return
            }
            onSave(value)
          }}
        >
          {t('common.save')}
        </Button>
      </Dialog.Footer>
    </Dialog>
  )
}
