export function reorder<T extends { id: string }>(items: T[], from: string, to: string): T[] {
  const start = items.findIndex((item) => item.id === from)
  const end = items.findIndex((item) => item.id === to)
  if (start < 0 || end < 0 || start === end) return items
  const next = [...items]
  const [item] = next.splice(start, 1)
  if (item) next.splice(end, 0, item)
  return next
}
