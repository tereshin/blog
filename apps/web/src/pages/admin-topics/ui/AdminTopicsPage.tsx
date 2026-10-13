import { TopicManagement } from '@/features/manage-topics'
import { AdminScreen } from '@/widgets/admin'
export default function AdminTopicsPage() {
  return (
    <AdminScreen route="topics">
      <TopicManagement />
    </AdminScreen>
  )
}
