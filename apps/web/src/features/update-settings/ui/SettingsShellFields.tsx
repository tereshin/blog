import type { ShellVisibility } from '@blog/contracts'
import type { MessageKey } from '@/shared/i18n'
import { useT } from '@/shared/i18n'
import { ToggleField } from '@/shared/ui'

const FIELDS: ReadonlyArray<{ key: keyof ShellVisibility; label: MessageKey }> = [
  { key: 'popular', label: 'shell.nav.popular' },
  { key: 'fresh', label: 'shell.nav.fresh' },
  { key: 'mine', label: 'shell.nav.my_feed' },
  { key: 'messages', label: 'shell.nav.messages' },
  { key: 'rating', label: 'shell.nav.rating' },
  { key: 'popular_comments', label: 'shell.popular_comments' },
]

type SettingsShellFieldsProps = {
  value: ShellVisibility
  onChange: (value: ShellVisibility) => void
}

export function SettingsShellFields({ value, onChange }: SettingsShellFieldsProps) {
  const { t } = useT()
  return (
    <>
      {FIELDS.map((field) => (
        <ToggleField
          key={field.key}
          label={t(field.label)}
          isSelected={value[field.key]}
          onChange={(selected) => onChange({ ...value, [field.key]: selected })}
        />
      ))}
    </>
  )
}
