import type { ReactionAppearance, ReactionCatalogRepositoryPort } from './reaction-catalog.types.ts'

export class ReactionCatalogService<TTx> {
  constructor(private readonly repository: ReactionCatalogRepositoryPort<TTx>) {}

  /** Конверт без каталога прежний набор не затирает. */
  async applyAppearances(tx: TTx, appearances: readonly ReactionAppearance[] | undefined): Promise<void> {
    if (!appearances) return
    const active = appearances.filter((item) => item.status === 'active').map((item) => item.kind)
    await this.repository.replaceActiveKinds(tx, active)
  }

  isActiveKind(tx: TTx, kind: string): Promise<boolean> {
    return this.repository.isActiveKind(tx, kind)
  }
}
