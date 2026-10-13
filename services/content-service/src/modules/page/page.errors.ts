import { AppError } from '@blog/errors'
const MESSAGES: Record<string, string> = {
  page_not_found: 'Страница не найдена',
  page_slug_taken: 'Этот адрес уже занят',
  page_version_conflict: 'Страница изменена другим редактором',
  page_slug_locked: 'Адрес закреплён после публикации',
  page_not_publishable: 'Добавьте содержание перед публикацией',
  validation_error: 'Проверьте название, адрес и содержание страницы',
  idempotency_key_conflict: 'Ключ повторного запроса уже использован для другой операции',
}
export function pageError(
  code: string,
  http_status: number,
  details?: Record<string, unknown>,
): AppError {
  return new AppError({
    code,
    http_status,
    message: MESSAGES[code] ?? code,
    ...(details ? { details } : {}),
  })
}
