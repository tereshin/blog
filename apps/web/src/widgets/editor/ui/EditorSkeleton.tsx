import { Skeleton } from '@/shared/ui'

/** Заготовка, пока бандл Editor.js ещё не приехал. */
export function EditorSkeleton() {
  return (
    <div className="flex flex-col gap-3 py-2" aria-hidden="true">
      <Skeleton shape="line" className="w-2/3" />
      <Skeleton shape="line" />
      <Skeleton shape="line" className="w-5/6" />
      <Skeleton shape="block" />
    </div>
  )
}
