import { FindArticleForm } from '@/features/moderate-content'
import { AdminScreen } from '@/widgets/admin'
export default function AdminFindArticlePage() {
  return (
    <AdminScreen route="find">
      <FindArticleForm />
    </AdminScreen>
  )
}
