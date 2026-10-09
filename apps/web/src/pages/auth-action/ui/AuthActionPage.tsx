import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { confirmEmailVerification, confirmPasswordReset, credentialFieldError } from '@/features/login'
import { useT } from '@/shared/i18n'
import { Button } from '@/shared/ui'
import { useShellStore } from '@/widgets/shell'

type ActionStatus = 'idle' | 'ok' | 'fail'

/** Страница письма: код из query уходит на подтверждение и не остаётся в адресе. */
export default function AuthActionPage() {
  const { t } = useT()
  const [params] = useSearchParams()
  const setHeaderCenter = useShellStore((state) => state.setHeaderCenter)
  const [status, setStatus] = useState<ActionStatus>('idle')
  const [password, setPassword] = useState('')
  const [field_error, setFieldError] = useState(false)
  const [action] = useState(() => ({ mode: params.get('mode'), oob_code: params.get('oob_code') }))
  const mode = action.mode
  const oob_code = action.oob_code

  useEffect(() => {
    setHeaderCenter({ kind: 'pill' })
  }, [setHeaderCenter])

  useEffect(() => {
    if (mode !== 'verifyEmail' || !oob_code) return
    const code = oob_code
    window.history.replaceState(window.history.state, '', '/auth/action')
    void confirmEmailVerification(code).then(
      () => setStatus('ok'),
      () => setStatus('fail'),
    )
  }, [mode, oob_code])

  const submitReset = () => {
    if (!oob_code) {
      setStatus('fail')
      return
    }
    if (credentialFieldError('reset@blog.test', password) === 'password') {
      setFieldError(true)
      return
    }
    const code = oob_code
    window.history.replaceState(window.history.state, '', '/auth/action')
    void confirmPasswordReset(code, password).then(
      () => setStatus('ok'),
      () => setStatus('fail'),
    )
  }

  const is_reset = mode === 'resetPassword' || (status !== 'idle' && mode !== 'verifyEmail')

  return (
    <div className="flex flex-col gap-3 p-4">
      {mode === 'verifyEmail' || (!is_reset && status !== 'idle') ? (
        <p>{status === 'fail' ? t('auth_action.verify_fail') : status === 'ok' ? t('auth_action.verify_ok') : t('common.loading')}</p>
      ) : null}
      {mode === 'resetPassword' && status === 'idle' ? (
        <form
          className="flex max-w-sm flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            submitReset()
          }}
        >
          <h1 className="text-lg">{t('auth_action.reset_title')}</h1>
          <label className="flex flex-col gap-1 text-sm">
            <span>{t('login.password')}</span>
            <input
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
