import { createHash } from 'node:crypto'
import { publicPageSchema, requireVerifiedEmail } from '@blog/contracts'
import type {
  AdminPagesQuery,
  BlocksDocument,
  CreatePage,
  ServiceContext,
  UpdatePage,
} from '@blog/contracts'
import {
  EmailUnverifiedError,
  ForbiddenError,
  RestrictedError,
  UnauthorizedError,
} from '@blog/errors'
import {
  sanitizeDocument,
  hasContentBlock,
} from '../../shared/editor-document/document.sanitizer.ts'
import type { FileOwner } from '../../shared/editor-document/document.sanitizer.ts'
import { pageDto, pageSummary } from './page.mapper.ts'
import { pageError } from './page.errors.ts'
import type { PageRepository, StoredPage } from './page.types.ts'
export type PageOptions = {
  media_urls: readonly string[]
  lookupFile: (url: string) => Promise<FileOwner | null>
}
export function requirePageAdmin(viewer: ServiceContext): string {
  if (!viewer.user_id) throw new UnauthorizedError()
  if (viewer.role !== 'superadmin') throw new ForbiddenError()
  if (viewer.is_restricted) throw new RestrictedError()
  if (!requireVerifiedEmail(viewer).allowed) throw new EmailUnverifiedError()
  return viewer.user_id
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']'
  if (value && typeof value === 'object')
    return (
      '{' +
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, child]) => JSON.stringify(key) + ':' + canonical(child))
        .join(',') +
      '}'
    )
  return JSON.stringify(value) ?? 'null'
}
function existingFiles(doc?: BlocksDocument) {
  const urls = new Set<string>()
  for (const block of doc?.blocks ?? [])
    if (block.type === 'image' || block.type === 'attaches') urls.add(block.data.file.url)
  return urls
}
export function createPageService(repository: PageRepository, options: PageOptions) {
  async function prepare(
    actor_id: string,
    input: CreatePage | UpdatePage,
    current: StoredPage | null,
  ) {
    const cache = new Map<string, Promise<FileOwner | null>>()
    const blocks = await sanitizeDocument(input.blocks ?? current?.blocks ?? { blocks: [] }, {
      ...options,
      author_id: actor_id,
      existing_urls: existingFiles(current?.blocks),
      lookupFile: (url) => {
        const pending = cache.get(url) ?? options.lookupFile(url)
        cache.set(url, pending)
        return pending
      },
    })
    const status =
      'expected_version' in input ? (input.status ?? current?.status ?? 'draft') : 'draft'
    if (status === 'deleted') throw pageError('page_not_found', 404)
    if (status === 'published' && !hasContentBlock(blocks.blocks))
      throw pageError('page_not_publishable', 422, { reasons: ['content'] })
    return {
      title: input.title ?? current?.title ?? '',
      slug: input.slug ?? current?.slug ?? '',
      blocks,
      status,
    }
  }
  function operation(
    viewer: ServiceContext,
    key: string,
    method: string,
    id: string | undefined,
    body: unknown,
    correlation_id: string,
  ) {
    const actor_id = requirePageAdmin(viewer)
    if (!key || key.length > 128) throw pageError('validation_error', 400)
    return {
      actor_id,
      key,
      fingerprint: createHash('sha256')
        .update(method + ':' + (id ?? '') + ':' + canonical(body))
        .digest('hex'),
      correlation_id,
    }
  }
  return {
    async list(viewer: ServiceContext, query: AdminPagesQuery) {
      requirePageAdmin(viewer)
      const page = await repository.list(query)
      return { items: page.rows.map(pageSummary), next_cursor: page.next_cursor }
    },
    async get(viewer: ServiceContext, id: string) {
      requirePageAdmin(viewer)
      const row = await repository.find(id)
      if (!row) throw pageError('page_not_found', 404)
      return pageDto(row)
    },
    async publicPage(slug: string) {
      const row = await repository.publicPage(slug)
      if (!row) throw pageError('page_not_found', 404)
      return publicPageSchema.strip().parse(pageDto(row))
    },
    published: repository.published,
    async create(viewer: ServiceContext, input: CreatePage, key: string, correlation_id: string) {
      const op = operation(viewer, key, 'POST', undefined, input, correlation_id)
      return repository.mutate(op, (current) => prepare(op.actor_id, input, current))
    },
    async update(
      viewer: ServiceContext,
      id: string,
      input: UpdatePage,
      key: string,
      correlation_id: string,
    ) {
      const op = operation(viewer, key, 'PATCH', id, input, correlation_id)
      return repository.mutate({ ...op, id, expected_version: input.expected_version }, (current) =>
        prepare(op.actor_id, input, current),
      )
    },
    async remove(
      viewer: ServiceContext,
      id: string,
      expected_version: number,
      key: string,
      correlation_id: string,
    ) {
      const op = operation(viewer, key, 'DELETE', id, { expected_version }, correlation_id)
      return repository.mutate({ ...op, id, expected_version, is_delete: true }, async () => {
        throw new Error('delete has no document')
      })
    },
  }
}
export type PageService = ReturnType<typeof createPageService>
