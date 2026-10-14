export type SlugOwnerType = 'profile' | 'topic' | 'article'

/** Порт реестра адресов. Резервирование адреса всегда выполняется в транзакции владельца (`TTx`). */
export type SlugRepositoryPort<TTx> = {
  /** Пытается занять адрес. `true` — занят этим вызовом, `false` — строка уже была. */
  insert: (tx: TTx, slug: string, owner_type: SlugOwnerType, owner_id: string) => Promise<boolean>
  findOwner: (tx: TTx, slug: string) => Promise<{ owner_type: SlugOwnerType; owner_id: string } | null>
  /** Освобождает адреса владельца, кроме `keep`. */
  deleteByOwner: (tx: TTx, owner_type: SlugOwnerType, owner_id: string, keep?: string) => Promise<void>
  listAll: (tx: TTx) => Promise<string[]>
}
