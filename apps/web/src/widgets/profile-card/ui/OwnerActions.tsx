import { useState } from 'react'
import type { Profile } from '@/entities/profile'
import { EditProfileDialog } from '@/features/edit-profile'
import { useT } from '@/shared/i18n'
import { Button } from '@/shared/ui'

type OwnerActionsProps = { profile: Profile }

export function OwnerActions({ profile }: OwnerActionsProps) {
  const { t } = useT()
  const [is_editing, setEditing] = useState(false)
  return (
    <>
      <Button variant="secondary" onPress={() => setEditing(true)}>{t('profile.edit')}</Button>
      {is_editing ? (
        <EditProfileDialog
          is_open={is_editing}
          onOpenChange={setEditing}
          initial={{ display_name: profile.display_name, bio: profile.bio ?? '', slug: profile.slug ?? '' }}
        />
      ) : null}
    </>
  )
}
