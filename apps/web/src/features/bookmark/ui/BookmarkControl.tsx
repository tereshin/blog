import { BookmarkButton } from './BookmarkButton.tsx'
import { useBookmark } from '../model/useBookmark.ts'

type BookmarkControlProps = { article_id: string; slug: string; count: number; is_bookmarked: boolean }

export function BookmarkControl(props: BookmarkControlProps) {
  const { toggle, is_pending } = useBookmark(props)
  return <BookmarkButton count={props.count} is_bookmarked={props.is_bookmarked} onToggle={toggle} is_pending={is_pending} />
}
