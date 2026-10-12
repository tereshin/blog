import { ArticleModerationQueue } from '@/features/moderate-content'
import { AdminScreen } from '@/widgets/admin'

export default function AdminArticleReportsPage() {
  return (
    <AdminScreen route="articles">
      <ArticleModerationQueue filter="reported" />
    </AdminScreen>
  )
}
