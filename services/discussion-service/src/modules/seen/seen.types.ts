export type SeenRepositoryPort = {
  upsert: (input: { viewer_key: string; feed_key: string; article_id: string }) => Promise<void>
  list: (viewer_key: string, feed_key: string, limit: number) => Promise<string[]>
}
