import { useState } from 'react'
import { useT } from '@/shared/i18n'
import { BaseIcon, Button } from '@/shared/ui'
import { TopicDialog } from './TopicDialog.tsx'
export function TopicCreateButton() {
  const { t } = useT()
  const [is_open, setOpen] = useState(false)
  return (
    <>
      <Button
        isIconOnly
        size="sm"
        variant="ghost"
        aria-label={t('admin.topics.create')}
        onPress={() => setOpen(true)}
      >
        <BaseIcon name="add" size={18} />
      </Button>
      <TopicDialog is_open={is_open} onOpenChange={setOpen} />
    </>
  )
}
