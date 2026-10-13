import { useState } from 'react'
import type { Topic } from '@/entities/topic'
import { useT } from '@/shared/i18n'
import { BaseIcon, Button } from '@/shared/ui'
import { TopicDialog } from './TopicDialog.tsx'
export function TopicSettingsButton({ topic }: { topic: Topic }) {
  const { t } = useT()
  const [is_open, setOpen] = useState(false)
  return (
    <>
      <Button
        variant="secondary"
        isIconOnly
        aria-label={t('admin.topics.edit')}
        onPress={() => setOpen(true)}
      >
        <BaseIcon name="settings_3" />
      </Button>
      <TopicDialog initial={topic} is_open={is_open} onOpenChange={setOpen} />
    </>
  )
}
