import { useCallback, useRef, useState } from 'react'
import { ApiError } from '@/shared/api'
import type { MessageKey } from '@/shared/i18n'
import { useLoginDialogStore } from './useLoginDialogStore.ts'

const ERRORS: Record<string, MessageKey> = {
  invalid_credentials: 'login.notice.invalid_credentials',
  invalid_code: 'login.code.invalid',
  code_expired: 'login.code.expired',
  code_attempts_exhausted: 'login.code.exhausted',
  code_cooldown: 'login.code.cooldown',
  flow_expired: 'login.flow.expired',
  account_changed: 'login.account_changed',
  forbidden: 'login.error.restricted',
}

/** Synchronous duplicate guard; outdated responses cannot move a reopened dialog. */
export function useAuthRequest() {
  const [is_submitting, setSubmitting] = useState(false)
  const [notice_key, setNotice] = useState<MessageKey | null>(null)
  const request_ref = useRef({ generation: 0, is_busy: false })
  const reset = useCallback(() => {
    request_ref.current = { generation: request_ref.current.generation + 1, is_busy: false }
    setSubmitting(false)
    setNotice(null)
  }, [])

  async function run(work: () => Promise<(() => void) | undefined>): Promise<void> {
    if (request_ref.current.is_busy) return
    const generation = request_ref.current.generation
    request_ref.current.is_busy = true
    setSubmitting(true)
    setNotice(null)
    try {
      const apply = await work()
      if (generation === request_ref.current.generation) apply?.()
    } catch (error) {
      if (generation !== request_ref.current.generation) return
      if (error instanceof ApiError && error.code === 'registration_closed') {
        useLoginDialogStore.getState().open('registration_closed')
      } else {
        setNotice(error instanceof ApiError ? (ERRORS[error.code] ?? 'login.notice.incomplete') : 'login.notice.incomplete')
      }
    } finally {
      if (generation === request_ref.current.generation) {
        request_ref.current.is_busy = false
        setSubmitting(false)
      }
    }
  }
  return { run, reset, is_submitting, notice_key, setNotice }
}
