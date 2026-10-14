import { useT } from '@/shared/i18n'
import { Button, Input } from '@/shared/ui'
import { authFormView } from '../model/auth-form-view.ts'
import type { AuthPanel } from '../model/useLoginDialogView.ts'
import { AuthProviders } from './AuthProviders.tsx'

const FIELD_CLASS = 'w-full'

type AuthFormProps = { panel: AuthPanel; is_unverified: boolean }

export function AuthForm({ panel, is_unverified }: AuthFormProps) {
  const { t } = useT()
  const view = authFormView(panel, is_unverified)

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault()
        if (view.phase !== panel.phase) panel.setPhase(view.phase)
        void panel.handleSubmitPassword()
      }}
    >
      {view.has_name ? (
        <label className="flex flex-col gap-1 text-sm">
          <span className="sr-only">{t('login.name')}</span>
          <Input
            size="lg"
            variant="secondary"
            autoComplete="name"
            value={panel.name}
            maxLength={50}
            placeholder={t('login.name')}
            className={FIELD_CLASS}
            aria-invalid={panel.field_error === 'name'}
            onChange={(event) => panel.setName(event.target.value)}
          />
          {panel.field_error === 'name' ? (
            <span role="alert" className="text-danger">
              {t('login.field.name')}
            </span>
          ) : null}
        </label>
      ) : null}
      {view.has_email ? (
        <label className="flex flex-col gap-1 text-sm">
          <span className="sr-only">{t('login.email')}</span>
          <Input
            size="lg"
            variant="secondary"
            type="email"
            placeholder={t('login.email')}
            aria-invalid={panel.field_error === 'email'}
            autoComplete="username"
            value={panel.email}
            className={FIELD_CLASS}
            onChange={(event) => panel.setEmail(event.target.value)}
          />
          {panel.field_error === 'email' ? (
            <span className="text-danger">{t('login.field.email')}</span>
          ) : null}
        </label>
      ) : null}
      {view.has_password ? (
        <label className="flex flex-col gap-1 text-sm">
          <span className="sr-only">{t('login.password')}</span>
          <Input
            size="lg"
            variant="secondary"
            type="password"
            placeholder={t('login.password')}
            aria-invalid={panel.field_error === 'password'}
            autoComplete={view.password_autocomplete}
            value={panel.password}
            className={FIELD_CLASS}
            onChange={(event) => panel.setPassword(event.target.value)}
          />
          {panel.field_error === 'password' ? (
            <span className="text-danger">{t('login.field.password')}</span>
          ) : null}
        </label>
      ) : null}
      {view.has_submit ? (
        <Button
          className="mt-1 h-14 w-full text-base"
          type="submit"
          variant="primary"
          isDisabled={panel.is_submitting}
        >
          {t(view.submit_key)}
        </Button>
      ) : null}
      {view.has_resend ? (
        <Button type="button" variant="ghost" onPress={() => void panel.handleResendVerification()}>
          {t('login.resend')}
        </Button>
      ) : null}
      {view.has_switches ? (
        <div className="flex flex-wrap justify-center gap-1">
          <Button type="button" size="lg" variant="ghost" onPress={() => panel.setPhase('register')}>
            {t('login.register')}
          </Button>
          <Button type="button" size="lg" variant="ghost" onPress={() => panel.setPhase('reset')}>
            {t('login.forgot_link')}
          </Button>
        </div>
      ) : null}
      {view.has_back ? (
        <Button type="button" size="lg" fullWidth variant="ghost" onPress={() => panel.setPhase('sign_in')}>
          {t('login.submit')}
        </Button>
      ) : null}
      <AuthProviders panel={panel} />
    </form>
  )
}
