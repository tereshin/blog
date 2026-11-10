import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import type { EmailCodeStep } from '@blog/contracts'
import { sessionKeys } from '@/entities/session'
import { claimEmail, confirmEmailCode, getAuthConfig, resendEmailCode, sendEmailVerification, setupPassword, signInWithPassword, startEmailFlow } from '../api/auth-api.ts'
import { looksLikeEmail } from '../lib/credentials.ts'
import { signInWithProvider } from '../lib/firebase-auth.ts'
import { useAuthRequest } from './useAuthRequest.ts'
import { useProviderAuth } from './useProviderAuth.ts'
import { useLoginDialogStore } from './useLoginDialogStore.ts'

export type AuthPhase = 'email' | 'sign_in' | 'code' | 'password_setup' | 'pending' | 'claim'

export function providerLabel(provider_id: string): string {
  if (provider_id === 'google.com') return 'Google'
  if (provider_id === 'github.com') return 'GitHub'
  return provider_id
}

export function useAuthPanel(is_open: boolean) {
  const query_client = useQueryClient()
  const close = useLoginDialogStore((state) => state.close)
  const [phase, setPhase] = useState<AuthPhase>('email')
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [flow, setFlow] = useState<EmailCodeStep | null>(null)
  const [resend_deadline, setResendDeadline] = useState(0)
  const [field_error, setFieldError] = useState<'email' | 'password' | null>(null)
  const request = useAuthRequest()
  const resetRequest = request.reset
  const reset = useCallback(() => {
    resetRequest()
    setPhase('email')
    setEmail('')
    setPassword('')
    setCode('')
    setFlow(null)
    setFieldError(null)
    setDirection('forward')
  }, [resetRequest])
  useEffect(() => useLoginDialogStore.subscribe((next, previous) => {
    if (!next.is_open && previous.is_open) reset()
  }), [reset])

  const config_query = useQuery({ queryKey: ['auth', 'config'], queryFn: ({ signal }) => getAuthConfig(signal), enabled: is_open, retry: false })
  const config = config_query.data
  const provider_auth = useProviderAuth(config, is_open)
  const providers = config?.providers ?? []
  const has_password = providers.some((provider) => provider.id === 'password')
  const oauth_providers = providers.filter((provider) => provider.id !== 'password')
  const test_participants = config?.emulator_host && config.test_participants && config.test_password ? config.test_participants : []

  async function finishSignedIn(): Promise<() => void> {
    await query_client.invalidateQueries({ queryKey: sessionKeys.current() })
    return close
  }

  function acceptCode(next: EmailCodeStep): void {
    setFlow(next)
    setCode('')
    setPassword('')
    // Server-relative duration avoids incorrect timers on devices with skewed clocks.
    setResendDeadline(Date.now() + Math.max(0, Date.parse(next.resend_at) - Date.parse(next.server_time)))
    setDirection('forward')
    setPhase('code')
  }

  function handleBack(): void {
    resetRequest()
    setDirection('back')
    setPhase(flow?.purpose === 'password_reset' && (phase === 'code' || phase === 'password_setup') ? 'sign_in' : 'email')
    setPassword('')
    setCode('')
    setFlow(null)
    setFieldError(null)
  }

  async function handleEmailContinue(purpose: 'continue' | 'password_reset' = 'continue'): Promise<void> {
    if (!looksLikeEmail(email)) { setFieldError('email'); return }
    setFieldError(null)
    await request.run(async () => {
      const next = await startEmailFlow(email.trim(), purpose)
      return () => {
        setEmail(email.trim().toLowerCase())
        if (next.step === 'code') acceptCode(next)
        else { setDirection('forward'); setPhase('sign_in'); setPassword('') }
      }
    })
  }

  async function handleSubmitPassword(): Promise<void> {
    if (phase === 'email') return handleEmailContinue()
    if (!looksLikeEmail(email) && phase !== 'password_setup') { setFieldError('email'); return }
    if (phase !== 'claim' && password.length < 8) { setFieldError('password'); return }
    setFieldError(null)
    await request.run(async () => {
      if (phase === 'claim') {
        await claimEmail(email.trim())
        return () => setPhase('pending')
      }
      if (phase === 'password_setup' && flow) await setupPassword(flow.flow_id, password)
      else await signInWithPassword(email.trim(), password)
      return finishSignedIn()
    })
  }

  async function handleCodeChange(value: string): Promise<void> {
    if (request.is_submitting) return
    const next = value.replace(/\D/g, '').slice(0, 6)
    setCode(next)
    request.setNotice(null)
    if (next.length !== 6 || !flow) return
    await request.run(async () => {
      await confirmEmailCode(flow.flow_id, next)
      return () => { setDirection('forward'); setPhase('password_setup'); setCode('') }
    })
  }

  async function handleResendCode(): Promise<void> {
    if (!flow || Date.now() < resend_deadline) return
    await request.run(async () => {
      const next = await resendEmailCode(flow.flow_id)
      return () => acceptCode(next)
    })
  }

  async function handleSubmitProvider(provider_id: string): Promise<void> {
    await request.run(async () => { await signInWithProvider(provider_id); return finishSignedIn() })
  }
  async function handleSubmitTestParticipant(participant_email: string): Promise<void> {
    const test_password = config?.test_password
    if (!test_password) return
    await request.run(async () => { await signInWithPassword(participant_email, test_password); return finishSignedIn() })
  }
  async function handleResendVerification(): Promise<void> {
    await request.run(async () => { await sendEmailVerification(); return () => setPhase('pending') })
  }

  return {
    config_query, provider_auth, phase, setPhase, direction, email, setEmail, password, setPassword, code, flow,
    field_error, has_password, oauth_providers, test_participants, resend_deadline,
    is_submitting: request.is_submitting, notice_key: request.notice_key,
    handleSubmitPassword, handleEmailContinue, handleCodeChange, handleResendCode, handleBack,
    handleSubmitProvider, handleSubmitTestParticipant, handleResendVerification, reset,
  }
}
