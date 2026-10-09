import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { AuthConfig } from '@blog/contracts'
import { sessionKeys } from '@/entities/session'
import { ApiError } from '@/shared/api'
import { claimEmail, getAuthConfig, registerWithPassword, requestPasswordReset, sendEmailVerification, signInWithPassword } from '../api/auth-api.ts'
import { credentialFieldError, looksLikeEmail } from '../lib/credentials.ts'
import { isPopupCancelled, signInWithProvider } from '../lib/firebase-auth.ts'
import { useLoginDialog } from './useLoginDialog.ts'

export type AuthPhase = 'sign_in' | 'register' | 'pending' | 'reset' | 'claim'

type FieldName = 'email' | 'password'

export function providerLabel(provider_id: string): string {
  if (provider_id === 'google.com') return 'Google'
  if (provider_id === 'github.com') return 'GitHub'
  return provider_id
}

export function useAuthPanel(is_open: boolean) {
  const query_client = useQueryClient()
  const openLogin = useLoginDialog((state) => state.open)
  const close = useLoginDialog((state) => state.close)
  const [phase, setPhase] = useState<AuthPhase>('sign_in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [field_error, setFieldError] = useState<FieldName | null>(null)
  const [notice, setNotice] = useState<'incomplete' | 'invalid_credentials' | 'reset_sent' | null>(null)
  const [is_submitting, setSubmitting] = useState(false)

  const config_query = useQuery({
    queryKey: ['auth', 'config'],
    queryFn: ({ signal }) => getAuthConfig(signal),
    enabled: is_open,
    retry: false,
  })

  const config: AuthConfig | undefined = config_query.data
  const providers = config?.providers ?? []
  const has_password = providers.some((provider) => provider.id === 'password')
  const oauth_providers = providers.filter((provider) => provider.id !== 'password')
  const test_participants = config?.emulator_host && config.test_participants && config.test_password ? config.test_participants : []

  async function finishSignedIn(): Promise<void> {
    await query_client.invalidateQueries({ queryKey: sessionKeys.current() })
    close()
  }

  function explain(error: unknown): void {
    if (isPopupCancelled(error)) {
      setNotice('incomplete')
      return
    }
    if (error instanceof ApiError && error.code === 'registration_closed') {
      openLogin('registration_closed')
      setNotice(null)
      return
    }
    if (error instanceof ApiError && error.code === 'invalid_credentials') {
      setNotice('invalid_credentials')
      return
    }
    setNotice('incomplete')
  }

  async function submitPassword(): Promise<void> {
    setNotice(null)
    if (is_submitting) return
    if (phase === 'reset' || phase === 'claim') {
      if (!looksLikeEmail(email)) {
        setFieldError('email')
        return
      }
    } else {
      const problem = credentialFieldError(email, password)
      setFieldError(problem)
      if (problem) return
    }
    setFieldError(null)
    setSubmitting(true)
    try {
      if (phase === 'register') {
        await registerWithPassword(email.trim(), password)
        setPhase('pending')
        setPassword('')
        return
      }
      if (phase === 'reset') {
        await requestPasswordReset(email.trim())
        setNotice('reset_sent')
        return
      }
      if (phase === 'claim') {
        await claimEmail(email.trim())
        setPhase('pending')
        return
      }
      await signInWithPassword(email.trim(), password)
      await finishSignedIn()
    } catch (error) {
      explain(error)
    } finally {
      setSubmitting(false)
    }
  }

  async function submitProvider(provider_id: string): Promise<void> {
    if (is_submitting) return
    setNotice(null)
    setSubmitting(true)
    try {
      await signInWithProvider(provider_id)
      await finishSignedIn()
    } catch (error) {
      explain(error)
    } finally {
      setSubmitting(false)
    }
  }

  async function submitTestParticipant(participant_email: string): Promise<void> {
    const test_password = config?.test_password
    if (!test_password || is_submitting) return
    setNotice(null)
    setSubmitting(true)
    try {
      await signInWithPassword(participant_email, test_password)
      await finishSignedIn()
    } catch (error) {
      explain(error)
    } finally {
      setSubmitting(false)
    }
  }

  async function resendVerification(): Promise<void> {
    if (is_submitting) return
    setSubmitting(true)
    setNotice(null)
    try {
      await sendEmailVerification()
      setPhase('pending')
    } catch (error) {
      explain(error)
    } finally {
      setSubmitting(false)
    }
  }

  return {
    config_query,
    phase,
    setPhase,
    email,
    setEmail,
    password,
    setPassword,
    field_error,
    notice,
    is_submitting,
    has_password,
    oauth_providers,
    test_participants,
    submitPassword,
    submitProvider,
    submitTestParticipant,
    resendVerification,
  }
}
