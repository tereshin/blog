import { createHash } from 'node:crypto'
import {
  adminNavSectionItemSchema,
  adminNavSectionSchema,
  adminNavSectionsSchema,
  publicNavSectionsSchema,
  toPublicNavSections,
} from '@blog/contracts'
import type {
  CreateNavSection,
  CreateNavSectionItem,
  ServiceContext,
  UpdateNavSection,
  UpdateNavSectionItem,
} from '@blog/contracts'
import {
  EmailUnverifiedError,
  ForbiddenError,
  RestrictedError,
  UnauthorizedError,
} from '@blog/errors'
import { requireVerifiedEmail } from '../../shared/require-verified-email.ts'
import { navError } from './nav-section.errors.ts'
import type { NavSectionRepository } from './nav-section.repository.ts'

export function requireNavAdmin(viewer: ServiceContext): string {
  if (!viewer.user_id) throw new UnauthorizedError()
  if (viewer.role !== 'superadmin') throw new ForbiddenError()
  if (viewer.is_restricted) throw new RestrictedError()
  if (!requireVerifiedEmail(viewer).allowed) throw new EmailUnverifiedError()
  return viewer.user_id
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']'
  if (value && typeof value === 'object') {
    return (
      '{' +
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => JSON.stringify(key) + ':' + canonical(child))
        .join(',') +
      '}'
    )
  }
  return JSON.stringify(value) ?? 'null'
}

export class NavSectionService {
  constructor(private readonly repository: NavSectionRepository) {}

  private operation(
    viewer: ServiceContext,
    key: string,
    method: string,
    path: string,
    body: unknown,
  ) {
    const actor_id = requireNavAdmin(viewer)
    if (!key || key.length > 128) throw navError('validation_error', 400)
    return {
      actor_id,
      key,
      fingerprint: createHash('sha256')
        .update(method + ':' + path + ':' + canonical(body))
        .digest('hex'),
    }
  }

  async listPublic() {
    const items = toPublicNavSections(await this.repository.list())
    return publicNavSectionsSchema.parse({ items })
  }

  async listAdmin(viewer: ServiceContext) {
    requireNavAdmin(viewer)
    return adminNavSectionsSchema.parse({ items: await this.repository.list() })
  }

  async createSection(viewer: ServiceContext, input: CreateNavSection, key: string) {
    const result = await this.repository.createSection(
      this.operation(viewer, key, 'POST', '/v1/admin/nav-sections', input),
      input.title,
    )
    return { status: result.status, body: adminNavSectionSchema.parse(result.body) }
  }

  async updateSection(viewer: ServiceContext, id: string, input: UpdateNavSection, key: string) {
    const result = await this.repository.updateSection(
      this.operation(viewer, key, 'PATCH', `/v1/admin/nav-sections/${id}`, input),
      id,
      input.title,
    )
    return { status: result.status, body: adminNavSectionSchema.parse(result.body) }
  }

  async deleteSection(viewer: ServiceContext, id: string, key: string) {
    await this.repository.deleteSection(
      this.operation(viewer, key, 'DELETE', `/v1/admin/nav-sections/${id}`, {}),
      id,
    )
  }

  async reorderSections(viewer: ServiceContext, section_ids: readonly string[], key: string) {
    const result = await this.repository.reorderSections(
      this.operation(viewer, key, 'PATCH', '/v1/admin/nav-sections/order', { section_ids }),
      section_ids,
    )
    return { status: result.status, body: adminNavSectionsSchema.parse(result.body) }
  }

  async createItem(
    viewer: ServiceContext,
    section_id: string,
    input: CreateNavSectionItem,
    key: string,
  ) {
    const result = await this.repository.createItem(
      this.operation(viewer, key, 'POST', `/v1/admin/nav-sections/${section_id}/items`, input),
      section_id,
      input,
    )
    return { status: result.status, body: adminNavSectionItemSchema.parse(result.body) }
  }

  async updateItem(
    viewer: ServiceContext,
    section_id: string,
    item_id: string,
    input: UpdateNavSectionItem,
    key: string,
  ) {
    const result = await this.repository.updateItem(
      this.operation(
        viewer,
        key,
        'PATCH',
        `/v1/admin/nav-sections/${section_id}/items/${item_id}`,
        input,
      ),
      section_id,
      item_id,
      input,
    )
    return { status: result.status, body: adminNavSectionItemSchema.parse(result.body) }
  }

  async deleteItem(viewer: ServiceContext, section_id: string, item_id: string, key: string) {
    await this.repository.deleteItem(
      this.operation(viewer, key, 'DELETE', `/v1/admin/nav-sections/${section_id}/items/${item_id}`, {}),
      section_id,
      item_id,
    )
  }

  async reorderItems(
    viewer: ServiceContext,
    section_id: string,
    item_ids: readonly string[],
    key: string,
  ) {
    const result = await this.repository.reorderItems(
      this.operation(viewer, key, 'PATCH', `/v1/admin/nav-sections/${section_id}/items/order`, {
        item_ids,
      }),
      section_id,
      item_ids,
    )
    return { status: result.status, body: adminNavSectionSchema.parse(result.body) }
  }
}
