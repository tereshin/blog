import { Menu, MenuItem } from 'react-aria-components/Menu'
import { useT } from '@/shared/i18n'
import { Avatar, Button } from '@/shared/ui'
import type { useCommentMentions } from '../model/useCommentMentions.ts'

type CommentMentionSuggestionsProps = {
  mention: ReturnType<typeof useCommentMentions>
  author_id: string | undefined
}

/** React Aria keeps virtual focus in the textarea while navigating suggestions. */
export function CommentMentionSuggestions({ mention, author_id }: CommentMentionSuggestionsProps) {
  const { t } = useT()
  if (!mention.is_open) return null
  return (
    <div className="comment-mentions" onMouseDown={(event) => event.preventDefault()}>
      <Menu
        aria-label={t('comment.add_mention')}
        className="comment-mentions__list"
        items={mention.suggestions}
        onAction={(key) => {
          const user = mention.suggestions.find((item) => item.user_id === key)
          if (user) mention.select(user)
        }}
        renderEmptyState={() => (
          <p role="status" className="px-3 py-2 text-sm text-muted">
            {mention.query.isFetching
              ? t('common.loading')
              : mention.query.isError
                ? t('error.unknown')
                : t('comment.members_empty')}
          </p>
        )}
      >
        {(user) => (
          <MenuItem
            id={user.user_id}
            aria-label={user.display_name}
            textValue={user.display_name}
            className="comment-mentions__item"
          >
            <Avatar size="sm" name={user.display_name} src={user.avatar_url} />
            <div className="min-w-0">
              <div className="truncate font-medium text-accent">{user.display_name}</div>
              {user.slug ? (
                <div className="text-xs text-muted">{user.slug}</div>
              ) : user.user_id === author_id ? (
                <div className="text-xs text-muted">{t('comment.article_author')}</div>
              ) : null}
            </div>
          </MenuItem>
        )}
      </Menu>
      {mention.query.isError ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onPress={() => void mention.query.refetch()}
        >
          {t('common.retry')}
        </Button>
      ) : null}
    </div>
  )
}
