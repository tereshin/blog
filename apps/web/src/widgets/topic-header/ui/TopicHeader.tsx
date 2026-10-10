import type { ReactNode } from 'react'
import type { Topic } from '@/entities/topic'
import { useT } from '@/shared/i18n'
import { IdentityHeader, Tabs } from '@/shared/ui'

type TopicHeaderProps = { topic: Topic; follow?: ReactNode }

export function TopicHeader({ topic, follow }: TopicHeaderProps) {
  const { t } = useT()
  return (
    <IdentityHeader>
      <IdentityHeader.Cover url={topic.cover_url} />
      <IdentityHeader.Identity
        avatar={<IdentityHeader.Avatar src={topic.avatar_url} name={topic.title} />}
        actions={follow}
      />
      <IdentityHeader.Content>
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="break-words text-2xl font-semibold leading-tight tracking-tight">
            {topic.title}
          </h1>
          <p className="break-words text-sm text-muted">@{topic.slug}</p>
        </div>
        {topic.description ? (
          <p className="whitespace-pre-wrap break-words text-[15px] leading-6">
            {topic.description}
          </p>
        ) : null}
        {topic.status === 'archived' ? (
          <p className="text-sm text-muted">{t('topic.archived')}</p>
        ) : null}
      </IdentityHeader.Content>
      <IdentityHeader.Navigation>
        <Tabs.List aria-label={t('profile.tab.posts')}>
          <Tabs.Tab id="posts">{t('profile.tab.posts')}</Tabs.Tab>
        </Tabs.List>
      </IdentityHeader.Navigation>
    </IdentityHeader>
  )
}
