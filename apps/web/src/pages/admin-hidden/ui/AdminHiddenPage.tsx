import { ArticleModerationQueue } from '@/features/moderate-content'
import { AdminScreen } from '@/widgets/admin'
export default function AdminHiddenPage() {
  return (
    <AdminScreen
      role="admin"
      title="admin.moderation.hidden"
      description="admin.moderation.hidden_empty_hint"
    >
      <ArticleModerationQueue filter="hidden" />
    </AdminScreen>
  )
}
