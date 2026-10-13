import { AppError } from '@blog/errors'

const MESSAGES: Record<string, string> = {
  nav_section_not_found: 'Секция не найдена',
  nav_section_item_not_found: 'Пункт секции не найден',
  nav_section_limit: 'Достигнут предел числа секций',
  nav_section_item_limit: 'Достигнут предел числа пунктов в секции',
  nav_section_order_invalid: 'Порядок должен содержать каждую запись один раз',
  nav_section_page_not_found: 'Страница не найдена',
  validation_error: 'Проверьте заголовок, иконку и адрес',
  idempotency_key_conflict: 'Ключ повторного запроса уже использован для другой операции',
}

export function navError(
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
