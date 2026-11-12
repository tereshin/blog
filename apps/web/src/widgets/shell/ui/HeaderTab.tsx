import { Link } from 'react-router'
import { Chat3Icon, HomeIcon } from '@/shared/ui'

const ICONS = { home: HomeIcon, chat_3: Chat3Icon }

type HeaderTabProps = {
  to: string
  label: string
  icon: keyof typeof ICONS
  is_selected: boolean
  has_unread?: boolean
  unread_label?: string
}

/** Пункт нижней панели ниже 768px: выбранный подсвечивается оттенком шапки. От 768px эти разделы есть в левом столбце. */
export function HeaderTab({ to, label, icon, is_selected, has_unread = false, unread_label }: HeaderTabProps) {
  const Icon = ICONS[icon]
  return (
    <Link
      to={to}
      aria-label={label}
      aria-current={is_selected ? 'page' : undefined}
      className="site-header-tab relative inline-flex items-center justify-center rounded-full text-foreground outline-offset-2 hover:bg-surface-secondary min-[768px]:hidden"
    >
      <Icon icon_style="line" />
      {has_unread ? (
        <span role="img" aria-label={unread_label} className="absolute right-2 top-2 size-2 rounded-avatar bg-accent" />
      ) : null}
    </Link>
  )
}
