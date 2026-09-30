export type ContentLanguage = 'en' | 'sr-Latn' | 'ru';

export type FeedArticle = {
  id: string;
  slug: string;
  title: string;
  language: ContentLanguage;
  published_at: string;
  author_id: string;
  category_id: string;
};

export type ArticleCounts = {
  view_count: number;
  like_count: number;
  comment_count: number;
  bookmark_count: number;
};

export type FeedPage = {
  items: FeedArticle[];
  has_next: boolean;
  has_prev: boolean;
  next_cursor: string | null;
};

export type PopularWeights = {
  id: string;
  views_weight: number;
  likes_weight: number;
  comments_weight: number;
  bookmarks_weight: number;
  age_decay: number;
};

export const seed_weights: PopularWeights = {
  id: '018f3c2a-7b10-7c3e-8f21-000000000002',
  views_weight: 1,
  likes_weight: 1,
  comments_weight: 1,
  bookmarks_weight: 1,
  age_decay: 1,
};

export type Caller = {
  user_id: string | null;
  role: 'user' | 'moderator' | 'administrator' | null;
};
