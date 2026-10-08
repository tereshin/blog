/** Репутация не опускается ниже нуля: `0` без плюса, иначе `+N`. */
export function formatReputation(value: number): string {
  const safe = Math.max(0, Math.trunc(value))
  return safe === 0 ? '0' : `+${safe}`
}
