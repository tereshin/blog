export type ReactionAppearance = { kind: string; status: string }

/** Каталог меняется и читается в транзакции потребителя или реакции. */
export type ReactionCatalogRepositoryPort<TTx> = {
  replaceActiveKinds: (tx: TTx, kinds: readonly string[]) => Promise<void>
  isActiveKind: (tx: TTx, kind: string) => Promise<boolean>
}
