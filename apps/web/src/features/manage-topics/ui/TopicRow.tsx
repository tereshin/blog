import type { Topic } from '@/entities/topic'
import { useT } from '@/shared/i18n'
import { Button } from '@/shared/ui'
import { useManageTopics } from '../model/useManageTopics.ts'

type TopicRowProps = { topic: Topic; is_first: boolean; is_last: boolean; onMove: (id: string, direction: -1 | 1) => void }

export function TopicRow({ topic, is_first, is_last, onMove }: TopicRowProps) {
  const { t } = useT()
  const { update } = useManageTopics()
  const is_archived = topic.status === 'archived'

  return (
    <li className="flex items-center gap-2 rounded-xl border border-separator px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{topic.title}</p>
        {topic.description ? <p className="truncate text-sm text-muted">{topic.description}</p> : null}
        {is_archived ? <p className="text-xs text-muted">{t('admin.topics.archived')}</p> : null}
      </div>
      <Button variant="ghost" size="sm" isDisabled={is_first || update.isPending} aria-label={t('admin.topics.move_up')} onPress={() => onMove(topic.id, -1)}>
        {t('admin.topics.move_up')}
      </Button>
      <Button variant="ghost" size="sm" isDisabled={is_last || update.isPending} aria-label={t('admin.topics.move_down')} onPress={() => onMove(topic.id, 1)}>
        {t('admin.topics.move_down')}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        isDisabled={update.isPending}
        onPress={() => update.mutate({ id: topic.id, body: { status: is_archived ? 'active' : 'archived' } })}
      >
        {is_archived ? t('admin.topics.restore') : t('admin.topics.archive')}
      </Button>
    </li>
  )
}
