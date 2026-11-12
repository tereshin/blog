import type { ReactNode } from 'react'
import { useT } from '@/shared/i18n'
import { EditorActions, EditorSection, SortableList, SortableRow } from '@/shared/ui'
type Entry = { id: string; title: string; description?: string }
export function ConfigList({
  entries,
  onMove,
  onEdit,
  onDelete,
  children,
}: {
  entries: Entry[]
  onMove: (from: string, to: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  children?: ((id: string, actions: ReactNode) => ReactNode) | undefined
}) {
  const { t } = useT()
  return (
    <SortableList ids={entries.map((entry) => entry.id)} onMove={onMove}>
      {entries.map((entry, index) => {
        const actions = (
          <EditorActions
            label={t('sidebars.actions', { title: entry.title })}
            onEdit={() => onEdit(entry.id)}
            onDelete={() => onDelete(entry.id)}
            onUp={
              index > 0
                ? () => {
                    const target = entries[index - 1]
                    if (target) onMove(entry.id, target.id)
                  }
                : undefined
            }
            onDown={
              index < entries.length - 1
                ? () => {
                    const target = entries[index + 1]
                    if (target) onMove(entry.id, target.id)
                  }
                : undefined
            }
          />
        )
        return (
          <SortableRow
            key={entry.id}
            id={entry.id}
            label={t('nav.sections.drag', { title: entry.title })}
          >
            {children ? (
              children(entry.id, actions)
            ) : (
              <div className="flex items-center gap-2 rounded-xl border border-separator p-3">
                <div className="min-w-0 flex-1">
                  <div className="break-words text-sm leading-5">{entry.title}</div>
                  {entry.description ? (
                    <p className="truncate text-sm text-muted">{entry.description}</p>
                  ) : null}
                </div>
                {actions}
              </div>
            )}
          </SortableRow>
        )
      })}
    </SortableList>
  )
}
export { EditorSection }
