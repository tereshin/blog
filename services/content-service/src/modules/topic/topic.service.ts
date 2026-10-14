import { randomUUID } from 'node:crypto'
import type { CreateTopic, ServiceContext, Topic, TopicDetail, UpdateTopic } from '@blog/contracts'
import { assertMediaUrl } from '../../shared/media-url.ts'
import { requireSuperadmin } from '../../shared/require-superadmin.ts'
import { TopicNotFoundError, TopicOrderInvalidError } from './topic.errors.ts'
import type { TopicFollowsPort, TopicPatch, TopicRepositoryPort, TopicSlugsPort, TopicWrite } from './topic.types.ts'

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

export class TopicService<TTx> {
  constructor(
    private readonly repository: TopicRepositoryPort<TTx>,
    private readonly follows: TopicFollowsPort,
    private readonly slugs: TopicSlugsPort<TTx>,
    private readonly options: { media_url: string },
  ) {}

  listActive(): Promise<Topic[]> {
    return this.repository.listActive()
  }

  listAll(viewer: ServiceContext): Promise<Topic[]> {
    requireSuperadmin(viewer)
    return this.repository.listAll()
  }

  async getBySlug(viewer: ServiceContext, slug: string): Promise<TopicDetail> {
    const topic = await this.repository.findBySlug(slug)
    if (!topic) throw new TopicNotFoundError()
    return { ...topic, is_following: await this.follows.isFollowingTopic(viewer, topic.id) }
  }

  async create(viewer: ServiceContext, input: CreateTopic): Promise<Topic> {
    requireSuperadmin(viewer)
    assertMediaUrl(input.avatar_url, this.options.media_url, 'avatar_url')
    assertMediaUrl(input.cover_url, this.options.media_url, 'cover_url')
    const write = toWrite(input)
    return this.repository.transaction(async (tx) => {
      const id = randomUUID()
      const max_position = await this.repository.maxPosition(tx)
      const position = max_position === null ? 0 : max_position + 1
      await this.slugs.reserveSlug(tx, write.slug, 'topic', id)
      return this.repository.insert(tx, { id, ...write, position })
    })
  }

  async update(viewer: ServiceContext, id: string, input: UpdateTopic): Promise<Topic> {
    requireSuperadmin(viewer)
    if (input.avatar_url !== undefined) assertMediaUrl(input.avatar_url, this.options.media_url, 'avatar_url')
    if (input.cover_url !== undefined) assertMediaUrl(input.cover_url, this.options.media_url, 'cover_url')
    const patch = toPatch(input)
    const topic = await this.repository.transaction(async (tx) => {
      const current = await this.repository.findById(id, tx)
      if (!current) return null
      if (patch.slug !== undefined && patch.slug !== current.slug)
        await this.slugs.replaceSlug(tx, patch.slug, 'topic', id)
      return this.repository.update(tx, id, patch)
    })
    if (!topic) throw new TopicNotFoundError()
    return topic
  }

  async reorder(viewer: ServiceContext, topic_ids: readonly string[]): Promise<Topic[]> {
    requireSuperadmin(viewer)
    return this.repository.transaction(async (tx) => {
      const current = new Set(await this.repository.listIds(tx))
      const is_same = topic_ids.length === current.size && topic_ids.every((id) => current.has(id))
      if (!is_same) throw new TopicOrderInvalidError()
      for (const [index, id] of topic_ids.entries()) await this.repository.setPosition(tx, id, index)
      return this.repository.listAll(tx)
    })
  }
}
