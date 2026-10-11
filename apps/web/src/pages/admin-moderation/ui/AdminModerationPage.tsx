import { ArticleModerationQueue } from '@/features/moderate-content'
import { AdminScreen } from '@/widgets/admin'
export default function AdminModerationPage() {
  return (
    <AdminScreen
      role="admin"
      title="admin.moderation.articles"
      description="admin.moderation.reports_empty_hint"
    >
      <ArticleModerationQueue filter="reported" />
    </AdminScreen>
  )
}
