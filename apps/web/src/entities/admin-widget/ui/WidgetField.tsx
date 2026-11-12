import type { ReactNode } from 'react'
export const WIDGET_INPUT_CLASS =
  'w-full rounded-lg border border-separator bg-surface px-3 py-2 text-sm'
export function WidgetField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-sm">
      <span>{label}</span>
      {children}
    </label>
  )
}
