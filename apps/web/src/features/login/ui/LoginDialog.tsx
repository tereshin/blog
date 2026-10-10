import { useEffect } from 'react'
import { useSettings } from '@/entities/settings'
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

const FIELD_CLASS = 'h-14 w-full rounded-2xl border border-separator bg-surface px-4 text-base outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20'

/** Диалог входа поверх текущего раздела; монтируется один раз в `AppProviders`. */
export function LoginDialog() {
  const { t } = useT()
  const { viewer } = useViewer()
  const { data: settings } = useSettings()
  const brand = settings?.name || t('common.site_name_fallback')
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
    <Dialog is_open={is_open} onOpenChange={(next) => (next ? open(reason) : close())} size="sm" className="auth-dialog">
      <Dialog.CloseTrigger />
      <Dialog.Header className="items-center gap-6 pt-10 text-center">
        <div className="flex h-20 min-w-20 items-center justify-center rounded-3xl bg-surface px-4" aria-hidden="true">
          {settings?.logo_url ? <img src={settings.logo_url} alt="" className="h-14 max-w-40 object-contain" /> : <span className="text-3xl font-semibold text-accent">{brand.slice(0, 2)}</span>}
        </div>
        <Dialog.Heading className="text-2xl font-semibold">{t(reason === 'expired' ? 'login.expired_title' : panel.phase === 'register' ? 'login.register_title' : panel.phase === 'reset' ? 'login.reset_title' : 'login.title')}</Dialog.Heading>
      </Dialog.Header>
      <Dialog.Body className="px-0 pb-8 pt-8">
        <div className="flex flex-col gap-3">
          {reason !== 'required' ? <p className={is_failure ? 'text-danger' : 'text-muted'}>{t(DESCRIPTION_KEY[reason])}</p> : null}
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
      <Dialog.Footer className="justify-center">
        {panel.phase === 'pending' ? (
          <Button variant="primary" onPress={() => panel.setPhase(unverified ? 'claim' : 'sign_in')}>
            {t('login.submit')}
          </Button>
        ) : null}
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
      {phase === 'register' ? (
        <label className="flex flex-col gap-1 text-sm">
          <span className="sr-only">{t('login.name')}</span>
          <input autoComplete="name" value={panel.name} maxLength={50} placeholder={t('login.name')} className={FIELD_CLASS} aria-invalid={panel.field_error === 'name'} onChange={(event) => panel.setName(event.target.value)} />
          {panel.field_error === 'name' ? <span role="alert" className="text-danger">{t('login.field.name')}</span> : null}
        </label>
      ) : null}
      {panel.has_password || phase === 'claim' || phase === 'reset' ? (
        <label className="flex flex-col gap-1 text-sm">
          <span className="sr-only">{t('login.email')}</span>
          <input
            type="email"
            placeholder={t('login.email')}
            aria-invalid={panel.field_error === 'email'}
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
          <span className="sr-only">{t('login.password')}</span>
          <input
            type="password"
            placeholder={t('login.password')}
            aria-invalid={panel.field_error === 'password'}
            autoComplete={phase === 'register' ? 'new-password' : 'current-password'}
            value={panel.password}
            className={FIELD_CLASS}
            onChange={(event) => panel.setPassword(event.target.value)}
          />
          {panel.field_error === 'password' ? <span className="text-danger">{t('login.field.password')}</span> : null}
        </label>
      ) : null}
      {panel.has_password || phase === 'claim' || phase === 'reset' ? (
        <Button className="mt-1 h-14 w-full text-base" type="submit" variant="primary" isDisabled={panel.is_submitting}>
          {t(phase === 'register' ? 'login.register_submit' : phase === 'reset' ? 'login.forgot' : phase === 'claim' ? 'login.claim_submit' : 'login.submit')}
        </Button>
      ) : null}
      {phase === 'claim' ? (
        <Button type="button" variant="ghost" onPress={() => void panel.resendVerification()}>
          {t('login.resend')}
        </Button>
      ) : null}
      {panel.has_password && phase === 'sign_in' ? (
        <div className="flex flex-wrap justify-center gap-1">
          <Button type="button" variant="ghost" onPress={() => panel.setPhase('register')}>
            {t('login.register')}
          </Button>
          <Button type="button" variant="ghost" onPress={() => panel.setPhase('reset')}>
            {t('login.forgot_link')}
          </Button>
        </div>
      ) : null}
      {phase === 'register' || phase === 'reset' ? (
        <Button type="button" variant="ghost" onPress={() => panel.setPhase('sign_in')}>
          {t('login.submit')}
        </Button>
      ) : null}
      <div className="mt-8 flex flex-col gap-3 border-t border-separator pt-6">
        {panel.oauth_providers.length > 0 ? <p className="text-center text-sm text-muted">{t('login.sso')}</p> : null}
        {panel.oauth_providers.map((provider) => (
          <Button key={provider.id} type="button" className="h-12 w-full text-base" variant="secondary" isDisabled={panel.is_submitting} onPress={() => void panel.submitProvider(provider.id)}>
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
      </div>
    </form>
  )
}
