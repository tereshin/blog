import { useState } from 'react'
import { adminWidgetSchema, type AdminWidget } from '@blog/contracts'
import { WidgetSettings, widgetErrors } from '@/entities/admin-widget'
import { useT } from '@/shared/i18n'
import { Button, Dialog } from '@/shared/ui'

export function WidgetDialog({
  initial,
  onSave,
  onClose,
}: {
  initial: AdminWidget
  onSave: (value: AdminWidget) => void
  onClose: () => void
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
      size="lg"
    >
      <Dialog.Header>
        <Dialog.Heading>{t(`widgets.${value.type}`)}</Dialog.Heading>
      </Dialog.Header>
      <Dialog.Body>
        <WidgetSettings
          widget={value}
          onChange={setValue}
          errors={is_invalid ? widgetErrors(value, t('widgets.invalid')) : {}}
        />
      </Dialog.Body>
      <Dialog.Footer>
        <Button variant="ghost" onPress={onClose}>
          {t('common.cancel')}
        </Button>
        <Button
          onPress={() => {
            const result = adminWidgetSchema.safeParse(value)
            setInvalid(!result.success)
            if (result.success) onSave(result.data)
          }}
        >
          {t('common.save')}
        </Button>
      </Dialog.Footer>
    </Dialog>
  )
}
