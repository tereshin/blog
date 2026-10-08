import { createHash } from 'node:crypto'

/** Фиксированное пространство имён seed: менять нельзя — иначе id всех записей разойдутся. */
export const SEED_NAMESPACE = '6f3c1b5e-8a42-5d1e-9c7a-2b4d6e8f0a13'

function uuidToBytes(uuid: string): Buffer {
  return Buffer.from(uuid.replaceAll('-', ''), 'hex')
}

function bytesToUuid(bytes: Buffer): string {
  const hex = bytes.toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

/** UUIDv5 (RFC 4122, SHA-1) от имени в заданном пространстве имён. */
export function uuidV5(name: string, namespace: string = SEED_NAMESPACE): string {
  const hash = createHash('sha1').update(uuidToBytes(namespace)).update(name, 'utf8').digest()
  const bytes = Buffer.from(hash.subarray(0, 16))
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x50
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80
  return bytesToUuid(bytes)
}

/** Идентификатор записи seed: UUIDv5 от `<сущность>:<ключ>`, например `user:superadmin`, `article:small:017`. */
export function seedId(entity: string, key: string): string {
  return uuidV5(`${entity}:${key}`)
}
