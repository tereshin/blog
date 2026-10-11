import type { SocialCoverInput } from '@blog/contracts'
import type { ObjectStore } from '../media/index.ts'

/** Resolve keys only inside the configured bucket, never fetch an author-supplied URL. */
export function ownedObjectKey(value: string, public_url: string): string | null {
  try {
    const url = new URL(value)
    const base = new URL(public_url.replace(/\/$/, '') + '/')
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname) || url.search || url.hash) return null
    const key = decodeURIComponent(url.pathname.slice(base.pathname.length))
    if (!/^(uploads|seed)\//.test(key) || key.includes('..') || key.includes('\\') || Array.from(key).some((char) => char.charCodeAt(0) < 32)) return null
    return key
  } catch { return null }
}

export async function coverAssets(input: SocialCoverInput, store: ObjectStore, public_url: string): Promise<{ background?: Uint8Array<ArrayBuffer>; logo?: Uint8Array<ArrayBuffer> }> {
  const read = async (url: string | null) => {
    const key = url ? ownedObjectKey(url, public_url) : null
    return key && store.get ? await store.get({ key, max_bytes: 8 * 1024 * 1024 }) : null
  }
  const [background, logo] = await Promise.all([read(input.settings.background_mode === 'image' ? input.image_url : null), read(input.settings.logo_url)])
  return { ...(background ? { background: new Uint8Array(background) } : {}), ...(logo ? { logo: new Uint8Array(logo) } : {}) }
}
