/** Результат операции, которая может предсказуемо не удаться. */
export type Result<T, E> = { ok: true; data: T } | { ok: false; error: E }

export function ok<T>(data: T): { ok: true; data: T } {
  return { ok: true, data }
}

export function fail<E>(error: E): { ok: false; error: E } {
  return { ok: false, error }
}
