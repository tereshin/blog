import { createDb } from '@blog/db-kit'
import type { DbHandle } from '@blog/db-kit'

export type { DbHandle }

export function openDatabase(url: string): DbHandle {
  return createDb({ url })
}
