import type { ReactNode } from 'react'
import { IdentityHeader } from '@/shared/ui'

type CoverProps = { url: string | null; is_own: boolean; action?: ReactNode }

export function ProfileCover({ url, is_own, action }: CoverProps) {
  return <IdentityHeader.Cover url={url} action={is_own ? action : null} />
}
