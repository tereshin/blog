import { DEFAULT_FEEDBACK_FIELDS, commentsWidgetSchema } from '@blog/contracts'
import type { AdminWidget } from '@blog/contracts'
export function defaultWidget(type: AdminWidget['type']): AdminWidget {
  const id = crypto.randomUUID()
  switch (type) {
    case 'adminComments':
      return { id, type, data: commentsWidgetSchema.parse({}) }
    case 'adminFeedback':
      return {
        id,
        type,
        data: { recipient: '', fields: DEFAULT_FEEDBACK_FIELDS.map((field) => ({ ...field })) },
      }
    case 'adminButtons':
      return { id, type, data: { title: '', is_expanded: true, items: [] } }
  }
}
export function moveItem<T>(items: T[], index: number, offset: number): T[] {
  const target = index + offset
  if (target < 0 || target >= items.length) return items
  const copy = [...items]
  const item = copy.splice(index, 1)[0]
  if (item === undefined) return items
  copy.splice(target, 0, item)
  return copy
}
