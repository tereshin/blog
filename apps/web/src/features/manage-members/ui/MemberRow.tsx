import { MemberEmailVerification } from './MemberEmailVerification.tsx'
import { useState } from 'react'
import { useT } from '@/shared/i18n'
import { BaseIcon, Button, Dialog, FormTextField, Select, ToggleField } from '@/shared/ui'
import { useManageMembers } from '../model/useManageMembers.ts'
import type { AdminUser } from '../api/users.ts'

export function MemberRow({ user }: { user: AdminUser }) {
  const { t } = useT()
  const actions = useManageMembers()
  const [is_editing, setEditing] = useState(false)
  const [is_confirming_delete, setConfirmDelete] = useState(false)
  const [display_name, setDisplayName] = useState(user.display_name)
  const [role, setRole] = useState<'member' | 'admin'>(user.role === 'admin' ? 'admin' : 'member')
  const [can_publish, setPublishing] = useState(user.can_publish)
  const is_pending = Object.values(actions).some((action) => action.isPending)
  const has_error = Object.values(actions).some((action) => action.isError)
  if (user.role === 'superadmin') return <MemberEmailVerification user={user} />
  return (
    <div className="flex items-center gap-1">
      <Button
        size="sm"
        isIconOnly
        variant="secondary"
        aria-label={t('admin.members.edit')}
        onPress={() => {
          setDisplayName(user.display_name)
          setRole(user.role === 'admin' ? 'admin' : 'member')
          setPublishing(user.can_publish)
          setEditing(true)
        }}
      >
        <BaseIcon name="pencil" style="line" size={18} />
      </Button>
      <Button
        size="sm"
        isIconOnly
        isDisabled={is_pending}
        variant="secondary"
        aria-label={t(user.is_restricted ? 'admin.members.unrestrict' : 'admin.members.restrict')}
        onPress={() =>
          user.is_restricted ? actions.unrestrict.mutate(user.id) : actions.restrict.mutate(user.id)
        }
      >
        {user.is_restricted ? (
          <BaseIcon name="unlock" style="line" size={18} />
        ) : (
          <BaseIcon name="forbid_circle" style="line" size={18} />
        )}
      </Button>
      <Button
        size="sm"
        isIconOnly
        isDisabled={is_pending}
        variant="danger"
        aria-label={t('admin.moderation.delete')}
        onPress={() => setConfirmDelete(true)}
      >
        <BaseIcon name="delete_2" style="line" size={18} />
      </Button>
      {has_error ? (
        <p role="alert" className="text-danger">
          {t('error.unknown')}
        </p>
      ) : null}
      <Dialog is_open={is_editing} onOpenChange={setEditing}>
        <Dialog.Header>
          <Dialog.Heading>{t('admin.members.edit')}</Dialog.Heading>
        </Dialog.Header>
        <Dialog.Body>
          <div className="flex flex-col gap-4">
            <MemberEmailVerification user={user} />
            <FormTextField
              label={t('profile.display_name')}
              value={display_name}
              maxLength={50}
              onChange={(event) => setDisplayName(event.target.value)}
            />
            <Select
              label={t('admin.members.access')}
              value={role}
              isDisabled={is_pending}
              options={(['member', 'admin'] as const).map((value) => ({
                value,
                label: t(`admin.members.access_${value}`),
              }))}
              onChange={(role) => {
                if (role === 'member' || role === 'admin') setRole(role)
              }}
            />
            <ToggleField
              label={t('admin.members.can_publish')}
              is_selected={can_publish}
              is_disabled={is_pending}
              onChange={setPublishing}
            />
            {has_error ? (
              <p role="alert" className="text-danger">
                {t('error.unknown')}
              </p>
            ) : null}
          </div>
        </Dialog.Body>
        <Dialog.Footer>
          <Button variant="ghost" onPress={() => setEditing(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            isDisabled={is_pending || !display_name.trim()}
            onPress={() =>
              actions.edit.mutate(
                {
                  id: user.id,
                  display_name: display_name.trim(),
                  role,
                  can_publish,
                  previous: user,
                },
                { onSuccess: () => setEditing(false) },
              )
            }
          >
            {t('common.save')}
          </Button>
        </Dialog.Footer>
      </Dialog>
      <Dialog is_open={is_confirming_delete} onOpenChange={setConfirmDelete}>
        <Dialog.Header>
          <Dialog.Heading>{t('admin.moderation.delete')}</Dialog.Heading>
        </Dialog.Header>
        <Dialog.Body>
          {t('admin.members.confirm_delete')} {user.display_name || user.email}
          {has_error ? (
            <p role="alert" className="text-danger">
              {t('error.unknown')}
            </p>
          ) : null}
        </Dialog.Body>
        <Dialog.Footer>
          <Button variant="ghost" onPress={() => setConfirmDelete(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="danger"
            isDisabled={is_pending}
            onPress={() =>
              actions.remove.mutate(user.id, { onSuccess: () => setConfirmDelete(false) })
            }
          >
            {t('admin.moderation.delete')}
          </Button>
        </Dialog.Footer>
      </Dialog>
    </div>
  )
}
