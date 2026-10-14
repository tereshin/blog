import type { BadgeDefinition } from '@blog/contracts'

export type BadgeFacts = {
  user_id: string
  reputation: number
  published_posts: number
  created_at: Date
}

/** Порт хранилища бейджей. Выдача идёт в транзакции источника события (`TTx`), откат снимает выдачу. */
export type BadgeRepositoryPort<TTx> = {
  /** Каталог из строки настроек; `null` — каталог не задан. `is_exclusive` берёт блокировку записи. */
  definitions: (tx: TTx, is_exclusive?: boolean) => Promise<BadgeDefinition[] | null>
  hasAwards: (tx: TTx, badge_ids: string[]) => Promise<boolean>
  facts: (tx: TTx, user_ids: string[]) => Promise<BadgeFacts[]>
  award: (tx: TTx, awards: { user_id: string; badge_id: string }[], now: Date) => Promise<void>
}
