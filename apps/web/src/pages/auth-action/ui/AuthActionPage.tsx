import { Link } from 'react-router'
import { useT } from '@/shared/i18n'
import { Button, EmptyState, Input } from '@/shared/ui'
import { useAuthActionPage } from '../model/useAuthActionPage.ts'

/** Страница письма: код из query уходит на подтверждение и не остаётся в адресе. */
export default function AuthActionPage() {
  const { t } = useT()
  const {
    status,
    password,
    setPassword,
    field_error,
    mode,
    handleReset,
    is_reset,
    is_invalid,
  } = useAuthActionPage()

  if (is_invalid) {
    return (
      <EmptyState
        title={t('auth_action.invalid_link')}
        description={t('auth_action.invalid_link_hint')}
      >
        <Link to="/" className="text-accent underline-offset-2 hover:underline">
          {t('shell.nav.fresh')}
        </Link>
      </EmptyState>
    )
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      {mode === 'verifyEmail' || (!is_reset && status !== 'idle') ? (
        <p>
          {status === 'fail'
            ? t('auth_action.verify_fail')
            : status === 'ok'
              ? t('auth_action.verify_ok')
              : t('common.loading')}
        </p>
      ) : null}
      {mode === 'resetPassword' && status === 'idle' ? (
        <form
          className="flex max-w-sm flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            handleReset()
          }}
        >
          <h1 className="text-lg">{t('auth_action.reset_title')}</h1>
          <label className="flex flex-col gap-1 text-sm">
            <span>{t('login.password')}</span>
            <Input
              size="base"
              variant="secondary"
              type="password"
              autoComplete="new-password"
              value={password}
              className="rounded-lg border border-separator bg-background px-3 py-2"
              onChange={(event) => setPassword(event.target.value)}
            />
            {field_error ? <span className="text-danger">{t('login.field.password')}</span> : null}
          </label>
          <Button type="submit" variant="primary">
            {t('auth_action.reset_submit')}
          </Button>
        </form>
      ) : null}
      {is_reset && status === 'ok' ? <p>{t('auth_action.reset_ok')}</p> : null}
      {is_reset && status === 'fail' ? <p>{t('auth_action.reset_fail')}</p> : null}
    </div>
  )
}
