import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { AdminNavSection, AdminNavSectionItem } from '@blog/contracts'
import { NavItemIcon } from '@/entities/nav-section'
import { useT } from '@/shared/i18n'
import { BaseIcon, Button } from '@/shared/ui'

type NavSectionCardProps = {
  section: AdminNavSection
  onRename: () => void
  onDelete: () => void
  onAddItem: () => void
  onEditItem: (item: AdminNavSectionItem) => void
  onDeleteItem: (item_id: string) => void
  onMoveItem: (active_id: string, over_id: string) => void
}

function SortableItem({
  item,
  onEdit,
  onDelete,
}: {
  item: AdminNavSectionItem
  onEdit: () => void
  onDelete: () => void
}) {
  const { t } = useT()
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id })
  const broken = item.target.kind === 'page' && item.target.status !== 'published' && item.target.status !== 'draft'
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="flex items-center gap-2 rounded-xl px-2 py-1"
    >
      <button
        type="button"
        className="text-muted"
        aria-label={t('nav.sections.drag', { title: item.title })}
        {...attributes}
        {...listeners}
      >
        <BaseIcon name="menu" style="line" size={18} />
      </button>
      {item.icon ? <NavItemIcon svg={item.icon} size={20} /> : null}
      <span className="min-w-0 flex-1 truncate">{item.title}</span>
      {broken ? <span className="text-sm text-danger">{t('nav.sections.page_missing')}</span> : null}
      <Button size="sm" variant="ghost" onPress={onEdit}>{t('nav.sections.edit')}</Button>
      <Button size="sm" variant="ghost" onPress={onDelete}>{t('common.delete')}</Button>
    </li>
  )
}

export function NavSectionCard({
  section,
  onRename,
  onDelete,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onMoveItem,
}: NavSectionCardProps) {
  const { t } = useT()
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: section.id })
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const onDragEnd = (event: DragEndEvent) => {
    const from = event.active.id
    const to = event.over?.id
    if (typeof from === 'string' && typeof to === 'string') onMoveItem(from, to)
  }
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="flex flex-col gap-2 rounded-card border border-border p-3"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="text-muted"
          aria-label={t('nav.sections.drag', { title: section.title })}
          {...attributes}
          {...listeners}
        >
          <BaseIcon name="menu" style="line" size={18} />
        </button>
        <h2 className="min-w-0 flex-1 truncate text-base">{section.title}</h2>
        <Button size="sm" variant="secondary" onPress={onRename}>{t('nav.sections.rename')}</Button>
        <Button size="sm" variant="ghost" onPress={onDelete}>{t('common.delete')}</Button>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={section.items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
          <ul className="flex flex-col">
            {section.items.map((item) => (
              <SortableItem
                key={item.id}
                item={item}
                onEdit={() => onEditItem(item)}
                onDelete={() => onDeleteItem(item.id)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      <Button size="sm" variant="ghost" className="self-start" onPress={onAddItem}>
        {t('nav.sections.add_item')}
      </Button>
    </li>
  )
}
