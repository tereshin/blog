import { HttpResponse, http } from 'msw'
import popular_comments from '../fixtures/popular-comments.json'
import settings from '../fixtures/settings.json'
import topics from '../fixtures/topics.json'

/** Данные колонок каркаса: темы (левая карточка) и популярные комментарии (правая). */
export const shellHandlers = [
  http.get('*/v1/topics', () => HttpResponse.json(topics)),
  http.get('*/v1/settings', () => HttpResponse.json(settings)),
  http.get('*/v1/comments/popular', () => HttpResponse.json(popular_comments)),
  http.put('*/v1/events/subscriptions', () => HttpResponse.json({ article_ids: [] })),
]
