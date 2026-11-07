import { useEffect } from 'react'
import { useSettings } from '@/entities/settings'
import { useViewer, useAppearance } from '@/entities/session'
import { useT } from '@/shared/i18n'
import type { MessageKey } from '@/shared/i18n'
import { readAuthError, stripAuthError } from './auth-error.ts'
import { useAuthPanel } from './useAuthPanel.ts'
import type { AuthPhase } from './useAuthPanel.ts'
import { useLoginDialogStore } from './useLoginDialogStore.ts'
import type { LoginReason } from './useLoginDialogStore.ts'

const DESCRIPTION_KEY: Record<LoginReason, MessageKey> = {
  required: 'login.description', expired: 'login.expired_description',
  registration_closed: 'login.error.registration_closed', restricted: 'login.error.restricted',
  unknown_error: 'login.error.unknown',
}
const TITLE_KEY: Partial<Record<AuthPhase, MessageKey>> = {
  sign_in: 'login.sign_in_title', code: 'login.code.title', claim: 'login.confirm_email',
}
export type AuthPanel = ReturnType<typeof useAuthPanel>

export function useLoginDialogView() {
  const { t } = useT()
  const { viewer } = useViewer()
  const { data: settings } = useSettings()
  const { theme } = useAppearance()
  const is_open = useLoginDialogStore((state) => state.is_open)
  const reason = useLoginDialogStore((state) => state.reason)
  const open = useLoginDialogStore((state) => state.open)
  const close = useLoginDialogStore((state) => state.close)
  const panel = useAuthPanel(is_open)
  const is_unverified = viewer.status === 'member' && !viewer.user.email_verified
  const setPhase = panel.setPhase

  useEffect(() => {
    if (!is_unverified) return
    open('required')
    setPhase('claim')
  }, [is_unverified, open, setPhase])
  useEffect(() => {
    const auth_error = readAuthError(window.location.search)
    if (!auth_error) return
    open(auth_error)
    window.history.replaceState(window.history.state, '',
      `${window.location.pathname}${stripAuthError(window.location.search)}${window.location.hash}`)
  }, [open])

  const title_key: MessageKey = panel.phase === 'password_setup'
    ? (panel.flow?.purpose === 'registration' ? 'login.create_password' : 'login.new_password')
    : (TITLE_KEY[panel.phase] ?? (reason === 'expired' ? 'login.expired_title' : 'login.title'))
  return {
    panel, is_open, is_unverified, is_pending: panel.phase === 'pending',
    logo_url: theme === 'dark' ? (settings?.logo_dark_url ?? settings?.logo_url) : settings?.logo_url,
    brand: settings?.name || t('common.site_name_fallback'), title_key,
    description_key: reason === 'required' ? null : DESCRIPTION_KEY[reason],
    is_failure: reason === 'registration_closed' || reason === 'restricted' || reason === 'unknown_error',
    notice_key: panel.notice_key, has_config_error: panel.config_query.isError,
    is_form_shown: reason !== 'restricted' && panel.config_query.isSuccess && panel.phase !== 'pending',
    retryConfig: () => void panel.config_query.refetch(),
    handleOpenChange: (next: boolean) => {
      if (next) open(reason)
      else { panel.reset(); close() }
    },
    handleContinue: () => panel.setPhase(is_unverified ? 'claim' : 'email'),
  }
}
