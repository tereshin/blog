import type { Connection } from './events.types.ts'

const MAX_CONNECTIONS_PER_VIEWER = 5

/** Реестр открытых потоков этой реплики: по `connection_id` и по статье. */
export class SubscriptionRegistry {
  private readonly connections = new Map<string, Connection>()
  private readonly by_article = new Map<string, Set<string>>()

  get size(): number {
    return this.connections.size
  }

  add(connection: Connection): void {
    const same_viewer = [...this.connections.values()].filter((item) => item.viewer.viewer_key === connection.viewer.viewer_key)
    // Лишние вкладки не копятся: самый старый поток закрывается.
    while (same_viewer.length >= MAX_CONNECTIONS_PER_VIEWER) same_viewer.shift()?.close()
    this.connections.set(connection.id, connection)
  }

  get(connection_id: string): Connection | undefined {
    return this.connections.get(connection_id)
  }

  remove(connection_id: string): void {
    const connection = this.connections.get(connection_id)
    if (!connection) return
    this.unindex(connection)
    this.connections.delete(connection_id)
  }

  /** Заменяет подписки соединения целиком: клиент присылает полный текущий набор. */
  replace(connection: Connection, next: { article_ids: string[]; conversation_ids: string[]; feed_key: string | null; notifications: boolean }): void {
    this.unindex(connection)
    connection.article_ids = new Set(next.article_ids)
    connection.conversation_ids = new Set(next.conversation_ids)
    connection.feed_key = next.feed_key
    connection.notifications = next.notifications
    for (const article_id of connection.article_ids) {
      let ids = this.by_article.get(article_id)
      if (!ids) this.by_article.set(article_id, (ids = new Set()))
      ids.add(connection.id)
    }
  }

  /** Снимает статью с соединения: следующие кадры этой статьи ему не уходят. */
  dropArticle(connection_id: string, article_id: string): void {
    const connection = this.connections.get(connection_id)
    if (!connection) return
    connection.article_ids.delete(article_id)
    const ids = this.by_article.get(article_id)
    if (!ids) return
    ids.delete(connection_id)
    if (ids.size === 0) this.by_article.delete(article_id)
  }

  forArticle(article_id: string): Connection[] {
    const ids = this.by_article.get(article_id)
    if (!ids) return []
    return [...ids].flatMap((id) => this.connections.get(id) ?? [])
  }

  forUser(user_id: string): Connection[] {
    return [...this.connections.values()].filter((item) => item.viewer.user_id === user_id)
  }

  all(): Connection[] {
    return [...this.connections.values()]
  }

  private unindex(connection: Connection): void {
    for (const article_id of connection.article_ids) {
      const ids = this.by_article.get(article_id)
      if (!ids) continue
      ids.delete(connection.id)
      if (ids.size === 0) this.by_article.delete(article_id)
    }
  }
}
