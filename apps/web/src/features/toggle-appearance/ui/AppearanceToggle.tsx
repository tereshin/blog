import { useAppearance } from '@/entities/session'
import { useT } from '@/shared/i18n'
import { cn } from '@/shared/lib'
import { BaseIcon, Button, Menu } from '@/shared/ui'
import { LeftNavItem } from '@/widgets/shell/ui/LeftNavItem.tsx'

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
    <LeftNavItem
      to="#"
      onPress={() => setAppearance(next)}
      is_selected={false}
      icon={next === 'light' ? <BaseIcon name="sun" style="line" size={20} /> : <BaseIcon name="moon" style="line" size={20} />}
      children={label}
    />
  )
}
