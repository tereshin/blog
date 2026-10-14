import { sumReactionCounts } from '@blog/contracts'
import type {
  Comment,
  CommentSort,
  CommentTreePage,
  PageQuery,
  PopularComment,
  ReactionCounts,
  ReactionKind,
  ServiceContext,
  UserCommentPage,
} from '@blog/contracts'
import { EmailUnverifiedError, ForbiddenError, RestrictedError, UnauthorizedError } from '@blog/errors'
import { canReadArticle } from '../../shared/can-read.ts'
import { requireVerifiedEmail } from '../../shared/require-verified-email.ts'
import {
  nextCommentCursor,
  nextUserCommentCursor,
  parseCommentCursor,
  parseUserCommentCursor,
} from './comment.cursor.ts'
import {
  CommentArticleNotFoundError,
  CommentNotFoundError,
  CommentsDisabledError,
} from './comment.errors.ts'
import { toExcerpt } from './comment.excerpt.ts'
import { POPULAR_COMMENTS_LIMIT } from './comment.schema.ts'
import { assembleCommentTree, emptyCounts, occupiesThread, toCommentNode } from './comment.tree.ts'
import type { CommentRow } from './comment.tree.ts'
import type { CommentRepositoryPort, CommentWriterPort } from './comment.types.ts'

const ANONYMOUS_NAME = 'Участник'

type WriteRequest = { viewer: ServiceContext; comment_id: string; correlation_id: string }

function indexCounts(
  rows: { target_id: string; kind: ReactionKind; total: number }[],
): Map<string, ReactionCounts> {
  const count_by_id = new Map<string, ReactionCounts>()
  for (const row of rows) {
    const counts = count_by_id.get(row.target_id) ?? emptyCounts()
    counts[row.kind] = row.total
    count_by_id.set(row.target_id, counts)
  }
  return count_by_id
}

function requireActor(viewer: ServiceContext): string {
  if (viewer.user_id === undefined) throw new UnauthorizedError()
  if (viewer.is_restricted) throw new RestrictedError()
  if (!requireVerifiedEmail(viewer).allowed) throw new EmailUnverifiedError()
  return viewer.user_id
}

function requireModerator(viewer: ServiceContext): string {
  if (viewer.user_id === undefined) throw new UnauthorizedError()
  if (viewer.role !== 'admin' && viewer.role !== 'superadmin') throw new ForbiddenError()
  return viewer.user_id
}

export class CommentService {
  constructor(
    private readonly repository: CommentRepositoryPort,
    private readonly writer: CommentWriterPort,
  ) {}

  async getPopular(viewer: ServiceContext): Promise<PopularComment[]> {
    const rows = await this.repository.findPopular(viewer, POPULAR_COMMENTS_LIMIT)
    const count_by_id = indexCounts(await this.repository.countReactions(rows.map((row) => row.id)))
    return rows.map((row) => {
      const reaction_counts = count_by_id.get(row.id) ?? emptyCounts()
      return {
        id: row.id,
        author_name: row.author_name ?? ANONYMOUS_NAME,
        author_avatar_url: row.author_avatar_url,
        article_id: row.article_id,
        article_title: row.article_title,
        article_slug: row.article_slug,
        excerpt: toExcerpt(row.body),
        reaction_counts,
        reaction_count: sumReactionCounts(reaction_counts),
      }
    })
  }

  async listForArticle(
    viewer: ServiceContext,
    article_id: string,
    query: PageQuery & { sort?: CommentSort; include_replies?: boolean },
  ): Promise<CommentTreePage> {
    const article = await this.repository.findArticle(article_id)
    if (!article || !canReadArticle(viewer, article)) throw new CommentArticleNotFoundError()
    const sort = query.sort ?? 'oldest'
    const cursor = parseCommentCursor(query.cursor, sort, article_id)
    const roots = await this.repository.listRoots(article_id, cursor, query.limit + 1, sort)
    const page = roots.slice(0, query.limit)
    const replies =
      query.include_replies === false
        ? []
        : await this.repository.listReplies(page.map((row) => row.id))
    return {
      comments: (await this.present(viewer, page, replies)).nodes,
      next_cursor: nextCommentCursor(roots, query.limit, sort, article_id),
    }
  }

  async listReplyPage(
    viewer: ServiceContext,
    root_id: string,
    query: PageQuery & { sort?: CommentSort },
  ): Promise<CommentTreePage> {
    const root = await this.readableComment(viewer, root_id)
    if (root.parent_id) throw new CommentNotFoundError()
    const sort = query.sort ?? 'oldest'
    const rows = await this.repository.listReplyPage(
      root_id,
      parseCommentCursor(query.cursor, sort, root_id),
      query.limit + 1,
      sort,
    )
    return {
      comments: (await this.present(viewer, rows.slice(0, query.limit))).nodes,
      next_cursor: nextCommentCursor(rows, query.limit, sort, root_id),
    }
  }

  async getByIds(viewer: ServiceContext, ids: string[]): Promise<Comment[]> {
    return (await this.present(viewer, await this.repository.findByIds(viewer, ids))).nodes
  }

  async getThread(
    viewer: ServiceContext,
    id: string,
  ): Promise<{ article_id: string; root: Comment; target: Comment }> {
    const target = await this.readableComment(viewer, id)
    const root = target.parent_id ? await this.readableComment(viewer, target.parent_id) : target
    const response = await this.present(viewer, target.id === root.id ? [root] : [root, target])
    return {
      article_id: target.article_id,
      root: response.node(root),
      target: response.node(target),
    }
  }

  async listByAuthor(
    viewer: ServiceContext,
    author_id: string,
    sort: 'fresh' | 'popular',
    query: PageQuery,
  ): Promise<UserCommentPage> {
    const cursor = parseUserCommentCursor(query.cursor)
    const rows = await this.repository.listByAuthor(viewer, author_id, sort, cursor, query.limit + 1)
    const page = rows.slice(0, query.limit)
    const ids = page.map((row) => row.id)
    const [counts, mine_rows, saved_ids] = await Promise.all([
      this.repository.countReactions(ids),
      viewer.user_id ? this.repository.findMine(viewer.user_id, ids) : [],
      viewer.user_id ? this.repository.findBookmarks(viewer.user_id, ids) : [],
    ])
    const count_by_id = indexCounts(counts)
    const kind_by_id = new Map(mine_rows.map((row) => [row.target_id, row.kind]))
    const saved = new Set(saved_ids)
    return {
      items: page.map((row) => ({
        id: row.id,
        excerpt: toExcerpt(row.body),
        article_id: row.article_id,
        article_title: row.article_title,
        article_slug: row.article_slug,
        created_at: row.created_at.toISOString(),
        reaction_count: row.reaction_count,
        reaction_counts: count_by_id.get(row.id) ?? emptyCounts(),
        my_reaction: kind_by_id.get(row.id) ?? null,
        is_bookmarked: saved.has(row.id),
      })),
      next_cursor: nextUserCommentCursor(rows, query.limit, sort),
    }
  }

  async create(input: {
    viewer: ServiceContext
    article_id: string
    body: string
    media?: { url: string; alt: string }[] | undefined
    mentions?: { user_id: string; display_name: string }[] | undefined
    parent_id?: string | undefined
    idempotency_key: string | null
    correlation_id: string
  }): Promise<Comment> {
    const user_id = requireActor(input.viewer)
    const article = await this.repository.findArticle(input.article_id)
    if (!article || !canReadArticle(input.viewer, article)) throw new CommentArticleNotFoundError()
    if (!article.comments_enabled) throw new CommentsDisabledError()
    return this.writer.insert({
      user_id,
      article_id: input.article_id,
      body: input.body,
      media: input.media,
      mentions: input.mentions,
      parent_id: input.parent_id,
      idempotency_key: input.idempotency_key,
      correlation_id: input.correlation_id,
    })
  }

  async update(input: WriteRequest & { body: string; idempotency_key: string | null }): Promise<Comment> {
    const user_id = requireActor(input.viewer)
    return this.writer.update({
      user_id,
      comment_id: input.comment_id,
      body: input.body,
      idempotency_key: input.idempotency_key,
      correlation_id: input.correlation_id,
    })
  }

  async remove(input: WriteRequest & { idempotency_key: string | null }): Promise<Comment> {
    const user_id = requireActor(input.viewer)
    return this.writer.remove({
      user_id,
      comment_id: input.comment_id,
      idempotency_key: input.idempotency_key,
      correlation_id: input.correlation_id,
    })
  }

  hide(input: WriteRequest): Promise<Comment> {
    return this.moderate(input, 'hidden')
  }

  restore(input: WriteRequest): Promise<Comment> {
    return this.moderate(input, 'visible')
  }

  moderateRemove(input: WriteRequest): Promise<Comment> {
    return this.moderate(input, 'deleted')
  }

  private async moderate(input: WriteRequest, status: 'visible' | 'deleted' | 'hidden'): Promise<Comment> {
    const moderator_id = requireModerator(input.viewer)
    return this.writer.moderate({ comment_id: input.comment_id, status, correlation_id: input.correlation_id, moderator_id })
  }

  private async present(viewer: ServiceContext, rows: CommentRow[], replies: CommentRow[] = []) {
    const ids = [...rows, ...replies].map((row) => row.id)
    const count_by_id = indexCounts(await this.repository.countReactions(ids))
    const kind_by_id = new Map<string, ReactionKind>()
    if (viewer.user_id)
      for (const row of await this.repository.findMine(viewer.user_id, ids)) kind_by_id.set(row.target_id, row.kind)
    const saved = new Set(viewer.user_id ? await this.repository.findBookmarks(viewer.user_id, ids) : [])
    const hydrate = (row: CommentRow) => ({ ...row, is_bookmarked: saved.has(row.id) })
    return {
      nodes: assembleCommentTree(rows.map(hydrate), replies.map(hydrate), count_by_id, kind_by_id),
      node: (row: CommentRow) => toCommentNode(hydrate(row), count_by_id, kind_by_id, []),
    }
  }

  private async readableComment(viewer: ServiceContext, id: string) {
    const row = await this.repository.findComment(id)
    if (!row || !occupiesThread(row)) throw new CommentNotFoundError()
    const article = await this.repository.findArticle(row.article_id)
    if (!article || !canReadArticle(viewer, article)) throw new CommentNotFoundError()
    return row
  }
}
