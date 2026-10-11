import { useT } from '@/shared/i18n'
import { formatCount } from '@/shared/lib'
import { ActionButton, BookmarkIcon } from '@/shared/ui'

type BookmarkButtonProps = {
  count: number
  is_bookmarked: boolean
  onToggle: () => void
  is_pending?: boolean
}

/** Иконка закладки и число. `aria-pressed` говорит, сохранена ли статья. */
export function BookmarkButton({ count, is_bookmarked, onToggle, is_pending = false }: BookmarkButtonProps) {
  const { t, locale } = useT()
  return (
    <ActionButton
      aria-pressed={is_bookmarked}
      aria-label={t(is_bookmarked ? 'article.unbookmark' : 'article.bookmark')}
      isDisabled={is_pending}
      onPress={onToggle}
    >
      <span className="action-control__icon"><BookmarkIcon className="size-5" icon_style={is_bookmarked ? 'fill' : 'line'} /></span>
      <span className="text-base">{formatCount(count, locale)}</span>
    </ActionButton>
  )
}
