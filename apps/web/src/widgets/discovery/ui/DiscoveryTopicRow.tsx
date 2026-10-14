import type { ReactNode } from 'react'
import type { Topic } from '@/entities/topic'
import { DiscoveryRow } from './DiscoveryRow.tsx'

export type DiscoveryTopic = Pick<Topic, 'id' | 'title' | 'slug' | 'avatar_url'>

type DiscoveryTopicRowProps = { topic: DiscoveryTopic; action: ReactNode }

export function DiscoveryTopicRow({ topic, action }: DiscoveryTopicRowProps) {
  return (
    <DiscoveryRow
      href={`/t/${encodeURIComponent(topic.slug)}`}
      name={topic.title}
      slug={topic.slug}
      avatar_url={topic.avatar_url}
      action={action}
    />
  )
}
