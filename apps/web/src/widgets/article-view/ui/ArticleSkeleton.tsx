import { Card, Skeleton } from '@/shared/ui'

/** Заготовка статьи: карточка текста и карточка обсуждения, пока текст не пришёл. */
export function ArticleSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      <Card className="gap-0">
        <div className="flex flex-col gap-3 px-5 py-4">
          <div className="flex items-center gap-3">
            <Skeleton shape="circle" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-48 w-full" />
        </div>
      </Card>
      <Card className="gap-0">
        <div className="flex flex-col gap-3 px-5 py-4">
          <Skeleton className="h-11 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full" />
        </div>
      </Card>
    </div>
  )
}
