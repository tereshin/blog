import { WelcomeSettings } from '@/widgets/editor'
import { AdminCatalog } from '@/widgets/admin'

export default function AdminSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <AdminCatalog catalog="settings" />
      <WelcomeSettings />
    </div>
  )
}
