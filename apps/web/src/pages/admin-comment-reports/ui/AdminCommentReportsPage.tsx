import { CommentReportQueue } from '@/features/moderate-content'
import { AdminScreen } from '@/widgets/admin'
export default function AdminCommentReportsPage() {
  return (
    <AdminScreen
      role="admin"
      title="comment.reports_title"
      description="admin.moderation.reports_empty_hint"
    >
      <CommentReportQueue />
    </AdminScreen>
  )
}
