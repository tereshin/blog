import type { Dataset } from './types.ts'

export type CoverageRule = {
  entity: string
  /** Значение состояния из таблицы «Покрытие малого набора» (`data-model.md`). */
  value: string
  /** Находит запись набора с этим значением; `undefined` — покрытия нет. */
  find: (data: Dataset) => unknown
}

const HOUR = 3_600_000
const LONG_TEXT = 1200

const articleText = (data: Dataset, id: string): number =>
  data.articles.find((article) => article.id === id)?.search_text.length ?? 0

/** Таблица «Покрытие малого набора» как данные: сущность, состояние, функция поиска записи. */
export const COVERAGE_RULES: readonly CoverageRule[] = [
  { entity: 'Участник', value: 'роль member', find: (d) => d.users.find((u) => u.role === 'member') },
  { entity: 'Участник', value: 'роль admin', find: (d) => d.users.find((u) => u.role === 'admin') },
  { entity: 'Участник', value: 'роль superadmin', find: (d) => d.users.find((u) => u.role === 'superadmin') },
  { entity: 'Участник', value: 'без права публикации', find: (d) => d.users.find((u) => !u.can_publish) },
  { entity: 'Участник', value: 'ограниченный', find: (d) => d.users.find((u) => u.restricted_at !== null) },
  { entity: 'Участник', value: 'создан более года назад', find: (d) => d.users.find((u) => d.anchor.getTime() - u.created_at.getTime() > 365 * 24 * HOUR) },
  { entity: 'Участник', value: 'новый без материалов', find: (d) => d.users.find((u) => u.key === 'newcomer' && !d.articles.some((a) => a.author_id === u.id)) },
  { entity: 'Профиль', value: 'с коротким адресом', find: (d) => d.profiles.find((p) => p.slug !== null) },
  { entity: 'Профиль', value: 'без короткого адреса', find: (d) => d.profiles.find((p) => p.slug === null) },
  { entity: 'Профиль', value: 'с обложкой', find: (d) => d.profiles.find((p) => p.cover_url !== null) },
  { entity: 'Профиль', value: 'без обложки', find: (d) => d.profiles.find((p) => p.cover_url === null) },
  { entity: 'Профиль', value: 'с описанием', find: (d) => d.profiles.find((p) => p.bio !== null) },
  { entity: 'Профиль', value: 'без описания', find: (d) => d.profiles.find((p) => p.bio === null) },
  { entity: 'Тема', value: 'не меньше трёх активных', find: (d) => (d.topics.filter((t) => t.status === 'active').length >= 3 ? d.topics[0] : undefined) },
  { entity: 'Тема', value: 'архивная', find: (d) => d.topics.find((t) => t.status === 'archived') },
  { entity: 'Статья', value: 'draft', find: (d) => d.articles.find((a) => a.status === 'draft') },
  { entity: 'Статья', value: 'published', find: (d) => d.articles.find((a) => a.status === 'published') },
  { entity: 'Статья', value: 'hidden', find: (d) => d.articles.find((a) => a.status === 'hidden') },
  { entity: 'Статья', value: 'deleted', find: (d) => d.articles.find((a) => a.status === 'deleted') },
  { entity: 'Статья', value: 'доступ public', find: (d) => d.articles.find((a) => a.visibility === 'public') },
  { entity: 'Статья', value: 'доступ members', find: (d) => d.articles.find((a) => a.visibility === 'members') },
  { entity: 'Статья', value: 'доступ author', find: (d) => d.articles.find((a) => a.visibility === 'author') },
  { entity: 'Статья', value: 'комментарии включены', find: (d) => d.articles.find((a) => a.comments_enabled) },
  { entity: 'Статья', value: 'комментарии выключены', find: (d) => d.articles.find((a) => !a.comments_enabled) },
  { entity: 'Статья', value: 'с изображением', find: (d) => d.articles.find((a) => a.first_image_url !== null) },
  { entity: 'Статья', value: 'без изображения', find: (d) => d.articles.find((a) => a.first_image_url === null) },
  { entity: 'Статья', value: 'с вложением', find: (d) => d.articles.find((a) => a.blocks.blocks.some((b) => b.type === 'attaches')) },
  { entity: 'Статья', value: 'длинная', find: (d) => d.articles.find((a) => articleText(d, a.id) > LONG_TEXT) },
  { entity: 'Статья', value: 'короткая', find: (d) => d.articles.find((a) => a.status === 'published' && articleText(d, a.id) < 400) },
  { entity: 'Комментарий', value: 'корневой', find: (d) => d.comments.find((c) => c.parent_id === null && c.status === 'visible') },
  { entity: 'Комментарий', value: 'с ответами', find: (d) => d.comments.find((c) => d.comments.some((r) => r.parent_id === c.id)) },
  { entity: 'Комментарий', value: 'ответ', find: (d) => d.comments.find((c) => c.parent_id !== null) },
  { entity: 'Комментарий', value: 'удалённый с ответами', find: (d) => d.comments.find((c) => c.status === 'deleted' && d.comments.some((r) => r.parent_id === c.id)) },
  { entity: 'Комментарий', value: 'скрытый модератором', find: (d) => d.comments.find((c) => c.status === 'hidden') },
  { entity: 'Комментарий', value: 'правленый', find: (d) => d.comments.find((c) => c.edited_at !== null) },
  ...(['laugh', 'heart', 'thumb', 'fire'] as const).flatMap((kind): CoverageRule[] => [
    { entity: 'Реакция', value: `${kind} на статье`, find: (d) => d.reactions.find((r) => r.kind === kind && r.target_type === 'article') },
    { entity: 'Реакция', value: `${kind} на комментарии`, find: (d) => d.reactions.find((r) => r.kind === kind && r.target_type === 'comment') },
  ]),
  { entity: 'Просмотр', value: 'у вошедшего', find: (d) => d.views.find((v) => v.viewer_key.startsWith('user:')) },
  { entity: 'Просмотр', value: 'у гостя', find: (d) => d.views.find((v) => v.viewer_key.startsWith('guest:')) },
  ...(['fresh', 'popular', 'mine', 'topic'] as const).map<CoverageRule>((mode) => ({
    entity: 'Просмотренное в ленте',
    value: `режим ${mode}`,
    find: (d) => d.feed_seen.find((s) => s.feed_key === mode || s.feed_key.startsWith(`${mode}:`)),
  })),
  { entity: 'Просмотренное в ленте', value: 'у гостя', find: (d) => d.feed_seen.find((s) => s.viewer_key.startsWith('guest:')) },
  { entity: 'Подписка', value: 'на автора', find: (d) => d.follows.find((f) => f.target_type === 'user') },
  { entity: 'Подписка', value: 'на тему', find: (d) => d.follows.find((f) => f.target_type === 'topic') },
  { entity: 'Закладка', value: 'на статьи разных авторов', find: (d) => (new Set(d.bookmarks.map((b) => d.articles.find((a) => a.id === b.article_id)?.author_id)).size > 1 ? d.bookmarks[0] : undefined) },
  { entity: 'Продвижение', value: 'действующее', find: (d) => d.promotions.find((p) => p.until > d.anchor) },
  { entity: 'Продвижение', value: 'истёкшее', find: (d) => d.promotions.find((p) => p.until <= d.anchor) },
  { entity: 'Репутация и знаки', value: 'первый пост', find: (d) => [...d.derived.badges.values()].find((b) => b.first_post) },
  { entity: 'Репутация и знаки', value: '10 реакций', find: (d) => [...d.derived.badges.values()].find((b) => b.ten_reactions) },
  { entity: 'Репутация и знаки', value: 'год на площадке', find: (d) => [...d.derived.badges.values()].find((b) => b.one_year) },
  { entity: 'Репутация и знаки', value: 'нулевая репутация', find: (d) => [...d.derived.reputation.entries()].find(([, value]) => value === 0) },
  { entity: 'Жалоба', value: 'на опубликованную статью', find: (d) => d.reports.find((r) => d.articles.find((a) => a.id === r.article_id)?.status === 'published') },
  ...(['comment', 'reply', 'reaction', 'message', 'moderation'] as const).flatMap((kind): CoverageRule[] => [
    { entity: 'Уведомление', value: `${kind} прочитанное`, find: (d) => d.notifications.find((n) => n.kind === kind && n.read_at !== null) },
    { entity: 'Уведомление', value: `${kind} непрочитанное`, find: (d) => d.notifications.find((n) => n.kind === kind && n.read_at === null) },
  ]),
  { entity: 'Диалог и сообщение', value: 'прочитанное сообщение', find: (d) => d.messages.find((m) => m.read_at !== null) },
  { entity: 'Диалог и сообщение', value: 'непрочитанное сообщение', find: (d) => d.messages.find((m) => m.read_at === null) },
  { entity: 'Настройки площадки', value: 'название, логотип, язык, «О проекте», регистрация, право публикации', find: (d) => (d.settings.name && d.settings.logo_url && d.settings.locale && d.settings.about ? d.settings : undefined) },
]
