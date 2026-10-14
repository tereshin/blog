import type { ServiceContext } from '@blog/contracts'

export type TopicRow = {
  id: string
  title: string
  description: string | null
  avatar_url: string | null
  cover_url: string | null
  slug: string
  status: 'active' | 'archived'
  position: number
}

export type TopicWrite = {
  title: string
  description: string | null
  avatar_url: string | null
  cover_url: string | null
  slug: string
}

export type TopicPatch = Partial<TopicWrite> & { status?: 'active' | 'archived' }

/** Порт хранилища тем. Запись темы и её адреса идут в одной транзакции `TTx`. */
export type TopicRepositoryPort<TTx> = {
  transaction: <T>(work: (tx: TTx) => Promise<T>) => Promise<T>
  listActive: () => Promise<TopicRow[]>
  listAll: (tx?: TTx) => Promise<TopicRow[]>
  findBySlug: (slug: string) => Promise<TopicRow | null>
  findById: (id: string, tx?: TTx) => Promise<TopicRow | null>
  maxPosition: (tx: TTx) => Promise<number | null>
  insert: (tx: TTx, row: TopicWrite & { id: string; position: number }) => Promise<TopicRow>
  update: (tx: TTx, id: string, patch: TopicPatch) => Promise<TopicRow | null>
  listIds: (tx: TTx) => Promise<string[]>
  setPosition: (tx: TTx, id: string, position: number) => Promise<void>
}

export type TopicFollowsPort = {
  isFollowingTopic: (viewer: ServiceContext, topic_id: string) => Promise<boolean>
}

export type TopicSlugsPort<TTx> = {
  reserveSlug: (tx: TTx, slug: string, owner_type: 'topic', owner_id: string) => Promise<void>
  replaceSlug: (tx: TTx, slug: string, owner_type: 'topic', owner_id: string) => Promise<void>
}
