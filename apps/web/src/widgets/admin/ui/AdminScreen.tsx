import type { ReactNode } from 'react'
import { ADMIN_ROUTES } from '@/entities/admin'
import type { AdminRouteId } from '@/entities/admin'
import { RequireRole } from '@/entities/session'
import { useT } from '@/shared/i18n'
import { PageCard } from '@/shared/ui'

type AdminScreenProps = {
  route: AdminRouteId
  children: ReactNode
  actions?: ReactNode
  footer?: ReactNode
}

export function AdminScreen({ route, children, actions, footer }: AdminScreenProps) {
  const { t } = useT()
  const config = ADMIN_ROUTES[route]
  return (
    <RequireRole role={config.role}>
      <PageCard>
        <PageCard.Header title={t(config.title)} actions={actions} />
        <PageCard.Content>{children}</PageCard.Content>
        {footer ? <PageCard.Footer>{footer}</PageCard.Footer> : null}
      </PageCard>
    </RequireRole>
  )
}
