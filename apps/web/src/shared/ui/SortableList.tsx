import type { ReactNode } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { BaseIcon } from './BaseIcon.tsx'
import { Button } from './Button.tsx'

export function SortableList({
  ids,
  onMove,
  children,
}: {
  ids: string[]
  onMove: (from: string, to: string) => void
  children: ReactNode
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={(event) => {
        if (event.over && event.active.id !== event.over.id)
          onMove(String(event.active.id), String(event.over.id))
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="grid gap-3">{children}</div>
      </SortableContext>
    </DndContext>
  )
}
export function SortableRow({
  id,
  label,
  children,
}: {
  id: string
  label: string
  children: ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="flex min-w-0 items-start gap-2"
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        isIconOnly
        aria-label={label}
        className="mt-3 touch-none"
        {...attributes}
        {...listeners}
      >
        <BaseIcon name="menu" style="line" size={18} />
      </Button>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
