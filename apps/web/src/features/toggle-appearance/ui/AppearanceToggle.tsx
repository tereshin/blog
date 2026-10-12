import type { ReactNode } from 'react'
import { useAppearance } from '@/entities/session'
import type { AppearancePreference } from '@/entities/session'
import { useT } from '@/shared/i18n'
import type { MessageKey } from '@/shared/i18n'
import { cn } from '@/shared/lib'
import { BaseIcon, Link, Menu } from '@/shared/ui'

type AppearanceOption = {
  id: AppearancePreference
  label: MessageKey
  /** Подпись кнопки, пока выбран этот вариант. */
  current: MessageKey
  icon: ReactNode
}

/** Генератор иконок видит только буквальные `name`/`style`, поэтому иконки заданы элементами. */
const OPTIONS: ReadonlyArray<AppearanceOption> = [
  {
    id: 'system',
    label: 'account.theme_system',
    current: 'account.theme_current_system',
    icon: <BaseIcon name="contrast" style="line" size={24} />,
  },
  {
    id: 'light',
    label: 'account.theme_light',
    current: 'account.theme_current_light',
    icon: <BaseIcon name="sun" style="line" size={24} />,
  },
  {
    id: 'dark',
    label: 'account.theme_dark',
    current: 'account.theme_current_dark',
    icon: <BaseIcon name="moon" style="line" size={24} />,
  },
]

type AppearanceToggleProps = { className?: string }

/** Выбор вида: системный, светлый или тёмный. Кнопка называет текущий выбор. */
export function AppearanceToggle({ className }: AppearanceToggleProps) {
  const { t } = useT()
  const { preference, setAppearance } = useAppearance()
  const selected = OPTIONS.find((option) => option.id === preference) ?? OPTIONS[0]

  return (
    <Menu>
      <Link
        className={cn('flex items-center gap-2.5 text-md text-muted hover:bg-surface-secondary no-underline', className)}
      >
        <span className="flex size-6 shrink-0">{selected?.icon}</span>
        <span className="min-w-0 truncate">{selected ? t(selected.current) : null}</span>
      </Link>
      <Menu.Content
        aria-label={t('account.theme')}
        selectionMode="single"
        selectedKeys={[preference]}
        className="min-w-56"
        onAction={(key) => {
          const next = OPTIONS.find((option) => option.id === key)
          if (next) setAppearance(next.id)
        }}
      >
        {OPTIONS.map((option) => {
          const is_selected = option.id === preference
          return (
            <Menu.Item
              key={option.id}
              id={option.id}
              textValue={t(option.label)}
              className={cn('gap-3 rounded-xl px-3 py-2.5 text-md', is_selected && 'bg-surface-secondary font-semibold')}
            >
              <span className="flex shrink-0">{option.icon}</span>
              <span className="min-w-0 flex-1 truncate">{t(option.label)}</span>
              {is_selected ? <BaseIcon name="check" style="line" size={20} className="shrink-0 text-positive" /> : null}
            </Menu.Item>
          )
        })}
      </Menu.Content>
    </Menu>
  )
}
