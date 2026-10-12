import type { SettingsSection } from '@/features/update-settings'
import { AdminScreen } from './AdminScreen.tsx'
import { AdminSettingsContent } from './AdminSettingsContent.tsx'

export function AdminSettingsScreen({ section }: { section: SettingsSection }) {
  return (
    <AdminScreen route={section}>
      <AdminSettingsContent section={section} />
    </AdminScreen>
  )
}
