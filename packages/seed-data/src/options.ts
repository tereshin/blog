/** Что seed берёт из окружения, а не из данных: адреса файлов и почта суперадминистратора. */
export type SeedOptions = {
  /** Базовый адрес публичных файлов (без завершающего `/`): `${media_base_url}/seed/<имя>.png`. */
  media_base_url: string
  /** Почта суперадминистратора окружения (`SUPERADMIN_EMAIL`). */
  superadmin_email: string
}

export const DEFAULT_SEED_OPTIONS: SeedOptions = {
  media_base_url: 'http://localhost:9000/blog-media',
  superadmin_email: 'superadmin@blog.test',
}

export function mediaUrl(options: SeedOptions, object_name: string): string {
  return `${options.media_base_url.replace(/\/$/, '')}/${object_name}`
}
