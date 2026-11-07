import { useT } from '@/shared/i18n'
import { Button, Input } from '@/shared/ui'
import type { AuthPanel } from '../model/useLoginDialogView.ts'
import { AuthProviders } from './AuthProviders.tsx'
import { AuthPasswordField } from './AuthPasswordField.tsx'
import { AuthCodeField } from './AuthCodeField.tsx'

type AuthFormProps = { panel: AuthPanel; is_unverified: boolean }

export function AuthForm({ panel, is_unverified }: AuthFormProps) {
  const { t } = useT()
  const is_initial = panel.phase === 'email'
  const is_claim = panel.phase === 'claim'
  const has_email = is_initial || panel.phase === 'sign_in' || is_claim
  const has_password = panel.phase === 'sign_in' || panel.phase === 'password_setup'
  const has_submit = (is_initial && panel.has_password) || has_password || is_claim
  const submit_key = is_initial ? 'login.continue' : is_claim ? 'login.claim_submit'
    : panel.phase === 'password_setup' ? 'login.save_password' : 'login.submit'

  return (
    <form className="auth-form" noValidate onSubmit={(event) => {
      event.preventDefault()
      if (has_submit) void panel.handleSubmitPassword()
    }} aria-busy={panel.is_submitting}>
      <div className="auth-form__fields">
        {has_email && (panel.has_password || is_claim) ? (
          <label className="flex flex-col gap-1 text-sm">
            <span className="sr-only">{t('login.email')}</span>
            <Input autoFocus={is_initial || is_claim} size="lg" variant="secondary" type="email"
              placeholder={t('login.email')} aria-invalid={panel.field_error === 'email'}
              aria-describedby={panel.field_error === 'email' ? 'auth-email-error' : undefined}
              autoComplete="username" value={panel.email} maxLength={320} disabled={panel.is_submitting}
              onChange={(event) => panel.setEmail(event.target.value)} className="w-full" />
            {panel.field_error === 'email' ? <span id="auth-email-error" role="alert" className="text-danger">{t('login.field.email')}</span> : null}
          </label>
        ) : null}
        {has_password ? <AuthPasswordField panel={panel} /> : null}
        {panel.phase === 'code' ? <AuthCodeField panel={panel} /> : null}
        {panel.notice_key ? <p role="alert" className="text-center text-sm text-danger">{t(panel.notice_key)}</p> : null}
        {panel.phase === 'sign_in' ? (
          <Button type="button" variant="ghost" className="auth-reset-link text-accent" isDisabled={panel.is_submitting}
            onPress={() => void panel.handleEmailContinue('password_reset')}>{t('login.send_code')}</Button>
        ) : null}
        {is_unverified && is_claim ? <p className="text-sm text-muted">{t('login.email_unverified')}</p> : null}
        {is_initial && has_submit ? (
          <Button type="submit" variant="primary" className="auth-submit" isDisabled={panel.is_submitting || !panel.email.trim()}>
            {t(submit_key)}
          </Button>
        ) : null}
      </div>
      <div className="auth-form__bottom">
        {!is_initial && has_submit ? (
          <Button type="submit" variant="primary" className="auth-submit" isDisabled={panel.is_submitting || (has_password && !panel.password)}>
            {t(submit_key)}
          </Button>
        ) : null}
        {is_claim ? <Button type="button" variant="ghost" isDisabled={panel.is_submitting}
          onPress={() => void panel.handleResendVerification()}>{t('login.resend')}</Button> : null}
        {is_initial ? <AuthProviders panel={panel} /> : null}
      </div>
    </form>
  )
}
