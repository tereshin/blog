import type { ReactNode } from 'react'
import { useT } from '@/shared/i18n'
import { Button, Card, EmptyState } from '@/shared/ui'

type SortProps = { sort: 'fresh' | 'popular'; onChange: (sort: 'fresh' | 'popular') => void }

function Sort({ sort, onChange }: SortProps) {
  const { t } = useT()
  return (
    <div className="flex justify-center gap-2 py-3" role="group" aria-label={t('profile.sort.fresh')}>
      <Button variant={sort === 'fresh' ? 'primary' : 'ghost'} aria-pressed={sort === 'fresh'} onPress={() => onChange('fresh')}>
        {t('profile.sort.fresh')}
      </Button>
      <Button variant={sort === 'popular' ? 'primary' : 'ghost'} aria-pressed={sort === 'popular'} onPress={() => onChange('popular')}>
        {t('profile.sort.popular')}
      </Button>
    </div>
  )
}

function Reach({ children }: { children?: ReactNode }) {
  if (!children) return null
  return <div className="px-4 pt-4">{children}</div>
}

function Items({ children, empty }: { children: ReactNode; empty?: string }) {
  const is_empty = children === null || children === false || (Array.isArray(children) && children.length === 0)
  if (is_empty && empty) return <EmptyState title={empty} />
  return <ul className="flex flex-col">{children}</ul>
}

function Root({ children }: { children: ReactNode }) {
  return <Card>{children}</Card>
}

export const ProfileListCard = Object.assign(Root, { Sort, Reach, Items })
