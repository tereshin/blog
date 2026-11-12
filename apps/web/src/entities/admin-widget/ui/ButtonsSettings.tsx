import { useState } from 'react'
import { createNavSectionItemSchema, type AdminWidget, type SidebarLink } from '@blog/contracts'
import { useT } from '@/shared/i18n'
import {
  Button,
  Dialog,
  EditorActions,
  FormTextField,
  SortableList,
  SortableRow,
  ToggleField,
} from '@/shared/ui'
import { moveItem } from '../model/default-widget.ts'
import { LinkSettings } from './LinkSettings.tsx'
type Data = Extract<AdminWidget, { type: 'adminButtons' }>['data']
export function ButtonsSettings({
  data,
  onChange,
  errors = {},
}: {
  data: Data
  onChange: (data: Data) => void
  errors?: Record<string, string>
}) {
  const { t } = useT()
  const [editing, setEditing] = useState<SidebarLink | null>(null)
  const [is_invalid, setInvalid] = useState(false)
  const commit = () => {
    if (!editing) return
    const result = createNavSectionItemSchema.safeParse({
      title: editing.title,
      icon: editing.icon,
      target: editing.target,
    })
    setInvalid(!result.success)
    if (!result.success) return
    const item = { id: editing.id, ...result.data }
    onChange({
      ...data,
      items: data.items.some((current) => current.id === item.id)
        ? data.items.map((current) => (current.id === item.id ? item : current))
        : [...data.items, item],
    })
    setEditing(null)
  }
  const open = (item: SidebarLink) => {
    setEditing(item)
    setInvalid(false)
  }
  return (
    <div className="grid gap-4">
      <FormTextField
        label={t('widgets.title')}
        value={data.title}
        error={errors.title}
        onChange={(event) => onChange({ ...data, title: event.target.value })}
      />
      <ToggleField
        label={t('widgets.expanded')}
        is_selected={data.is_expanded}
        onChange={(is_expanded) => onChange({ ...data, is_expanded })}
      />
      <SortableList
        ids={data.items.map((item) => item.id)}
        onMove={(from, to) =>
          onChange({
            ...data,
            items: moveItem(
              data.items,
              data.items.findIndex((item) => item.id === from),
              data.items.findIndex((item) => item.id === to) -
                data.items.findIndex((item) => item.id === from),
            ),
          })
        }
      >
        {data.items.map((item, index) => (
          <SortableRow
            key={item.id}
            id={item.id}
            label={t('nav.sections.drag', { title: item.title })}
          >
            <div className="flex items-center justify-between rounded-lg border border-separator p-2">
              <span className="truncate">{item.title}</span>
              <EditorActions
                label={item.title}
                onEdit={() => open(item)}
                onDelete={() =>
                  onChange({
                    ...data,
                    items: data.items.filter((current) => current.id !== item.id),
                  })
                }
                onUp={
                  index > 0
                    ? () => onChange({ ...data, items: moveItem(data.items, index, -1) })
                    : undefined
                }
                onDown={
                  index < data.items.length - 1
                    ? () => onChange({ ...data, items: moveItem(data.items, index, 1) })
                    : undefined
                }
              />
            </div>
          </SortableRow>
        ))}
      </SortableList>
      <Button
        type="button"
        variant="secondary"
        isDisabled={data.items.length >= 30}
        onPress={() =>
          open({ id: crypto.randomUUID(), title: '', icon: null, target: { kind: 'url', url: '' } })
        }
      >
        {t('widgets.add_button')}
      </Button>
      {editing ? (
        <Dialog
          is_open
          onOpenChange={(open) => {
            if (!open) setEditing(null)
          }}
        >
          <Dialog.Header>
            <Dialog.Heading>{t('nav.sections.edit_item')}</Dialog.Heading>
          </Dialog.Header>
          <Dialog.Body>
            <LinkSettings
              value={editing}
              onChange={setEditing}
              errors={
                is_invalid
                  ? {
                      title: !editing.title.trim() ? t('widgets.invalid') : '',
                      target: t('widgets.invalid'),
                    }
                  : {}
              }
            />
          </Dialog.Body>
          <Dialog.Footer>
            <Button type="button" variant="ghost" onPress={() => setEditing(null)}>
              {t('common.cancel')}
            </Button>
            <Button type="button" onPress={commit}>
              {t('common.save')}
            </Button>
          </Dialog.Footer>
        </Dialog>
      ) : null}
    </div>
  )
}
