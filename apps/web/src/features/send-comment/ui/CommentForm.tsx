import { useRef, useState } from 'react'
import { Autocomplete } from 'react-aria-components/Autocomplete'
import { memberMutationBlock, useViewer } from '@/entities/session'
import { useT } from '@/shared/i18n'
import { BaseIcon, Button } from '@/shared/ui'
import { CommentEditor } from './CommentEditor.tsx'
import { CommentAttachments } from './CommentAttachments.tsx'
import { CommentExtras } from './CommentExtras.tsx'
import { CommentMentionSuggestions } from './CommentMentionSuggestions.tsx'
import type { CommentMention } from '../lib/comment-mentions.ts'
import { useCommentExtras } from '../model/useCommentExtras.ts'
import { useCommentDrafts } from '../model/useCommentDrafts.ts'
import { useCommentMentions } from '../model/useCommentMentions.ts'
import { useSendComment } from '../model/useSendComment.ts'

type ReplyTarget = { id: string; name: string }
type CommentFormProps = {
  article_id: string
  author?: CommentMention
  comments_enabled: boolean
  parent: ReplyTarget | null
  onCancelReply: () => void
  onSent: () => void
  requireSession: (action: () => void) => void
}

/** A compact composer expands on focus; mentions are selected inline at the caret. */
export function CommentForm({
  article_id,
  author,
  comments_enabled,
  parent,
  onCancelReply,
  onSent,
  requireSession,
}: CommentFormProps) {
  const { t } = useT()
  const { viewer } = useViewer()
  const extras = useCommentExtras()
  const draft = useCommentDrafts(article_id, parent?.id ?? null)
  const [is_focused, setFocused] = useState(false)
  const field_ref = useRef<HTMLDivElement>(null)
  const block = memberMutationBlock(viewer)
  const mention = useCommentMentions({
    draft,
    field_ref,
    author,
    is_focused,
    can_search: viewer.status === 'member' && block === null,
  })
  const is_expanded =
    is_focused || draft.text.length > 0 || Boolean(parent) || extras.media.length > 0
  const send = useSendComment(article_id, (sent_parent) => {
    draft.clear()
    extras.clear()
    mention.dismiss()
    if (sent_parent) onSent()
  })

  if (!comments_enabled) return null
  if (block === 'restricted')
    return parent ? null : <p className="text-sm text-muted">{t('comment.restricted')}</p>
  const field_label = parent
    ? t('comment.reply_to', { name: parent.name })
    : t('comment.placeholder')
  const can_send =
    draft.text.trim().length > 0 &&
    !send.is_pending &&
    !extras.is_uploading &&
    block !== 'email_unverified'
  const submit = () => {
    if (!can_send) return
    mention.dismiss()
    requireSession(() =>
      send.send(draft.text.trim(), parent?.id ?? null, {
        media: extras.media,
        mentions: mention.mentions,
      }),
    )
  }

  return (
    <form
      className="comment-composer flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <Autocomplete inputValue={draft.text} filter={() => true}>
        <div
          className="comment-composer__control form-control form-control--lg form-control--secondary"
          data-expanded={is_expanded}
          onKeyDownCapture={(event) => {
            if (event.nativeEvent.isComposing) {
              event.stopPropagation()
              return
            }
            if (event.key === 'Escape' && mention.is_open) {
              event.preventDefault()
              event.stopPropagation()
              mention.dismiss()
            }
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
              event.preventDefault()
              event.stopPropagation()
              submit()
            }
          }}
          onFocus={() => setFocused(true)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setFocused(false)
              mention.dismiss()
            }
          }}
        >
          <CommentMentionSuggestions mention={mention} author_id={author?.user_id} />
          {parent ? (
            <div className="comment-composer__reply">
              <BaseIcon
                name="corner_up_right"
                style="line"
                size={16}
                className="shrink-0 text-accent"
              />
              <span className="min-w-0 flex-1 truncate text-xs text-muted">{field_label}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                isIconOnly
                aria-label={t('comment.cancel_reply')}
                onPress={onCancelReply}
              >
                <BaseIcon name="close" style="line" size={16} />
              </Button>
            </div>
          ) : null}
          <CommentEditor
            draft={draft}
            mention={mention}
            field_ref={field_ref}
            label={field_label}
            placeholder={t('comment.input_placeholder')}
            auto_focus={Boolean(parent)}
          />
          <CommentAttachments extras={extras} />
          <div className="comment-composer__toolbar">
            <CommentExtras
              extras={extras}
              authorize={requireSession}
              onMention={mention.start}
              can_mention={mention.mentions.length < 10}
            />
            {is_expanded && draft.text.trim() ? (
              <Button
                type="submit"
                variant="primary"
                isIconOnly
                isDisabled={!can_send}
                className="comment-composer__send"
                aria-label={
                  send.is_pending
                    ? t('comment.sending')
                    : send.error
                      ? t('comment.retry')
                      : t('comment.send')
                }
              >
                {send.is_pending ? (
                  <BaseIcon
                    name="loading"
                    style="line"
                    size={22}
                    className="animate-spin motion-reduce:animate-none"
                  />
                ) : (
                  <BaseIcon name="arrow_up" style="line" size={22} />
                )}
              </Button>
            ) : null}
          </div>
        </div>
      </Autocomplete>
      {block === 'email_unverified' ? (
        <p className="text-sm text-muted">{t('login.email_unverified')}</p>
      ) : null}
      {send.error ? (
        <p role="alert" className="text-sm text-danger">
          {send.error}
        </p>
      ) : null}
    </form>
  )
}
