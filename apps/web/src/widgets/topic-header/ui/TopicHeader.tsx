import type { ReactNode } from 'react'
import type { Topic } from '@/entities/topic'
import { useT } from '@/shared/i18n'
import { Card } from '@/shared/ui'

type TopicHeaderProps = {
  topic: Topic
  /** Кнопка подписки над списком статей. */
  follow?: ReactNode
}

/** Шапка темы: обложка, аватар, название, описание и слот подписки над лентой. */
export function TopicHeader({ topic, follow }: TopicHeaderProps) {
  const { t } = useT()
  return (
    <Card className="overflow-hidden">
      {topic.cover_url ? (
        <img src={topic.cover_url} alt="" className="h-36 w-full object-cover" />
      ) : (
        <div className="h-24 bg-surface-secondary" />
      )}
      <Card.Content className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-3">
          {topic.avatar_url ? (
            <img src={topic.avatar_url} alt="" className="-mt-10 size-16 rounded-avatar object-cover ring-4 ring-background" />
          ) : (
            <span className="-mt-10 grid size-16 place-items-center rounded-avatar bg-surface-tertiary text-lg font-semibold ring-4 ring-background">
              {topic.title.charAt(0).toUpperCase()}
            </span>
          )}
          {follow}
        </div>
        <h1 className="text-xl font-semibold">{topic.title}</h1>
        {topic.description ? <p className="text-sm text-muted">{topic.description}</p> : null}
        {topic.status === 'archived' ? <p className="text-sm text-muted">{t('topic.archived')}</p> : null}
      </Card.Content>
    </Card>
  )
}
