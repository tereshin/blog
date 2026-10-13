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
  PublicSettings,
  ReactionAppearances,
  ServiceContext,
  UpdateSettings,
} from '@blog/contracts'
import {
  sanitizeDocument,
  hasContentBlock,
} from '../../shared/editor-document/document.sanitizer.ts'
import type { FileOwner } from '../../shared/editor-document/document.sanitizer.ts'
import { requireSuperadmin } from '../access/require-superadmin.ts'
import { assertMediaUrl } from '../media-url.ts'
import { DEFAULT_REACTION_APPEARANCES, assertSingleEmoji } from './reaction-appearance.ts'
import type { SettingsRepository, SettingsRow } from './settings.repository.ts'

export const DEFAULT_SETTINGS: AdminSettings = {
  name: 'Блог',
  logo_url: null,
  locale: 'ru',
  registration_open: true,
  new_members_can_publish: true,
  reaction_appearances: DEFAULT_REACTION_APPEARANCES,
  profile_status_icons: [],
  shell: DEFAULT_SHELL_VISIBILITY,
}

function appearancesOf(value: ReactionAppearances): ReactionAppearances {
  return reactionAppearancesSchema.parse(value)
}

function toPublic(row: SettingsRow): PublicSettings {
  return {
    welcome_content: row.welcome_content ?? null,
    name: row.name,
    logo_url: row.logo_url,
    logo_dark_url: row.logo_dark_url ?? null,
    favicon: faviconSettingsSchema.parse(row.favicon ?? {}),
    locale: row.locale,
    reaction_appearances: appearancesOf(row.reaction_appearances),
    profile_status_icons: row.profile_status_icons,
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

/** Настройки пустой площадки: регистрация закрыта, публиковать новым участникам можно. */
export const BOOTSTRAP_SETTINGS: SettingsRow = {
  name: 'Блог',
  logo_url: null,
  locale: 'ru',
  registration_open: false,
  new_members_can_publish: true,
  reaction_appearances: DEFAULT_REACTION_APPEARANCES,
  profile_status_icons: [],
  shell: DEFAULT_SHELL_VISIBILITY,
}

export type SettingsService = {
  getPublic: () => Promise<PublicSettings>
  getAdmin: (viewer: ServiceContext) => Promise<AdminSettings>
  update: (
    viewer: ServiceContext,
    input: UpdateSettings,
    correlation_id: string,
  ) => Promise<AdminSettings>
  ensureDefaults: (correlation_id: string) => Promise<SettingsRow>
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

export function createSettingsService(
  repository: SettingsRepository,
  options: {
    media_url: string
    public_origin?: string
    lookupFile?: (url: string) => Promise<FileOwner | null>
  },
): SettingsService {
  return {
    async getPublic() {
      const row = await repository.find()
      return row ? toPublic(row) : toPublic(DEFAULT_SETTINGS)
    },

    async getAdmin(viewer) {
      requireSuperadmin(viewer)
      const row = await repository.find()
      return {
        ...(row ? toAdmin(row) : DEFAULT_SETTINGS),
        ...(options.public_origin ? { public_origin: options.public_origin } : {}),
      }
    },

    async update(viewer, input, correlation_id) {
      requireSuperadmin(viewer)
      const current = await repository.find()
      const previous = current?.welcome_content ?? null
      const requested = input.welcome_content === undefined ? previous : input.welcome_content
      const existing_urls = new Set<string>()
      for (const block of previous?.document.blocks ?? []) {
        if (block.type === 'image' || block.type === 'attaches')
          existing_urls.add(block.data.file.url)
      }
      let welcome_content = requested
        ? {
            title: requested.title,
            document: await sanitizeDocument(requested.document, {
              author_id: viewer.user_id ?? '',
              media_urls: [options.media_url],
              existing_urls,
              lookupFile: options.lookupFile ?? (async () => null),
            }),
          }
        : null
      if (
        welcome_content &&
        !welcome_content.title.trim() &&
        !hasContentBlock(welcome_content.document.blocks)
      )
        welcome_content = null
      const seo = seoSettingsSchema.parse(input.seo ?? current?.seo ?? {})
      const social_cover = socialCoverSettingsSchema.parse(
        input.social_cover ?? current?.social_cover ?? {},
      )
      assertMediaUrl(seo.publisher.logo_url, options.media_url, 'seo.publisher.logo_url')
      assertMediaUrl(social_cover.logo_url, options.media_url, 'social_cover.logo_url')
      assertMediaUrl(
        social_cover.default_image_url,
        options.media_url,
        'social_cover.default_image_url',
      )
      assertMediaUrl(
        input.logo_dark_url ?? current?.logo_dark_url ?? null,
        options.media_url,
        'logo_dark_url',
      )
      const favicon = faviconSettingsSchema.parse(input.favicon ?? current?.favicon ?? {})
      for (const [variant, url] of Object.entries(favicon))
        assertMediaUrl(url, options.media_url, `favicon.${variant}`)
      assertMediaUrl(input.logo_url, options.media_url, 'logo_url')
      assertAppearances(input.reaction_appearances, options.media_url)
      for (const icon of input.profile_status_icons) {
        assertMediaUrl(
          icon.image_url,
          options.media_url,
          `profile_status_icons.${icon.id}.image_url`,
        )
      }
      const saved = await repository.save(
        {
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
          seo,
          social_cover,
          shell: shellVisibilitySchema.parse(input.shell ?? current?.shell ?? {}),
        },
        correlation_id,
      )
      return {
        ...toAdmin(saved),
        ...(options.public_origin ? { public_origin: options.public_origin } : {}),
      }
    },

    async ensureDefaults(correlation_id) {
      const existing = await repository.find()
      if (existing) return existing
      return (
        (await repository.insertIfAbsent(BOOTSTRAP_SETTINGS, correlation_id)) ??
        (await repository.find()) ??
        BOOTSTRAP_SETTINGS
      )
    },
  }
}
