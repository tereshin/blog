import { useEffect } from 'react'
import { useViewer } from '@/entities/session'
import { useT } from '@/shared/i18n'
import type { MessageKey } from '@/shared/i18n'
import { Button, Dialog } from '@/shared/ui'
import { readAuthError, stripAuthError } from '../model/auth-error.ts'
import { providerLabel, useAuthPanel } from '../model/useAuthPanel.ts'
import type { AuthPhase } from '../model/useAuthPanel.ts'
import { useLoginDialog } from '../model/useLoginDialog.ts'
import type { LoginReason } from '../model/useLoginDialog.ts'

const NOTICE_KEY = {
  incomplete: 'login.notice.incomplete',
  invalid_credentials: 'login.notice.invalid_credentials',
  reset_sent: 'login.notice.reset_sent',
} as const satisfies Record<string, MessageKey>

const DESCRIPTION_KEY: Record<LoginReason, MessageKey> = {
  required: 'login.description',
  expired: 'login.expired_description',
  registration_closed: 'login.error.registration_closed',
  restricted: 'login.error.restricted',
  unknown_error: 'login.error.unknown',
}

const FIELD_CLASS = 'rounded-lg border border-separator bg-background px-3 py-2'

/** Диалог входа поверх текущего раздела; монтируется один раз в `AppProviders`. */
export function LoginDialog() {
  const { t } = useT()
  const { viewer } = useViewer()
  const is_open = useLoginDialog((state) => state.is_open)
  const reason = useLoginDialog((state) => state.reason)
  const open = useLoginDialog((state) => state.open)
  const close = useLoginDialog((state) => state.close)
  const panel = useAuthPanel(is_open)
  const unverified = viewer.status === 'member' && !viewer.user.email_verified
  const setPhase = panel.setPhase

  useEffect(() => {
    if (!unverified) return
    open('required')
    setPhase('claim')
  }, [unverified, open, setPhase])

  useEffect(() => {
    const auth_error = readAuthError(window.location.search)
    if (!auth_error) return
    open(auth_error)
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${stripAuthError(window.location.search)}${window.location.hash}`)
  }, [open])

  const is_failure = reason === 'registration_closed' || reason === 'restricted' || reason === 'unknown_error'
  const can_retry = reason !== 'restricted'

  return (
    <Dialog is_open={is_open} onOpenChange={(next) => (next ? open(reason) : close())} size="sm">
      <Dialog.CloseTrigger />
      <Dialog.Header>
        <Dialog.Heading>{t(reason === 'expired' ? 'login.expired_title' : 'login.title')}</Dialog.Heading>
      </Dialog.Header>
      <Dialog.Body>
        <div className="flex flex-col gap-3">
          <p className={is_failure ? 'text-danger' : 'text-muted'}>{t(DESCRIPTION_KEY[reason])}</p>
          {unverified ? <p className="text-sm text-muted">{t('login.email_unverified')}</p> : null}
          {panel.notice ? <p className="text-sm text-danger">{t(NOTICE_KEY[panel.notice])}</p> : null}
          {panel.config_query.isError ? (
            <Button variant="secondary" onPress={() => void panel.config_query.refetch()}>
              {t('login.retry')}
            </Button>
          ) : null}
          {panel.phase === 'pending' ? <p>{t('login.pending')}</p> : null}
          {can_retry && panel.config_query.isSuccess && panel.phase !== 'pending' ? (
            <AuthForm panel={panel} unverified={unverified} />
          ) : null}
        </div>
      </Dialog.Body>
      <Dialog.Footer>
        {panel.phase === 'pending' ? (
          <Button variant="primary" onPress={() => panel.setPhase(unverified ? 'claim' : 'sign_in')}>
            {t('login.submit')}
          </Button>
        ) : null}
        <Button variant="ghost" slot="close">
          {t('common.close')}
        </Button>
      </Dialog.Footer>
    </Dialog>
  )
}

type Panel = ReturnType<typeof useAuthPanel>

function AuthForm({ panel, unverified }: { panel: Panel; unverified: boolean }) {
  const { t } = useT()
  const phase: AuthPhase = unverified && panel.phase === 'sign_in' ? 'claim' : panel.phase
  const show_password = phase === 'sign_in' || phase === 'register'

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault()
        if (phase !== panel.phase) panel.setPhase(phase)
        void panel.submitPassword()
      }}
    >
      {panel.has_password || phase === 'claim' || phase === 'reset' ? (
        <label className="flex flex-col gap-1 text-sm">
          <span>{t('login.email')}</span>
          <input
            type="email"
            autoComplete="username"
            value={panel.email}
            className={FIELD_CLASS}
            onChange={(event) => panel.setEmail(event.target.value)}
          />
          {panel.field_error === 'email' ? <span className="text-danger">{t('login.field.email')}</span> : null}
        </label>
      ) : null}
      {panel.has_password && show_password ? (
        <label className="flex flex-col gap-1 text-sm">
          <span>{t('login.password')}</span>
          <input
            type="password"
            autoComplete={phase === 'register' ? 'new-password' : 'current-password'}
            value={panel.password}
            className={FIELD_CLASS}
            onChange={(event) => panel.setPassword(event.target.value)}
          />
          {panel.field_error === 'password' ? <span className="text-danger">{t('login.field.password')}</span> : null}
        </label>
      ) : null}
      {panel.has_password || phase === 'claim' || phase === 'reset' ? (
        <Button type="submit" variant="primary" isDisabled={panel.is_submitting}>
          {t(phase === 'register' ? 'login.register_submit' : phase === 'reset' ? 'login.forgot' : phase === 'claim' ? 'login.claim_submit' : 'login.submit')}
        </Button>
      ) : null}
      {phase === 'claim' ? (
        <Button type="button" variant="ghost" onPress={() => void panel.resendVerification()}>
          {t('login.resend')}
        </Button>
      ) : null}
      {panel.oauth_providers.map((provider) => (
        <Button key={provider.id} type="button" variant="secondary" isDisabled={panel.is_submitting} onPress={() => void panel.submitProvider(provider.id)}>
          {t('login.provider', { name: providerLabel(provider.id) })}
        </Button>
      ))}
      {panel.test_participants.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted">{t('login.test_participants')}</p>
          {panel.test_participants.map((participant) => (
            <Button key={participant.email} type="button" variant="ghost" onPress={() => void panel.submitTestParticipant(participant.email)}>
              {participant.label}
            </Button>
          ))}
        </div>
      ) : null}
      {panel.has_password && phase === 'sign_in' ? (
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onPress={() => panel.setPhase('register')}>
            {t('login.register')}
          </Button>
          <Button type="button" variant="ghost" onPress={() => panel.setPhase('reset')}>
            {t('login.forgot')}
          </Button>
        </div>
      ) : null}
      {phase === 'register' || phase === 'reset' ? (
        <Button type="button" variant="ghost" onPress={() => panel.setPhase('sign_in')}>
          {t('login.submit')}
        </Button>
      ) : null}
    </form>
  )
}
