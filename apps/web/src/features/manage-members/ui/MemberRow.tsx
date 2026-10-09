import { useT } from '@/shared/i18n'
import { Button } from '@/shared/ui'
import { useManageMembers } from '../model/useManageMembers.ts'
import type { AdminUser } from '../api/users.ts'

type MemberRowProps = { user: AdminUser }

export function MemberRow({ user }: MemberRowProps) {
  const { t } = useT()
  const actions = useManageMembers()
  const locked = user.role === 'superadmin'
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-separator px-3 py-2 text-sm">
      <span className="min-w-0 flex-1 truncate">{user.email}</span>
      <span className="text-muted">#{user.public_number}</span>
      {locked ? <span>{t('admin.site_admin_only')}</span> : null}
      {!locked && user.role !== 'admin' ? (
        <Button variant="secondary" onPress={() => actions.setRole.mutate({ id: user.id, role: 'admin' })}>
          {t('admin.members.role_admin')}
        </Button>
      ) : null}
      {!locked && user.role === 'admin' ? (
        <Button variant="secondary" onPress={() => actions.setRole.mutate({ id: user.id, role: 'member' })}>
          {t('admin.members.role_member')}
        </Button>
      ) : null}
      {!locked ? (
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={user.can_publish}
            onChange={(event) => actions.setPublishing.mutate({ id: user.id, can_publish: event.target.checked })}
          />
          {t('admin.members.can_publish')}
        </label>
      ) : null}
      {!locked ? (
        <Button variant={user.is_restricted ? 'secondary' : 'danger'} onPress={() => (user.is_restricted ? actions.unrestrict.mutate(user.id) : actions.restrict.mutate(user.id))}>
          {user.is_restricted ? t('admin.members.unrestrict') : t('admin.members.restrict')}
        </Button>
      ) : null}
    </div>
  )
}
