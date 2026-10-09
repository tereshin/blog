import { useState } from 'react'
import type { MessageModel } from '@/entities/conversation'
import { useViewer } from '@/entities/session'
import { useT } from '@/shared/i18n'
import { Button } from '@/shared/ui'
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
export function MessageComposer({ conversation_id, peer_user_id, requireSession, onSent }: MessageComposerProps) {
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

  if (viewer.status === 'member' && viewer.user.is_restricted) {
    return <p className="py-3 text-sm text-muted">{t('messages.restricted')}</p>
  }

  const submit = () => {
    const body = text.trim()
    if (!body || send.is_pending || !peer_user_id) return
    requireSession(() => send.send(body))
  }

  const error_text = send.error_code === 'restricted' ? t('messages.peer_restricted') : send.error

  return (
    <form
      className="flex flex-col gap-2 border-t border-separator pt-3"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <textarea
        value={text}
        maxLength={MAX_LENGTH}
        rows={3}
        placeholder={t('messages.placeholder')}
        aria-label={t('messages.placeholder')}
        className="rounded-lg border border-separator bg-background px-3 py-2 text-sm text-foreground"
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            submit()
          }
        }}
      />
      {error_text ? <p className="text-sm text-danger">{error_text}</p> : null}
      <Button type="submit" variant="primary" isDisabled={text.trim().length === 0 || send.is_pending || !peer_user_id}>
        {send.error ? t('common.retry') : t('messages.send')}
      </Button>
    </form>
  )
}
