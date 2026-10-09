import type { ArticleCardModel, FeedPageModel } from './article-types.ts'

type InfiniteFeed = { pages: FeedPageModel[]; pageParams: unknown[] }

function isInfinite(data: object): data is InfiniteFeed {
  return 'pages' in data && Array.isArray(data.pages)
}

function isPage(data: object): data is FeedPageModel {
  return 'items' in data && 'next_cursor' in data && Array.isArray(data.items)
}

/** Обходит кэш ленты (бесконечный список и первую порцию) и возвращает новый объект, если карточка изменилась. */
export function mapFeedCards(data: unknown, map_card: (card: ArticleCardModel) => ArticleCardModel): unknown {
  if (!data || typeof data !== 'object') return data
  if (isInfinite(data)) {
    return { ...data, pages: data.pages.map((page) => ({ ...page, items: page.items.map(map_card) })) }
  }
  if (isPage(data)) return { ...data, items: data.items.map(map_card) }
  return data
}

/**
 * Перечитывание `GET /v1/articles?ids=` обновляет вернувшиеся карточки.
 * Запрошенная, но не вернувшаяся карточка из ленты уходит: зритель больше её не видит.
 */
export function syncFeedCards(
  data: unknown,
  requested_ids: ReadonlySet<string>,
  returned: ReadonlyMap<string, ArticleCardModel>,
): unknown {
  const apply = (items: ArticleCardModel[]): ArticleCardModel[] =>
    items.flatMap((card) => {
      if (!requested_ids.has(card.id)) return [card]
      const next = returned.get(card.id)
      return next ? [next] : []
    })
  if (!data || typeof data !== 'object') return data
  if (isInfinite(data)) return { ...data, pages: data.pages.map((page) => ({ ...page, items: apply(page.items) })) }
  if (isPage(data)) return { ...data, items: apply(data.items) }
  return data
}
