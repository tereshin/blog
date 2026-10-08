import { Skeleton } from '@/shared/ui'

/** Заготовка статьи: те же зоны, что у готовой страницы, пока текст не пришёл. */
export function ArticleSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4" aria-hidden="true">
      <div className="flex items-center gap-3">
        <Skeleton shape="circle" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="h-7 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-48 w-full" />
    </div>
  )
}
