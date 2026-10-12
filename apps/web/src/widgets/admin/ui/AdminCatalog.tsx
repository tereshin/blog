import { ADMIN_ICONS } from './admin-icons.tsx'
import { Link } from 'react-router'
import { ADMIN_ROUTES, getAdminChildren } from '@/entities/admin'
import type { AdminCatalogId } from '@/entities/admin'
import { RequireRole, useViewer } from '@/entities/session'
import { useT } from '@/shared/i18n'
import { BaseIcon, Card } from '@/shared/ui'

type AdminCatalogProps = { catalog: AdminCatalogId }

export function AdminCatalog({ catalog }: AdminCatalogProps) {
  const { t } = useT()
  const { is_superadmin } = useViewer()
  const config = ADMIN_ROUTES[catalog]
  const children = getAdminChildren(catalog, is_superadmin)
  return (
    <RequireRole role={config.role}>
      <div className="max-w-[640px] mx-auto">
      <Card>
          <Card.Header className="border-b border-separator px-4 pb-4 sm:px-6">
            <h1 className="text-lg font-semibold">{t(config.title)}</h1>
          </Card.Header>
          <Card.Content className="p-0">
            <nav aria-label={t(config.title)}>
              <ul className="">
                {children.map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className="flex min-h-20 items-center gap-4 px-4 py-4 text-foreground transition-colors hover:bg-surface-secondary focus-visible:bg-surface-secondary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent sm:px-6"
                    >
                      <span className="flex size-6 shrink-0 items-center text-muted">
                        {ADMIN_ICONS[item.icon]}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="text-base font-medium">{t(item.label ?? item.title)}</span>
                        <span className="text-sm leading-relaxed text-muted">
                          {t(item.description)}
                        </span>
                      </span>
                      <BaseIcon
                        name="right"
                        style="line"
                        size={18}
                        className="shrink-0 text-muted"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </Card.Content>
        </Card>
      </div>
    </RequireRole>
  )
}
