import { useT } from '@/shared/i18n'
import { Card, Skeleton } from '@/shared/ui'

const PLACEHOLDER_KEYS = ['a', 'b', 'c'] as const

/** Заготовка центра зависит от раздела: лента, статья или две карточки профиля. */
export type CenterSkeletonKind = 'feed' | 'article' | 'profile'

type CenterSkeletonProps = { kind?: CenterSkeletonKind }

function FeedSkeleton() {
  return (
    <>
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
    </>
  )
}

function ArticleSkeleton() {
  return (
    <>
      <Card>
        <Card.Content className="flex flex-col gap-3">
          <Skeleton shape="line" className="h-8 w-2/3" />
          <Skeleton shape="line" className="w-full" />
          <Skeleton shape="line" className="w-11/12" />
          <Skeleton shape="block" />
        </Card.Content>
      </Card>
      <Card>
        <Card.Content className="flex flex-col gap-3">
          <Skeleton shape="line" className="h-11 w-full" />
          <Skeleton shape="line" className="w-full" />
        </Card.Content>
      </Card>
    </>
  )
}

function ProfileSkeleton() {
  return (
    <>
      <Card>
        <Skeleton shape="block" className="h-36 w-full rounded-none" />
        <Card.Content className="flex flex-col gap-3">
          <Skeleton shape="circle" className="size-16" />
          <Skeleton shape="line" className="h-6 w-40" />
          <Skeleton shape="line" className="w-2/3" />
        </Card.Content>
      </Card>
      <Card>
        <Card.Content className="flex flex-col gap-3">
          <Skeleton shape="line" className="h-5 w-1/2" />
          <Skeleton shape="block" />
        </Card.Content>
      </Card>
    </>
  )
}

/** Серые заготовки той же ширины, что и содержимое раздела. */
export function CenterSkeleton({ kind = 'feed' }: CenterSkeletonProps) {
  const { t } = useT()
  return (
    <div role="status" aria-label={t('shell.center.loading')} className="flex flex-col gap-3 px-4 py-4 min-[768px]:px-0 min-[768px]:pt-0">
      {kind === 'article' ? <ArticleSkeleton /> : null}
      {kind === 'profile' ? <ProfileSkeleton /> : null}
      {kind === 'feed' ? <FeedSkeleton /> : null}
    </div>
  )
}
