import { ArticleModerationQueue } from '@/features/moderate-content'
import { AdminScreen } from '@/widgets/admin'
export default function AdminHiddenPage() {
  return (
    <AdminScreen route="hidden">
      <ArticleModerationQueue filter="hidden" />
    </AdminScreen>
  )
}
