import { useId, useLayoutEffect, useRef, useState } from 'react'
import { memberMutationBlock, useViewer } from '@/entities/session'
import { useT } from '@/shared/i18n'
import { BaseIcon, Button, Menu } from '@/shared/ui'
import { CommentAttachments } from './CommentAttachments.tsx'
import { CommentExtras } from './CommentExtras.tsx'
import { useCommentExtras } from '../model/useCommentExtras.ts'
import { useCommentDrafts } from '../model/useCommentDrafts.ts'
import { useSendComment } from '../model/useSendComment.ts'

type ReplyTarget = { id: string; name: string }

type CommentFormProps = {
  article_id: string
  comments_enabled: boolean
  parent: ReplyTarget | null
  onCancelReply: () => void
  onSent: () => void
  requireSession: (action: () => void) => void
}

const COMMENT_EMOJI = ['😀', '😂', '❤️', '👍', '🔥', '🎉', '🤔', '🙏']

/** Компактное поле раскрывается при вводе; черновик и семантика textarea сохраняются. */
export function CommentForm({
  article_id,
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
  const field_ref = useRef<HTMLTextAreaElement>(null)
  const hint_id = useId()
  const is_expanded =
    is_focused ||
    draft.text.length > 0 ||
    Boolean(parent) ||
    extras.media.length > 0 ||
    extras.mentions.length > 0
  const send = useSendComment(article_id, (sent_parent) => {
    draft.clear()
    extras.clear()
    if (sent_parent) onSent()
  })
  useLayoutEffect(() => {
    const field = field_ref.current
    if (!field) return
    field.style.height = 'auto'
    field.style.height = `${Math.min(field.scrollHeight, 240)}px`
  }, [draft.text, is_expanded])

  if (!comments_enabled) return null
  const block = memberMutationBlock(viewer)
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
    requireSession(() =>
      send.send(draft.text.trim(), parent?.id ?? null, {
        media: extras.media,
        mentions: extras.mentions,
      }),
    )
  }
  const insertEmoji = (emoji: string) => {
    const field = field_ref.current
    const start = field?.selectionStart ?? draft.text.length
    const end = field?.selectionEnd ?? start
    const text = `${draft.text.slice(0, start)}${emoji}${draft.text.slice(end)}`
    if (text.length > 5000) return
    draft.update(text)
    requestAnimationFrame(() => {
      field?.focus()
      field?.setSelectionRange(start + emoji.length, start + emoji.length)
    })
  }

  return (
    <form
      className="comment-composer flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <div
        className={`border border-transparent bg-surface-secondary transition-colors focus-within:border-accent/40 focus-within:ring-2 focus-within:ring-accent/10 ${is_expanded ? 'rounded-2xl' : 'rounded-[28px]'}`}
        onFocus={() => setFocused(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
        }}
      >
        {parent ? (
          <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2">
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
        <div className="flex items-start gap-2 px-4 py-3">
          <textarea
            ref={field_ref}
            value={draft.text}
            maxLength={5000}
            rows={is_expanded ? 3 : 1}
            autoFocus={Boolean(parent)}
            placeholder={t('comment.placeholder')}
            aria-label={field_label}
            aria-describedby={is_expanded ? hint_id : undefined}
            className="min-w-0 flex-1 resize-none border-0 bg-transparent py-1 text-[15px] leading-6 text-foreground outline-none placeholder:text-muted focus-visible:outline-none"
            onChange={(event) => draft.update(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === 'Enter' &&
                (event.ctrlKey || event.metaKey) &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault()
                submit()
              }
            }}
          />
          <CommentExtras extras={extras} authorize={requireSession} />
          <Menu>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              isIconOnly
              className="shrink-0 text-muted"
              aria-label={t('comment.add_emoji')}
            >
              <BaseIcon name="happy" style="line" size={22} />
            </Button>
            <Menu.Content
              aria-label={t('comment.add_emoji')}
              onAction={(key) => insertEmoji(String(key))}
              className="grid grid-cols-4 gap-1"
            >
              {COMMENT_EMOJI.map((emoji) => (
                <Menu.Item
                  key={emoji}
                  id={emoji}
                  textValue={emoji}
                  className="justify-center text-xl"
                >
                  {emoji}
                </Menu.Item>
              ))}
            </Menu.Content>
          </Menu>
        </div>
        <CommentAttachments extras={extras} />
        {is_expanded ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 px-4 py-3">
            <div id={hint_id} className="text-xs text-muted">
              <span className="hidden sm:inline">{t('comment.send_hint')} · </span>
              {t('comment.counter', { count: draft.text.length })}
            </div>
            <Button type="submit" variant="primary" size="sm" isDisabled={!can_send}>
              <BaseIcon name="send_plane" style="line" size={16} />
              {send.is_pending
                ? t('comment.sending')
                : send.error
                  ? t('comment.retry')
                  : t('comment.send')}
            </Button>
          </div>
        ) : null}
      </div>
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
