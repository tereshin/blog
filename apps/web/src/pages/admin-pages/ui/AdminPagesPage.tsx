import { useNavigate } from 'react-router'
import { BaseIcon, Button } from '@/shared/ui'
import { useT } from '@/shared/i18n'
import { PageList } from '@/features/manage-pages'
import { AdminScreen } from '@/widgets/admin'
export default function AdminPagesPage() {
  const { t } = useT()
  const navigate = useNavigate()
  return (
    <AdminScreen
      route="pages"
      actions={
        <Button
          isIconOnly
          aria-label={t('pages.create')}
          onPress={() => navigate('/admin/pages/new')}
        >
          <BaseIcon name="add" style="line" />
        </Button>
      }
    >
      <PageList />
    </AdminScreen>
  )
}
