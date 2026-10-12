import type { ReactNode } from 'react'
import { ADMIN_ROUTES } from '@/entities/admin'
import type { AdminRouteId } from '@/entities/admin'
import { RequireRole } from '@/entities/session'
import { useT } from '@/shared/i18n'
import { Card } from '@/shared/ui'

type AdminScreenProps = { route: AdminRouteId; children: ReactNode }

export function AdminScreen({ route, children }: AdminScreenProps) {
  const { t } = useT()
  const config = ADMIN_ROUTES[route]
  return (
    <RequireRole role={config.role}>
      <div className="min-w-0 p-4 sm:p-6">
        <Card>
          <Card.Header className="border-b border-separator px-4 py-5 sm:px-6 sm:py-6">
            <h1 className="text-xl font-semibold">{t(config.title)}</h1>
          </Card.Header>
          <Card.Content className="min-w-0 px-4 py-6 sm:p-6">{children}</Card.Content>
        </Card>
      </div>
    </RequireRole>
  )
}
