import { SETTINGS_SECTIONS } from '@/features/update-settings'
import type { SettingsSection } from '@/features/update-settings'
import { AdminScreen } from './AdminScreen.tsx'
import { AdminSettingsContent } from './AdminSettingsContent.tsx'

export function AdminSettingsScreen({ section }: { section: SettingsSection }) {
  const config = SETTINGS_SECTIONS[section]
  return (
    <AdminScreen role="superadmin" title={config.title} description={config.description}>
      <AdminSettingsContent section={section} />
    </AdminScreen>
  )
}
