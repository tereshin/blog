import { useEffect } from 'react'
import { useT } from '@/shared/i18n'
import type { MessageKey } from '@/shared/i18n'
import { Button, Dialog } from '@/shared/ui'
import { readAuthError, stripAuthError, toReturnPath } from '../model/auth-error.ts'
import { useLoginDialog } from '../model/useLoginDialog.ts'
import type { LoginReason } from '../model/useLoginDialog.ts'

const DESCRIPTION_KEY: Record<LoginReason, MessageKey> = {
  required: 'login.description',
  expired: 'login.expired_description',
  registration_closed: 'login.error.registration_closed',
  restricted: 'login.error.restricted',
  unknown_error: 'login.error.unknown',
}

/** Диалог входа поверх текущего раздела; монтируется один раз в `AppProviders`. */
export function LoginDialog() {
  const { t } = useT()
  const is_open = useLoginDialog((state) => state.is_open)
  const reason = useLoginDialog((state) => state.reason)
  const open = useLoginDialog((state) => state.open)
  const close = useLoginDialog((state) => state.close)

  // Возврат со входа с отказом: показываем причину и убираем параметр из адреса.
  useEffect(() => {
    const auth_error = readAuthError(window.location.search)
    if (!auth_error) return
    open(auth_error)
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${stripAuthError(window.location.search)}${window.location.hash}`)
  }, [open])

  const handleSignIn = () => {
    const return_to = toReturnPath(window.location.pathname, window.location.search, window.location.hash)
    window.location.assign(`/v1/auth/google?return_to=${encodeURIComponent(return_to)}`)
  }

  const is_failure = reason === 'registration_closed' || reason === 'restricted' || reason === 'unknown_error'
  const can_retry = reason !== 'restricted' && reason !== 'registration_closed'

  return (
    <Dialog is_open={is_open} onOpenChange={(next) => (next ? open(reason) : close())} size="sm">
      <Dialog.CloseTrigger />
      <Dialog.Header>
        <Dialog.Heading>{t(reason === 'expired' ? 'login.expired_title' : 'login.title')}</Dialog.Heading>
      </Dialog.Header>
      <Dialog.Body>
        <p className={is_failure ? 'text-danger' : 'text-muted'}>{t(DESCRIPTION_KEY[reason])}</p>
      </Dialog.Body>
      <Dialog.Footer>
        {can_retry ? (
          <Button variant="primary" onPress={handleSignIn}>
            {t('login.google')}
          </Button>
        ) : null}
        <Button variant="ghost" slot="close">
          {t('common.close')}
        </Button>
      </Dialog.Footer>
    </Dialog>
  )
}
