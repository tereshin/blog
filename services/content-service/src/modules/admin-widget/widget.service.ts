import { ValidationError } from '@blog/errors'
import {
  adminWidgetSchema,
  type AdminWidget,
  type ServiceContext,
  type Sidebar,
} from '@blog/contracts'
import { requirePageAdmin } from '../page/index.ts'
import { linkedPageIds, publicWidget } from '../../shared/editor-document/widget.public.ts'
import type { WidgetRepository } from './widget.repository.ts'
export class WidgetService {
  constructor(readonly repository: WidgetRepository) {}
  async admin(viewer: ServiceContext) {
    requirePageAdmin(viewer)
    return this.repository.get()
  }
  async save(
    viewer: ServiceContext,
    sections: Sidebar['sections'],
    expected_version: number,
    key: string,
  ) {
    const actor = requirePageAdmin(viewer)
    if (!key || key.length > 128) throw new ValidationError({ message: 'Missing idempotency key' })
    return this.repository.save(
      { sections, version: expected_version + 1 },
      expected_version,
      actor,
      key,
    )
  }
  async public() {
    const config = await this.repository.get()
    const links = await this.repository.publicLinks(
      linkedPageIds(config.sections.flatMap((section) => section.widgets)),
    )
    return {
      ...config,
      sections: config.sections.map((section) => ({
        ...section,
        widgets: section.widgets.map((widget) => publicWidget(widget, links)),
      })),
    }
  }
  async resolve(id: string, page_id?: string): Promise<AdminWidget | null> {
    if (page_id) {
      const page = await this.repository.page(page_id)
      const block = page?.blocks.blocks.find((block) => block.id === id)
      const parsed = adminWidgetSchema.safeParse(block)
      return parsed.success ? parsed.data : null
    }
    if (!(await this.repository.isSidebarEnabled())) return null
    const config = await this.repository.get()
    return (
      config.sections.flatMap((section) => section.widgets).find((widget) => widget.id === id) ??
      null
    )
  }
}
