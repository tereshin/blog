import { SlugInvalidError, SlugReservedError, SlugTakenError } from './slug.errors.ts'
import { slugRepository } from './slug.repository.ts'
import type { SlugOwnerType, SlugRepository, SlugTx } from './slug.types.ts'

/** 3–40 символов: `a–z`, цифры и дефис, дефис не с краю. */
export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/

/** Служебные сегменты адресов из `contracts/sections.md`. */
export const RESERVED_SLUGS: readonly string[] = [
  'popular', 'feed', 'messages', 'rating', 'bookmarks', 'search', 'about', 'write', 'admin', 'api', 'auth', 't', 'p', 'u',
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

export function createSlugService(repository: SlugRepository = slugRepository) {
  return {
    /**
     * Занимает адрес для владельца. Повтор тем же владельцем — не ошибка.
     * При отказе ничего не меняется: прежний адрес владельца остаётся нетронутым.
     */
    async reserveSlug(tx: SlugTx, slug: string, owner_type: SlugOwnerType, owner_id: string): Promise<void> {
      validateSlug(slug)
      if (await repository.insert(tx, slug, owner_type, owner_id)) return
      const owner = await repository.findOwner(tx, slug)
      if (owner?.owner_type === owner_type && owner.owner_id === owner_id) return
      throw new SlugTakenError(slug)
    },

    /** Освобождает все адреса владельца (удаление темы, обнуление адреса профиля). */
    async releaseSlug(tx: SlugTx, owner_type: SlugOwnerType, owner_id: string): Promise<void> {
      await repository.deleteByOwner(tx, owner_type, owner_id)
    },

    /** Смена адреса: сначала занимаем новый, и только после успеха освобождаем прежний. */
    async replaceSlug(tx: SlugTx, new_slug: string, owner_type: SlugOwnerType, owner_id: string): Promise<void> {
      await this.reserveSlug(tx, new_slug, owner_type, owner_id)
      await repository.deleteByOwner(tx, owner_type, owner_id, new_slug)
    },
  }
}

export type SlugService = ReturnType<typeof createSlugService>

const defaultService = createSlugService()

export const reserveSlug = defaultService.reserveSlug.bind(defaultService)
export const releaseSlug = defaultService.releaseSlug.bind(defaultService)
export const replaceSlug = defaultService.replaceSlug.bind(defaultService)
