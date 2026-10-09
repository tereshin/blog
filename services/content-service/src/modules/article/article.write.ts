import { blocksDocumentSchema } from '@blog/contracts'
import type { ArticleDraft, BlocksDocument, CreateArticle, ServiceContext, UpdateArticle } from '@blog/contracts'
import { RestrictedError, UnauthorizedError } from '@blog/errors'
import { ArticleUnavailableError, CannotPublishError, InvalidBlockError } from './article.errors.ts'
import type { ArticleRepository, StoredArticle } from './article.types.ts'
import { deriveExcerpt, deriveFirstImage, searchText } from './lib/slugify.ts'
import { hasContentBlock, sanitizeDocument } from './article.sanitizer.ts'
import type { FileOwner } from './article.sanitizer.ts'

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
  }
}

export function createArticleWrite(repository: ArticleRepository, options: ArticleWriteOptions) {
  async function sanitize(author_id: string, blocks: BlocksDocument): Promise<BlocksDocument> {
    return sanitizeDocument(blocks, { media_urls: options.media_urls, author_id, lookupFile: options.lookupFile })
  }

  return {
    async create(viewer: ServiceContext, input: CreateArticle, _correlation_id: string): Promise<ArticleDraft> {
      const author_id = assertCanPublish(viewer)
      const blocks = await sanitize(author_id, input.blocks)
      const row = await repository.insertDraft({
        author_id,
        title: input.title,
        topic_id: input.topic_id,
        blocks,
        visibility: input.visibility,
        comments_enabled: input.comments_enabled,
        excerpt: deriveExcerpt(blocks.blocks),
        first_image_url: deriveFirstImage(blocks.blocks),
        ...(input.slug === undefined ? {} : { slug: input.slug }),
      })
      return toDraft(row)
    },

    async update(viewer: ServiceContext, id: string, input: UpdateArticle, correlation_id: string): Promise<ArticleDraft> {
      const author_id = assertCanChange(viewer)
      const current = await repository.findForAuthor(id, author_id)
      if (!current || current.status === 'deleted') throw new ArticleUnavailableError()
      const blocks = input.blocks === undefined ? parseBlocks(current.blocks) : await sanitize(author_id, input.blocks)
      const saved = await repository.save(id, author_id, {
        title: input.title ?? current.title,
        topic_id: input.topic_id ?? current.topic_id,
        blocks,
        visibility: input.visibility ?? current.visibility,
        comments_enabled: input.comments_enabled ?? current.comments_enabled,
        excerpt: deriveExcerpt(blocks.blocks),
        first_image_url: deriveFirstImage(blocks.blocks),
        search_text: searchText(input.title ?? current.title, blocks.blocks),
        ...(input.slug === undefined ? {} : { slug: input.slug }),
        correlation_id,
      })
      if (!saved) throw new ArticleUnavailableError()
      return toDraft(saved)
    },

    async publish(viewer: ServiceContext, id: string, correlation_id: string): Promise<ArticleDraft> {
      const author_id = assertCanPublish(viewer)
      const current = await repository.findForAuthor(id, author_id)
      if (!current || current.status === 'deleted') throw new ArticleUnavailableError()
      const blocks = parseBlocks(current.blocks)
      const saved = await repository.publish(id, author_id, {
        has_content: hasContentBlock(blocks.blocks),
        search_text: searchText(current.title, blocks.blocks),
        correlation_id,
      })
      if (!saved) throw new ArticleUnavailableError()
      return toDraft(saved)
    },

    async remove(viewer: ServiceContext, id: string, correlation_id: string): Promise<void> {
      const author_id = assertCanChange(viewer)
      const removed = await repository.remove(id, author_id, correlation_id)
      if (!removed) throw new ArticleUnavailableError()
    },

    async getDraft(viewer: ServiceContext, id: string): Promise<ArticleDraft> {
      const row = await repository.findForAuthor(id, requireUser(viewer))
      if (!row) throw new ArticleUnavailableError()
      return toDraft(row)
    },

    async listDrafts(viewer: ServiceContext): Promise<ArticleDraft[]> {
      const rows = await repository.listDrafts(requireUser(viewer))
      return rows.map(toDraft)
    },
  }
}
