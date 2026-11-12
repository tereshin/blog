import { adminWidgetSchema, type AdminWidget } from '@blog/contracts'
export function widgetErrors(widget: AdminWidget, message: string): Record<string, string> {
  const result = adminWidgetSchema.safeParse(widget)
  if (result.success) return {}
  return Object.fromEntries(
    result.error.issues.map((issue) => [issue.path.slice(1).join('.'), message]),
  )
}
