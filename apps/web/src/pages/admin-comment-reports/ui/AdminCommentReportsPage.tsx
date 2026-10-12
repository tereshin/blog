import { CommentReportQueue } from '@/features/moderate-content'
import { AdminScreen } from '@/widgets/admin'
export default function AdminCommentReportsPage() {
  return (
    <AdminScreen route="comments">
      <CommentReportQueue />
    </AdminScreen>
  )
}
