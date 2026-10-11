import { FindArticleForm } from '@/features/moderate-content'
import { Card } from '@/shared/ui'
import { AdminScreen } from '@/widgets/admin'
export default function AdminFindArticlePage() {
  return (
    <AdminScreen
      role="admin"
      title="admin.moderation.find_title"
      description="admin.moderation.find_hint"
    >
      <Card>
        <Card.Content>
          <FindArticleForm />
        </Card.Content>
      </Card>
    </AdminScreen>
  )
}
