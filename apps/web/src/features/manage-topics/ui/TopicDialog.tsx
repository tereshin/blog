import type { Topic } from '@/entities/topic'
import { useT } from '@/shared/i18n'
import { Button, Dialog } from '@/shared/ui'
import { TopicForm } from './TopicForm.tsx'
import type { TopicUpload } from './TopicForm.tsx'
export function TopicDialog({
  initial,
  upload,
  is_open,
  onOpenChange,
}: {
  initial?: Topic
  upload?: TopicUpload
  is_open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useT()
  return (
    <Dialog is_open={is_open} onOpenChange={onOpenChange} size="lg">
      <Dialog.Header>
        <Dialog.Heading>{t(initial ? 'admin.topics.edit' : 'admin.topics.create')}</Dialog.Heading>
      </Dialog.Header>
      <Dialog.Body>
        {is_open ? (
          <TopicForm initial={initial} upload={upload} onSaved={() => onOpenChange(false)} />
        ) : null}
      </Dialog.Body>
      <Dialog.Footer>
        <Button variant="ghost" onPress={() => onOpenChange(false)}>
          {t('common.close')}
        </Button>
      </Dialog.Footer>
    </Dialog>
  )
}
