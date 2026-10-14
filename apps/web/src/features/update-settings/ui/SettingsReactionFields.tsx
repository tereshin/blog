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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { MAX_ACTIVE_REACTIONS } from '@blog/contracts'
import type { ReactNode } from 'react'
import { useT } from '@/shared/i18n'
import { Button } from '@/shared/ui'
import { activeDrafts, retiredDrafts } from '../model/appearance-draft.ts'
import type { AppearanceDraft, AppearanceFieldError } from '../model/appearance-draft.ts'
import { SettingsReactionAdd } from './SettingsReactionAdd.tsx'
import { SettingsReactionRow } from './SettingsReactionRow.tsx'

type SettingsReactionFieldsProps = {
  drafts: readonly AppearanceDraft[]
  can_edit_media: boolean
  errors: Partial<Record<string, AppearanceFieldError>>
  upload: (options: { label: string; onUploaded: (url: string) => void }) => ReactNode
  onPatch: (
    kind: string,
    patch: Partial<Pick<AppearanceDraft, 'presentation' | 'emoji' | 'image_url' | 'label'>>,
  ) => void
  onReorder: (from_kind: string, to_kind: string) => void
  onRetire: (kind: string) => void
  onRestore: (kind: string) => void
  onAdd: (draft: AppearanceDraft) => void
}

export function SettingsReactionFields({
  drafts,
  can_edit_media,
  errors,
  upload,
  onPatch,
  onReorder,
  onRetire,
  onRestore,
  onAdd,
}: SettingsReactionFieldsProps) {
  const { t } = useT()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const active = activeDrafts(drafts)
  const retired = retiredDrafts(drafts)
  const onDragEnd = (event: DragEndEvent) => {
    const from = event.active.id
    const to = event.over?.id
    if (typeof from !== 'string' || typeof to !== 'string') return
    onReorder(from, to)
  }
  return (
    <fieldset className="flex flex-col gap-8 border-0 p-0">
      <legend className="sr-only">{t('admin.settings.reactions')}</legend>
      <p className="text-sm text-muted">{t('admin.settings.reactions_hint')}</p>
      <DndContext
        sensors={can_edit_media ? sensors : []}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={active.map((item) => item.kind)} strategy={verticalListSortingStrategy}>
          <ul className="flex flex-col gap-6">
            {active.map((item) => (
              <SettingsReactionRow
                key={item.kind}
                item={item}
                can_edit={can_edit_media}
                can_retire={active.length > 1}
                error={errors[item.kind]}
                upload={upload}
                onPatch={onPatch}
                onRetire={onRetire}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      {can_edit_media && active.length === 1 ? (
        <p className="text-sm text-muted">{t('admin.settings.reaction_last')}</p>
      ) : null}
      {can_edit_media ? (
        <SettingsReactionAdd can_add={active.length < MAX_ACTIVE_REACTIONS} upload={upload} onAdd={onAdd} />
      ) : null}
      {retired.length > 0 ? (
        <section className="flex flex-col gap-4 border-t border-separator pt-6">
          <h2 className="text-base font-semibold">{t('admin.settings.reaction_retired')}</h2>
          <ul className="flex flex-col gap-3">
            {retired.map((item) => (
              <li key={item.kind} className="flex items-center gap-3">
                {item.presentation === 'emoji' ? (
                  <span aria-hidden="true" className="text-base">
                    {item.emoji}
                  </span>
                ) : item.image_url ? (
                  <img loading="lazy" src={item.image_url} alt="" className="size-6 object-contain" />
                ) : null}
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {can_edit_media ? (
                  <Button
                    type="button"
                    variant="ghost"
                    isDisabled={active.length >= MAX_ACTIVE_REACTIONS}
                    onPress={() => onRestore(item.kind)}
                  >
                    {t('admin.settings.reaction_restore')}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </fieldset>
  )
}
