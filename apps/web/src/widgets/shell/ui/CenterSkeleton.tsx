import { useT } from '@/shared/i18n'
import { Card, Skeleton } from '@/shared/ui'

const PLACEHOLDER_KEYS = ['a', 'b', 'c'] as const

/** Серые заготовки формы карточек той же ширины, что и настоящие. */
export function CenterSkeleton() {
  const { t } = useT()
  return (
    <div role="status" aria-label={t('shell.center.loading')} className="flex flex-col gap-3 px-4 py-4 min-[1200px]:px-0 min-[1200px]:pt-0">
      {PLACEHOLDER_KEYS.map((key) => (
        <Card key={key}>
          <Card.Content className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Skeleton shape="circle" />
              <Skeleton shape="line" className="w-40" />
            </div>
            <Skeleton shape="line" className="h-6 w-3/4" />
            <Skeleton shape="block" />
          </Card.Content>
        </Card>
      ))}
    </div>
  )
}
