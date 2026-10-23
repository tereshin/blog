import { DEFAULT_PROFILE_BADGES } from '../../shared/profile-badges.ts'
import {
  DEFAULT_SHELL_VISIBILITY,
  faviconSettingsSchema,
  reactionAppearancesSchema,
  seoSettingsSchema,
  shellVisibilitySchema,
  socialCoverSettingsSchema,
} from '@blog/contracts'
import type {
  AdminSettings,
  FaviconSettings,
  PublicSettings,
  ReactionAppearances,
  SeoSettings,
  ServiceContext,
  SocialCoverSettings,
  UpdateSettings,
  WelcomeContent,
} from '@blog/contracts'
import {
  sanitizeDocument,
  hasContentBlock,
} from '../../shared/editor-document/document.sanitizer.ts'
import { requireSuperadmin } from '../../shared/require-superadmin.ts'
import { assertMediaUrl } from '../../shared/media-url.ts'
import { DEFAULT_REACTION_APPEARANCES, assertSingleEmoji } from './reaction-appearance.ts'
import type {
  SettingsBadgesPort,
  SettingsCoversPort,
  SettingsOptions,
  SettingsRepositoryPort,
  SettingsRow,
} from './settings.types.ts'

export const DEFAULT_SETTINGS: AdminSettings = {
  maintenance_enabled: false,
  name: 'Блог',
  logo_url: null,
  locale: 'ru',
  registration_open: true,
  new_members_can_publish: true,
  reaction_appearances: DEFAULT_REACTION_APPEARANCES,
  profile_status_icons: [],
  profile_badges: DEFAULT_PROFILE_BADGES,
  shell: DEFAULT_SHELL_VISIBILITY,
}

/** Настройки пустой площадки: регистрация закрыта, публиковать новым участникам можно. */
export const BOOTSTRAP_SETTINGS: SettingsRow = {
  maintenance_enabled: false,
  name: 'Блог',
  logo_url: null,
  locale: 'ru',
  registration_open: false,
  new_members_can_publish: true,
  reaction_appearances: DEFAULT_REACTION_APPEARANCES,
  profile_status_icons: [],
  profile_badges: DEFAULT_PROFILE_BADGES,
  shell: DEFAULT_SHELL_VISIBILITY,
}

function appearancesOf(value: ReactionAppearances): ReactionAppearances {
  return reactionAppearancesSchema.parse(value)
}

function toPublic(row: SettingsRow): PublicSettings {
  return {
    meta_pixel_id: row.meta_pixel_id ?? null,
    maintenance_enabled: row.maintenance_enabled ?? false,
    welcome_content: row.welcome_content ?? null,
    name: row.name,
    logo_url: row.logo_url,
    logo_dark_url: row.logo_dark_url ?? null,
    favicon: faviconSettingsSchema.parse(row.favicon ?? {}),
    locale: row.locale,
    reaction_appearances: appearancesOf(row.reaction_appearances),
    profile_status_icons: row.profile_status_icons,
    profile_badges: row.profile_badges ?? DEFAULT_PROFILE_BADGES,
    seo: seoSettingsSchema.parse(row.seo ?? {}),
    social_cover: socialCoverSettingsSchema.parse(row.social_cover ?? {}),
    shell: shellVisibilitySchema.parse(row.shell ?? {}),
  }
}

function toAdmin(row: SettingsRow): AdminSettings {
  return {
    ...toPublic(row),
    registration_open: row.registration_open,
    new_members_can_publish: row.new_members_can_publish,
  }
}

function assertAppearances(appearances: ReactionAppearances, media_url: string): void {
  for (const appearance of appearances) {
    const field = `reaction_appearances.${appearance.kind}`
    if (appearance.presentation === 'emoji') {
      assertSingleEmoji(appearance.emoji, `${field}.emoji`)
      continue
    }
    assertMediaUrl(appearance.image_url, media_url, `${field}.image_url`)
  }
}

type ValidatedImages = { seo: SeoSettings; social_cover: SocialCoverSettings; favicon: FaviconSettings }

export class SettingsService<TTx> {
  constructor(
    private readonly repository: SettingsRepositoryPort<TTx>,
    private readonly badges: SettingsBadgesPort<TTx>,
    private readonly covers: SettingsCoversPort<TTx>,
    private readonly options: SettingsOptions,
  ) {}

  async getMaintenance() {
    const row = await this.repository.findMaintenance()
    return { maintenance_enabled: row?.maintenance_enabled ?? false, locale: row?.locale ?? 'ru' }
  }

  async getPublic(viewer?: ServiceContext): Promise<PublicSettings> {
    const row = await this.repository.find()
    const settings = row ? toPublic(row) : toPublic(DEFAULT_SETTINGS)
    // Bootstrap settings remain available for sign-in, but home-page content is suspended too.
    if (settings.maintenance_enabled && viewer?.role !== 'admin' && viewer?.role !== 'superadmin')
      return { ...settings, welcome_content: null }
    return settings
  }

  async getAdmin(viewer: ServiceContext): Promise<AdminSettings> {
    requireSuperadmin(viewer)
    const row = await this.repository.find()
    return this.withOrigin(row ? toAdmin(row) : DEFAULT_SETTINGS)
  }

  async update(viewer: ServiceContext, input: UpdateSettings, correlation_id: string): Promise<AdminSettings> {
    requireSuperadmin(viewer)
    const current = await this.repository.find()
    const welcome_content = await this.welcomeContent(viewer, input, current)
    const { seo, social_cover, favicon } = this.validateImages(input, current)
    const saved = await this.repository.transaction(async (tx) => {
      const catalog = await this.badges.validateReplacement(tx, input.profile_badges)
      const row: SettingsRow = {
        meta_pixel_id: input.meta_pixel_id === undefined ? (current?.meta_pixel_id ?? null) : input.meta_pixel_id,
        maintenance_enabled: input.maintenance_enabled ?? current?.maintenance_enabled ?? false,
        welcome_content,
        name: input.name,
        logo_url: input.logo_url,
        logo_dark_url:
          input.logo_dark_url === undefined
            ? (current?.logo_dark_url ?? null)
            : input.logo_dark_url,
        favicon,
        locale: input.locale,
        registration_open: input.registration_open,
        new_members_can_publish: input.new_members_can_publish,
        reaction_appearances: input.reaction_appearances,
        profile_status_icons: input.profile_status_icons,
        profile_badges: catalog,
        seo,
        social_cover,
        shell: shellVisibilitySchema.parse(input.shell ?? current?.shell ?? {}),
      }
      const written = await this.repository.save(tx, row)
      await this.repository.appendUpdated(tx, row, correlation_id)
      await this.covers.requestSiteCover(tx, correlation_id)
      return written
    })
    return this.withOrigin(toAdmin(saved))
  }

  async ensureDefaults(correlation_id: string): Promise<SettingsRow> {
    const existing = await this.repository.find()
    if (existing) return existing
    const inserted = await this.repository.transaction(async (tx) => {
      const row = await this.repository.insertIfAbsent(tx, BOOTSTRAP_SETTINGS)
      if (!row) return null
      await this.repository.appendUpdated(tx, BOOTSTRAP_SETTINGS, correlation_id)
      await this.covers.requestSiteCover(tx, correlation_id)
      return row
    })
    return inserted ?? (await this.repository.find()) ?? BOOTSTRAP_SETTINGS
  }

  private withOrigin(settings: AdminSettings): AdminSettings {
    return { ...settings, ...(this.options.public_origin ? { public_origin: this.options.public_origin } : {}) }
  }

  private async welcomeContent(viewer: ServiceContext, input: UpdateSettings, current: SettingsRow | null): Promise<WelcomeContent | null> {
    const previous = current?.welcome_content ?? null
    const requested = input.welcome_content === undefined ? previous : input.welcome_content
    const existing_urls = new Set<string>()
    for (const block of previous?.document.blocks ?? []) {
      if (block.type === 'image' || block.type === 'attaches')
        existing_urls.add(block.data.file.url)
    }
    const welcome_content = requested
      ? {
          title: requested.title,
          document: await sanitizeDocument(requested.document, {
            author_id: viewer.user_id ?? '',
            media_urls: [this.options.media_url],
            existing_urls,
            lookupFile: this.options.lookupFile ?? (async () => null),
          }),
        }
      : null
    if (
      welcome_content &&
      !welcome_content.title.trim() &&
      !hasContentBlock(welcome_content.document.blocks)
    )
      return null
    return welcome_content
  }

  /** Все картинки настроек должны лежать на своём media-origin; встроенные значки бейджей — исключение. */
  private validateImages(input: UpdateSettings, current: SettingsRow | null): ValidatedImages {
    const media_url = this.options.media_url
    const seo = seoSettingsSchema.parse(input.seo ?? current?.seo ?? {})
    const social_cover = socialCoverSettingsSchema.parse(
      input.social_cover ?? current?.social_cover ?? {},
    )
    assertMediaUrl(seo.publisher.logo_url, media_url, 'seo.publisher.logo_url')
    assertMediaUrl(social_cover.logo_url, media_url, 'social_cover.logo_url')
    assertMediaUrl(social_cover.default_image_url, media_url, 'social_cover.default_image_url')
    assertMediaUrl(input.logo_dark_url ?? current?.logo_dark_url ?? null, media_url, 'logo_dark_url')
    const favicon = faviconSettingsSchema.parse(input.favicon ?? current?.favicon ?? {})
    for (const [variant, url] of Object.entries(favicon))
      assertMediaUrl(url, media_url, `favicon.${variant}`)
    assertMediaUrl(input.logo_url, media_url, 'logo_url')
    assertAppearances(input.reaction_appearances, media_url)
    for (const icon of input.profile_status_icons) {
      assertMediaUrl(icon.image_url, media_url, `profile_status_icons.${icon.id}.image_url`)
    }
    const profile_badges =
      input.profile_badges ?? current?.profile_badges ?? DEFAULT_PROFILE_BADGES
    for (const badge of profile_badges) {
      if (!DEFAULT_PROFILE_BADGES.some((item) => item.image_url === badge.image_url)) {
        assertMediaUrl(badge.image_url, media_url, `profile_badges.${badge.id}.image_url`)
      }
    }
    return { seo, social_cover, favicon }
  }
}
