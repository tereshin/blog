import type { ReactNode } from 'react'
import { NearEndSentinel } from './NearEndSentinel.tsx'

type PlainFeedListProps = {
  article_ids: readonly string[]
  renderItem: (article_id: string) => ReactNode
  onNearEnd: () => void
}

const NEAR_END_RATIO = 0.8

/** Обычный список: до порога виртуализации все карточки в DOM. */
export function PlainFeedList({ article_ids, renderItem, onNearEnd }: PlainFeedListProps) {
  const sentinel_index = Math.max(0, Math.floor(article_ids.length * NEAR_END_RATIO) - 1)
  // Вторая метка в самом конце ловит прыжок через список (клавиша End): наблюдатель срабатывает только при пересечении.
  return (
    <>
      <ol className="flex flex-col gap-4">
        {article_ids.map((article_id, index) => (
          <li key={article_id}>
            {renderItem(article_id)}
            {index === sentinel_index ? <NearEndSentinel onNearEnd={onNearEnd} /> : null}
          </li>
        ))}
      </ol>
      <NearEndSentinel key={article_ids.length} onNearEnd={onNearEnd} />
    </>
  )
}
