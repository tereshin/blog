import type { AdminNavSectionItem, CreateNavSectionItem } from '@blog/contracts'
import { useT } from '@/shared/i18n'
import { Button, Dialog, FormTextField, Select } from '@/shared/ui'
import { useItemDialog } from '../model/useItemDialog.ts'
import { NavIconField } from './NavIconField.tsx'

type ItemDialogProps = {
  item: AdminNavSectionItem | null
  is_pending: boolean
  onClose: () => void
  onSave: (body: CreateNavSectionItem) => void
}

export function ItemDialog({ item, is_pending, onClose, onSave }: ItemDialogProps) {
  const { t } = useT()
  const dialog = useItemDialog(item, onSave)
  return (
    <Dialog is_open onOpenChange={(open) => { if (!open) onClose() }}>
      <form onSubmit={dialog.handleSubmit}>
        <Dialog.Header>
          <Dialog.Heading>{t(item ? 'nav.sections.edit_item' : 'nav.sections.add_item')}</Dialog.Heading>
        </Dialog.Header>
        <Dialog.Body>
          <div className="flex flex-col gap-4">
            <FormTextField
              label={t('nav.sections.item_title')}
              value={dialog.draft.title}
              maxLength={80}
              error={dialog.errorFor('nav.sections.title_required')}
              onChange={(event) => dialog.setTitle(event.target.value)}
            />
            <NavIconField
              icon={dialog.draft.icon}
              error={dialog.errorFor('nav.sections.icon_invalid')}
              onChange={dialog.setIcon}
              onInvalid={dialog.markIconInvalid}
            />
            <Select
              label={t('nav.sections.target')}
              value={dialog.draft.kind}
              options={[
                { value: 'page', label: t('nav.sections.target_page') },
                { value: 'url', label: t('nav.sections.target_url') },
              ]}
              onChange={dialog.setKind}
            />
            {dialog.draft.kind === 'page' ? (
              <Select
                label={t('nav.sections.page')}
                value={dialog.draft.page_id}
                options={dialog.page_options}
                error={dialog.errorFor('nav.sections.page_required')}
                onChange={dialog.setPageId}
              />
            ) : (
              <FormTextField
                label={t('nav.sections.url')}
                value={dialog.draft.url}
                error={dialog.errorFor('nav.sections.url_invalid')}
                onChange={(event) => dialog.setUrl(event.target.value)}
              />
            )}
          </div>
        </Dialog.Body>
        <Dialog.Footer>
          <Button type="button" variant="ghost" onPress={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" isDisabled={is_pending}>{t('common.save')}</Button>
        </Dialog.Footer>
      </form>
    </Dialog>
  )
}
