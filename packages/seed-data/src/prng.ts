export type Prng = () => number

/** mulberry32: детерминированный генератор в [0, 1). Случайное в seed — только отсюда. */
export function mulberry32(seed: number): Prng {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Целое в [min, max] включительно. */
export function int(random: Prng, min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1))
}

export function pick<T>(random: Prng, items: readonly T[]): T {
  if (items.length === 0) throw new Error('pick: пустой список')
  return items[int(random, 0, items.length - 1)] as T
}

/** Перемешивание Фишера — Йетса; исходный массив не меняется. */
export function shuffle<T>(random: Prng, items: readonly T[]): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = int(random, 0, index)
    const current = result[index] as T
    result[index] = result[other] as T
    result[other] = current
  }
  return result
}
