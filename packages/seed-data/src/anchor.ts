export const DAY_MS = 24 * 60 * 60 * 1000

export type ResolveAnchorInput = {
  /** Якорь, уже записанный в `seed_runs` этой базы. */
  recorded?: Date | null | undefined
  /** Значение флага `--anchor=<ISO>`. */
  flag?: string | undefined
  now: Date
}

export class AnchorConflictError extends Error {
  constructor(recorded: Date, requested: Date) {
    super(
      `Якорь времени уже записан (${recorded.toISOString()}) и отличается от запрошенного (${requested.toISOString()}). ` +
        'Чтобы сменить якорь, очистите тома.',
    )
    this.name = 'AnchorConflictError'
  }
}

function parseFlag(flag: string): Date {
  const date = new Date(flag)
  if (Number.isNaN(date.getTime())) throw new Error(`Некорректный --anchor: ${flag}`)
  return date
}

export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

/**
 * Якорь времени seed: записанный в базе, иначе `--anchor`, иначе начало суток UTC.
 * Явный `--anchor`, не совпадающий с записанным, — отказ (large после small с другим якорем).
 */
export function resolveAnchor(input: ResolveAnchorInput): Date {
  const requested = input.flag ? parseFlag(input.flag) : null
  if (input.recorded) {
    if (requested && requested.getTime() !== input.recorded.getTime()) {
      throw new AnchorConflictError(input.recorded, requested)
    }
    return input.recorded
  }
  return requested ?? startOfUtcDay(input.now)
}

/** Момент времени относительно якоря: все даты seed считаются только так. */
export function at(anchor: Date, offset_ms: number): Date {
  return new Date(anchor.getTime() + offset_ms)
}

/** Фиксированные смещения от якоря (мс) для состояний, зависящих от времени. */
export const ANCHOR_OFFSETS = {
  /** «Действующее» продвижение: подтверждено 4 суток назад, заканчивается через 3. */
  promotion_active_confirmed_at: -4 * DAY_MS,
  promotion_active_until: 3 * DAY_MS,
  /** «Истёкшее» продвижение: срок вышел за 2 суток до якоря. */
  promotion_expired_confirmed_at: -9 * DAY_MS,
  promotion_expired_until: -2 * DAY_MS,
  /** Участник со знаком «Год на площадке» появился за 400 суток до якоря. */
  member_one_year_created_at: -400 * DAY_MS,
  /** Новичок появился за сутки до якоря. */
  member_newcomer_created_at: -1 * DAY_MS,
} as const
