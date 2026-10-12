import { MemberSearch } from '@/features/manage-members'
import { AdminScreen } from '@/widgets/admin'
export default function AdminMembersPage() {
  return (
    <AdminScreen route="members">
      <MemberSearch />
    </AdminScreen>
  )
}
