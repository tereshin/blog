import { Navigate, useLocation } from 'react-router'

type DiscoveryRedirectProps = { to: string }

export function DiscoveryRedirect({ to }: DiscoveryRedirectProps) {
  const { search, hash } = useLocation()
  return <Navigate replace to={to + search + hash} />
}
