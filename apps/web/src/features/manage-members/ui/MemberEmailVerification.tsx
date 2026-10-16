import { useT } from '@/shared/i18n'
import { Button } from '@/shared/ui'
import type { AdminUser } from '../api/users.ts'
import { useConfirmMemberEmail } from '../model/useManageMembers.ts'

export function MemberEmailVerification({ user }: { user: AdminUser }) {
  const { t } = useT()
  const mutation = useConfirmMemberEmail()
  return (
    <div className="flex flex-col items-start gap-2">
      <p className="break-all text-sm">{user.email || t('admin.members.no_email')}</p>
      <p role="status" className="text-sm text-muted">
        {t(user.email_verified ? 'admin.members.email_verified' : 'admin.members.email_unverified')}
      </p>
      {user.email && !user.email_verified ? (
        <Button
          size="sm"
          variant="secondary"
          isDisabled={mutation.isPending}
          onPress={() => mutation.mutate(user.id)}
        >
          {t('admin.members.confirm_email')}
        </Button>
      ) : null}
      {mutation.isError ? (
        <p role="alert" className="text-sm text-danger">
          {t('admin.members.confirm_email_failed')}
        </p>
      ) : null}
    </div>
  )
}
