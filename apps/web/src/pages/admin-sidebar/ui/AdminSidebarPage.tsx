import { SidebarsEditor } from '@/features/manage-sidebar'
import { AdminScreen } from '@/widgets/admin'
export default function AdminSidebarPage() {
  return <AdminScreen route="sidebars"><SidebarsEditor /></AdminScreen>
}
