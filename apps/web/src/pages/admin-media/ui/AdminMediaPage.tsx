import { RequireRole } from '@/entities/session'
import { MediaSettingsPanel } from '@/features/update-media-settings'

export default function AdminMediaPage() {
  return (
    <RequireRole role="superadmin">
      <MediaSettingsPanel />
    </RequireRole>
  )
}
