import { SlugInvalidError, SlugReservedError, SlugTakenError } from './slug.errors.ts'
import type { SlugOwnerType, SlugRepositoryPort } from './slug.types.ts'

/** 3–40 символов: `a–z`, цифры и дефис, дефис не с краю. */
export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/

/** Служебные сегменты адресов из `contracts/sections.md`. */
export const RESERVED_SLUGS: readonly string[] = [
  'popular', 'feed', 'messages', 'discovery', 'rating', 'bookmarks', 'search', 'write', 'admin', 'api', 'auth', 't', 'p', 'u',
]

/** Проверка без обращения к базе: форма, затем служебный список. */
export function validateSlug(slug: string): void {
  if (!SLUG_PATTERN.test(slug)) {
    // Служебные слова из одной-двух букв (`t`, `p`, `u`) короче минимума: говорим про них честно.
    if (RESERVED_SLUGS.includes(slug)) throw new SlugReservedError(slug)
    throw new SlugInvalidError(slug)
  }
  if (RESERVED_SLUGS.includes(slug)) throw new SlugReservedError(slug)
}

export class SlugService<TTx> {
  constructor(private readonly repository: SlugRepositoryPort<TTx>) {}

  /**
   * Занимает адрес для владельца. Повтор тем же владельцем — не ошибка.
   * При отказе ничего не меняется: прежний адрес владельца остаётся нетронутым.
   */
  async reserveSlug(tx: TTx, slug: string, owner_type: SlugOwnerType, owner_id: string): Promise<void> {
    validateSlug(slug)
    if (await this.repository.insert(tx, slug, owner_type, owner_id)) return
    const owner = await this.repository.findOwner(tx, slug)
    if (owner?.owner_type === owner_type && owner.owner_id === owner_id) return
    throw new SlugTakenError(slug)
  }

  /** Освобождает все адреса владельца (удаление темы, обнуление адреса профиля). */
  async releaseSlug(tx: TTx, owner_type: SlugOwnerType, owner_id: string): Promise<void> {
    await this.repository.deleteByOwner(tx, owner_type, owner_id)
  }

  /** Смена адреса: сначала занимаем новый, и только после успеха освобождаем прежний. */
  async replaceSlug(tx: TTx, new_slug: string, owner_type: SlugOwnerType, owner_id: string): Promise<void> {
    await this.reserveSlug(tx, new_slug, owner_type, owner_id)
    await this.repository.deleteByOwner(tx, owner_type, owner_id, new_slug)
  }

  /** Выбор свободного адреса: `choose` получает проверку «занят, служебный или не по форме». */
  async pickFree(tx: TTx, choose: (is_unavailable: (slug: string) => boolean) => string): Promise<string> {
    const taken = new Set(await this.repository.listAll(tx))
    return choose((slug) => taken.has(slug) || RESERVED_SLUGS.includes(slug) || !SLUG_PATTERN.test(slug))
  }
}
