import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import {
  confirmEmailVerification,
  confirmPasswordReset,
  credentialFieldError,
} from '@/features/login'
import { useShellStore } from '@/widgets/shell'

type ActionStatus = 'idle' | 'ok' | 'fail'

export function useAuthActionPage() {
  const [params] = useSearchParams()
  const setHeaderCenter = useShellStore((state) => state.setHeaderCenter)
  const [status, setStatus] = useState<ActionStatus>('idle')
  const [password, setPassword] = useState('')
  const [field_error, setFieldError] = useState(false)
  const [action] = useState(() => ({ mode: params.get('mode'), oob_code: params.get('oob_code') }))
  const mode = action.mode
  const oob_code = action.oob_code

  useEffect(() => {
    setHeaderCenter({ kind: 'empty' })
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

  const handleReset = () => {
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
  const is_invalid = !oob_code || (mode !== 'verifyEmail' && mode !== 'resetPassword')

  return {
    status,
    password,
    setPassword,
    field_error,
    mode,
    oob_code,
    handleReset,
    is_reset,
    is_invalid,
  }
}
