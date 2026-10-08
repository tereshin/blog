import { buildBookmarks } from '../bookmarks.ts'
import { buildFillerArticles, buildNamedArticles } from '../articles.ts'
import { buildSmallComments } from '../comments.ts'
import { buildSmallConversations } from '../conversations.ts'
import { buildFiles } from '../files.ts'
import { buildSmallFeedSeen } from '../feed-seen.ts'
import { buildFollows } from '../follows.ts'
import { buildSmallMessages } from '../messages.ts'
import { buildSmallNotifications } from '../notifications.ts'
import type { SeedOptions } from '../options.ts'
import { buildParticipants } from '../participants.ts'
import { buildProfiles } from '../profiles.ts'
import { buildPromotions } from '../promotions.ts'
import { buildSmallReactions } from '../reactions.ts'
import { buildReports } from '../reports.ts'
import { buildSettings } from '../settings.ts'
import { buildSlugs } from '../slugs.ts'
import { buildTopics } from '../topics.ts'
import type { DatasetBody } from '../types.ts'
import { buildSmallViews } from '../views.ts'

/** Малый набор: несколько десятков записей, каждая сущность и каждое состояние из таблицы покрытия. */
export function buildSmall(anchor: Date, options: SeedOptions): DatasetBody {
  const users = buildParticipants(anchor, options)
  const profiles = buildProfiles(users, options)
  const topics = buildTopics(options)
  const articles = [...buildNamedArticles(anchor, options), ...buildFillerArticles(anchor, options)]
  return {
    users,
    profiles,
    topics,
    slugs: buildSlugs(profiles, topics, articles),
    settings: buildSettings(options),
    articles,
    promotions: buildPromotions(anchor),
    follows: buildFollows(anchor),
    reports: buildReports(anchor),
    bookmarks: buildBookmarks(anchor),
    comments: buildSmallComments(anchor),
    reactions: buildSmallReactions(anchor),
    views: buildSmallViews(anchor),
    feed_seen: buildSmallFeedSeen(anchor),
    notifications: buildSmallNotifications(anchor),
    conversations: buildSmallConversations(anchor),
    messages: buildSmallMessages(anchor),
    files: buildFiles(options),
  }
}
