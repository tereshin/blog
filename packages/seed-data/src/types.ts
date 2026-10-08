import type { SeedOptions } from './options.ts'

export type SeedProfileName = 'small' | 'large'
export type Role = 'member' | 'admin' | 'superadmin'
export type Visibility = 'public' | 'members' | 'author'
export type ArticleStatus = 'draft' | 'published' | 'hidden' | 'deleted'
export type CommentStatus = 'visible' | 'deleted' | 'hidden'
export type ReactionKind = 'laugh' | 'heart' | 'thumb' | 'fire'
export const REACTION_KINDS: readonly ReactionKind[] = ['laugh', 'heart', 'thumb', 'fire']
export type NotificationKind = 'comment' | 'reply' | 'reaction' | 'message' | 'moderation'
export type FeedMode = 'fresh' | 'popular' | 'mine' | `topic:${string}`

export type SeedUser = {
  key: string
  id: string
  public_number: number
  /** Идентификатор Google (`sub`): тот же читает mock-google. */
  sub: string
  email: string
  display_name: string
  role: Role
  can_publish: boolean
  restricted_at: Date | null
  created_at: Date
  /** Фото для `picture` mock-google и аватара профиля. */
  avatar_url: string
}

export type SeedProfile = {
  user_id: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  cover_url: string | null
  slug: string | null
}

export type SeedTopic = {
  key: string
  id: string
  title: string
  description: string | null
  avatar_url: string | null
  cover_url: string | null
  slug: string
  status: 'active' | 'archived'
  position: number
}

export type SeedSlug = { slug: string; owner_type: 'profile' | 'topic' | 'article'; owner_id: string }

export type SeedSettings = {
  name: string
  logo_url: string | null
  locale: 'ru' | 'en' | 'sr'
  about: string
  registration_open: boolean
  new_members_can_publish: boolean
}

export type EditorBlock = { id?: string; type: string; data: Record<string, unknown> }
export type EditorDocument = { time: number; blocks: EditorBlock[]; version: string }

export type SeedArticle = {
  key: string
  id: string
  author_id: string
  topic_id: string
  title: string
  slug: string
  blocks: EditorDocument
  visibility: Visibility
  comments_enabled: boolean
  status: ArticleStatus
  published_at: Date | null
  created_at: Date
  updated_at: Date
  excerpt: string
  first_image_url: string | null
  /** Текст для полнотекстового вектора: заголовок и текст блоков. */
  search_text: string
}

export type SeedPromotion = { article_id: string; confirmed_at: Date; until: Date }
export type SeedFollow = { follower_id: string; target_type: 'user' | 'topic'; target_id: string; created_at: Date }
export type SeedReport = { id: string; article_id: string; reporter_id: string; created_at: Date; status: 'open' | 'reviewed' }
export type SeedBookmark = { user_id: string; article_id: string; created_at: Date }

export type SeedComment = {
  key: string
  id: string
  article_id: string
  author_id: string
  parent_id: string | null
  body: string
  status: CommentStatus
  edited_at: Date | null
  created_at: Date
}

export type SeedReaction = {
  user_id: string
  target_type: 'article' | 'comment'
  target_id: string
  kind: ReactionKind
  created_at: Date
}

export type SeedView = { article_id: string; viewer_key: string; counted_at: Date }
export type SeedFeedSeen = { viewer_key: string; feed_key: FeedMode; article_id: string; seen_at: Date }

export type SeedNotification = {
  id: string
  user_id: string
  kind: NotificationKind
  article_id: string | null
  comment_id: string | null
  conversation_id: string | null
  read_at: Date | null
  created_at: Date
}

export type SeedConversation = { id: string; user_low_id: string; user_high_id: string; last_message_at: Date }

export type SeedMessage = {
  id: string
  conversation_id: string
  sender_id: string
  body: string
  created_at: Date
  read_at: Date | null
}

export type SeedFile = {
  id: string
  object_name: string
  uploader_id: string
  kind: 'image' | 'attachment'
  mime: string
  url: string
}

export type ArticleDerived = {
  reaction_counts: Record<ReactionKind, number>
  reaction_count: number
  comment_count: number
  view_count: number
  bookmark_count: number
  top_comment: { id: string; author_id: string; body: string; reaction_count: number; reply_count: number } | null
}

export type CommentDerived = { reaction_count: number; reply_count: number }

export type Badges = { first_post: boolean; ten_reactions: boolean; one_year: boolean }

export type Derived = {
  articles: Map<string, ArticleDerived>
  comments: Map<string, CommentDerived>
  reputation: Map<string, number>
  badges: Map<string, Badges>
}

export type Dataset = {
  profile: SeedProfileName
  anchor: Date
  options: SeedOptions
  users: SeedUser[]
  profiles: SeedProfile[]
  topics: SeedTopic[]
  slugs: SeedSlug[]
  settings: SeedSettings
  articles: SeedArticle[]
  promotions: SeedPromotion[]
  follows: SeedFollow[]
  reports: SeedReport[]
  bookmarks: SeedBookmark[]
  comments: SeedComment[]
  reactions: SeedReaction[]
  views: SeedView[]
  feed_seen: SeedFeedSeen[]
  notifications: SeedNotification[]
  conversations: SeedConversation[]
  messages: SeedMessage[]
  files: SeedFile[]
  derived: Derived
}

/** Всё, что строит профиль, до расчёта производных значений. */
export type DatasetBody = Omit<Dataset, 'derived' | 'profile' | 'anchor' | 'options'>
