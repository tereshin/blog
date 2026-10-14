import type { QueryClient } from '@tanstack/react-query'

// A request started before a mutation must not replace its optimistic or confirmed state.
const FOLLOW_VERSIONS = new WeakMap<QueryClient, Map<string, number>>()

export function followVersion(client: QueryClient, type: string, id: string): number {
  return FOLLOW_VERSIONS.get(client)?.get(`${type}:${id}`) ?? 0
}

export function advanceFollowVersion(client: QueryClient, type: string, id: string): void {
  let values = FOLLOW_VERSIONS.get(client)
  if (!values) {
    values = new Map()
    FOLLOW_VERSIONS.set(client, values)
  }
  values.set(`${type}:${id}`, followVersion(client, type, id) + 1)
}
