import { SidebarForm } from '@/features/manage-sidebar'
import { AdminScreen } from '@/widgets/admin'
export default function AdminSidebarPage() {
  return (
    <AdminScreen route="sidebar">
      <SidebarForm />
    </AdminScreen>
  )
}
