import type { ReactNode } from 'react'
import { NavLink } from 'react-router'
import { RequireRole, useViewer } from '@/entities/session'
import { useT } from '@/shared/i18n'
import type { MessageKey } from '@/shared/i18n'
import { Card } from '@/shared/ui'

const GROUPS: {
  label: MessageKey
  role: 'admin' | 'superadmin'
  links: { to: string; label: MessageKey }[]
}[] = [
  {
    label: 'admin.moderation',
    role: 'admin',
    links: [
      { to: '/admin/moderation', label: 'admin.moderation.articles' },
      { to: '/admin/moderation/hidden', label: 'admin.moderation.hidden' },
      { to: '/admin/moderation/comments', label: 'comment.reports_title' },
      { to: '/admin/moderation/find', label: 'admin.moderation.find_title' },
    ],
  },
  {
    label: 'admin.settings',
    role: 'superadmin',
    links: [
      { to: '/admin/settings', label: 'admin.settings.general' },
      { to: '/admin/settings/access', label: 'admin.settings.access' },
      { to: '/admin/settings/reactions', label: 'admin.settings.reactions' },
      { to: '/admin/settings/status-icons', label: 'admin.settings.status_icons' },
      { to: '/admin/settings/seo', label: 'seo.settings' },
      { to: '/admin/settings/publisher', label: 'seo.publisher' },
      { to: '/admin/settings/covers', label: 'seo.covers' },
    ],
  },
  {
    label: 'admin.members.title',
    role: 'superadmin',
    links: [
      { to: '/admin/members', label: 'admin.members.title' },
      { to: '/admin/topics', label: 'admin.topics' },
    ],
  },
]

type AdminScreenProps = {
  title: MessageKey
  description?: MessageKey
  role: 'admin' | 'superadmin'
  children: ReactNode
}

export function AdminScreen({ title, description, role, children }: AdminScreenProps) {
  const { t } = useT()
  const { is_superadmin } = useViewer()
  return (
    <RequireRole role={role}>
      <div className="flex min-w-0 flex-col gap-5 p-4 sm:p-6">
        <header className="flex flex-col gap-1">
          <p className="text-sm text-muted">{t('admin.title')}</p>
          <h1 className="text-2xl font-semibold">{t(title)}</h1>
          {description ? <p className="text-sm text-muted">{t(description)}</p> : null}
        </header>
        <Card>
          <Card.Content>
            <nav aria-label={t('admin.navigation')} className="flex flex-col gap-3">
              {GROUPS.filter((group) => group.role === 'admin' || is_superadmin).map((group) => (
                <div key={group.label} className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-muted">{t(group.label)}</p>
                  <div className="flex flex-wrap gap-1">
                    {group.links.map((link) => (
                      <NavLink
                        key={link.to}
                        to={link.to}
                        end
                        className={({ isActive }) =>
                          `rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-accent ${isActive ? 'bg-surface-secondary font-semibold text-foreground ring-1 ring-inset ring-accent' : 'text-foreground hover:bg-surface-secondary'}`
                        }
                      >
                        {t(link.label)}
                      </NavLink>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </Card.Content>
        </Card>
        <div className="min-w-0">{children}</div>
      </div>
    </RequireRole>
  )
}
