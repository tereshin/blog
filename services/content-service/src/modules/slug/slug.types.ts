import type { Database } from '@blog/broker'

export type SlugOwnerType = 'profile' | 'topic' | 'article'

/** База или транзакция: резервирование адреса всегда выполняется в транзакции владельца. */
export type SlugTx = Database

export type SlugRepository = {
  /** Пытается занять адрес. `true` — занят этим вызовом, `false` — строка уже была. */
  insert: (tx: SlugTx, slug: string, owner_type: SlugOwnerType, owner_id: string) => Promise<boolean>
  findOwner: (tx: SlugTx, slug: string) => Promise<{ owner_type: SlugOwnerType; owner_id: string } | null>
  /** Освобождает адреса владельца, кроме `keep`. */
  deleteByOwner: (tx: SlugTx, owner_type: SlugOwnerType, owner_id: string, keep?: string) => Promise<void>
}
