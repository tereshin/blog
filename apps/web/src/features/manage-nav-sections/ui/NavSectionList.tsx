import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { AdminNavSection, AdminNavSectionItem, CreateNavSectionItem } from '@blog/contracts'
import { useT } from '@/shared/i18n'
import { EmptyState, ErrorState, Skeleton } from '@/shared/ui'
import { useManageNavSections } from '../model/useManageNavSections.ts'
import { DeleteSectionDialog, ItemDialog, SectionTitleDialog } from './NavSectionDialogs.tsx'
import { NavSectionCard } from './NavSectionCard.tsx'

type DialogState =
  | { kind: 'create' }
  | { kind: 'rename'; section: AdminNavSection }
  | { kind: 'delete'; section: AdminNavSection }
  | { kind: 'item'; section: AdminNavSection; item: AdminNavSectionItem | null }

type NavSectionListProps = {
  dialog: DialogState | null
  onDialog: (dialog: DialogState | null) => void
}

export function NavSectionList({ dialog, onDialog }: NavSectionListProps) {
  const { t } = useT()
  const manage = useManageNavSections()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const items = manage.sections.data?.items ?? []
  const onDragEnd = (event: DragEndEvent) => {
    const from = event.active.id
    const to = event.over?.id
    if (typeof from === 'string' && typeof to === 'string') manage.moveSections(from, to)
  }
  const saveItem = (section_id: string, item_id: string | null, body: CreateNavSectionItem) => {
    const done = () => onDialog(null)
    if (item_id) manage.updateItem.mutate({ section_id, item_id, body }, { onSuccess: done })
    else manage.createItem.mutate({ section_id, body }, { onSuccess: done })
  }

  const body = manage.sections.isPending ? (
    <div className="flex flex-col gap-3" role="status" aria-label={t('common.loading')}>
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  ) : manage.sections.isError ? (
    <ErrorState title={t('nav.sections.load_error')} onRetry={() => void manage.sections.refetch()} />
  ) : items.length === 0 ? (
        <EmptyState title={t('nav.sections.empty')} />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items.map((section) => section.id)} strategy={verticalListSortingStrategy}>
            <ul className="flex flex-col gap-3">
              {items.map((section) => (
                <NavSectionCard
                  key={section.id}
                  section={section}
                  onRename={() => onDialog({ kind: 'rename', section })}
                  onDelete={() => onDialog({ kind: 'delete', section })}
                  onAddItem={() => onDialog({ kind: 'item', section, item: null })}
                  onEditItem={(item) => onDialog({ kind: 'item', section, item })}
                  onDeleteItem={(item_id) => manage.removeItem.mutate({ section_id: section.id, item_id })}
                  onMoveItem={(active_id, over_id) => manage.moveItems(section.id, active_id, over_id)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
  )

  return (
    <>
      {body}
      {dialog?.kind === 'create' ? (
        <SectionTitleDialog
          title=""
          heading="nav.sections.create"
          is_pending={manage.create.isPending}
          onClose={() => onDialog(null)}
          onSave={(title) => manage.create.mutate(title, { onSuccess: () => onDialog(null) })}
        />
      ) : null}
      {dialog?.kind === 'rename' ? (
        <SectionTitleDialog
          key={dialog.section.id}
          title={dialog.section.title}
          heading="nav.sections.rename"
          is_pending={manage.update.isPending}
          onClose={() => onDialog(null)}
          onSave={(title) =>
            manage.update.mutate({ id: dialog.section.id, title }, { onSuccess: () => onDialog(null) })
          }
        />
      ) : null}
      {dialog?.kind === 'delete' ? (
        <DeleteSectionDialog
          title={dialog.section.title}
          is_pending={manage.remove.isPending}
          onClose={() => onDialog(null)}
          onDelete={() => manage.remove.mutate(dialog.section.id, { onSuccess: () => onDialog(null) })}
        />
      ) : null}
      {dialog?.kind === 'item' ? (
        <ItemDialog
          key={dialog.item?.id ?? 'new'}
          item={dialog.item}
          is_pending={manage.createItem.isPending || manage.updateItem.isPending}
          onClose={() => onDialog(null)}
          onSave={(body) => saveItem(dialog.section.id, dialog.item?.id ?? null, body)}
        />
      ) : null}
    </>
  )
}

export type { DialogState }
