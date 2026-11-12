import { useState } from 'react'
import { sidebarLinkSchema, type SidebarLink } from '@blog/contracts'
import { LinkSettings } from '@/entities/admin-widget'
import { useT } from '@/shared/i18n'
import { Button, Dialog } from '@/shared/ui'

export function LinkDialog({
  initial,
  onSave,
  onClose,
}: {
  initial: SidebarLink
  onSave: (value: SidebarLink) => void
  onClose: () => void
}) {
  const { t } = useT()
  const [value, setValue] = useState(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  return (
    <Dialog
      is_open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <Dialog.Header>
        <Dialog.Heading>{t('nav.sections.edit_item')}</Dialog.Heading>
      </Dialog.Header>
      <Dialog.Body>
        <LinkSettings value={value} onChange={setValue} errors={errors} />
      </Dialog.Body>
      <Dialog.Footer>
        <Button variant="ghost" onPress={onClose}>
          {t('common.cancel')}
        </Button>
        <Button
          onPress={() => {
            const result = sidebarLinkSchema.safeParse(value)
            if (!result.success) {
              setErrors(
                Object.fromEntries(
                  result.error.issues.map((issue) => [String(issue.path[0]), t('widgets.invalid')]),
                ),
              )
              return
            }
            if (
              value.target.kind === 'page' &&
              !value.target.page_id &&
              !(initial.target.kind === 'page' && initial.target.page_id === null && initial.title)
            ) {
              setErrors({ target: t('widgets.invalid') })
              return
            }
            onSave(result.data)
          }}
        >
          {t('common.save')}
        </Button>
      </Dialog.Footer>
    </Dialog>
  )
}
