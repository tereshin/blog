import { AppError } from '@blog/errors'
import type { Database } from '@blog/broker'
import type { DbHandle } from './infra/db/client.ts'
import type { FileOwner } from './modules/article/index.ts'
import { AccessController, AccessRepository, AccessService } from './modules/access/index.ts'
import { ArticleController, ArticleRepository, ArticleService, ArticleWriteService } from './modules/article/index.ts'
import { BadgeRepository, BadgeService } from './modules/badge/index.ts'
import { FeedController, FeedRepository, FeedService } from './modules/feed/index.ts'
import { FollowController, FollowRepository, FollowService } from './modules/follow/index.ts'
import { ModerationController, ModerationRepository, ModerationService } from './modules/moderation/index.ts'
import { NavSectionController, NavSectionRepository, NavSectionService } from './modules/nav-section/index.ts'
import { PageController, PageRepository, PageService } from './modules/page/index.ts'
import {
  ProfileController,
  ProfileListService,
  ProfileListsRepository,
  ProfileRepository,
  ProfileService,
} from './modules/profile/index.ts'
import { PromotionController, PromotionRepository, PromotionService } from './modules/promotion/index.ts'
import { ReportController, ReportRepository, ReportService } from './modules/report/index.ts'
import { SearchController, SearchRepository, SearchService } from './modules/search/index.ts'
import { CrawlService, SeoController, SeoRepository, SeoService } from './modules/seo/index.ts'
import { SettingsController, SettingsRepository, SettingsService } from './modules/settings/index.ts'
import { SlugRepository, SlugService } from './modules/slug/index.ts'
import { SocialCoverRepository, SocialCoverService } from './modules/social-cover/index.ts'
import { TopicController, TopicRepository, TopicService } from './modules/topic/index.ts'

export type ComposeContentInput = {
  database: DbHandle
  media_url: string
  public_origin?: string
  media_public_url?: string
  app_env?: 'prod' | 'dev' | 'local'
  media_urls?: readonly string[]
  lookupFile?: (url: string) => Promise<FileOwner | null>
}

export function composeContent(input: ComposeContentInput) {
  const db = input.database.db as Database
  const media_url = input.media_public_url ?? input.media_url
  const media_urls = input.media_urls ?? [input.media_url, ...(input.media_public_url ? [input.media_public_url] : [])]
  const lookupFile = input.lookupFile ?? (async () => null)
  const public_origin = input.public_origin ?? 'http://localhost'
  const app_env = input.app_env ?? 'local'

  const slugs = new SlugService(new SlugRepository())
  const covers = new SocialCoverService(new SocialCoverRepository())
  const badges = new BadgeService(new BadgeRepository())
  const follows = new FollowService(new FollowRepository(db))
  const articles = new ArticleRepository(db)
  const writes = new ArticleWriteService(articles, slugs, covers, badges, { media_urls, lookupFile })
  const settings = new SettingsService(new SettingsRepository(db), badges, covers, {
    media_url,
    public_origin,
    lookupFile,
  })
  const pages = new PageService(new PageRepository(db), { media_urls, lookupFile })
  const seo_repository = new SeoRepository(db)
  seo_repository.simplePage = async (slug) => {
    try {
      return await pages.publicPage(slug)
    } catch (error) {
      if (error instanceof AppError && error.http_status === 404) return null
      throw error
    }
  }
  const profiles = new ProfileService(new ProfileRepository(db), {
    media_bases: [media_url, public_origin],
    isStatusIconAvailable: async (id) => (await settings.getPublic()).profile_status_icons.some((icon) => icon.id === id),
  })

  return {
    access: new AccessController(new AccessService(new AccessRepository(db))),
    topic: new TopicController(new TopicService(new TopicRepository(db), follows, slugs, { media_url })),
    settings: new SettingsController(settings),
    feed: new FeedController(new FeedService(new FeedRepository(db))),
    search: new SearchController(new SearchService(new SearchRepository(db))),
    seo: new SeoController(
      new SeoService(seo_repository, { public_origin, app_env }),
      new CrawlService(db, seo_repository, { public_origin, app_env }, (cursor, limit) => pages.published(cursor, limit)),
    ),
    article: new ArticleController(new ArticleService(articles), writes),
    nav: new NavSectionController(new NavSectionService(new NavSectionRepository(db))),
    page: new PageController(pages),
    profile: new ProfileController(profiles, new ProfileListService(new ProfileListsRepository(db), profiles)),
    follow: new FollowController(follows),
    promotion: new PromotionController(new PromotionService(new PromotionRepository(db))),
    report: new ReportController(new ReportService(new ReportRepository(db))),
    moderation: new ModerationController(new ModerationService(new ModerationRepository(db), articles, covers)),
  }
}
