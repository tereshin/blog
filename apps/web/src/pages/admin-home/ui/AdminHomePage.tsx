import { Navigate } from 'react-router'
import { RequireRole, useViewer } from '@/entities/session'
export default function AdminHomePage() {
  const { is_superadmin } = useViewer()
  return (
    <RequireRole role="admin">
      <Navigate replace to={is_superadmin ? '/admin/settings' : '/admin/moderation'} />
    </RequireRole>
  )
}
