import type { SettingsSection } from '@/features/update-settings'
import { RequireRole } from '@/entities/session'
import { AdminSettingsContent } from './AdminSettingsContent.tsx'

export function AdminSettingsScreen({ section }: { section: SettingsSection }) {
  return (
    <RequireRole role="superadmin">
      <AdminSettingsContent section={section} />
    </RequireRole>
  )
}
