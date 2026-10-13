import { useState } from 'react'
import { useT } from '@/shared/i18n'
import { BaseIcon, Button } from '@/shared/ui'
import { NavSectionList } from '@/features/manage-nav-sections'
import type { DialogState } from '@/features/manage-nav-sections'
import { AdminScreen } from '@/widgets/admin'

export default function AdminNavSectionsPage() {
  const { t } = useT()
  const [dialog, setDialog] = useState<DialogState | null>(null)
  return (
    <AdminScreen
      route="sections"
      actions={
        <Button
          isIconOnly
          aria-label={t('nav.sections.create')}
          onPress={() => setDialog({ kind: 'create' })}
        >
          <BaseIcon name="add" style="line" />
        </Button>
      }
    >
      <NavSectionList dialog={dialog} onDialog={setDialog} />
    </AdminScreen>
  )
}
