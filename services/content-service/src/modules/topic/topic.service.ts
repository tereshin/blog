import { NotFoundError } from '@blog/errors'
import type { CreateTopic, ServiceContext, Topic, UpdateTopic } from '@blog/contracts'
import { requireSuperadmin } from '../access/require-superadmin.ts'
import { assertMediaUrl } from '../media-url.ts'
import type { TopicPatch, TopicRepository, TopicRow, TopicWrite } from './topic.repository.ts'

export type TopicService = {
  listActive: () => Promise<Topic[]>
  listAll: (viewer: ServiceContext) => Promise<Topic[]>
  getBySlug: (slug: string) => Promise<Topic>
  create: (viewer: ServiceContext, input: CreateTopic) => Promise<Topic>
  update: (viewer: ServiceContext, id: string, input: UpdateTopic) => Promise<Topic>
  reorder: (viewer: ServiceContext, topic_ids: readonly string[]) => Promise<Topic[]>
}

function blankToNull(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined
  return value === '' ? null : value
}

function toWrite(input: CreateTopic): TopicWrite {
  return {
    title: input.title,
    description: blankToNull(input.description) ?? null,
    avatar_url: input.avatar_url,
    cover_url: input.cover_url,
    slug: input.slug,
  }
}

function toPatch(input: UpdateTopic): TopicPatch {
  const patch: TopicPatch = {}
  if (input.title !== undefined) patch.title = input.title
  if (input.description !== undefined) patch.description = blankToNull(input.description) ?? null
  if (input.avatar_url !== undefined) patch.avatar_url = input.avatar_url
  if (input.cover_url !== undefined) patch.cover_url = input.cover_url
  if (input.slug !== undefined) patch.slug = input.slug
  if (input.status !== undefined) patch.status = input.status
  return patch
}

export function createTopicService(repository: TopicRepository, options: { media_url: string }): TopicService {
  return {
    listActive: () => repository.listActive(),
    listAll(viewer) {
      requireSuperadmin(viewer)
      return repository.listAll()
    },
    async getBySlug(slug) {
      const topic = await repository.findBySlug(slug)
      if (!topic) throw new NotFoundError({ message: 'Такой темы нет' })
      return topic
    },
    async create(viewer, input) {
      requireSuperadmin(viewer)
      assertMediaUrl(input.avatar_url, options.media_url, 'avatar_url')
      assertMediaUrl(input.cover_url, options.media_url, 'cover_url')
      return repository.create(toWrite(input))
    },
    async update(viewer, id, input) {
      requireSuperadmin(viewer)
      if (input.avatar_url !== undefined) assertMediaUrl(input.avatar_url, options.media_url, 'avatar_url')
      if (input.cover_url !== undefined) assertMediaUrl(input.cover_url, options.media_url, 'cover_url')
      const topic = await repository.update(id, toPatch(input))
      if (!topic) throw new NotFoundError({ message: 'Такой темы нет' })
      return topic
    },
    reorder(viewer, topic_ids) {
      requireSuperadmin(viewer)
      return repository.reorder(topic_ids)
    },
  }
}

export type { TopicRow }
