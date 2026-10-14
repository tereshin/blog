const HEROUI_IMAGE = 'https://img.heroui.chat/image'

/** Портретов на сервисе двенадцать. Пол по `u` не чередуется: портрет участника подбирается по картинке. */
export const AVATAR_COUNT = 12

export const PHOTO_KINDS = [
  'landscape', 'places', 'ai', 'food', 'sports', 'book', 'fashion', 'movie', 'game', 'dashboard', 'furniture', 'album', 'finance',
] as const

export type PhotoKind = (typeof PHOTO_KINDS)[number]

/** Квадратный портрет. `index` берётся по модулю 12. */
export function avatarUrl(index: number): string {
  return `${HEROUI_IMAGE}/avatar?w=400&h=400&u=${mod(index, AVATAR_COUNT)}`
}

/** Фото или абстрактный кадр. У этих категорий уникальны `u` от 0 до 10. */
export function photoUrl(kind: PhotoKind, index: number, width = 1200, height = 750): string {
  return `${HEROUI_IMAGE}/${kind}?w=${width}&h=${height}&u=${mod(index, 11)}`
}

function mod(index: number, size: number): number {
  return ((index % size) + size) % size
}
