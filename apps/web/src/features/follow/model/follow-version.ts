import type { QueryClient } from '@tanstack/react-query'

type FollowRead = { version: number; readers: number }
// Only in-flight reads need mutation versions. Entries are released in queryFn's finally.
const READS_BY_CLIENT = new WeakMap<QueryClient, Map<string, FollowRead>>()

export function beginFollowRead(client: QueryClient, type: string, ids: string[]) {
  let reads = READS_BY_CLIENT.get(client)
  if (!reads) {
    reads = new Map()
    READS_BY_CLIENT.set(client, reads)
  }
  const records = ids.map((id) => {
    const key = `${type}:${id}`
    const state = reads.get(key) ?? { version: 0, readers: 0 }
    state.readers++
    reads.set(key, state)
    return { key, state, version: state.version }
  })
  return {
    isCurrent: (index: number) => {
      const record = records[index]
      return record !== undefined && record.state.version === record.version
    },
    release: () => {
      for (const { key, state } of records) {
        state.readers--
        if (state.readers === 0) reads.delete(key)
      }
      if (reads.size === 0) READS_BY_CLIENT.delete(client)
    },
  }
}

export function advanceFollowVersion(client: QueryClient, type: string, id: string): void {
  const state = READS_BY_CLIENT.get(client)?.get(`${type}:${id}`)
  if (state) state.version++
}
