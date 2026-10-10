import { useAppearance } from '@/entities/session'
import { useT } from '@/shared/i18n'
import { BaseIcon, Button, Menu } from '@/shared/ui'

type AppearanceToggleProps = { as?: 'button' | 'item' }

/** Переключает тёмный и светлый вид. Подпись называет вид, который включится. */
export function AppearanceToggle({ as = 'button' }: AppearanceToggleProps) {
  const { t } = useT()
  const { theme, setAppearance } = useAppearance()
  const next = theme === 'dark' ? 'light' : 'dark'
  const label = t(next === 'light' ? 'account.theme_light' : 'account.theme_dark')
  if (as === 'item') {
    return (
      <Menu.Item id="appearance" textValue={label} onPress={() => setAppearance(next)}>
        {label}
      </Menu.Item>
    )
  }
  return (
    <Button
      variant="ghost"
      aria-label={label}
      className="max-sm:size-9 max-sm:min-w-9 max-sm:p-0"
      onPress={() => setAppearance(next)}
    >
      {next === 'light' ? (
        <BaseIcon name="sun" style="line" size={20} className="sm:hidden" />
      ) : (
        <BaseIcon name="moon" style="line" size={20} className="sm:hidden" />
      )}
      <span className="max-sm:sr-only">{label}</span>
    </Button>
  )
}
