import { Link } from 'react-router'
import { HomeIcon, MessageIcon } from '@/shared/ui'

const ICONS = { home: HomeIcon, messages: MessageIcon }

type HeaderTabProps = {
  to: string
  label: string
  icon: keyof typeof ICONS
  is_selected: boolean
  has_unread?: boolean
  unread_label?: string
}

/** Пункт нижней панели ниже 768px: выбранный рисуется заливкой и акцентом. От 768px эти разделы есть в левом столбце. */
export function HeaderTab({ to, label, icon, is_selected, has_unread = false, unread_label }: HeaderTabProps) {
  const Icon = ICONS[icon]
  return (
    <Link
      to={to}
      aria-label={label}
      aria-current={is_selected ? 'page' : undefined}
      className="site-header-tab relative inline-flex items-center justify-center rounded-full text-foreground outline-offset-2 hover:bg-surface-secondary aria-[current=page]:text-accent min-[768px]:hidden"
    >
      <Icon icon_style={is_selected ? 'fill' : 'line'} />
      {has_unread ? (
        <span role="img" aria-label={unread_label} className="absolute right-2 top-2 size-2 rounded-avatar bg-accent" />
      ) : null}
    </Link>
  )
}
