import { useAppearance } from '@/entities/session'
import { useT } from '@/shared/i18n'
import { cn } from '@/shared/lib'
import { BaseIcon, Button, Menu } from '@/shared/ui'

type AppearanceToggleProps = { as?: 'button' | 'item'; className?: string }

/** Переключает тёмный и светлый вид. Подпись называет вид, который включится. */
export function AppearanceToggle({ as = 'button', className }: AppearanceToggleProps) {
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
      className={cn('h-auto', className)}
      onPress={() => setAppearance(next)}
    >
      {next === 'light' ? (
        <BaseIcon name="sun" style="line" size={20} />
      ) : (
        <BaseIcon name="moon" style="line" size={20} />
      )}
      <span>{label}</span>
    </Button>
  )
}
