import { SOCIAL_COVER_SIZES } from '@blog/contracts'
import type { ServiceContext, SocialCoverRequestedV1, SocialImages } from '@blog/contracts'
import { ForbiddenError } from '@blog/errors'
import type { Logger } from '@blog/logger'
import type { ObjectStore } from '../media/index.ts'
import { coverAssets } from './social-cover.assets.ts'
import type { SocialCoverPreviewBody } from './social-cover.schema.ts'
import type { CoverRenderer, RenderResult } from './social-cover.types.ts'

const VARIANTS = ['og', 'twitter', 'vk'] as const

export class SocialCoverService {
  constructor(
    private readonly renderer: CoverRenderer,
    private readonly store: ObjectStore,
    private readonly public_url: string,
    private readonly logger: Logger,
  ) {}

  /** Доступ проверяется до разбора тела: чужой зритель получает 403, а не 400. */
  assertCanPreview(viewer: ServiceContext): void {
    if (viewer.role !== 'superadmin' || viewer.is_restricted) throw new ForbiddenError()
  }

  /** Предпросмотр из текущих значений формы: только суперадминистратор, файлы не сохраняются. */
  async preview(viewer: ServiceContext, body: SocialCoverPreviewBody): Promise<RenderResult> {
    this.assertCanPreview(viewer)
    const { input, variant } = body
    const assets = await coverAssets(input, this.store, this.public_url)
    return this.renderer.render({ input, variant, ...assets })
  }

  /** Рендерит и сохраняет все три варианта; неполный набор — ошибка, задача уйдёт на повтор. */
  async renderSet(event: SocialCoverRequestedV1): Promise<SocialImages> {
    const assets = await coverAssets(event.input, this.store, this.public_url)
    const results = await Promise.all(
      VARIANTS.map(async (variant) => {
        const result = await this.renderer.render({ input: event.input, variant, ...assets })
        for (const warning of result.warnings)
          this.logger.warn({ warning, target_id: event.target_id, correlation_id: event.correlation_id }, 'social cover: using fallback')
        const key = `social-covers/${event.target_id}/${event.revision}/${variant}.jpg`
        await this.store.put({ key, body: result.bytes, content_type: 'image/jpeg' })
        const image = { url: `${this.public_url.replace(/\/$/, '')}/${key}`, ...SOCIAL_COVER_SIZES[variant], alt: event.input.title, mime: 'image/jpeg' }
        return { variant, image }
      }),
    )
    const og = results.find((result) => result.variant === 'og')?.image
    const twitter = results.find((result) => result.variant === 'twitter')?.image
    const vk = results.find((result) => result.variant === 'vk')?.image
    if (!og || !twitter || !vk) throw new Error('Incomplete social cover set')
    return { og, twitter, vk }
  }
}
