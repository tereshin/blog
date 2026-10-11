import { useState } from 'react'
import { Spinner } from '@heroui/react/spinner'
import { TextArea } from '@heroui/react/textarea'
import type { MessageModel } from '@/entities/conversation'
import { memberMutationBlock, useViewer } from '@/entities/session'
import { useT } from '@/shared/i18n'
import { ArrowUpIcon, Button } from '@/shared/ui'
import { useSendMessage } from '../model/useSendMessage.ts'

const MAX_LENGTH = 4000

type MessageComposerProps = {
  conversation_id: string | null
  peer_user_id: string | null
  /** Гость не отправляет: страница открывает вход и оставляет текст. */
  requireSession: (action: () => void) => void
  onSent?: (message: MessageModel) => void
}

/** Поле сообщения. Текст остаётся в поле, пока отправка не удалась. Enter отправляет. */
export function MessageComposer({
  conversation_id,
  peer_user_id,
  requireSession,
  onSent,
}: MessageComposerProps) {
  const { t } = useT()
  const { viewer } = useViewer()
  const [text, setText] = useState('')
  const send = useSendMessage({
    conversation_id,
    peer_user_id,
    onSent: (message) => {
      setText('')
      onSent?.(message)
    },
  })

  const block = memberMutationBlock(viewer)
  if (block === 'restricted') {
    return <p className="py-3 text-sm text-muted">{t('messages.restricted')}</p>
  }

  const submit = () => {
    const body = text.trim()
    if (!body || send.is_pending || !peer_user_id || block === 'email_unverified') return
    requireSession(() => send.send(body))
  }

  const error_text =
    block === 'email_unverified'
      ? t('login.email_unverified')
      : send.error_code === 'restricted'
        ? t('messages.peer_restricted')
        : send.error

  return (
    <form
      className="flex w-full flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <div className="flex items-end gap-2">
        <TextArea
          value={text}
          maxLength={MAX_LENGTH}
          rows={2}
          placeholder={t('messages.placeholder')}
          aria-label={t('messages.placeholder')}
          variant="secondary"
          disabled={send.is_pending}
          aria-invalid={Boolean(error_text)}
          aria-describedby={error_text ? 'message-composer-error' : undefined}
          className="max-h-40 min-h-12 min-w-0 flex-1 resize-none rounded-xl text-sm"
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault()
              submit()
            }
          }}
        />
        <Button
          type="submit"
          isIconOnly
          variant="primary"
          aria-label={send.error ? t('common.retry') : t('messages.send')}
          isDisabled={
            text.trim().length === 0 ||
            send.is_pending ||
            !peer_user_id ||
            block === 'email_unverified'
          }
          className="mb-1 shrink-0"
        >
          {send.is_pending ? <Spinner size="sm" color="current" /> : <ArrowUpIcon />}
        </Button>
      </div>
      {error_text ? (
        <p id="message-composer-error" role="alert" className="text-sm text-danger">
          {error_text}
        </p>
      ) : null}
    </form>
  )
}
