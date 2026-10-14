import { randomUUID } from 'node:crypto'
import { blocksDocumentSchema } from '@blog/contracts'
import type { ArticleDraft, BlocksDocument, CreateArticle, ServiceContext, UpdateArticle } from '@blog/contracts'
import { EmailUnverifiedError, RestrictedError, UnauthorizedError, ValidationError } from '@blog/errors'
import { requireVerifiedEmail } from '../../shared/require-verified-email.ts'
import { ArticleUnavailableError, CannotPublishError, InvalidBlockError, NotPublishableError, TopicArchivedError } from './article.errors.ts'
import { hasContentBlock, sanitizeDocument } from './article.sanitizer.ts'
import type { FileOwner } from './article.sanitizer.ts'
import type {
  ArticleBadgesPort,
  ArticleCoversPort,
  ArticleEventName,
  ArticleRepositoryPort,
  ArticleSlugsPort,
  StoredArticle,
} from './article.types.ts'
import { deriveExcerpt, deriveFirstImage, searchText, uniqueSlug } from './lib/slugify.ts'

export type ArticleWriteOptions = {
  media_urls: readonly string[]
  lookupFile: (url: string) => Promise<FileOwner | null>
}

function requireUser(viewer: ServiceContext): string {
  if (viewer.user_id === undefined) throw new UnauthorizedError()
  return viewer.user_id
}

function assertCanChange(viewer: ServiceContext): string {
  const user_id = requireUser(viewer)
  if (viewer.is_restricted) throw new RestrictedError()
  if (!requireVerifiedEmail(viewer).allowed) throw new EmailUnverifiedError()
  return user_id
}

function assertCanPublish(viewer: ServiceContext): string {
  const user_id = assertCanChange(viewer)
  if (!viewer.can_publish) throw new CannotPublishError()
  return user_id
}

function parseBlocks(value: unknown): BlocksDocument {
  const parsed = blocksDocumentSchema.safeParse(value)
  if (!parsed.success) throw new InvalidBlockError()
  return parsed.data
}

function toDraft(row: StoredArticle): ArticleDraft {
  return {
    id: row.id,
    title: row.title,
    blocks: parseBlocks(row.blocks),
    topic_id: row.topic_id,
    visibility: row.visibility,
    comments_enabled: row.comments_enabled,
    slug: row.slug,
    status: row.status,
    seo_title: row.seo_title ?? null,
    seo_description: row.seo_description ?? null,
  }
}

/** Запись черновика и публикация: каждая операция — одна транзакция вместе с адресом, outbox и обложкой. */
export class ArticleWriteService<TTx> {
  constructor(
    private readonly repository: ArticleRepositoryPort<TTx>,
    private readonly slugs: ArticleSlugsPort<TTx>,
    private readonly covers: ArticleCoversPort<TTx>,
    private readonly badges: ArticleBadgesPort<TTx>,
    private readonly options: ArticleWriteOptions,
  ) {}

  async create(viewer: ServiceContext, input: CreateArticle): Promise<ArticleDraft> {
    const author_id = assertCanPublish(viewer)
    const blocks = await this.sanitize(author_id, input.blocks)
    const row = await this.repository.transaction(async (tx) => {
      await this.assertActiveTopic(tx, input.topic_id)
      const id = randomUUID()
      const public_number = (await this.repository.findPublicNumber(tx, author_id)) ?? 1
      const slug = input.slug ?? (await this.slugs.pickFree(tx, (is_unavailable) => uniqueSlug(input.title, public_number, is_unavailable)))
      await this.slugs.reserveSlug(tx, slug, 'article', id)
      return this.repository.insertDraft(tx, {
        id,
        slug,
        author_id,
        title: input.title,
        seo_title: input.seo_title?.trim() || null,
        seo_description: input.seo_description?.trim() || null,
        topic_id: input.topic_id,
        blocks,
        visibility: input.visibility,
        comments_enabled: input.comments_enabled,
        excerpt: deriveExcerpt(blocks.blocks),
        first_image_url: deriveFirstImage(blocks.blocks),
      })
    })
    return toDraft(row)
  }

  async update(viewer: ServiceContext, id: string, input: UpdateArticle, correlation_id: string): Promise<ArticleDraft> {
    const author_id = assertCanChange(viewer)
    const current = await this.repository.findForAuthor(id, author_id)
    if (!current || current.status === 'deleted') throw new ArticleUnavailableError()
    const blocks = input.blocks === undefined ? parseBlocks(current.blocks) : await this.sanitize(author_id, input.blocks)
    const title = input.title ?? current.title
    const save = {
      title,
      seo_title: input.seo_title === undefined ? (current.seo_title ?? null) : input.seo_title?.trim() || null,
      seo_description: input.seo_description === undefined ? (current.seo_description ?? null) : input.seo_description?.trim() || null,
      topic_id: input.topic_id ?? current.topic_id,
      blocks,
      visibility: input.visibility ?? current.visibility,
      comments_enabled: input.comments_enabled ?? current.comments_enabled,
      excerpt: deriveExcerpt(blocks.blocks),
      first_image_url: deriveFirstImage(blocks.blocks),
      search_text: searchText(title, blocks.blocks),
      ...(input.slug === undefined ? {} : { slug: input.slug }),
    }
    const saved = await this.repository.transaction(async (tx) => {
      const locked = await this.repository.findForAuthor(id, author_id, tx)
      if (!locked || locked.status === 'deleted') return null
      if (save.topic_id !== locked.topic_id) await this.assertActiveTopic(tx, save.topic_id)
      if (save.slug !== undefined && save.slug !== locked.slug) await this.slugs.replaceSlug(tx, save.slug, 'article', id)
      const stored = await this.repository.save(tx, id, author_id, { ...save, should_index: locked.status === 'published' })
      if (stored?.status === 'published') {
        await this.repository.appendEvent(tx, 'content.article.updated', stored, correlation_id)
        await this.covers.requestArticleCover(tx, stored.id, correlation_id)
      }
      return stored
    })
    if (!saved) throw new ArticleUnavailableError()
    return toDraft(saved)
  }

  async publish(viewer: ServiceContext, id: string, correlation_id: string): Promise<ArticleDraft> {
    const author_id = assertCanPublish(viewer)
    const current = await this.repository.findForAuthor(id, author_id)
    if (!current || current.status === 'deleted') throw new ArticleUnavailableError()
    const blocks = parseBlocks(current.blocks)
    const saved = await this.repository.transaction(async (tx) => {
      const locked = await this.repository.findForAuthor(id, author_id, tx)
      if (!locked || locked.status === 'deleted') return null
      const topic_status = await this.repository.findTopicStatus(tx, locked.topic_id)
      const reasons: string[] = []
      if (locked.title.trim().length === 0) reasons.push('title')
      if (topic_status !== 'active') reasons.push('topic')
      if (!hasContentBlock(blocks.blocks)) reasons.push('content')
      if (reasons.length > 0) throw new NotPublishableError(reasons)
      const stored = await this.repository.publish(tx, id, {
        published_at: locked.published_at ?? new Date(),
        search_text: searchText(current.title, blocks.blocks),
      })
      if (!stored) return null
      if (locked.status !== 'published') await this.repository.appendEvent(tx, 'content.article.published', stored, correlation_id)
      await this.covers.requestArticleCover(tx, stored.id, correlation_id)
      await this.badges.evaluate(tx, author_id)
      return stored
    })
    if (!saved) throw new ArticleUnavailableError()
    return toDraft(saved)
  }

  async remove(viewer: ServiceContext, id: string, correlation_id: string): Promise<void> {
    const author_id = assertCanChange(viewer)
    const removed = await this.repository.transaction(async (tx) => {
      const current = await this.repository.findForAuthor(id, author_id, tx)
      if (!current || current.status === 'deleted') return null
      const row: StoredArticle = { ...current, status: 'deleted' }
      await this.repository.appendEvent(tx, 'content.article.deleted', row, correlation_id)
      await this.slugs.releaseSlug(tx, 'article', id)
      await this.covers.invalidateArticleCover(tx, id)
      await this.repository.markDeleted(tx, id)
      return row
    })
    if (!removed) throw new ArticleUnavailableError()
  }

  async getDraft(viewer: ServiceContext, id: string): Promise<ArticleDraft> {
    const row = await this.repository.findForAuthor(id, requireUser(viewer))
    if (!row) throw new ArticleUnavailableError()
    return toDraft(row)
  }

  async listDrafts(viewer: ServiceContext): Promise<ArticleDraft[]> {
    const rows = await this.repository.listDrafts(requireUser(viewer))
    return rows.map(toDraft)
  }

  /** Снимок статьи в outbox внутри чужой транзакции: модерация пишет статус сама и сообщает об этом так же. */
  appendEvent(tx: TTx, name: ArticleEventName, row: StoredArticle, correlation_id: string, moderator_id?: string): Promise<void> {
    return this.repository.appendEvent(tx, name, row, correlation_id, moderator_id)
  }

  private sanitize(author_id: string, blocks: BlocksDocument): Promise<BlocksDocument> {
    return sanitizeDocument(blocks, { media_urls: this.options.media_urls, author_id, lookupFile: this.options.lookupFile })
  }

  private async assertActiveTopic(tx: TTx, topic_id: string): Promise<void> {
    const status = await this.repository.findTopicStatus(tx, topic_id)
    if (!status) throw new ValidationError({ message: 'Тема не найдена', details: { field: 'topic_id' } })
    if (status !== 'active') throw new TopicArchivedError()
  }
}
