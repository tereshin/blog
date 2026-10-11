import { MemberSearch } from '@/features/manage-members'
import { Card } from '@/shared/ui'
import { AdminScreen } from '@/widgets/admin'
export default function AdminMembersPage() {
  return (
    <AdminScreen role="superadmin" title="admin.members.title">
      <Card>
        <Card.Content>
          <MemberSearch />
        </Card.Content>
      </Card>
    </AdminScreen>
  )
}
