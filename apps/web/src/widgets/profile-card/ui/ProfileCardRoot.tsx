import type { ReactNode } from 'react'
import { IdentityHeader } from '@/shared/ui'

type ProfileCardRootProps = { children: ReactNode }

export function ProfileCardRoot({ children }: ProfileCardRootProps) {
  return <IdentityHeader>{children}</IdentityHeader>
}
