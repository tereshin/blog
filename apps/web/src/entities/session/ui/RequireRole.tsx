import type { ReactNode } from 'react'
import { useT } from '@/shared/i18n'
import { EmptyState } from '@/shared/ui'
import { useViewer } from '../model/useViewer.ts'

type RequireRoleProps = { role: 'superadmin'; children: ReactNode }

/** Объяснение остаётся в центре. Каркас вокруг раздела не меняется. */
export function RequireRole({ role, children }: RequireRoleProps) {
  const { t } = useT()
  const { is_loading, is_superadmin } = useViewer()
  if (is_loading) return null
  if (role === 'superadmin' && !is_superadmin) return <EmptyState title={t('admin.site_admin_only')} />
  return children
}
