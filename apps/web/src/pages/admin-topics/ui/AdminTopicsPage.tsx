import { TopicManagement } from '@/features/manage-topics'
import { ImageUploadButton } from '@/features/upload-media'
import { useT } from '@/shared/i18n'
import { AdminScreen } from '@/widgets/admin'

export default function AdminTopicsPage() {
  const { t } = useT()
  return (
    <AdminScreen route="topics">
      <TopicManagement
        upload={(field, onUploaded) => (
          <ImageUploadButton
            label={t(field === 'avatar' ? 'admin.topics.avatar' : 'admin.topics.cover')}
            onUploaded={onUploaded}
          />
        )}
      />
    </AdminScreen>
  )
}
